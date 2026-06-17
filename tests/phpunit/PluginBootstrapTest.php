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
 *    the composer autoloader (and therefore WPDev\Core\Plugin).
 *  - A `plugins_loaded` action hook (or a direct call to
 *    `WPDev\Core\Plugin::boot()`) that wires the kit into WordPress.
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
            'Plugin bootstrap must pull in vendor/autoload.php so WPDev\\Core\\Plugin is reachable'
        );
    }

    /* ------------------------------------------------------------------ */
    /* Plugin boot wiring                                                 */
    /* ------------------------------------------------------------------ */

    public function test_template_wires_WPSK_Core_Plugin(): void
    {
        $source = $this->templateSource();
        // Either an `add_action('plugins_loaded', ...)` or a direct
        // WPDev\Core\Plugin::boot() call. We accept both forms.
        $hasAction = strpos($source, "add_action('plugins_loaded'") !== false
                  || strpos($source, 'add_action("plugins_loaded"') !== false;
        $hasBoot = strpos($source, 'WPDev\\Core\\Plugin::boot(') !== false
                || strpos($source, 'WPDev\Core\Plugin::boot(') !== false;
        $this->assertTrue(
            $hasAction || $hasBoot,
            'Plugin bootstrap must wire `add_action(\'plugins_loaded\', ...)` or call `WPDev\\Core\\Plugin::boot()`'
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

    /**
     * Pull a balanced `register_*_hook(__FILE__, X)` call out of the source
     * and return the second-argument expression as written (trimmed).
     *
     * Used by the signature-tightening tests below. The regex is permissive
     * about whitespace and quoting so any plausible PHP source passes:
     *
     *   register_activation_hook( __FILE__, [ 'X', 'Y' ] );
     *   register_activation_hook( __FILE__, "fn" );
     *
     * It is intentionally NOT permissive about leaving the call unbalanced —
     * we count `(` and `)` and require them to balance so the test cannot be
     * tricked by `register_activation_hook(__FILE__, "abc"` (no closing paren).
     */
    private function extractHookCallable(string $source, string $functionName): ?string
    {
        $pattern = '/' . preg_quote($functionName, '/') . '\s*\(\s*__FILE__\s*,\s*(.*)/s';
        if (!preg_match($pattern, $source, $m, PREG_OFFSET_CAPTURE)) {
            return null;
        }
        $rest = $m[1][0];
        $offset = $m[1][1];
        // Walk through `rest`, balancing parens/brackets and tracking
        // string/quoted states, until the closing paren of the call.
        // Note: `rest` starts AFTER the opening `(` of the function call and
        // AFTER `__FILE__,`, so $depth must start at 1 (one unclosed paren
        // already on the stack). When we hit the matching `)` it goes back
        // to 0 and we return the substring up to that point.
        $depth = 1;
        $depthBracket = 0;
        $inSingle = false;
        $inDouble = false;
        $prev = '';
        $len = strlen($rest);
        for ($i = 0; $i < $len; $i++) {
            $c = $rest[$i];
            if ($inSingle) {
                if ($c === "'" && $prev !== '\\') {
                    $inSingle = false;
                }
            } elseif ($inDouble) {
                if ($c === '"' && $prev !== '\\') {
                    $inDouble = false;
                }
            } else {
                if ($c === "'") {
                    $inSingle = true;
                } elseif ($c === '"') {
                    $inDouble = true;
                } elseif ($c === '(') {
                    $depth++;
                } elseif ($c === ')') {
                    $depth--;
                    if ($depth === 0) {
                        $arg = substr($rest, 0, $i);
                        return trim($arg);
                    }
                } elseif ($c === '[') {
                    $depthBracket++;
                } elseif ($c === ']') {
                    $depthBracket--;
                }
            }
            $prev = $c;
        }
        return null;
    }

    public function test_template_registers_activation_with_array_callable(): void
    {
        $arg = $this->extractHookCallable($this->templateSource(), 'register_activation_hook');
        $this->assertNotNull(
            $arg,
            'Plugin bootstrap must call register_activation_hook(__FILE__, <callable>)'
        );
        $this->assertMatchesRegularExpression(
            '/^\[\s*.+\s*,\s*.+\s*\]\s*$/s',
            $arg,
            "register_activation_hook's second arg must be a PHP array callable [Class|object, 'method']; got: {$arg}"
        );
    }

    public function test_template_registers_deactivation_with_array_callable(): void
    {
        $arg = $this->extractHookCallable($this->templateSource(), 'register_deactivation_hook');
        $this->assertNotNull(
            $arg,
            'Plugin bootstrap must call register_deactivation_hook(__FILE__, <callable>)'
        );
        $this->assertMatchesRegularExpression(
            '/^\[\s*.+\s*,\s*.+\s*\]\s*$/s',
            $arg,
            "register_deactivation_hook's second arg must be a PHP array callable [Class|object, 'method']; got: {$arg}"
        );
    }

    public function test_template_registers_uninstall_with_string_callable(): void
    {
        $arg = $this->extractHookCallable($this->templateSource(), 'register_uninstall_hook');
        $this->assertNotNull(
            $arg,
            'Plugin bootstrap must call register_uninstall_hook(__FILE__, <callable>)'
        );
        // Uninstall callbacks must be a *non-array* callable: a function name
        // (string identifier) or a static method name ("Class::method"). An
        // array callable [class, 'method'] is rejected by WP for the uninstall
        // hook because uninstall runs in a context where the autoloader may
        // not be reachable. The implementation may write either of:
        //   'function_name'                     → must NOT be an array
        //   'ClassName::method'                 → must NOT be an array
        $this->assertDoesNotMatchRegularExpression(
            '/^\s*\[/s',
            $arg,
            "register_uninstall_hook's second arg must NOT be an array callable; got: {$arg}"
        );
        // Must be a *string* literal (single or double quoted). The contents
        // may be a plain function name ("my_plugin_uninstall") or a static
        // method name ("My_Plugin::uninstall"), or — as in this scaffold —
        // a {{template_token}} that the project renderer will replace. We
        // accept anything that is a quoted string with at least one
        // identifier-like character.
        $this->assertMatchesRegularExpression(
            "/^['\"][^'\"]+['\"]\s*$/s",
            $arg,
            "register_uninstall_hook's second arg must be a quoted string callable; got: {$arg}"
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

    /**
     * Pull a `load_plugin_textdomain(<domain>, <relative>, <path>)` call out
     * of the template and return its three arguments as a 3-tuple of trimmed
     * strings. Returns null if no balanced call is found.
     *
     * WordPress's signature is:
     *   load_plugin_textdomain( string $domain, string|false $deprecated, string $plugin_rel_path = '' )
     *
     * The "deprecated" arg (#2) is the relative path flag — WP resolves the
     * .mo location relative to the plugin root when it's `false`. Modern WP
     * passes `false` so WP itself does the `plugin_dir_path(__FILE__)` work.
     */
    private function extractTextdomainCall(string $source): ?array
    {
        $pattern = '/load_plugin_textdomain\s*\(\s*(.*)/s';
        if (!preg_match($pattern, $source, $m)) {
            return null;
        }
        $rest = $m[1];
        // Split top-level args on top-level commas (not inside parens/brackets/strings).
        // `rest` starts AFTER the opening `(` of the function call, so $depth
        // starts at 1 (one unclosed paren already on the stack). Top-level
        // commas (depth===1) split args; closing `)` brings depth to 0 and
        // closes the call.
        $args = [];
        $buf = '';
        $depth = 1;
        $depthBracket = 0;
        $inSingle = false;
        $inDouble = false;
        $prev = '';
        $len = strlen($rest);
        for ($i = 0; $i < $len; $i++) {
            $c = $rest[$i];
            if ($inSingle) {
                if ($c === "'" && $prev !== '\\') {
                    $inSingle = false;
                }
                $buf .= $c;
            } elseif ($inDouble) {
                if ($c === '"' && $prev !== '\\') {
                    $inDouble = false;
                }
                $buf .= $c;
            } else {
                if ($c === "'") {
                    $inSingle = true;
                    $buf .= $c;
                } elseif ($c === '"') {
                    $inDouble = true;
                    $buf .= $c;
                } elseif ($c === '(' || $c === '[') {
                    if ($c === '(') {
                        $depth++;
                    } else {
                        $depthBracket++;
                    }
                    $buf .= $c;
                } elseif ($c === ')' || $c === ']') {
                    if ($c === ')') {
                        $depth--;
                        if ($depth === 0) {
                            // Closing paren of the call — push last buf and stop.
                            $args[] = trim($buf);
                            return $args;
                        }
                    } else {
                        $depthBracket--;
                    }
                    $buf .= $c;
                } elseif ($c === ',' && $depth === 1 && $depthBracket === 0) {
                    $args[] = trim($buf);
                    $buf = '';
                } else {
                    $buf .= $c;
                }
            }
            $prev = $c;
        }
        return null;
    }

    public function test_template_load_plugin_textdomain_uses_false_relative_path(): void
    {
        $args = $this->extractTextdomainCall($this->templateSource());
        $this->assertIsArray(
            $args,
            'Plugin bootstrap must call load_plugin_textdomain(<domain>, <relative>, <path>)'
        );
        $this->assertCount(
            3,
            $args,
            'load_plugin_textdomain call must pass exactly 3 arguments (domain, relative, path)'
        );
        $this->assertSame(
            'false',
            strtolower($args[1]),
            "load_plugin_textdomain's 2nd argument must be `false` (WordPress resolves the plugin-relative .mo path itself); got: {$args[1]}"
        );
    }

    public function test_template_load_plugin_textdomain_path_uses_plugin_basename_dirname(): void
    {
        $args = $this->extractTextdomainCall($this->templateSource());
        $this->assertIsArray(
            $args,
            'Plugin bootstrap must call load_plugin_textdomain(<domain>, <relative>, <path>)'
        );
        $this->assertCount(
            3,
            $args,
            'load_plugin_textdomain call must pass exactly 3 arguments (domain, relative, path)'
        );
        $this->assertStringContainsString(
            'dirname',
            $args[2],
            "load_plugin_textdomain's 3rd argument must call `dirname(...)` to resolve the plugin-relative path; got: {$args[2]}"
        );
        $this->assertStringContainsString(
            'plugin_basename',
            $args[2],
            "load_plugin_textdomain's 3rd argument must call `plugin_basename(__FILE__)` to anchor the path to this plugin; got: {$args[2]}"
        );
        $this->assertStringContainsString(
            '__FILE__',
            $args[2],
            "load_plugin_textdomain's 3rd argument must reference `__FILE__` so the path resolves relative to the plugin root; got: {$args[2]}"
        );
        $this->assertStringContainsString(
            '/languages',
            $args[2],
            "load_plugin_textdomain's 3rd argument must end with `/languages`; got: {$args[2]}"
        );
    }

    public function test_template_load_plugin_textdomain_uses_textDomain_token(): void
    {
        $args = $this->extractTextdomainCall($this->templateSource());
        $this->assertIsArray(
            $args,
            'Plugin bootstrap must call load_plugin_textdomain(<domain>, <relative>, <path>)'
        );
        $this->assertStringContainsString(
            '{{textDomain}}',
            $args[0],
            "load_plugin_textdomain's 1st argument (the text domain) must be the {{textDomain}} template token; got: {$args[0]}"
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
