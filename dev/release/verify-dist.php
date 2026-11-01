<?php
/**
 * Verify dist correctness and namespace isolation (Phase 1 release gate).
 *
 * Usage: php dev/release/verify-dist.php
 */
declare(strict_types=1);

$root = dirname(__DIR__, 2);
$cfgPath = $root . '/wpdev.json';
if (!is_file($cfgPath)) {
    $cfgPath = $root . '/project.config.json';
}
$cfg = json_decode((string) file_get_contents($cfgPath), true);
$slug = $cfg['slug'] ?? 'wpdev-starter';
$vendorPrefix = $cfg['vendorPrefix'] ?? 'WpdevVendor';
$dist = $root . '/dist/' . $slug;

if (!is_dir($dist)) {
    fwrite(STDERR, "Dist directory not found: {$dist}\nRun `php dev/release/build-dist.php` first.\n");
    exit(1);
}

// 1. Monorepo directories are excluded
$excludedDirs = [
    'packages', 'core', 'tools', 'skills', 'migration',
    'docs', 'build', 'examples', 'wp-content', 'types',
    'tests', 'dev', 'node_modules',
];
foreach ($excludedDirs as $d) {
    if (is_dir($dist . '/' . $d)) {
        fwrite(STDERR, "FAIL: Directory '{$d}' must not be present in dist.\n");
        exit(1);
    }
}

// 2. Unprefixed framework is not in vendor
if (is_dir($dist . '/vendor/wpdev')) {
    fwrite(STDERR, "FAIL: Unprefixed 'vendor/wpdev' must be cleaned up from dist.\n");
    exit(1);
}

// 3. Scoped framework exists in vendor-prefixed
if (!is_file($dist . '/vendor-prefixed/wpdev/framework/src/Core/Plugin.php')) {
    fwrite(STDERR, "FAIL: Scoped framework missing under vendor-prefixed/.\n");
    exit(1);
}

// 4. Dev config and monorepo files excluded
$excludedFiles = [
    'phpunit.xml.dist', 'phpunit.xml', 'AGENTS.md',
    'CLAUDE.md', 'babel.config.js', 'budget-ledger.json',
    'commitlint.config.cjs',
];
foreach ($excludedFiles as $f) {
    if (is_file($dist . '/' . $f)) {
        fwrite(STDERR, "FAIL: Dev file '{$f}' must not be present in dist.\n");
        exit(1);
    }
}

// 5. Marker exists
if (!is_file($dist . '/.dist-built')) {
    fwrite(STDERR, "FAIL: .dist-built marker missing in dist.\n");
    exit(1);
}

// 6. Test bootstrap in sandbox
if (!defined('ABSPATH')) {
    define('ABSPATH', '/tmp/');
}
if (!function_exists('plugin_dir_path')) {
    function plugin_dir_path($f) { return dirname($f) . '/'; }
}
if (!function_exists('plugins_url')) {
    function plugins_url($p, $f) { return 'http://example.com/'; }
}
if (!function_exists('add_action')) {
    function add_action($tag, $cb, $p = 10, $a = 1) {}
}
if (!function_exists('did_action')) {
    function did_action($tag) { return false; }
}
if (!function_exists('register_activation_hook')) {
    function register_activation_hook($f, $cb) {}
}
if (!function_exists('register_deactivation_hook')) {
    function register_deactivation_hook($f, $cb) {}
}
if (!function_exists('register_uninstall_hook')) {
    function register_uninstall_hook($f, $cb) {}
}

require $dist . '/wpdev-starter.php';

$pluginClass = $vendorPrefix . '\\WPDev\\Core\\Plugin';
$moduleClass = $vendorPrefix . '\\WPDev\\Modules\\ExampleFeature\\Module';

if (!class_exists($pluginClass)) {
    fwrite(STDERR, "FAIL: Scoped plugin class '{$pluginClass}' was not autoloaded.\n");
    exit(1);
}
if (!class_exists($moduleClass)) {
    fwrite(STDERR, "FAIL: Scoped module class '{$moduleClass}' was not autoloaded.\n");
    exit(1);
}
if (class_exists('WPDev\\Core\\Plugin')) {
    fwrite(STDERR, "FAIL: Unprefixed 'WPDev\\Core\\Plugin' leaked into dist environment.\n");
    exit(1);
}

fwrite(STDOUT, "PASS: Dist correctness and scoping verified successfully.\n");
exit(0);
