<?php
/**
 * WPDev activation and deactivation hooks
 *
 * @package WPDev
 * @subpackage Hooks
 * @since 2.0.0
 */

namespace WPDevFramework;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * WPDev activation and deactivation hooks
 *
 * @since 2.0.0
 */
class Hooks {

	/**
	 * Static-only class.
	 */
	private function __construct() {} // end __construct;

	/**
	 * Register the activation and deactivation hooks
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function init() {

		/**
		 * In library mode the host plugin owns activation hooks.
		 */
		$is_library = ( defined( 'WPDEV_LIBRARY_MODE' ) && WPDEV_LIBRARY_MODE )
			|| ( function_exists( 'wpdev_is_library_mode' ) && wpdev_is_library_mode() );

		if ( ! $is_library ) {

			/**
			 * Runs on WPDev activation
			 */
			register_activation_hook(WPDEV_PLUGIN_FILE, array('WPDevFramework\Hooks', 'on_activation'));

			/**
			 * Runs on WPDev deactivation
			 */
			register_deactivation_hook(WPDEV_PLUGIN_FILE, array('WPDevFramework\Hooks', 'on_deactivation'));

		} // end if;

		/**
		 * Runs the activation hook.
		 */
		add_action('plugins_loaded', array('WPDevFramework\Hooks', 'on_activation_do'), 1);

		/**
		 * Plugins.php action links registered via {@see wpdev_register_plugin_settings_link()}.
		 */
		add_filter( 'plugin_action_links', array( __CLASS__, 'filter_plugin_action_links' ), 10, 2 );

		/**
		 * Boot central database migration manager and WP-CLI commands.
		 */
		if ( class_exists( '\WPDevFramework\Database\Migration\Migration_Manager' ) ) {
			\WPDevFramework\Database\Migration\Migration_Manager::boot();
		} elseif ( function_exists( 'add_action' ) ) {
			add_action( 'plugins_loaded', static function() {
				if ( class_exists( '\WPDevFramework\Database\Migration\Migration_Manager' ) ) {
					\WPDevFramework\Database\Migration\Migration_Manager::boot();
				}
			}, 20 );
		}

	} // end init;

	/**
	 * Inject registered Settings links on the Plugins screen.
	 *
	 * @since 2.8.6
	 *
	 * @param array<string, string> $links Plugin action links.
	 * @param string                $file  Plugin basename.
	 * @return array<string, string>
	 */
	public static function filter_plugin_action_links( $links, $file ) {

		$registry = isset( $GLOBALS['wpdev_plugin_settings_links'] ) && is_array( $GLOBALS['wpdev_plugin_settings_links'] )
			? $GLOBALS['wpdev_plugin_settings_links']
			: array();

		/**
		 * Filter the map of plugin basename => settings link config.
		 *
		 * @since 2.8.6
		 *
		 * @param array<string, array{url:string,label:string}> $registry Registered links.
		 */
		$registry = apply_filters( 'wpdev_plugin_settings_links', $registry );

		if ( ! is_array( $registry ) || ! isset( $registry[ $file ] ) || ! is_array( $registry[ $file ] ) ) {
			return $links;
		}

		$entry = $registry[ $file ];
		$url   = isset( $entry['url'] ) ? (string) $entry['url'] : '';
		$label = isset( $entry['label'] ) ? (string) $entry['label'] : '';
		if ( '' === $label ) {
			// Translate here (plugins.php / after init), not at registration time.
			$label = __( 'Settings', 'wpdev' );
		}

		if ( '' === $url ) {
			return $links;
		}

		// Prepend so it sits near Deactivate / Edit.
		$links = array_merge(
			array(
				'settings' => sprintf(
					'<a href="%s">%s</a>',
					esc_url( $url ),
					esc_html( $label )
				),
			),
			is_array( $links ) ? $links : array()
		);

		return $links;

	} // end filter_plugin_action_links;

	/**
	 *  Runs when WPDev is activated
	 *
	 * @since 1.9.6 It now uses hook-based approach, it is up to each sub-class to attach their own routines.
	 * @since 1.2.0
	 */
	public static function on_activation() {

//		wpdev_log_add('wpdev-core', __('Activating WPDev...', 'wpdev'));

		/*
		 * Set the activation flag
		 */
		update_network_option(null, 'wpdev_activation', 'yes');

	} // end on_activation;

	/**
	 * Runs whenever the activation flag is set.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function on_activation_do() {

		if ( ! function_exists( 'wpdev_request' ) ) {
			return;
		}

		if (get_network_option(null, 'wpdev_activation') === 'yes' && wpdev_request('activate')) {

			// Removes the flag
			delete_network_option(null, 'wpdev_activation');

			/**
			 * Let other parts of the plugin attach their routines for activation
			 *
			 * @since 1.9.6
			 * @return void
			 */
			do_action('wpdev_activation');

		} // end if;

	} // end on_activation_do;

	/**
	 * Runs when WPDev is deactivated
	 *
	 * @since 1.9.6 It now uses hook-based approach, it is up to each sub-class to attach their own routines.
	 * @since 1.2.0
	 */
	public static function on_deactivation() {

		if ( function_exists( 'WPDevFramework\wpdev_log_add' ) ) {
			wpdev_log_add('wpdev-core', __('Deactivating WPDev...', 'wpdev'));
		} elseif ( function_exists( 'wpdev_log_add' ) ) {
			\wpdev_log_add('wpdev-core', __('Deactivating WPDev...', 'wpdev'));
		}

		/**
		 * Let other parts of the plugin attach their routines for deactivation
		 *
		 * @since 1.9.6
		 * @return void
		 */
		do_action('wpdev_deactivation');

	} // end on_deactivation;

} // end class Hooks;
