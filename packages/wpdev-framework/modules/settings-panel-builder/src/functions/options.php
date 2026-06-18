<?php
/**
 * Options Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.11
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

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

	if ( function_exists( 'wpdev_playground_uses_site_admin_context' ) && wpdev_playground_uses_site_admin_context() ) {
		$option_value = get_option( $slug, $default );
	} else {
		$option_value = get_network_option( null, $slug, $default );
	}

	return apply_filters('wpdev_get_option', $option_value, $option_name, $default);

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

	if ( function_exists( 'wpdev_playground_uses_site_admin_context' ) && wpdev_playground_uses_site_admin_context() ) {
		return update_option( $slug, $value, false );
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

	if ( function_exists( 'wpdev_playground_uses_site_admin_context' ) && wpdev_playground_uses_site_admin_context() ) {
		return delete_option( $slug );
	}

	return delete_network_option( null, $slug );

} // end wpdev_delete_option;
