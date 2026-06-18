<?php
/**
 * Geolocation Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Get the customers' IP address.
 *
 * @since 2.0.0
 * @return string
 */
function wpdev_get_ip() {

	$geolocation = \WPDevFramework\Geolocation::geolocate_ip('', true);

	return apply_filters('wpdev_get_ip', $geolocation['ip']);

} // end wpdev_get_ip;
