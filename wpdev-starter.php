<?php
/**
 * Plugin Name:       WPDev Starter
 * Plugin URI:        https://github.com/abolfazl-moeini/wp-plugin-starter-kit
 * Description:       WordPress plugin starter kit — modular monolith reference implementation.
 * Version:           1.1.1
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            wp-starter-kit
 * Author URI:        https://github.com/abolfazl-moeini/wp-plugin-starter-kit
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wpdev-starter
 * Domain Path:       /languages
 *
 * @package wpdev-starter
 */

defined( 'ABSPATH' ) || exit;

if ( defined( 'WPDEV_STARTER_LOADED' ) ) {
	return;
}
define( 'WPDEV_STARTER_LOADED', true );

if ( ! defined( 'WPDEV_STARTER_VERSION' )) {
	define( 'WPDEV_STARTER_VERSION', '1.1.1' );
}
if ( ! defined( 'WPDEV_STARTER_PLUGIN_FILE' )) {
	define( 'WPDEV_STARTER_PLUGIN_FILE', __FILE__ );
}
if ( ! defined( 'WPDEV_STARTER_PLUGIN_DIR' )) {
	define( 'WPDEV_STARTER_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
}

$autoloadCandidates = [
	__DIR__ . '/vendor-prefixed/autoload.php',
	__DIR__ . '/vendor/autoload.php',
];

foreach ($autoloadCandidates as $autoload) {
	if (is_file( $autoload )) {
		require_once $autoload;
	}
}

// Inform Assets of the plugin root so path/URL resolution works correctly
// regardless of whether the framework lives in packages/ (dev) or vendor/ (Composer).
if ( class_exists( 'WPDev\\Support\\Assets' ) ) {
	\WPDev\Support\Assets::set_plugin_dir(
		WPDEV_STARTER_PLUGIN_DIR,
		plugins_url( '', WPDEV_STARTER_PLUGIN_FILE )
	);
	// Shared vendors (handle: preact) — first registrant wins across plugins.
	add_action(
		'init',
		static function (): void {
			\WPDev\Support\Assets::register_vendor_scripts();
		},
		1,
		0
	);
}

if ( class_exists( 'WPDev\\Core\\Plugin' ) ) {
	\WPDev\Core\Plugin::set_plugin_dir( WPDEV_STARTER_PLUGIN_DIR );
}

if ( ! class_exists( 'WPDev\\Core\\Plugin' )) {
	add_action(
		'admin_notices',
		static function (): void {
			echo '<div class="error"><p>' .
			esc_html__( 'WPDev Starter requires Composer. Run `composer install` in the plugin directory.', 'wpdev-starter' ) .
			'</p></div>';
		}
	);
	return;
}

register_activation_hook( __FILE__, [ 'wpdev_starter_on_activate', 'handle' ] );
register_deactivation_hook( __FILE__, [ 'wpdev_starter_on_deactivate', 'handle' ] );
register_uninstall_hook( __FILE__, 'wpdev_starter_on_uninstall' );

if ( ! class_exists( 'wpdev_starter_on_activate' )) {
	class wpdev_starter_on_activate {
		public static function handle(): void {
			// Activation stub — extend in your modules.
		}
	}
}

if ( ! class_exists( 'wpdev_starter_on_deactivate' )) {
	class wpdev_starter_on_deactivate {
		public static function handle(): void {
			// Deactivation stub.
		}
	}
}

if ( ! function_exists( 'wpdev_starter_on_uninstall' )) {
	function wpdev_starter_on_uninstall(): void {
		// Uninstall stub.
	}
}

add_action( 'init', 'wpdev_starter_load_textdomain', 1 );
if ( ! function_exists( 'wpdev_starter_load_textdomain' ) ) {
	function wpdev_starter_load_textdomain(): void {
		load_plugin_textdomain(
			'wpdev-starter',
			false,
			dirname( plugin_basename( __FILE__ ) ) . '/languages'
		);
	}
}

/**
 * Register every feature module on the active Plugin loader.
 *
 * Exposed as a named function (rather than an inline closure) so the
 * late-load fallback below — which fires when `wpdev-starter.php` is
 * included AFTER `plugins_loaded` has already happened (mu-plugins,
 * wp-cli, test bootstrap) — can re-run registration. An inline
 * closure cannot be called a second time by name; a function can.
 */
if ( ! function_exists( 'wpdev_starter_register_modules' ) ) {
	function wpdev_starter_register_modules(): void {
		if ( ! class_exists( 'WPDev\\Core\\Plugin' ) ) {
			return;
		}
		$loader = WPDev\Core\Plugin::loader();
		if ( class_exists( 'WPDev\\Modules\\ExampleFeature\\Module' ) ) {
			$loader->register( new WPDev\Modules\ExampleFeature\Module() );
		}
		if ( class_exists( 'WPDev\\Modules\\McpAbilities\\Module' ) ) {
			$loader->register( new WPDev\Modules\McpAbilities\Module() );
		}
	}
}

add_action( 'plugins_loaded', 'wpdev_starter_register_modules', 5 );
add_action(
	'plugins_loaded',
	static function (): void {
		\WPDev\Core\Plugin::boot( WPDEV_STARTER_PLUGIN_DIR . 'wpdev.json' );
	},
	10,
	0
);

if (
	did_action( 'plugins_loaded' )
	&& ! ( defined( 'WP_SANDBOX_SCRAPING' ) && WP_SANDBOX_SCRAPING )
) {
	// Late load: wpdev-starter.php was included after `plugins_loaded`
	// already fired, so the add_action() calls above are too late to
	// run. Re-run both halves of the normal flow so the plugin still
	// boots: register the modules FIRST, then run Plugin::boot()
	// (which will trigger on_plugins_loaded and boot all registered modules).
	\WPDev\Core\Plugin::set_plugin_dir( WPDEV_STARTER_PLUGIN_DIR );
	wpdev_starter_register_modules();
	\WPDev\Core\Plugin::boot( WPDEV_STARTER_PLUGIN_DIR . 'wpdev.json' );
}
