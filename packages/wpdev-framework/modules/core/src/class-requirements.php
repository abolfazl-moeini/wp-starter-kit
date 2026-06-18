<?php
/**
 * Check if all the pre-requisites to run WPDev are in place.
 *
 * @package WPDev
 * @subpackage Requirements
 * @since 2.0.0
 */

namespace WPDevFramework;

use \WPDevFramework\Loaders\Table_Loader;
use \WPDevFramework\Installers\Core_Installer;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Check if all the pre-requisites to run WPDev are in place.
 *
 * @since 2.0.0
 */
class Requirements {

	/**
	 * Caches the result of the requirement check.
	 *
	 * @since 2.0.0
	 * @var bool
	 */
	public static $met;

	/**
	 * Minimum PHP version required to run WPDev.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	public static $php_version = '7.4.1';

	/**
	 * Recommended PHP Version
	 *
	 * @since 2.0.0
	 * @var string
	 */
	public static $php_recommended_version = '7.4.1';

	/**
	 * Minimum WordPress version required to run WPDev.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	public static $wp_version = '5.3';

	/**
	 * Recommended WP Version.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	public static $wp_recommended_version = '6.4.1';

	/**
	 * Static-only class.
	 */
	private function __construct() {} // end __construct;

	/**
	 * Check if the minimum pre-requisites to run WPDev are present.
	 *
	 * - Check if the PHP version requirements are met;
	 * - Check if the WordPress version requirements are met.
	 *
	 * Multisite and network-active checks are separate (see is_multisite(), is_network_active()).
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public static function met() {

		if (self::$met === null) {
			self::$met = (
				self::check_php_version()  && self::check_wp_version()
			);

		} // end if;

		return self::$met;

	} // end met;

	/**
	 * Checks if we have ran through the setup already.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	public static function run_setup() {

		global $wpdb;

		if (self::is_unit_test()) {

			// phpcs:disable

			$tables = wpdev_array_flatten($wpdb->get_results(sprintf('SHOW TABLES FROM %s;', DB_NAME), ARRAY_N));

			// phpcs:enable

			if (!in_array("{$wpdb->prefix}wpdev_domain_mappings", $tables, true)) {

				Core_Installer::get_instance()->_install_database_tables();

			} // end if;

			return true;

		} // end if;

		return get_network_option( null, 'wpdev_setup_finished', false );

	} // end run_setup;

	/**
	 * Checks for a test environment.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public static function is_unit_test() {

		return defined('WP_TESTS_MULTISITE') && WP_TESTS_MULTISITE;

	} // end is_unit_test;
	/**
	 * Check if the PHP version requirements are met
	 *
	 * @since 2.0.0
	 */
	public static function check_php_version(): bool {

		if (version_compare(phpversion(), self::$php_version, '<')) {

			add_action('network_admin_notices', array('WPDevFramework\Requirements', 'notice_unsupported_php_version'));

			return false;

		} // end if;

		return true;

	} // end check_php_version;
	/**
	 * Check if the WordPress version requirements are met
	 *
	 * @since 2.0.0
	 */
	public static function check_wp_version(): bool {

		global $wp_version;

		if (version_compare($wp_version, self::$wp_version, '<')) {

			add_action('network_admin_notices', array('WPDevFramework\Requirements', 'notice_unsupported_wp_version'));

			return false;

		} // end if;

		return true;

	} // end check_wp_version;

	/**
	 * Check Cron Status
	 *
	 * Gets the current cron status by performing a test spawn.
	 * Cached for one hour when all is well.
	 *
	 * Heavily inspired on Astra's test_cron check:
	 *
	 * @see astra/inc/theme-update/class-astra-theme-background-updater.php
	 *
	 * @since 2.0.0
	 * @return false if there is a problem spawning a call to WP-Cron system.
	 */
	public static function check_wp_cron(): bool {

		global $wp_version;

		if (defined('DISABLE_WP_CRON') && DISABLE_WP_CRON) {

			return false;

		} // end if;

		if (defined('ALTERNATE_WP_CRON') && ALTERNATE_WP_CRON) {

			return false;

		} // end if;

		$cached_status = get_site_transient('wpdev-cron-test-ok');

		if ($cached_status) {

			return true;

		} // end if;

		$sslverify     = version_compare($wp_version, 4.0, '<');
		$doing_wp_cron = sprintf('%.22F', microtime(true));

		$cron_request = apply_filters('cron_request', array( // phpcs:ignore
			'url'  => site_url('wp-cron.php?doing_wp_cron=' . $doing_wp_cron),
			'args' => array(
				'timeout'   => 3,
				'blocking'  => true,
				'sslverify' => apply_filters('https_local_ssl_verify', $sslverify), // phpcs:ignore
			),
		));

		$result = wp_remote_post($cron_request['url'], $cron_request['args']);

		if (wp_remote_retrieve_response_code($result) >= 300) {

			return false;

		} // end if;

		set_transient('wpdev-cron-test-ok', 1, HOUR_IN_SECONDS);

		return true;

	} // end check_wp_cron;
	/**
	 * Check if the install is a Multisite install
	 *
	 * @since 2.0.0
	 */
	public static function is_multisite(): bool {

		if (!is_multisite()) {

			add_action('admin_notices', array('WPDevFramework\Requirements', 'notice_not_multisite'));

			return false;

		} // end if;

		return true;

	} // end is_multisite;
	/**
	 * Check if WPDev is network active.
	 *
	 * @since 2.0.0
	 */
	public static function is_network_active(): bool {

		/**
		 * Allow for developers to short-circuit this check.
		 *
		 * This is useful when using composer-based and other custom setups,
		 * such as Bedrock, for example, where using plugins as mu-plugins
		 * are the norm.
		 *
		 * @since 2.0.0
		 * @return bool
		 */
		$skip_network_activation_check = apply_filters('wpdev_skip_network_active_check', wpdev_is_must_use());

		if ($skip_network_activation_check) {

			return true;

		} // end if;

		if (!function_exists('is_plugin_active_for_network')) {

			require_once ABSPATH . '/wp-admin/includes/plugin.php';

		} // end if;

		if (!is_plugin_active_for_network(WPDEV_PLUGIN_BASENAME) && !self::is_unit_test()) {

			add_action('admin_notices', array('WPDevFramework\Requirements', 'notice_not_network_active'));

			return false;

		} // end if;

		return true;

	} // end is_network_active;

	/**
	 * Adds a network admin notice about the PHP requirements not being met
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function notice_unsupported_php_version() {
		// translators: the %1$s placeholder is the required PHP version, while the %2$s is the current PHP version.
		$message = sprintf(__('WPDev requires at least PHP version %1$s to run. Your current PHP version is <strong>%2$s</strong>. Please, contact your hosting company support to upgrade your PHP version. If you want maximum performance consider upgrading your PHP to version 7.0 or later.', 'wpdev'), self::$php_version, phpversion());

		printf('<div class="notice notice-error"><p>%s</p></div>', wp_kses_post( $message ));
	}

	// end notice_unsupported_php_version;

	/**
	 * Adds a network admin notice about the WordPress requirements not being met
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function notice_unsupported_wp_version() {

		global $wp_version;

		// translators: the %1$s placeholder is the required WP version, while the %2$s is the current WP version.
		$message = sprintf(__('WPDev requires at least WordPress version %1$s to run. Your current WordPress version is <strong>%2$s</strong>.', 'wpdev'), self::$wp_version, $wp_version);

		printf('<div class="notice notice-error"><p>%s</p></div>', wp_kses_post( $message ));

	} // end notice_unsupported_wp_version;

	/**
	 * Adds a network admin notice about the install not being a multisite install
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function notice_not_multisite() {
		$message = __('WPDev requires a multisite install to run properly. To know more about WordPress Networks, visit this link: <a href="https://wordpress.org/support/article/create-a-network/">Create a Network &rarr;</a>', 'wpdev');

		printf('<div class="notice notice-error"><p>%s</p></div>', wp_kses_post( $message ));
	}

	// end notice_not_multisite;

	/**
	 * Adds a network admin notice about the WPDev not being network-active
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public static function notice_not_network_active() {
		// translators: %s is a placeholder for the Network Admin plugins page URL.
		$message = sprintf(__('WPDev needs to be network active to run properly. You can "Network Activate" it <a href="%s">here</a>', 'wpdev'), network_admin_url('plugins.php'));

		printf('<div class="notice notice-error"><p>%s</p></div>', wp_kses_post( $message ));
	}

	// end notice_not_network_active;

} // end class Requirements;
