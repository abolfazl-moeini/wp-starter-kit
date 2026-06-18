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
	 * Runs on WPDev activation
	 */
		register_activation_hook(WPDEV_PLUGIN_FILE, array('WPDevFramework\Hooks', 'on_activation'));

		/**
		 * Runs on WPDev deactivation
		 */
		register_deactivation_hook(WPDEV_PLUGIN_FILE, array('WPDevFramework\Hooks', 'on_deactivation'));

		/**
		 * Runs the activation hook.
		 */
		add_action('plugins_loaded', array('WPDevFramework\Hooks', 'on_activation_do'), 1);

	} // end init;

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

			/*
			 * Update the sunrise meta file.
			 */
			\WPDevFramework\Sunrise::maybe_tap('activating');

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

		wpdev_log_add('wpdev-core', __('Deactivating WPDev...', 'wpdev'));

		/*
		 * Update the sunrise meta file.
		 */
		\WPDevFramework\Sunrise::maybe_tap('deactivating');

		/**
		 * Let other parts of the plugin attach their routines for deactivation
		 *
		 * @since 1.9.6
		 * @return void
		 */
		do_action('wpdev_deactivation');

	} // end on_deactivation;

} // end class Hooks;
