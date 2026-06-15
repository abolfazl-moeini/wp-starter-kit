<?php

use PHPUnit\Framework\TestCase;

/**
 * Tests for the scaffolded `{slug}.php` plugin bootstrap template.
 *
 * These tests assert that the template file shipped under
 * `packages/create-wp-project/src/templates/plugin/plugin-file.php.tpl`
 * contains every piece a WordPress.org plugin file is expected to
 * ship in Phase 11:
 *
 *  - Plugin Name / Version / Requires PHP / Text Domain headers.
 *  - `defined('ABSPATH') || exit;` guard at the top of the file.
 *  - `require_once __DIR__ . '/vendor/autoload.php';` to pull in
 *    the composer autoloader (and therefore WPSK\Core\Plugin).
 *  - A `plugins_loaded` action hook (or a direct call to
 *    `WPSK\Core\Plugin::boot()`) that wires the kit into WordPress.
 *  - `register_activation_hook`, `register_deactivation_hook`,
 *    `register_uninstall_hook` so the plugin participates in the
 *    WordPress lifecycle.
 *  - `load_plugin_textdomain(..., plugin_dir_path(__FILE__) . 'languages')`
 *    so translations live under the plugin, not the theme.
 *  - **No** `get_template_directory` or `after_setup_theme` calls
 *    (the kit is plugin-first; theme bootstrap is deprecated).
 *
 * The template is loaded as a plain string and inspected with
 * `assertStringContainsString` / `assertStringNotContainsString`,
 * which is enough to prove the RED→GREEN contract: the test file
 * fails before the template is written and passes once it is.
 */
class PluginBootstrapTest extends TestCase
{
    /**
     * Absolute path to the template file under test.
     */
    private function templatePath(): string
    {
        // This test file lives at tests/phpunit/PluginBootstrapTest.php,
        // so the wp-starter-kit root is dirname(__DIR__, 2).
        $root = dirname(__DIR__, 2);
        return $root . '/packages/create-wp-project/src/templates/plugin/plugin-file.php.tpl';
    }

    /**
     * Read the template contents once per test. The template file is
     * plain text so `file_get_contents` is sufficient — no PHP parsing
     * is needed (and is in fact undesirable, because the template
     * contains `{{token}}` placeholders).
     */
    private function templateSource(): string
    {
        $path = $this->templatePath();
        $this->assertFileExists(
            $path,
            "Plugin bootstrap template must exist at {$path} — write it under packages/create-wp-project/src/templates/plugin/plugin-file.php.tpl"
        );
        $contents = file_get_contents($path);
        $this->assertNotFalse(
            $contents,
            "Plugin bootstrap template at {$path} must be readable"
        );
        return $contents;
    }

    public function test_template_file_exists(): void
    {
        $this->assertFileExists(
            $this->templatePath(),
            'packages/create-wp-project/src/templates/plugin/plugin-file.php.tpl must be created by the GREEN step'
        );
    }

    /* ------------------------------------------------------------------ */
    /* Plugin file headers (WordPress.org requirement)                    */
    /* ------------------------------------------------------------------ */

    public function test_template_contains_Plugin_Name_header(): void
    {
        $this->assertStringContainsString(
            'Plugin Name:',
            $this->templateSource(),
            'WordPress.org requires a "Plugin Name:" header in the plugin bootstrap file'
        );
    }

    public function test_template_contains_Version_header(): void
    {
        $this->assertStringContainsString(
            'Version:',
            $this->templateSource(),
            'WordPress.org requires a "Version:" header in the plugin bootstrap file'
        );
    }

    public function test_template_contains_Requires_PHP_header(): void
    {
        $this->assertStringContainsString(
            'Requires PHP:',
            $this->templateSource(),
            'WordPress.org requires a "Requires PHP:" header in the plugin bootstrap file'
        );
    }

    public function test_template_contains_Text_Domain_header(): void
    {
        $this->assertStringContainsString(
            'Text Domain:',
            $this->templateSource(),
            'WordPress.org requires a "Text Domain:" header in the plugin bootstrap file'
        );
    }

    /* ------------------------------------------------------------------ */
    /* ABSPATH guard                                                       */
    /* ------------------------------------------------------------------ */

    public function test_template_contains_ABSPATH_guard(): void
    {
        $source = $this->templateSource();
        // The test is whitespace-tolerant so a template may freely write
        // `defined( 'ABSPATH' ) || exit;` or `defined('ABSPATH')||exit;`.
        $this->assertMatchesRegularExpression(
            "/defined\s*\(\s*['\"]ABSPATH['\"]\s*\)/",
            $source,
            'Plugin bootstrap must contain a defined(\'ABSPATH\') guard'
        );
        $this->assertStringContainsString(
            'exit',
            $source,
            'Plugin bootstrap ABSPATH guard must include `exit;` (no alternative path)'
        );
    }

    /* ------------------------------------------------------------------ */
    /* Autoloader                                                         */
    /* ------------------------------------------------------------------ */

    public function test_template_requires_vendor_autoload(): void
    {
        $source = $this->templateSource();
        $this->assertStringContainsString(
            'require_once',
            $source,
            'Plugin bootstrap must require_once the composer autoloader'
        );
        $this->assertStringContainsString(
            'vendor/autoload.php',
            $source,
            'Plugin bootstrap must pull in vendor/autoload.php so WPSK\\Core\\Plugin is reachable'
        );
    }

    /* ------------------------------------------------------------------ */
    /* Plugin boot wiring                                                 */
    /* ------------------------------------------------------------------ */

    public function test_template_wires_WPSK_Core_Plugin(): void
    {
        $source = $this->templateSource();
        // Either an `add_action('plugins_loaded', ...)` or a direct
        // WPSK\Core\Plugin::boot() call. We accept both forms.
        $hasAction = strpos($source, "add_action('plugins_loaded'") !== false
                  || strpos($source, 'add_action("plugins_loaded"') !== false;
        $hasBoot = strpos($source, 'WPSK\\Core\\Plugin::boot(') !== false
                || strpos($source, 'WPSK\Core\Plugin::boot(') !== false;
        $this->assertTrue(
            $hasAction || $hasBoot,
            'Plugin bootstrap must wire `add_action(\'plugins_loaded\', ...)` or call `WPSK\\Core\\Plugin::boot()`'
        );
    }

    /* ------------------------------------------------------------------ */
    /* Plugin lifecycle hooks                                             */
    /* ------------------------------------------------------------------ */

    public function test_template_contains_register_activation_hook(): void
    {
        $this->assertStringContainsString(
            'register_activation_hook',
            $this->templateSource(),
            'Plugin bootstrap must call register_activation_hook for the WP lifecycle'
        );
    }

    public function test_template_contains_register_deactivation_hook(): void
    {
        $this->assertStringContainsString(
            'register_deactivation_hook',
            $this->templateSource(),
            'Plugin bootstrap must call register_deactivation_hook for the WP lifecycle'
        );
    }

    public function test_template_contains_register_uninstall_hook(): void
    {
        $this->assertStringContainsString(
            'register_uninstall_hook',
            $this->templateSource(),
            'Plugin bootstrap must call register_uninstall_hook for the WP lifecycle'
        );
    }

    /* ------------------------------------------------------------------ */
    /* Text domain                                                         */
    /* ------------------------------------------------------------------ */

    public function test_template_loads_text_domain_from_plugin_path(): void
    {
        $source = $this->templateSource();
        $this->assertStringContainsString(
            'load_plugin_textdomain',
            $source,
            'Plugin bootstrap must call load_plugin_textdomain to register the .mo files'
        );
        $this->assertStringContainsString(
            'plugin_dir_path(__FILE__)',
            $source,
            'load_plugin_textdomain path must be anchored to the *plugin* directory, not the theme'
        );
        $this->assertStringContainsString(
            '/languages',
            $source,
            'Translations must live under <plugin>/languages/'
        );
    }

    /* ------------------------------------------------------------------ */
    /* Theme-agnostic guards                                               */
    /* ------------------------------------------------------------------ */

    public function test_template_does_not_use_get_template_directory(): void
    {
        $this->assertStringNotContainsString(
            'get_template_directory',
            $this->templateSource(),
            'Plugin bootstrap must not call get_template_directory() — the kit is plugin-first'
        );
    }

    public function test_template_does_not_use_after_setup_theme(): void
    {
        $this->assertStringNotContainsString(
            'after_setup_theme',
            $this->templateSource(),
            'Plugin bootstrap must not register an after_setup_theme hook — theme bootstrap is deprecated'
        );
    }
}
