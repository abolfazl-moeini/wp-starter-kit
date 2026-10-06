import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);
const TRANSFORMER_PHP = path.resolve(packageRoot, "plan3/transformer.php");

/**
 * AST Symbol Resolution (declared-universe) test suite.
 * Harness mirrors assemble-profile-s-candidate.mjs: --dump-map then --batch,
 * then a post-transform runner (never scanned) executes the tree and asserts
 * runtime behavior. External stubs live ONLY in the runner.
 */
async function transformDir(files, seed = "test-symres-seed") {
  const dir = await mkdtemp(path.join(os.tmpdir(), "symres-"));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(dir, name), content, "utf8");
  }
  const mapOut = path.join(dir, "symbol-map.json");
  await execFileAsync("php", [TRANSFORMER_PHP, "--dump-map", dir, mapOut, seed]);
  const { stdout: batchOut } = await execFileAsync("php", [
    TRANSFORMER_PHP,
    "--batch",
    dir,
    mapOut,
    seed,
  ]);
  return { dir, mapOut, batchOut };
}

async function phpLint(dir, names) {
  for (const name of names) {
    const { stdout } = await execFileAsync("php", ["-l", path.join(dir, name)]);
    assert.ok(stdout.includes("No syntax errors detected"), `${name} must stay syntax-valid`);
  }
}

async function cleanup(dir) {
  await rm(dir, { recursive: true, force: true });
}

test("TC-01: external root class sharing short name with internal class is never hijacked", async () => {
  const { dir } = await transformDir({
    "internal.php": `<?php
namespace WPDevFramework;
class Switcher {
    public function render($id) { return 'INTERNAL:' . $id; }
}
echo 'TC01-INT:' . (new Switcher())->render('a') . "\\n";
`,
    "caller.php": `<?php
namespace WPDevFramework\\Shop;
class Basket {
    public function link($u) { return \\switcher::switch_to_url($u); }
}
echo 'TC01-EXT:' . (new Basket())->link('u9') . "\\n";
`,
  });
  try {
    await phpLint(dir, ["internal.php", "caller.php"]);
    const caller = await readFile(path.join(dir, "caller.php"), "utf8");
    assert.ok(
      caller.includes("switcher::switch_to_url"),
      "external \\switcher reference must stay intact",
    );
    assert.ok(
      !caller.match(/_[cf][a-z0-9_]*::switch_to_url/),
      "external call must not be rewritten to a mangled symbol",
    );
    const internal = await readFile(path.join(dir, "internal.php"), "utf8");
    assert.ok(
      !internal.match(/class\s+Switcher\b/),
      "internal class declaration must be mangled",
    );
    const runner = path.join(dir, "runner.php");
    await writeFile(
      runner,
      `<?php
class switcher { public static function switch_to_url($u) { return 'EXT:' . $u; } }
require '${path.join(dir, "internal.php")}';
require '${path.join(dir, "caller.php")}';
`,
      "utf8",
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC01-INT:INTERNAL:a"), `internal probe must pass, got: ${stdout}`);
    assert.ok(stdout.includes("TC01-EXT:EXT:u9"), `external probe must pass, got: ${stdout}`);
  } finally {
    await cleanup(dir);
  }
});

test("TC-02: WordPress core inheritance stays untouched while child is mangled", async () => {
  const { dir } = await transformDir({
    "table.php": `<?php
namespace Shop;
class My_Table extends \\WP_List_Table {
    public function rows() { return 'ROWS'; }
}
echo 'TC02:' . (new My_Table())->rows() . "\\n";
`,
  });
  try {
    await phpLint(dir, ["table.php"]);
    const table = await readFile(path.join(dir, "table.php"), "utf8");
    assert.ok(table.includes("extends \\WP_List_Table"), "\\WP_List_Table must stay intact");
    assert.ok(!table.match(/class\s+My_Table\b/), "child declaration must be mangled");
    const runner = path.join(dir, "runner.php");
    await writeFile(
      runner,
      `<?php
class WP_List_Table {}
require '${path.join(dir, "table.php")}';
`,
      "utf8",
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC02:ROWS"), `probe must pass, got: ${stdout}`);
  } finally {
    await cleanup(dir);
  }
});

test("TC-03: PHP core root classes need no hardcoded list", async () => {
  const { dir } = await transformDir({
    "core.php": `<?php
namespace App;
class Vault {
    public function now() { $d = new \\DateTime('2020-01-02'); return $d->format('Y'); }
    public function fail() { try { throw new \\Exception('x'); } catch (\\Exception $e) { return 'CAUGHT'; } }
    public function bag() { $o = new \\stdClass(); $o->v = 'STD'; return $o->v; }
}
$v = new Vault();
echo 'TC03:' . $v->now() . $v->fail() . $v->bag() . "\\n";
`,
  });
  try {
    await phpLint(dir, ["core.php"]);
    const src = await readFile(path.join(dir, "core.php"), "utf8");
    for (const token of ["\\DateTime", "\\Exception", "\\stdClass"]) {
      assert.ok(src.includes(token), `${token} must stay intact`);
    }
    const runner = path.join(dir, "runner.php");
    await writeFile(runner, `<?php\nrequire '${path.join(dir, "core.php")}';\n`, "utf8");
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC03:2020CAUGHTSTD"), `probe must pass, got: ${stdout}`);
  } finally {
    await cleanup(dir);
  }
});

test("TC-04: use-imported internal class resolves through the import", async () => {
  const { dir } = await transformDir({
    "lib.php": `<?php
namespace WPDevFramework;
class User_Switching {
    public function who() { return 'LIB'; }
}
`,
    "app.php": `<?php
namespace App;
use WPDevFramework\\User_Switching;
echo 'TC04:' . (new User_Switching())->who() . "\\n";
`,
  });
  try {
    await phpLint(dir, ["lib.php", "app.php"]);
    const runner = path.join(dir, "runner.php");
    await writeFile(
      runner,
      `<?php
require '${path.join(dir, "lib.php")}';
require '${path.join(dir, "app.php")}';
`,
      "utf8",
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC04:LIB"), `probe must pass, got: ${stdout}`);
  } finally {
    await cleanup(dir);
  }
});

test("TC-05: use-imported external class stays untouched", async () => {
  const { dir } = await transformDir({
    "app.php": `<?php
namespace App;
use SomePlugin\\ExternalClass;
echo 'TC05:' . (new ExternalClass())->tag() . "\\n";
`,
  });
  try {
    await phpLint(dir, ["app.php"]);
    const runner = path.join(dir, "runner.php");
    await writeFile(
      runner,
      `<?php
namespace SomePlugin {
    class ExternalClass { public function tag() { return 'EXT-CLS'; } }
}
namespace {
    require '${path.join(dir, "app.php")}';
}
`,
      "utf8",
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC05:EXT-CLS"), `probe must pass, got: ${stdout}`);
  } finally {
    await cleanup(dir);
  }
});

test("TC-06: zero hardcoded class names in transformer.php", async () => {
  const src = await readFile(TRANSFORMER_PHP, "utf8");
  assert.ok(!src.includes("$frozen_public_classes"), "frozen list must be gone");
  assert.ok(!src.includes("is_frozen_class"), "frozen helper must be gone");
  assert.ok(!src.toLowerCase().includes("user_switching"), "no project/third-party literal may remain");
  for (const lit of ["stdclass", "datetimeimmutable", "throwable"]) {
    const hits = src.toLowerCase().split(lit).length - 1;
    assert.equal(hits, 0, `hardcoded literal '${lit}' must be gone`);
  }
});

test("TC-07: trait-use inside class body is isolated but still mangled", async () => {
  const { dir } = await transformDir({
    "traits.php": `<?php
namespace App;
trait Timestampable {
    public function ts() { return 'TS'; }
}
class Post {
    use Timestampable;
    public function p() { return $this->ts(); }
}
class Adapted {
    use Timestampable { ts as stamp; }
    public function q() { return $this->stamp(); }
}
echo 'TC07:' . (new Post())->p() . (new Adapted())->q() . "\\n";
`,
  });
  try {
    await phpLint(dir, ["traits.php"]);
    const runner = path.join(dir, "runner.php");
    await writeFile(runner, `<?php\nrequire '${path.join(dir, "traits.php")}';\n`, "utf8");
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC07:TSTS"), `probe must pass, got: ${stdout}`);
    const src = await readFile(path.join(dir, "traits.php"), "utf8");
    assert.ok(!src.match(/trait\s+Timestampable\b/), "trait declaration must be mangled");
  } finally {
    await cleanup(dir);
  }
});

test("TC-08: group-use kinds route to the correct map", async () => {
  const { dir } = await transformDir({
    "lib.php": `<?php
namespace Lib;
class WidgetA { public function w() { return 'W'; } }
function helper_b() { return 'H'; }
const CONF_C = 'C';
`,
    "app.php": `<?php
namespace App;
use Lib\\{WidgetA, function helper_b, const CONF_C};
echo 'TC08:' . (new WidgetA())->w() . helper_b() . CONF_C . "\\n";
`,
  });
  try {
    await phpLint(dir, ["lib.php", "app.php"]);
    const app = await readFile(path.join(dir, "app.php"), "utf8");
    assert.ok(!app.includes("const CONF_C"), "use const must not enter the class import map");
    const runner = path.join(dir, "runner.php");
    await writeFile(
      runner,
      `<?php
require '${path.join(dir, "lib.php")}';
require '${path.join(dir, "app.php")}';
`,
      "utf8",
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC08:WHC"), `probe must pass, got: ${stdout}`);
  } finally {
    await cleanup(dir);
  }
});

test("TC-09: hook callback strings resolve like code references", async () => {
  const { dir } = await transformDir({
    "internal.php": `<?php
namespace WPDevFramework;
class Switcher {
    public static function boot() { return 'INTERNAL-SW'; }
}
`,
    "hooks.php": `<?php
namespace App;
class Registrar {
    public static function register() { return 'REG'; }
}
add_action('init', array('Registrar', 'register'));
add_action('init', array('switcher', 'switch_to_url'));
`,
  });
  try {
    await phpLint(dir, ["internal.php", "hooks.php"]);
    const runner = path.join(dir, "runner.php");
    await writeFile(
      runner,
      `<?php
class switcher { public static function switch_to_url($u) { return 'EXT-SW:' . $u; } }
function add_action($tag, $cb) { $GLOBALS['__tc_cbs'][] = $cb; }
require '${path.join(dir, "internal.php")}';
require '${path.join(dir, "hooks.php")}';
$internal = call_user_func($GLOBALS['__tc_cbs'][0]);
$external = call_user_func($GLOBALS['__tc_cbs'][1], 'u1');
echo 'TC09:' . $internal . '|' . $external . "\\n";
`,
      "utf8",
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC09:REG|EXT-SW:u1"), `probe must pass, got: ${stdout}`);
    const hooks = await readFile(path.join(dir, "hooks.php"), "utf8");
    assert.ok(hooks.includes("'switcher'"), "external callback string must stay byte-identical");
  } finally {
    await cleanup(dir);
  }
});

test("TC-10: Foo::class resolves, self/static/parent/dynamic never rewrite", async () => {
  const { dir } = await transformDir({
    "internal.php": `<?php
namespace WPDevFramework;
class Switcher {
    public static function boot() { return 'S'; }
}
`,
    "meta.php": `<?php
namespace App;
class Box {
    public static function name() { return Box::class; }
}
class Child extends Box {
    public static function names() { return array(self::class, parent::class); }
}
echo 'TC10-A:' . Box::name() . "\\n";
echo 'TC10-B:' . \\switcher::class . "\\n";
$names = Child::names();
echo 'TC10-C:' . ($names[0] !== $names[1] && $names[1] === Box::name() ? 'PARENT-OK' : 'DIFF') . "\\n";
`,
  });
  try {
    await phpLint(dir, ["internal.php", "meta.php"]);
    const meta = await readFile(path.join(dir, "meta.php"), "utf8");
    assert.ok(meta.includes("switcher::class"), "\\switcher::class must stay intact");
    const runner = path.join(dir, "runner.php");
    await writeFile(
      runner,
      `<?php
require '${path.join(dir, "internal.php")}';
require '${path.join(dir, "meta.php")}';
`,
      "utf8",
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC10-B:switcher"), `external ::class must pass, got: ${stdout}`);
    assert.ok(stdout.includes("TC10-C:PARENT-OK"), `parent identity must pass, got: ${stdout}`);
    assert.ok(!stdout.match(/TC10-A:App\\Box/), "internal ::class must not leak the original FQCN");
  } finally {
    await cleanup(dir);
  }
});

test("TC-11: unqualified function calls keep PHP fallback semantics", async () => {
  const { dir } = await transformDir({
    "alpha.php": `<?php
namespace Alpha;
function greet($n) { return 'ALPHA:' . $n; }
`,
    "other.php": `<?php
namespace Other;
echo 'TC11:' . greet('x') . "\\n";
`,
  });
  try {
    await phpLint(dir, ["alpha.php", "other.php"]);
    const runner = path.join(dir, "runner.php");
    await writeFile(
      runner,
      `<?php
function greet($n) { return 'GLOBAL:' . $n; }
require '${path.join(dir, "alpha.php")}';
require '${path.join(dir, "other.php")}';
`,
      "utf8",
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC11:GLOBAL:x"), `global fallback must win, got: ${stdout}`);
  } finally {
    await cleanup(dir);
  }
});

test("TC-13: qualified name without import resolves namespace-relative, never to root", async () => {
  const { dir } = await transformDir({
    "lib.php": `<?php
namespace Lib;
class Widget {
    public static function make() { return 'ROOT-WIDGET'; }
}
`,
    "app.php": `<?php
namespace App;
class Client {
    public function go() { return Lib\\Widget::make(); }
}
`,
  });
  try {
    await phpLint(dir, ["lib.php", "app.php"]);
    const app = await readFile(path.join(dir, "app.php"), "utf8");
    assert.ok(
      app.includes("Lib\\Widget::make"),
      "namespace-relative Lib\\Widget (App\\Lib\\Widget, undeclared) must stay intact",
    );
    assert.ok(
      !app.match(/_[cf][a-z0-9_]*::make/),
      "must not be rewritten to the root Lib\\Widget mangled symbol",
    );
  } finally {
    await cleanup(dir);
  }
});

test("TC-14: trait-use through an aliased import rewrites to the mangled trait", async () => {
  const { dir } = await transformDir({
    "trait.php": `<?php
namespace Other;
trait TraitA {
    public function t() { return 'T'; }
}
`,
    "user.php": `<?php
namespace App;
use Other\\TraitA as TA;
class User {
    use TA;
    public function u() { return $this->t(); }
}
echo 'TC14:' . (new User())->u() . "\\n";
`,
  });
  try {
    await phpLint(dir, ["trait.php", "user.php"]);
    const user = await readFile(path.join(dir, "user.php"), "utf8");
    assert.ok(!user.match(/use\s+TA\s*;/), "aliased trait-use must be rewritten");
    const runner = path.join(dir, "runner.php");
    await writeFile(runner, `<?php\nrequire '${path.join(dir, "trait.php")}';\nrequire '${path.join(dir, "user.php")}';\n`, "utf8");
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC14:T"), `probe must pass, got: ${stdout}`);
  } finally {
    await cleanup(dir);
  }
});

test("TC-15: trait adaptations keep brace tracking and resolve insteadof/as", async () => {
  const { dir } = await transformDir({
    "traits.php": `<?php
namespace App;
trait TA {
    public function m() { return 'A'; }
    public function n() { return 'NA'; }
}
trait TB {
    public function m() { return 'B'; }
}
class User {
    use TA, TB { TA::m insteadof TB; TA::n as protected aliasN; }
    public function u() { return $this->m() . $this->aliasN(); }
}
class After {
    public function a() { return 'AFTER'; }
}
echo 'TC15:' . (new User())->u() . (new After())->a() . "\\n";
`,
  });
  try {
    await phpLint(dir, ["traits.php"]);
    const src = await readFile(path.join(dir, "traits.php"), "utf8");
    assert.ok(src.match(/class\s+[^\s\\]+\s*\{[^}]*public function a/s), "class after adaptations must keep a bare declaration name");
    assert.ok(!src.includes("insteadof TB;"), "insteadof operand is a trait reference and must resolve");
    assert.ok(src.includes("aliasN"), "adaptation alias must stay verbatim");
    const runner = path.join(dir, "runner.php");
    await writeFile(runner, `<?php\nrequire '${path.join(dir, "traits.php")}';\n`, "utf8");
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC15:ANAAFTER"), `probe must pass, got: ${stdout}`);
  } finally {
    await cleanup(dir);
  }
});

test("TC-16: namespace\\-relative references resolve against the current namespace", async () => {
  const { dir } = await transformDir({
    "ns.php": `<?php
namespace App;
class Helper {
    public static function run() { return 'H'; }
}
class Probe {
    public function p() { return namespace\\Helper::run(); }
}
echo 'TC16:' . (new Probe())->p() . "\\n";
`,
    "ext.php": `<?php
namespace Other;
class Probe2 {
    public function p() { return namespace\\Helper::run(); }
}
`,
  });
  try {
    await phpLint(dir, ["ns.php", "ext.php"]);
    const ns = await readFile(path.join(dir, "ns.php"), "utf8");
    assert.ok(!ns.includes("namespace\\Helper"), "declared namespace\\Helper must rewrite to the mangled symbol");
    const ext = await readFile(path.join(dir, "ext.php"), "utf8");
    assert.ok(ext.includes("namespace\\Helper"), "undeclared Other\\Helper must stay intact");
    const runner = path.join(dir, "runner.php");
    await writeFile(runner, `<?php\nrequire '${path.join(dir, "ns.php")}';\n`, "utf8");
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC16:H"), `probe must pass, got: ${stdout}`);
  } finally {
    await cleanup(dir);
  }
});

test("TC-17: const-initializer class refs honor import shadowing", async () => {
  const { dir } = await transformDir({
    "vault.php": `<?php
namespace App;
class Vault {
    const SECRET = 'S';
}
`,
    "cfg.php": `<?php
namespace Current;
use External\\Vault;
class Cfg {
    const X = Vault::SECRET;
}
`,
  });
  try {
    await phpLint(dir, ["vault.php", "cfg.php"]);
    const cfg = await readFile(path.join(dir, "cfg.php"), "utf8");
    assert.ok(cfg.includes("Vault::SECRET"), "import-shadowed Vault (External\\Vault) must stay intact");
  } finally {
    await cleanup(dir);
  }
});

test("TC-12: braced multi-namespace files resolve per block", async () => {
  const { dir } = await transformDir({
    "multi.php": `<?php
namespace A {
    class Item {
        public function a() { return 'A-ITEM'; }
    }
}
namespace B {
    class Item {
        public function b() { return 'B-ITEM'; }
    }
}
`,
    "probe.php": `<?php
namespace C;
use A\\Item as AItem;
use B\\Item as BItem;
echo 'TC12:' . (new AItem())->a() . (new BItem())->b() . "\\n";
`,
  });
  try {
    await phpLint(dir, ["multi.php", "probe.php"]);
    const runner = path.join(dir, "runner.php");
    await writeFile(
      runner,
      `<?php
require '${path.join(dir, "multi.php")}';
require '${path.join(dir, "probe.php")}';
`,
      "utf8",
    );
    const { stdout } = await execFileAsync("php", [runner]);
    assert.ok(stdout.includes("TC12:A-ITEMB-ITEM"), `probe must pass, got: ${stdout}`);
  } finally {
    await cleanup(dir);
  }
});
