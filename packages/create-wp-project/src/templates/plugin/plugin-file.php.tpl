<?php
/**
 * Plugin Name:       {{name}}
 * Plugin URI:        {{pluginUri}}
 * Description:       {{description}}
 * Version:           0.1.0
 * Requires at least: {{wpMinVersion}}
 * Requires PHP:      {{phpMinVersion}}
 * Author:            {{author}}
 * Author URI:        {{authorUri}}
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       {{textDomain}}
 * Domain Path:       /languages
 *
 * @package {{slug}}
 */

/*
 * -----------------------------------------------------------------------------
 * Bootstrap guard
 * -----------------------------------------------------------------------------
 * WordPress will only load this file once. The ABSPATH guard prevents the
 * plugin file from being opened directly in a browser, which is a security
 * requirement of the WordPress.org plugin review team.
 */
defined( 'ABSPATH' ) || exit;

/*
 * -----------------------------------------------------------------------------
 * Plugin constants
 * -----------------------------------------------------------------------------
 * These constants are derived from project.config.json (slug, textDomain,
 * hookPrefix, phpFunctionPrefix) and are available to every feature module
 * loaded by this plugin.
 */
if ( ! defined( '{{slug_underscore}}_VERSION' ) ) {
    define( '{{slug_underscore}}_VERSION', '0.1.0' );
}
if ( ! defined( '{{slug_underscore}}_PLUGIN_FILE' ) ) {
    define( '{{slug_underscore}}_PLUGIN_FILE', __FILE__ );
}
if ( ! defined( '{{slug_underscore}}_PLUGIN_DIR' ) ) {
    define( '{{slug_underscore}}_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
}

/*
 * -----------------------------------------------------------------------------
 * Composer autoloaders (scoped vendor FIRST)
 * -----------------------------------------------------------------------------
 * Strauss writes prefixed classes to vendor-prefixed/. Load that tree
 * before vendor/autoload.php so co-installed plugins sharing a dependency
 * cannot fatal on class redeclaration.
 */
$scoped_autoload = __DIR__ . '/vendor-prefixed/autoload.php';
$vendor_autoload = __DIR__ . '/vendor/autoload.php';

if ( is_readable( $scoped_autoload ) ) {
    require_once $scoped_autoload;
}

if ( is_readable( $vendor_autoload ) ) {
    require_once $vendor_autoload;
} elseif ( ! is_readable( $scoped_autoload ) ) {
    add_action( 'admin_notices', function (): void {
        echo '<div class="error"><p>' . esc_html__( '{{name}} requires Composer. Run `composer install` in the plugin directory.', '{{textDomain}}' ) . '</p></div>';
    } );
    return;
}

/*
 * -----------------------------------------------------------------------------
 * Lifecycle: activation / deactivation / uninstall
 * -----------------------------------------------------------------------------
 * Each hook is wired to a stub callback in the project's own namespace.
 * The stubs are intentionally tiny — extend them in src/Modules/ when you
 * add the first real feature.
 */
register_activation_hook(
    __FILE__,
    [ '{{slug_underscore}}_on_activate', 'handle' ]
);
register_deactivation_hook(
    __FILE__,
    [ '{{slug_underscore}}_on_deactivate', 'handle' ]
);
register_uninstall_hook(
    __FILE__,
    '{{slug_underscore}}_on_uninstall'
);

if ( ! class_exists( '{{slug_underscore}}_on_activate' ) ) {
    /**
     * Activation stub. Runs on register_activation_hook.
     *
     * Common duties: flush rewrite rules, set default options, prime
     * capability roles. Replace the body in your own module, not here.
     */
    class {{slug_underscore}}_on_activate {
        public static function handle(): void {
            // Activation work goes here. Keep idempotent.
        }
    }
}

if ( ! class_exists( '{{slug_underscore}}_on_deactivate' ) ) {
    /**
     * Deactivation stub. Runs on register_deactivation_hook. Note:
     * deactivation is *not* uninstall — user data must survive.
     */
    class {{slug_underscore}}_on_deactivate {
        public static function handle(): void {
            // Deactivation work goes here. Keep idempotent.
        }
    }
}

if ( ! function_exists( '{{slug_underscore}}_on_uninstall' ) ) {
    /**
     * Uninstall handler. Runs when the user deletes the plugin from the
     * WordPress admin. This is the only hook that is allowed to drop
     * database tables and delete options.
     */
    function {{slug_underscore}}_on_uninstall(): void {
        // Uninstall work goes here. Drop tables, delete options.
    }
}

/*
 * -----------------------------------------------------------------------------
 * Translation loading
 * -----------------------------------------------------------------------------
 * Translations live under <plugin>/languages/{textDomain}-{locale}.mo and
 * are loaded from the *plugin* directory — never the theme. The relative
 * path argument to load_plugin_textdomain is `false` because we want WP to
 * resolve it relative to the plugin's languages directory using
 * plugin_dir_path(__FILE__) below.
 */
add_action( 'init', '{{slug_underscore}}_load_textdomain' );
function {{slug_underscore}}_load_textdomain(): void {
    load_plugin_textdomain(
        '{{textDomain}}',
        false,
        dirname( plugin_basename( __FILE__ ) ) . '/languages'
    );
}

/*
 * -----------------------------------------------------------------------------
 * Wire WPDev\Core\Plugin
 * -----------------------------------------------------------------------------
 * The static facade is responsible for:
 *   - reading project.config.json (from the plugin root, not the theme),
 *   - building a ModuleLoader from any src/Modules/* that registers itself,
 *   - hooking `plugins_loaded` (priority 10) and `init` (priority 10),
 *   - firing the `{$hookPrefix}_plugin_loaded` action.
 *
 * Phase 11 of wp-starter-kit promotes this pattern: every project is a
 * plugin, the WPDev namespace owns the boot sequence, and theme functions
 * are kept strictly for backward compatibility (see functions.php for the
 * deprecation note).
 */
add_action( 'plugins_loaded', 'WPDev\\Core\\Plugin::boot', 10, 0 );
// Direct call as a safety net for environments where plugins_loaded has
// already fired (e.g. wp-cli, unit tests, and most test runners).
if ( class_exists( 'WPDev\\Core\\Plugin' ) && did_action( 'plugins_loaded' ) ) {
    WPDev\Core\Plugin::boot();
}
