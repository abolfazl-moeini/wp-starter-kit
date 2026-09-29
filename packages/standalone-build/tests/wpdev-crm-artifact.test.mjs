import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import test, { before, after } from "node:test";
import { promisify } from "node:util";
import { getDefaultZipPath, prepareArtifactFixture } from "../artifact-fixture-helper.mjs";

const execFileAsync = promisify(execFile);
const CONSUMER = "wpdev-crm";
const ZIP_PATH = getDefaultZipPath(CONSUMER);

let fixture;

before(async () => {
  fixture = await prepareArtifactFixture({ consumer: CONSUMER, zipPath: ZIP_PATH });
});

after(async () => {
  if (fixture?.cleanup) {
    await fixture.cleanup();
  }
});

test("WPDev CRM Artifact: ZIP exists and matches strict package hygiene", async () => {
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

test("WPDev CRM Artifact: verifies comment stripping and symbol mangling across modules", async () => {
  // Check ContactStatus.php
  const statusPhp = await readFile(path.join(fixture.pluginDir, "src/Modules/CrmModule/Database/Contacts/ContactStatus.php"), "utf8");
  assert.ok(/class\s+_c_[a-z0-9]+/i.test(statusPhp), "ContactStatus must be mangled to global _c_... class");
  assert.ok(!statusPhp.includes("/**"), "DocBlocks must be stripped");

  // Check Module.php
  const modulePhp = await readFile(path.join(fixture.pluginDir, "src/Modules/CrmModule/Module.php"), "utf8");
  assert.ok(modulePhp.includes("class Module"), "Module class entrypoint must remain class Module");
  assert.ok(!modulePhp.includes("/**"), "DocBlocks must be stripped from Module.php");
  assert.ok(modulePhp.includes("'crm'"), "Slug literal must be preserved");
});

test("WPDev CRM Artifact: verifies inlined Database Engine (BerlinDB) and Enum functionality without wpdev", async () => {
  const stagingRoot = fixture.stagingRoot;
  const pluginDir = fixture.pluginDir;
    const upgradeDir = path.join(stagingRoot, "wp-admin/includes");
    await mkdir(upgradeDir, { recursive: true });
    await writeFile(path.join(upgradeDir, "upgrade.php"), "<?php function dbDelta($q) { return []; }", "utf8");

    const dbRunnerScript = `<?php
define('ABSPATH', '${stagingRoot}/');
define('WP_DEBUG', true);

// Stub core WordPress environment
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
function esc_sql($s) { return is_array($s) ? array_map('esc_sql', $s) : addslashes((string)$s); }
function sanitize_key($k) { return strtolower(preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$k)); }
function get_option($n, $d = false) { return $d; }
function update_option($n, $v) { return true; }
function is_admin() { return true; }
function wp_list_pluck($list, $field) { $res = []; foreach ($list as $k => $v) { $res[$k] = is_array($v) ? ($v[$field] ?? null) : ($v->$field ?? null); } return $res; }
function wp_parse_args($args, $defaults = []) { return array_merge($defaults, (array) $args); }
function wp_next_scheduled($hook, $args = []) { return false; }
function wp_schedule_event($timestamp, $recurrence, $hook, $args = []) { return true; }
function wp_unschedule_hook($hook) { return true; }

// Global wpdb stub
class FakeWpDb {
    public $prefix = 'wp_';
    public $charset = 'utf8mb4';
    public $collate = 'utf8mb4_unicode_ci';
    public $crm_contacts = 'wp_wpdev_crm_contacts';
    public function get_charset_collate() { return 'DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'; }
    public function update($table, $data, $where) { return 1; }
    public function insert($table, $data) { return 1; }
    public function get_results($query) { return []; }
    public function get_row($query) { return null; }
    public function get_var($query) { return null; }
    public function query($query) { return true; }
    public function suppress_errors($suppress = true) { return true; }
    public function prepare($query, ...$args) { return $query; }
}
$GLOBALS['wpdb'] = new FakeWpDb();

// Load plugin's self-contained vendor autoloader
require_once "${pluginDir}/vendor/autoload.php";

// Load inlined database engine and functions
if (file_exists("${pluginDir}/src/FrameworkClosure/functions-closure.php")) {
    require_once "${pluginDir}/src/FrameworkClosure/functions-closure.php";
}

// 1. Verify Enum (ContactStatus) works standalone without wpdev
require_once "${pluginDir}/src/Modules/CrmModule/Database/Contacts/ContactStatus.php";

$classes = get_declared_classes();
$statusClass = null;
foreach ($classes as $cls) {
    if (strpos($cls, '_c_') === 0 && is_subclass_of($cls, '_c_89d43ba9')) {
        $statusClass = $cls;
        break;
    }
    if (strpos($cls, '_c_') === 0) {
        $refl = new ReflectionClass($cls);
        if ($refl->hasConstant('IN_PROGRESS') && $refl->hasConstant('DONE')) {
            $statusClass = $cls;
            break;
        }
    }
}

if (!$statusClass) {
    echo "ERROR: ContactStatus mangled class not found\\n";
    exit(1);
}

// Test status options and cache flush
$opts = $statusClass::get_options();
assert(is_array($opts), "Status options must return array");
$statusClass::flush_options_cache();

// 2. Verify Database Schema (ContactsSchema) can instantiate standalone
require_once "${pluginDir}/src/Modules/CrmModule/Database/Contacts/ContactsSchema.php";
$schemaClass = null;
foreach (get_declared_classes() as $cls) {
    if (strpos($cls, '_c_') === 0) {
        $refl = new ReflectionClass($cls);
        if ($refl->hasProperty('columns') && $refl->hasProperty('prefix')) {
            $schemaClass = $cls;
            break;
        }
    }
}

assert($schemaClass !== null, "ContactsSchema class must exist");
$schema = new $schemaClass();
assert(!empty($schema->columns), "Schema columns must be set");

echo "CRM_DB_ENGINE_STANDALONE_SUCCESS\\n";
`;

    const runnerFile = path.join(stagingRoot, "crm-db-runner.php");
    await writeFile(runnerFile, dbRunnerScript, "utf8");

    const { stdout, stderr } = await execFileAsync("php", [runnerFile]);
    assert.ok(stdout.includes("CRM_DB_ENGINE_STANDALONE_SUCCESS"), `Database engine test must succeed: ${stdout} ${stderr}`);
});
