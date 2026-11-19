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
    'tests', 'dev', 'node_modules', '.idea', '.claude',
    '.workbuddy-ai', '.vscode', '.git', '.github', '.husky',
    '.cursor', '.kiro',
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
    'commitlint.config.cjs', 'package.json', 'package-lock.json',
    '.npmrc', '.gitmodules', '.gitignore', '.editorconfig',
    'README.md', 'CHANGELOG.md',
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
    function plugins_url($p, $f = '') { return 'http://example.com/'; }
}
if (!function_exists('esc_html__')) {
    function esc_html__($text, $domain = 'default') { return $text; }
}

$registered_actions = [];
if (!function_exists('add_action')) {
    function add_action($tag, $cb, $p = 10, $a = 1) {
        global $registered_actions;
        $registered_actions[] = ['tag' => $tag, 'cb' => $cb, 'priority' => $p];
    }
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

$mainPluginFile = is_file($dist . '/' . $slug . '.php')
    ? $dist . '/' . $slug . '.php'
    : $dist . '/wpdev-starter.php';

if (!is_file($mainPluginFile)) {
    fwrite(STDERR, "FAIL: Main plugin file missing under {$dist}.\n");
    exit(1);
}

require $mainPluginFile;

// Assert no admin_notices (which fires if Composer/classes are missing)
// and assert plugins_loaded boot hook was registered.
$hasPluginsLoadedBoot = false;
foreach ($registered_actions as $action) {
    if ($action['tag'] === 'admin_notices') {
        fwrite(STDERR, "FAIL: Main plugin triggered admin_notices (early abort or missing dependency notice).\n");
        exit(1);
    }
    if ($action['tag'] === 'plugins_loaded') {
        $hasPluginsLoadedBoot = true;
    }
}
if (!$hasPluginsLoadedBoot) {
    fwrite(STDERR, "FAIL: Main plugin did not register any plugins_loaded boot callback.\n");
    exit(1);
}

$pluginClass = $vendorPrefix . '\\WPDev\\Core\\Plugin';
$moduleClass = $vendorPrefix . '\\WPDev\\Modules\\ExampleFeature\\Module';

if (!class_exists($pluginClass)) {
    fwrite(STDERR, "FAIL: Scoped plugin class '{$pluginClass}' was not autoloaded.\n");
    exit(1);
}
if (is_dir($dist . '/src/Modules/ExampleFeature') && !class_exists($moduleClass)) {
    fwrite(STDERR, "FAIL: Scoped module class '{$moduleClass}' was not autoloaded.\n");
    exit(1);
}
if (class_exists('WPDev\\Core\\Plugin')) {
    fwrite(STDERR, "FAIL: Unprefixed 'WPDev\\Core\\Plugin' leaked into dist environment.\n");
    exit(1);
}

// 7. Check that all dist PHP files pass syntax check and have zero unprefixed WPDev references
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($dist, FilesystemIterator::SKIP_DOTS)
);
foreach ($iterator as $item) {
    /** @var SplFileInfo $item */
    if ($item->isDir() || $item->getExtension() !== 'php') {
        continue;
    }
    $path = $item->getPathname();
    $rel = substr($path, strlen($dist) + 1);
    $raw = (string) file_get_contents($path);

    if (defined('TOKEN_PARSE')) {
        try {
            token_get_all($raw, TOKEN_PARSE);
        } catch (\ParseError $e) {
            fwrite(STDERR, "FAIL: Syntax error in {$rel}: " . $e->getMessage() . "\n");
            exit(1);
        }
    }

    if (strpos($rel, 'vendor/') !== 0 && strpos($rel, 'vendor-prefixed/') !== 0) {
        // Assert no raw unprefixed WPDev namespace references in code (including leading backslash and escaped string forms)
        if (preg_match('/(^|[^A-Za-z0-9_\\\\])\\\\?WPDev\\\\[A-Za-z0-9_]+/', $raw) ||
            preg_match('/(^|[^A-Za-z0-9_\\\\])(\\\\\\\\)?WPDev\\\\\\\\[A-Za-z0-9_]+/', $raw)) {
            fwrite(STDERR, "FAIL: Unprefixed WPDev namespace reference found in dist file {$rel}.\n");
            exit(1);
        }
    }
}

fwrite(STDOUT, "PASS: Dist correctness and scoping verified successfully.\n");
exit(0);
