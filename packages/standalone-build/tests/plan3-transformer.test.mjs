import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);
const TRANSFORMER_PHP = path.resolve(packageRoot, "plan3/transformer.php");

test("Plan 3: strips comments while preserving main plugin header and license notices", async () => {
  const source = `<?php
/**
 * Plugin Name: Tavangary Test Plugin
 * Version: 1.0.0
 * Author: Tavangary
 */

// This is an internal developer comment that MUST be stripped
/**
 * Internal docblock explaining business secrets.
 */
class InternalService {
    // Another comment
    public function execute() {
        return 42;
    }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-test-"));
  const tempFile = path.join(tempDir, "main.php");
  try {
    await writeFile(tempFile, source, "utf8");
    await execFileAsync("php", [TRANSFORMER_PHP, tempFile, "--main", "seed-plan3"]);

    const transformed = await readFile(tempFile, "utf8");

    // Plugin Header must be preserved
    assert.ok(transformed.includes("Plugin Name: Tavangary Test Plugin"), "Main plugin header must be preserved");

    // Internal developer comments must be 100% stripped
    assert.ok(!transformed.includes("Internal developer comment"), "Inline comments must be stripped");
    assert.ok(!transformed.includes("Internal docblock explaining"), "DocBlocks must be stripped");
    assert.ok(!transformed.includes("Another comment"), "Method comments must be stripped");

    // Syntax validation
    const { stdout } = await execFileAsync("php", ["-l", tempFile]);
    assert.ok(stdout.includes("No syntax errors detected"), "Transformed PHP must be syntax-valid");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
test("Plan 3: mangles private symbols while preserving public contracts and gettext %1$s", async () => {
  const source = `<?php
class BannerService {
    private $secretKey = "encrypted_data";
    public $publicTitle = "Banner Title";

    public function renderBanner($userName, $itemCount) {
        $msg = sprintf(__('Welcome %1$s! You have %2$d items.', 'tavangary'), $userName, $itemCount);
        return $this->formatSecret($msg);
    }

    private function formatSecret($text) {
        $token = $this->secretKey . ':' . $text;
        return $token;
    }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-test-"));
  const tempFile = path.join(tempDir, "service.php");
  try {
    await writeFile(tempFile, source, "utf8");
    await execFileAsync("php", [TRANSFORMER_PHP, tempFile, "--not-main", "seed-plan3"]);

    const transformed = await readFile(tempFile, "utf8");

    // Public property and public method preserved
    assert.ok(transformed.includes("public $publicTitle"), "Public properties must not be renamed");
    assert.ok(transformed.includes("public function renderBanner"), "Public methods must not be renamed");

    // Gettext placeholders %1$s and %2$d preserved
    assert.ok(
      transformed.includes("'Welcome %1$s! You have %2$d items.'"),
      "Gettext format placeholders %1$s and %2$d must remain byte-exact"
    );

    // Private property and private method mangled
    assert.ok(!transformed.includes("$secretKey"), "Private property must be mangled");
    assert.ok(!transformed.includes("formatSecret"), "Private method must be mangled");

    // Local variable mangled
    assert.ok(!transformed.includes("$msg ="), "Local variable must be mangled");

    // Syntax validation
    const { stdout } = await execFileAsync("php", ["-l", tempFile]);
    assert.ok(stdout.includes("No syntax errors detected"), "Transformed PHP must be syntax-valid");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("Plan 3: preserves public property lists and rewrites private static calls", async () => {
  const source = `<?php
class StaticInternal {
    private static $first = 1, $second = 2;
    protected $visible = 3;
    private static function sum() { return self::$first + self::$second; }
    public static function run() { return self::sum(); }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-test-"));
  const tempFile = path.join(tempDir, "service.php");
  try {
    await writeFile(tempFile, source, "utf8");
    await execFileAsync("php", [TRANSFORMER_PHP, tempFile, "--not-main", "seed-plan3"]);
    const transformed = await readFile(tempFile, "utf8");
    assert.ok(transformed.includes("protected $visible"));
    assert.ok(!transformed.includes("self::sum()"));
    assert.ok(!transformed.includes("$first"));
    assert.ok(!transformed.includes("$second"));
    const { stdout } = await execFileAsync("php", ["-l", tempFile]);
    assert.ok(stdout.includes("No syntax errors detected"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("Plan 3: flattens namespaces and removes internal use statements into global scope", async () => {
  const file1 = `<?php
namespace WpdevCrm\\Modules\\CrmModule\\Database\\Contacts;

use WPDevFramework\\Database\\Engine\\Table;
use WpdevCrm\\Modules\\CrmModule\\Database\\Contacts\\ContactStatus;

class ContactsTable extends Table {
    public function get_status(): string {
        return ContactStatus::ACTIVE;
    }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-flatten-test-"));
  const file1Path = path.join(tempDir, "ContactsTable.php");
  const mapFile = path.join(tempDir, "map.json");
  try {
    await writeFile(file1Path, file1, "utf8");
    await execFileAsync("php", [
      TRANSFORMER_PHP,
      "--dump-map",
      tempDir,
      mapFile,
      "seed-test"
    ]);

    await execFileAsync("php", [
      TRANSFORMER_PHP,
      file1Path,
      "--not-main",
      mapFile,
      "seed-test"
    ]);

    const transformed = await readFile(file1Path, "utf8");

    // Namespace declaration must be completely gone
    assert.ok(!transformed.includes("namespace WpdevCrm"), "Namespace declaration must be stripped");

    // Internal class name must be mangled global class
    assert.ok(transformed.includes("class _c_"), "Class must be mangled global symbol");

    // Syntax validation
    const { stdout } = await execFileAsync("php", ["-l", file1Path]);
    assert.ok(stdout.includes("No syntax errors detected"), "Transformed PHP must be syntax-valid");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("Plan 3: disambiguates classes sharing identical short names in different namespaces", async () => {
  const fileA = `<?php
namespace App\\ModuleA;
class Component_Registry {
    public function getId() { return 'A'; }
}
`;
  const fileB = `<?php
namespace App\\ModuleB;
class Component_Registry {
    public function getId() { return 'B'; }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-collision-test-"));
  const dirA = path.join(tempDir, "ModuleA");
  const dirB = path.join(tempDir, "ModuleB");
  await mkdir(dirA, { recursive: true });
  await mkdir(dirB, { recursive: true });

  const fileAPath = path.join(dirA, "Component_Registry.php");
  const fileBPath = path.join(dirB, "Component_Registry.php");
  const mapFile = path.join(tempDir, "map.json");

  try {
    await writeFile(fileAPath, fileA, "utf8");
    await writeFile(fileBPath, fileB, "utf8");

    await execFileAsync("php", [
      TRANSFORMER_PHP,
      "--dump-map",
      tempDir,
      mapFile,
      "seed-test"
    ]);

    const mapData = JSON.parse(await readFile(mapFile, "utf8"));
    const mangledA = mapData.classes["App\\ModuleA\\Component_Registry"];
    const mangledB = mapData.classes["App\\ModuleB\\Component_Registry"];

    assert.ok(mangledA, "App\\ModuleA\\Component_Registry must be mapped");
    assert.ok(mangledB, "App\\ModuleB\\Component_Registry must be mapped");
    assert.notEqual(mangledA, mangledB, "Mangled names for distinct FQCNs must NEVER collide!");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("Plan 3: dump-map records declaration kinds including enum and enum declaration stays valid PHP", async () => {
  const phpVersionOut = await execFileAsync("php", ["-r", "echo PHP_VERSION;"]);
  const phpVersion = phpVersionOut.stdout.trim();
  const majorMinor = phpVersion.split(".").slice(0, 2).join(".");
  if (Number(phpVersion.split(".")[0]) < 8 || (Number(phpVersion.split(".")[0]) === 8 && Number(phpVersion.split(".")[1]) < 1)) {
    return;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-enum-"));
  const srcDir = path.join(tempDir, "src");
  const mapFile = path.join(tempDir, "map.json");
  try {
    await mkdir(srcDir, { recursive: true });
    await writeFile(
      path.join(srcDir, "Status.php"),
      `<?php
namespace App\\Enums;
enum TicketLifecycle: string {
    case Open = 'open';
    case Closed = 'closed';
}
`
    );
    await writeFile(
      path.join(srcDir, "Contract.php"),
      `<?php
namespace App\\Enums;
interface Contract {}
trait Helper {}
class Service implements Contract {
    use Helper;
}
`
    );

    await execFileAsync("php", [
      TRANSFORMER_PHP,
      "--dump-map",
      tempDir,
      mapFile,
      "seed-enum",
    ]);

    const mapData = JSON.parse(await readFile(mapFile, "utf8"));
    assert.ok(mapData.kinds, "dump-map must persist declaration kinds");
    assert.equal(mapData.kinds["App\\Enums\\TicketLifecycle"], "enum");
    assert.equal(mapData.kinds["App\\Enums\\Contract"], "interface");
    assert.equal(mapData.kinds["App\\Enums\\Helper"], "trait");
    assert.equal(mapData.kinds["App\\Enums\\Service"], "class");

    await execFileAsync("php", [
      TRANSFORMER_PHP,
      "--batch",
      tempDir,
      mapFile,
      "seed-enum",
      "Status.php",
    ]);

    const transformed = await readFile(path.join(srcDir, "Status.php"), "utf8");
    assert.match(transformed, /\benum\s+_c_[0-9a-f]{8}/, "enum declaration name must be mangled without breaking the enum keyword");
    assert.ok(
      transformed.includes("function_exists('enum_exists')") || transformed.includes("function_exists(\"enum_exists\")"),
      "enum alias guard must be PHP 7.4-safe via function_exists('enum_exists')"
    );
    assert.ok(!/enum_exists\s*\(/.test(transformed.split("\n").filter((l) => !l.includes("function_exists")).join("\n")) || transformed.includes("function_exists('enum_exists')"));

    const lint = await execFileAsync("php", ["-l", path.join(srcDir, "Status.php")]);
    assert.ok(lint.stdout.includes("No syntax errors detected"), `enum transform must lint clean on ${majorMinor}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("Plan 3: preserves WordPress hook names and unrelated strings while mangling private callbacks", async () => {
  const source = `<?php
class HookService {
    public function boot() {
        add_action('init', [$this, 'init']);
        add_filter('the_content', [$this, 'filter_content']);
        remove_action('init', array($this, 'init'));
        $label = 'init';
        return $label;
    }
    private function init() { return 'booted'; }
    private function filter_content($c) { return $c; }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-hook-"));
  const tempFile = path.join(tempDir, "HookService.php");
  try {
    await writeFile(tempFile, source, "utf8");
    await execFileAsync("php", [TRANSFORMER_PHP, tempFile, "--not-main", "seed-hook"]);
    const transformed = await readFile(tempFile, "utf8");

    assert.ok(transformed.includes("add_action('init'"), "WordPress hook name init must stay byte-exact");
    assert.ok(transformed.includes("remove_action('init'"), "remove_action hook name init must stay byte-exact");
    assert.ok(transformed.includes("add_filter('the_content'"), "the_content hook name must stay byte-exact");
    assert.ok(!transformed.includes("add_action('_m_"), "hook API first argument must not be rewritten to a mangled method");
    assert.match(transformed, /\[\$this,\s*'_m_[0-9a-f]{8}'\]/, "array callable private method string must be mangled");
    assert.match(transformed, /array\(\$this,\s*'_m_[0-9a-f]{8}'\)/, "array() callable private method string must be mangled");
    assert.ok(transformed.includes("= 'init'"), "unrelated string that only happens to match a private method name must stay");
    assert.ok(!transformed.includes("function init("), "private method declaration must be mangled");
    assert.ok(!transformed.includes("function filter_content("), "private filter callback declaration must be mangled");

    const lint = await execFileAsync("php", ["-l", tempFile]);
    assert.ok(lint.stdout.includes("No syntax errors detected"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("Plan 3: mangles private members through the nullsafe operator and keeps runtime behavior", async () => {
  const source = `<?php
class NullsafeSvc {
    private $secretKey = 'x';
    private function hidden() { return $this->secretKey; }
    public function run() { return $this?->hidden(); }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-nullsafe-"));
  const tempFile = path.join(tempDir, "NullsafeSvc.php");
  try {
    await writeFile(tempFile, source, "utf8");
    await execFileAsync("php", [TRANSFORMER_PHP, tempFile, "--not-main", "seed-nullsafe"]);
    const transformed = await readFile(tempFile, "utf8");

    assert.ok(!transformed.includes("function hidden("), "private method declaration must be mangled");
    assert.ok(!transformed.includes("?->hidden("), "nullsafe call must use the mangled private method");
    assert.match(transformed, /\?->_m_[0-9a-f]{8}\s*\(/, "nullsafe private method call must be rewritten");
    assert.ok(!transformed.includes("$secretKey"), "private property must be mangled");

    const runner = path.join(tempDir, "run.php");
    await writeFile(
      runner,
      `<?php
require '${tempFile}';
$o = new NullsafeSvc();
$result = $o->run();
if ($result !== 'x') { fwrite(STDERR, "NULLSAFE_RUNTIME:$result\\n"); exit(1); }
echo 'NULLSAFE_OK';
`,
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.equal(stdout.trim(), "NULLSAFE_OK");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("Plan 3: does not rewrite public methods that share a class short name", async () => {
  const source = `<?php
namespace App\\Two;
class Registry {
    public function Registry() { return 'ctor-like'; }
    public function ping() { return 'b'; }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-method-collide-"));
  const filePath = path.join(tempDir, "Registry.php");
  const mapFile = path.join(tempDir, "map.json");
  try {
    await writeFile(filePath, source, "utf8");
    await execFileAsync("php", [TRANSFORMER_PHP, "--dump-map", tempDir, mapFile, "seed-collide"]);
    await execFileAsync("php", [
      TRANSFORMER_PHP,
      filePath,
      "--not-main",
      mapFile,
      "seed-collide",
    ]);
    const transformed = await readFile(filePath, "utf8");
    assert.ok(transformed.includes("function Registry("), "public method named after the class must keep its method name");
    assert.ok(!/function _c_[0-9a-f]{8}\s*\(/.test(transformed), "class hash must not replace a method declaration");

    const runner = path.join(tempDir, "run.php");
    await writeFile(
      runner,
      `<?php
require '${filePath}';
$o = new App\\Two\\Registry();
if ($o->Registry() !== 'ctor-like') { fwrite(STDERR, "METHOD_COLLIDE\\n"); exit(1); }
if ($o->ping() !== 'b') { fwrite(STDERR, "PING\\n"); exit(1); }
echo 'METHOD_COLLIDE_OK';
`,
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.equal(stdout.trim(), "METHOD_COLLIDE_OK");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("Plan 3: preserves distinctive WordPress globals instead of mangling them", async () => {
  const source = `<?php
function use_wp_globals() {
    global $wp, $current_user, $current_screen, $wp_admin_bar, $wp_roles, $wp_rewrite, $wp_filesystem, $typenow, $taxnow, $authordata;
    return array($wp, $current_user, $current_screen, $wp_admin_bar, $wp_roles, $wp_rewrite, $wp_filesystem, $typenow, $taxnow, $authordata);
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-globals-"));
  const tempFile = path.join(tempDir, "globals.php");
  try {
    await writeFile(tempFile, source, "utf8");
    await execFileAsync("php", [TRANSFORMER_PHP, tempFile, "--not-main", "seed-globals"]);
    const transformed = await readFile(tempFile, "utf8");
    for (const name of [
      "$wp",
      "$current_user",
      "$current_screen",
      "$wp_admin_bar",
      "$wp_roles",
      "$wp_rewrite",
      "$wp_filesystem",
      "$typenow",
      "$taxnow",
      "$authordata",
    ]) {
      assert.ok(transformed.includes(name), `${name} is a WordPress global and must not be mangled`);
    }
    assert.ok(!transformed.includes("global $_v_"), "WordPress globals must not be rewritten to local hashes");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("Plan 3: rewrites compact() names to follow mangled locals", async () => {
  const source = `<?php
class CompactSvc {
    public function run() {
        $fee = 10;
        $pack = compact('fee');
        return isset($pack['fee']) ? $pack['fee'] : -1;
    }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-compact-"));
  const tempFile = path.join(tempDir, "CompactSvc.php");
  try {
    await writeFile(tempFile, source, "utf8");
    await execFileAsync("php", [TRANSFORMER_PHP, tempFile, "--not-main", "seed-compact"]);
    const transformed = await readFile(tempFile, "utf8");
    assert.ok(!transformed.includes("$fee"), "local $fee must be mangled");
    assert.ok(!transformed.includes("compact("), "compact() with literal names must be rewritten so array keys stay stable");
    assert.match(
      transformed,
      /array\(\s*'fee'\s*=>\s*\$_v_[0-9a-f]{8}\s*\)/,
      "compact('fee') must become array('fee' => mangled_local) so $pack['fee'] still resolves",
    );
    assert.ok(transformed.includes("['fee']"), "compact() consumers must still read the original array key");

    const runner = path.join(tempDir, "run.php");
    await writeFile(
      runner,
      `<?php
require '${tempFile}';
$o = new CompactSvc();
if ($o->run() !== 10) { fwrite(STDERR, "COMPACT_RUNTIME\\n"); exit(1); }
echo 'COMPACT_OK';
`,
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.equal(stdout.trim(), "COMPACT_OK");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("Plan 3: brace namespaces dump the real FQCN and flatten to a runnable class", async () => {
  const source = `<?php
namespace App\\Brace {
    class InsideBrace {
        public function ok() { return 1; }
    }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-brace-"));
  const filePath = path.join(tempDir, "InsideBrace.php");
  const mapFile = path.join(tempDir, "map.json");
  try {
    await writeFile(filePath, source, "utf8");
    await execFileAsync("php", [TRANSFORMER_PHP, "--dump-map", tempDir, mapFile, "seed-brace"]);
    const mapData = JSON.parse(await readFile(mapFile, "utf8"));
    assert.ok(mapData.classes["App\\Brace\\InsideBrace"], "brace namespace class must be keyed by the real FQCN");
    assert.ok(
      !Object.keys(mapData.classes).some((key) => key.includes("\\ok\\")),
      "namespace scanner must not swallow method names into the FQCN",
    );

    await execFileAsync("php", [
      TRANSFORMER_PHP,
      filePath,
      "--not-main",
      mapFile,
      "seed-brace",
    ]);
    const transformed = await readFile(filePath, "utf8");
    assert.ok(!transformed.includes("namespace App\\Brace"), "flattened brace namespace declaration must be removed");
    const lint = await execFileAsync("php", ["-l", filePath]);
    assert.ok(lint.stdout.includes("No syntax errors detected"));

    const runner = path.join(tempDir, "run.php");
    await writeFile(
      runner,
      `<?php
require '${filePath}';
$o = new App\\Brace\\InsideBrace();
if ($o->ok() !== 1) { fwrite(STDERR, "BRACE_RUNTIME\\n"); exit(1); }
echo 'BRACE_OK';
`,
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.equal(stdout.trim(), "BRACE_OK");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("Plan 3: drops ambiguous short class names when two FQCNs share one", async () => {
  const fileA = `<?php
namespace App\\ModuleA;
class Registry { public function getId() { return 'A'; } }
`;
  const fileB = `<?php
namespace App\\ModuleB;
class Registry { public function getId() { return 'B'; } }
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "plan3-short-collide-"));
  const dirA = path.join(tempDir, "ModuleA");
  const dirB = path.join(tempDir, "ModuleB");
  await mkdir(dirA, { recursive: true });
  await mkdir(dirB, { recursive: true });
  const mapFile = path.join(tempDir, "map.json");
  try {
    await writeFile(path.join(dirA, "Registry.php"), fileA, "utf8");
    await writeFile(path.join(dirB, "Registry.php"), fileB, "utf8");
    await execFileAsync("php", [TRANSFORMER_PHP, "--dump-map", tempDir, mapFile, "seed-short"]);
    const mapData = JSON.parse(await readFile(mapFile, "utf8"));
    assert.ok(mapData.classes["App\\ModuleA\\Registry"]);
    assert.ok(mapData.classes["App\\ModuleB\\Registry"]);
    assert.notEqual(mapData.classes["App\\ModuleA\\Registry"], mapData.classes["App\\ModuleB\\Registry"]);
    assert.ok(
      !Object.prototype.hasOwnProperty.call(mapData.classes, "Registry"),
      "ambiguous short name Registry must not map to a single mangled class",
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

