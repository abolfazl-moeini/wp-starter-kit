import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const execFileAsync = promisify(execFile);
const MODULE_DIR = path.join(
  repoRoot,
  "packages/wpdev-framework/modules/settings-panel-builder/src"
);
const SETTINGS_FILE = path.join(MODULE_DIR, "class-settings.php");

/**
 * V5 (plan-05): framework domain code must not carry manual require_once
 * band-aids for sibling classes. Siblings use proper FQCNs resolvable through
 * the module autoloader convention (Modules/{Name} + class-<kebab>.php), and
 * dev bootstraps via setup.php requires — so the in-file requires are dead weight.
 */
test("V5: class-settings.php carries no manual sibling require_once", async () => {
  const src = await readFile(SETTINGS_FILE, "utf8");
  const hits = src.split("\n").filter((line) => /^\s*require_once\b/.test(line));
  assert.equal(hits.length, 0, `manual requires must be gone, found: ${hits.join(" | ")}`);
});

test("V5: sibling classes resolve through the module autoloader convention alone", async () => {
  const probe = `define('ABSPATH', '/tmp/');
spl_autoload_register(function ($class) {
    $kebab = function ($short) { return 'class-' . strtolower(str_replace('_', '-', $short)) . '.php'; };
    $frameworkRoot = dirname(dirname('${MODULE_DIR.replace(/\\/g, "\\\\")}'));
    if (0 === strpos($class, 'WPDevFramework\\\\Modules\\\\')) {
        $relative = substr($class, strlen('WPDevFramework\\\\Modules\\\\'));
        $parts = explode('\\\\', $relative);
        $module = array_shift($parts);
        $short = end($parts);
        $kebabModule = strtolower(preg_replace('/(?<!^)[A-Z]/', '-$0', $module));
        $file = $frameworkRoot . '/' . $kebabModule . '/src/' . $kebab($short);
        if (is_file($file)) { require_once $file; return; }
    }
    if (0 === strpos($class, 'WPDevFramework\\\\Core\\\\')) {
        $short = substr($class, strlen('WPDevFramework\\\\Core\\\\'));
        $short = end(explode('\\\\', $short));
        $file = $frameworkRoot . '/core/src/' . $kebab($short);
        if (is_file($file)) { require_once $file; return; }
    }
});
$ok = [];
foreach (array(
    'WPDevFramework\\\\Modules\\\\SettingsPanelBuilder\\\\Settings_Storage',
    'WPDevFramework\\\\Modules\\\\SettingsPanelBuilder\\\\Settings_Save',
    'WPDevFramework\\\\Modules\\\\SettingsPanelBuilder\\\\Settings_Section_Registry',
) as $fqcn) {
    $ok[] = class_exists($fqcn, true) ? '1' : '0';
}
echo 'V5-AUTOLOAD:' . implode('', $ok) . "\\n";
`;
  const { stdout } = await execFileAsync("php", ["-r", probe]);
  assert.ok(stdout.includes("V5-AUTOLOAD:111"), `all siblings must autoload, got: ${stdout}`);
});
