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
 * Domain Path:       /languages{{requiresPluginsHeader}}
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
 * PHP version gate (runtime — Composer platform-check is disabled)
 * -----------------------------------------------------------------------------
 * Enforce Requires PHP here so hosts can still `composer install` on a
 * newer CLI while WordPress runs on an older PHP (or the reverse).
 * Keep this block free of modern PHP syntax so it can fail gracefully.
 */
if ( ! defined( '{{slug_constant}}_PHP_MIN' ) ) {
	define( '{{slug_constant}}_PHP_MIN', '{{phpMinVersion}}' );
}

if ( version_compare( PHP_VERSION, {{slug_constant}}_PHP_MIN, '<' ) ) {
	/**
	 * @return void
	 */
	function {{slug_underscore}}_php_version_notice() {
		if ( function_exists( 'current_user_can' ) && ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		printf(
			'<div class="notice notice-error"><p>%s</p></div>',
			esc_html(
				sprintf(
					/* translators: 1: plugin name, 2: required PHP version, 3: running PHP version */
					__( '%1$s requires PHP %2$s or higher. This site is running PHP %3$s.', '{{textDomain}}' ),
					'{{name}}',
					{{slug_constant}}_PHP_MIN,
					PHP_VERSION
				)
			)
		);
	}
	add_action( 'admin_notices', '{{slug_underscore}}_php_version_notice' );

	register_activation_hook(
		__FILE__,
		static function () {
			if ( function_exists( 'deactivate_plugins' ) ) {
				deactivate_plugins( plugin_basename( __FILE__ ) );
			}
			wp_die(
				esc_html(
					sprintf(
						/* translators: 1: plugin name, 2: required PHP version, 3: running PHP version */
						__( '%1$s requires PHP %2$s or higher. This site is running PHP %3$s.', '{{textDomain}}' ),
						'{{name}}',
						{{slug_constant}}_PHP_MIN,
						PHP_VERSION
					)
				),
				esc_html__( 'Plugin activation error', '{{textDomain}}' ),
				array( 'back_link' => true )
			);
		}
	);

	// Do not load autoloaders or the rest of the plugin.
	return;
}

/*
 * -----------------------------------------------------------------------------
 * Plugin constants
 * -----------------------------------------------------------------------------
 * These constants are derived from project.config.json (slug, textDomain,
 * hookPrefix, phpFunctionPrefix) and are available to every feature module
 * loaded by this plugin.
 */
if ( ! defined( '{{slug_constant}}_VERSION' ) ) {
    define( '{{slug_constant}}_VERSION', '0.1.0' );
}
if ( ! defined( '{{slug_constant}}_PLUGIN_FILE' ) ) {
    define( '{{slug_constant}}_PLUGIN_FILE', __FILE__ );
}
if ( ! defined( '{{slug_constant}}_PLUGIN_DIR' ) ) {
    define( '{{slug_constant}}_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
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
{{wpdevDependencyCheck}}
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
add_action( 'init', '{{slug_underscore}}_load_textdomain', 1 );
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
 * Module registration: composer autoload files hook plugins_loaded @ 5.
 * Plugin::boot @ 10; module boot_all @ 11 (inside Plugin — must not be 10).
 * set_plugin_dir so wpdev.json / Assets resolve from the plugin root, not
 * packages/framework/.
 */
add_action(
    'plugins_loaded',
    static function (): void {
        if ( ! class_exists( \WPDev\Core\Plugin::class ) ) {
            return;
        }
        if ( defined( '{{slug_constant}}_PLUGIN_DIR' ) ) {
            \WPDev\Core\Plugin::set_plugin_dir( {{slug_constant}}_PLUGIN_DIR );
            if (
                class_exists( \WPDev\Support\Assets::class ) &&
                defined( '{{slug_constant}}_PLUGIN_FILE' )
            ) {
                \WPDev\Support\Assets::set_plugin_dir(
                    {{slug_constant}}_PLUGIN_DIR,
                    plugins_url( '', {{slug_constant}}_PLUGIN_FILE )
                );
            }
        }
        \WPDev\Core\Plugin::boot();
    },
    10,
    0
);
// Safety net when plugins_loaded already fired (CLI / unit tests).
if ( class_exists( \WPDev\Core\Plugin::class ) && did_action( 'plugins_loaded' ) ) {
    if ( defined( '{{slug_constant}}_PLUGIN_DIR' ) ) {
        \WPDev\Core\Plugin::set_plugin_dir( {{slug_constant}}_PLUGIN_DIR );
        if (
            class_exists( \WPDev\Support\Assets::class ) &&
            defined( '{{slug_constant}}_PLUGIN_FILE' )
        ) {
            \WPDev\Support\Assets::set_plugin_dir(
                {{slug_constant}}_PLUGIN_DIR,
                plugins_url( '', {{slug_constant}}_PLUGIN_FILE )
            );
        }
    }
    \WPDev\Core\Plugin::boot();
    \WPDev\Core\Plugin::loader()->boot_all();
}
