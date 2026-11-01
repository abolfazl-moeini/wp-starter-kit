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
 * Get the customers' IP address (local request headers only — no external lookup).
 *
 * @since 2.0.0
 * @return string
 */
if (!function_exists('wpdev_get_ip')) {
function wpdev_get_ip() {

	$ip = \WPDevFramework\Geolocation::get_ip_address();

	return apply_filters( 'wpdev_get_ip', $ip );

}
}
 // end wpdev_get_ip;
