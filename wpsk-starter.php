<?php
/**
 * Plugin Name:       WPSK Starter
 * Plugin URI:        https://github.com/abolfazl-moeini/wp-plugin-starter-kit
 * Description:       WordPress plugin starter kit — modular monolith reference implementation.
 * Version:           0.1.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            wp-starter-kit
 * Author URI:        https://github.com/abolfazl-moeini/wp-plugin-starter-kit
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wpsk-starter
 * Domain Path:       /languages
 *
 * @package wpsk-starter
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'WPSK_STARTER_VERSION' )) {
	define( 'WPSK_STARTER_VERSION', '0.1.0' );
}
if ( ! defined( 'WPSK_STARTER_PLUGIN_FILE' )) {
	define( 'WPSK_STARTER_PLUGIN_FILE', __FILE__ );
}
if ( ! defined( 'WPSK_STARTER_PLUGIN_DIR' )) {
	define( 'WPSK_STARTER_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
}

$autoloadCandidates = [
	__DIR__ . '/vendor-prefixed/autoload.php',
	__DIR__ . '/vendor/autoload.php',
];

foreach ($autoloadCandidates as $autoload) {
	if (is_file( $autoload )) {
		require_once $autoload;
		break;
	}
}

if ( ! class_exists( 'WPSK\\Core\\Plugin' )) {
	add_action(
		'admin_notices',
		static function (): void {
			echo '<div class="error"><p>' .
			esc_html__( 'WPSK Starter requires Composer. Run `composer install` in the plugin directory.', 'wpsk-starter' ) .
			'</p></div>';
		}
	);
	return;
}

register_activation_hook( __FILE__, [ 'wpsk_starter_on_activate', 'handle' ] );
register_deactivation_hook( __FILE__, [ 'wpsk_starter_on_deactivate', 'handle' ] );
register_uninstall_hook( __FILE__, 'wpsk_starter_on_uninstall' );

if ( ! class_exists( 'wpsk_starter_on_activate' )) {
	class wpsk_starter_on_activate {
		public static function handle(): void {
			// Activation stub — extend in your modules.
		}
	}
}

if ( ! class_exists( 'wpsk_starter_on_deactivate' )) {
	class wpsk_starter_on_deactivate {
		public static function handle(): void {
			// Deactivation stub.
		}
	}
}

if ( ! function_exists( 'wpsk_starter_on_uninstall' )) {
	function wpsk_starter_on_uninstall(): void {
		// Uninstall stub.
	}
}

add_action( 'init', 'wpsk_starter_load_textdomain' );
function wpsk_starter_load_textdomain(): void {
	load_plugin_textdomain(
		'wpsk-starter',
		false,
		dirname( plugin_basename( __FILE__ ) ) . '/languages'
	);
}

add_action(
	'plugins_loaded',
	static function (): void {
		WPSK\Core\Plugin::loader()->register( new WPSK\Modules\ExampleFeature\Module() );
	},
	5
);

add_action( 'plugins_loaded', 'WPSK\\Core\\Plugin::boot', 10, 0 );

if (did_action( 'plugins_loaded' )) {
	WPSK\Core\Plugin::boot();
}
