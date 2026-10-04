<?php
/**
 * Options Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.11
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

require_once __DIR__ . '/../class-settings-write-lock.php';

if ( ! function_exists( 'wpdev_with_option_lock' ) ) {
	function wpdev_with_option_lock($option_name, $callback, $timeout = 2000) {

		return \WPDevFramework\Modules\SettingsPanelBuilder\Settings_Write_Lock::run( $option_name, $callback, $timeout );

	} // end wpdev_with_option_lock;
}

/**
 * Get the value of a slugfied network option
 *
 * @since 1.9.6
 * @param string $option_name Option name.
 * @param mixed  $default The default value.
 * @return mixed
 */
function wpdev_get_option($option_name = 'settings', $default = array()) {

	// Default: network option (legacy). Site option only on playground parity production pages in site admin.
	$slug = wpdev_slugify( $option_name );

	$uses_site_context = ( function_exists( 'wpdev_uses_site_admin_context' ) && wpdev_uses_site_admin_context() )
		|| ( function_exists( 'wpdev_playground_uses_site_admin_context' ) && wpdev_playground_uses_site_admin_context() );

	if ( $uses_site_context || ! function_exists( 'get_network_option' ) ) {
		$option_value = function_exists( 'get_option' ) ? get_option( $slug, $default ) : $default;
	} else {
		$option_value = get_network_option( null, $slug, $default );
	}

	return function_exists( 'apply_filters' ) ? apply_filters('wpdev_get_option', $option_value, $option_name, $default) : $option_value;

} // end wpdev_get_option;

/**
 * Save slugfied network option
 *
 * @since 1.9.6
 * @param string $option_name The option name to save.
 * @param mixed  $value       The new value of the option.
 * @return boolean
 */
function wpdev_save_option($option_name = 'settings', $value = false) {

	$slug = wpdev_slugify( $option_name );

	$uses_site_context = ( function_exists( 'wpdev_uses_site_admin_context' ) && wpdev_uses_site_admin_context() )
		|| ( function_exists( 'wpdev_playground_uses_site_admin_context' ) && wpdev_playground_uses_site_admin_context() );

	if ( $uses_site_context || ! function_exists( 'update_network_option' ) ) {
		return function_exists( 'update_option' ) ? update_option( $slug, $value, false ) : false;
	}

	return update_network_option( null, $slug, $value );

} // end wpdev_save_option;

/**
 * Delete slugfied network option
 *
 * @since 1.9.6
 * @param string $option_name The option name to delete.
 * @return boolean
 */
function wpdev_delete_option($option_name) {

	$slug = wpdev_slugify( $option_name );

	$uses_site_context = ( function_exists( 'wpdev_uses_site_admin_context' ) && wpdev_uses_site_admin_context() )
		|| ( function_exists( 'wpdev_playground_uses_site_admin_context' ) && wpdev_playground_uses_site_admin_context() );

	if ( $uses_site_context || ! function_exists( 'delete_network_option' ) ) {
		return function_exists( 'delete_option' ) ? delete_option( $slug ) : false;
	}

	return delete_network_option( null, $slug );

} // end wpdev_delete_option;
