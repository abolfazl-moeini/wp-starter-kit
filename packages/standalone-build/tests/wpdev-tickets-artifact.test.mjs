import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import test, { before, after } from "node:test";
import { promisify } from "node:util";
import { prepareArtifactFixture } from "../artifact-fixture-helper.mjs";

const execFileAsync = promisify(execFile);
const CONSUMER = "wpdev-tickets";
const ZIP_PATH = path.resolve(`dist/${CONSUMER}-profile-s.zip`);

let fixture;

before(async () => {
  fixture = await prepareArtifactFixture({ consumer: CONSUMER, zipPath: ZIP_PATH });
});

after(async () => {
  if (fixture?.cleanup) {
    await fixture.cleanup();
  }
});

test("WPDev Tickets Artifact: ZIP exists and matches strict package hygiene", async () => {
  const entries = fixture.entries;

  assert.ok(entries.includes(`${CONSUMER}/${CONSUMER}.php`), "Main plugin bootstrap file must exist at zip root");
  assert.ok(entries.includes(`${CONSUMER}/LICENSE`), "LICENSE must be preserved");

  const forbiddenExtensions = [".md", ".yml", ".yaml", ".log", ".dist", ".bak", ".map"];
  for (const entry of entries) {
    assert.ok(entry.startsWith(`${CONSUMER}/`), `Entry must start with ${CONSUMER}/: ${entry}`);
    for (const ext of forbiddenExtensions) {
      assert.ok(!entry.endsWith(ext), `Entry must NOT contain forbidden dev extension (${ext}): ${entry}`);
    }
    assert.ok(!entry.includes("/tests/"), `Entry must NOT contain test directories: ${entry}`);
    assert.ok(!entry.endsWith("wpdev.json"), "wpdev.json must be purged from artifact");
  }

  const mainPhp = await readFile(path.join(fixture.pluginDir, `${CONSUMER}.php`), "utf8");
  assert.ok(!mainPhp.includes("Requires Plugins: wpdev"), "Requires Plugins: wpdev header must be stripped for standalone operation");
});

test("WPDev Tickets Artifact: verifies comment stripping and symbol mangling across modules", async () => {
  // Check Module.php
  const modulePhp = await readFile(path.join(fixture.pluginDir, "src/Modules/Tickets/Module.php"), "utf8");
  assert.ok(modulePhp.includes("class Module"), "Module class entrypoint must remain class Module");
  assert.ok(!modulePhp.includes("/**"), "DocBlocks must be stripped from Module.php");

  // Check an internal class
  const schemaPhp = await readFile(path.join(fixture.pluginDir, "src/Database/Schema.php"), "utf8");
  assert.ok(/class\s+_c_[a-z0-9]+/i.test(schemaPhp), "Schema must be mangled to global _c_... class");
  assert.ok(!schemaPhp.includes("/**"), "DocBlocks must be stripped from Schema.php");
});

test("WPDev Tickets Artifact: verifies inlined Database Engine and Ticket Schema without wpdev", async () => {
  const stagingRoot = fixture.stagingRoot;
  const pluginDir = fixture.pluginDir;
    const upgradeDir = path.join(stagingRoot, "wp-admin/includes");
    await mkdir(upgradeDir, { recursive: true });
    await writeFile(path.join(upgradeDir, "upgrade.php"), "<?php if (!function_exists('dbDelta')) { function dbDelta($q) { return []; } }", "utf8");

    const dbRunnerScript = `<?php
define('ABSPATH', '${stagingRoot}/');
define('WP_DEBUG', true);

// Stub core WordPress environment
$wp_actions = [];
$wp_filters = [];
function add_action($h, $cb, $p = 10, $a = 1) { global $wp_actions; $wp_actions[$h][] = $cb; return true; }
function add_filter($h, $cb, $p = 10, $a = 1) { global $wp_filters; $wp_filters[$h][] = $cb; return true; }
function apply_filters($h, $v, ...$args) { return $v; }
function do_action($h, ...$args) {}
function did_action($h) { return true; }
function __($t, $d = "default") { return $t; }
function esc_html__($t, $d = "default") { return $t; }
function esc_attr__($t, $d = "default") { return $t; }
function get_option($n, $d = false) { return $d; }
function update_option($n, $v) { return true; }
function wp_parse_args($args, $defaults = []) { return array_merge($defaults, (array) $args); }
if (!function_exists('dbDelta')) {
    function dbDelta($queries) { return []; }
}

// Global wpdb stub
class FakeWpDb {
    public $prefix = 'wp_';
    public $tickets = 'wp_wpdev_tickets';
    public function get_charset_collate() { return 'DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'; }
}
$GLOBALS['wpdb'] = new FakeWpDb();

// Load plugin's self-contained vendor autoloader
require_once "${pluginDir}/vendor/autoload.php";

// Load inlined database engine and functions
if (file_exists("${pluginDir}/src/FrameworkClosure/functions-closure.php")) {
    require_once "${pluginDir}/src/FrameworkClosure/functions-closure.php";
}

// 1. Verify Database Schema (Schema.php) can instantiate standalone
require_once "${pluginDir}/src/Database/Schema.php";
$schemaClass = null;
foreach (get_declared_classes() as $cls) {
    if (strpos($cls, '_c_') === 0) {
        $refl = new ReflectionClass($cls);
        if ($refl->hasConstant('DB_VERSION') && $refl->hasConstant('TABLE_PREFIX')) {
            $schemaClass = $cls;
            break;
        }
    }
}

assert($schemaClass !== null, "Schema class must exist");
$schemaClass::install();

echo "TICKETS_DB_ENGINE_STANDALONE_SUCCESS\\n";
`;

    const runnerFile = path.join(stagingRoot, "tickets-db-runner.php");
    await writeFile(runnerFile, dbRunnerScript, "utf8");

    const { stdout, stderr } = await execFileAsync("php", [runnerFile]);
    assert.ok(stdout.includes("TICKETS_DB_ENGINE_STANDALONE_SUCCESS"), `Database engine test must succeed: ${stdout} ${stderr}`);
});

test("WPDev Tickets Artifact: verifies TicketListAdminPage and cross-plugin ModuleLoader duck typing", async () => {
  const stagingRoot = fixture.stagingRoot;
  const pluginDir = fixture.pluginDir;

  // 1. Verify Composer autoload_files.php order: functions-closure.php MUST precede any -register.php
  const autoloadFilesPhp = await readFile(path.join(pluginDir, "vendor/composer/autoload_files.php"), "utf8");
  const closureIdx = autoloadFilesPhp.indexOf("functions-closure.php");
  const ticketsRegisterIdx = autoloadFilesPhp.indexOf("tickets-register.php");
  assert.ok(closureIdx !== -1, "functions-closure.php must be registered in autoload_files.php");
  assert.ok(ticketsRegisterIdx !== -1, "tickets-register.php must be registered in autoload_files.php");
  assert.ok(closureIdx < ticketsRegisterIdx, "functions-closure.php must precede tickets-register.php in autoload_files.php");

  // 2. Execute isolated PHP runner verifying Admin Pages resolution & ModuleLoader duck-typed registration
  const runnerScript = `<?php
define('ABSPATH', '${stagingRoot}/');
define('WP_DEBUG', true);

$wp_actions = [];
$wp_filters = [];
$wp_did_actions = [];
function add_action($h, $cb, $p = 10, $a = 1) { global $wp_actions; $wp_actions[$h][] = $cb; return true; }
function add_filter($h, $cb, $p = 10, $a = 1) { global $wp_filters; $wp_filters[$h][] = $cb; return true; }
function apply_filters($h, $v, ...$args) { return $v; }
function do_action($h, ...$args) { global $wp_did_actions; $wp_did_actions[$h] = ($wp_did_actions[$h] ?? 0) + 1; }
function did_action($h) { global $wp_did_actions; return $wp_did_actions[$h] ?? 0; }
function __($t, $d = "default") { return $t; }
function esc_html__($t, $d = "default") { return $t; }
function esc_attr__($t, $d = "default") { return $t; }
function is_admin() { return true; }

require_once "${pluginDir}/vendor/autoload.php";

// Assert List_Admin_Page resolves
assert(class_exists("WPDevFramework\\\\Admin_Pages\\\\List_Admin_Page"), "List_Admin_Page must be resolvable");
assert(class_exists("WPDevFramework\\\\Admin_Pages\\\\Base_Admin_Page"), "Base_Admin_Page must be resolvable");

// Assert TicketListAdminPage resolves without errors
assert(class_exists("WpdevTickets\\\\Modules\\\\Tickets\\\\Admin\\\\TicketListAdminPage"), "TicketListAdminPage must be resolvable");

// Assert ModuleLoader duck-typing
$loader = \\WPDev\\Core\\Plugin::loader();
$mockForeignModule = new class {
    public function get_slug(): string { return 'foreign-domain-module'; }
    public function should_boot(): bool { return true; }
};
$loader->register($mockForeignModule);
assert($loader->has('foreign-domain-module'), "Foreign duck-typed module must be registered");

echo "TICKETS_ADMIN_AND_MODULE_LOADER_SUCCESS\\n";
`;

  const runnerFile = path.join(stagingRoot, "tickets-admin-runner.php");
  await writeFile(runnerFile, runnerScript, "utf8");

  const { stdout, stderr } = await execFileAsync("php", [runnerFile]);
  assert.ok(stdout.includes("TICKETS_ADMIN_AND_MODULE_LOADER_SUCCESS"), `Admin and ModuleLoader test must succeed: ${stdout} ${stderr}`);
});

