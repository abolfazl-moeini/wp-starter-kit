<?php
/**
 * Sunrise Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * General helper functions for sunrise.
 *
 * @author      Arindo Duque
 * @category    Admin
 * @package     WPDev/Sunrise
 * @version     2.0.11
 */
function wpdev_should_load_sunrise() {

	return \WPDevFramework\Sunrise::should_load_sunrise();

} // end wpdev_should_load_sunrise;

function wpdev_get_settings_option_key() {

	return 'v2_settings';

} // end wpdev_get_settings_option_key;

/**
 * Get a setting value, when te normal APIs are not available.
 *
 * Should only be used if we're running in sunrise.
 *
 * @since 2.0.0
 *
 * @param string $setting Setting to get.
 * @param mixed  $default Default value.
 * @return mixed
 */
function wpdev_get_setting_early($setting, $default = false) {

	if (did_action('wpdev_load')) {

		_doing_it_wrong('wpdev_get_setting_early', __('Regular setting APIs are already available. You should use wpdev_get_setting() instead.', 'wpdev'), '2.0.0');

	} // end if;

	$settings_key = wpdev_get_settings_option_key();

	$settings = get_network_option(null, 'wpdev_' . $settings_key);

	return wpdev_get_isset($settings, $setting, $default);

} // end wpdev_get_setting_early;

/**
 * Set a setting value, when te normal APIs are not available.
 *
 * Should only be used if we're running in sunrise.
 *
 * @since 2.0.20
 *
 * @param string $key   Setting to save.
 * @param mixed  $value Setting value.
 */
function wpdev_save_setting_early($key, $value) {

	if (did_action('wpdev_load')) {

		_doing_it_wrong('wpdev_save_setting_early', __('Regular setting APIs are already available. You should use wpdev_save_setting() instead.', 'wpdev'), '2.0.20');

	} // end if;

	$settings_key = wpdev_get_settings_option_key();

	$settings = get_network_option(null, 'wpdev_' . $settings_key);

	$settings[$key] = $value;

	return update_network_option(null, 'wpdev_' . $settings_key, $settings);

} // end wpdev_save_setting_early;

/**
 * Get the security mode key used to disable security mode
 *
 * @since 2.0.20
 */
function wpdev_get_security_mode_key(): string {

	$hash = md5((string) get_network_option(null, 'admin_email'));

	return substr($hash, 0, 6);

} // end wpdev_get_security_mode_key;

/**
 * Load te dev tools, if they exist.
 *
 * @since 2.0.11
 *
 * @param boolean $load If we should load it or not.
 * @return string The path to the dev tools folder.
 */
function wpdev_load_dev_tools($load = true) {

	if (defined('WPDEV_SUNRISE_FILE')) {
		/*
		* If the vendor folder exists, we are
		* for sure, inside a dev environment.
		*/
		$autoload_file = dirname((string) WPDEV_SUNRISE_FILE, 2) . '/vendor/autoload.php';

		if (file_exists($autoload_file)) {

			$load && require_once $autoload_file;

			return $autoload_file;

		} // end if;

	} // end if;

	return '';

}  // end wpdev_load_dev_tools;

/**
 * Early substitute for wp_kses_data before it exists.
 *
 * Sanitize content with allowed HTML KSES rules.
 *
 * This function expects unslashed data.
 *
 * @since 2.1.0
 *
 * @param string $data Content to filter, expected to not be escaped.
 * @return string Filtered content.
 */
function wpdev_kses_data($data) {

	return function_exists('wp_kses_data') ? wp_kses_data($data) : $data;

} // end wpdev_kses_data;
