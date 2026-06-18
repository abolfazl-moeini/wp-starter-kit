<?php
/**
 * HTTP, Request and Response Helper Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.11
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Returns the PHP input (php://input) as JSON.
 *
 * @since 2.0.0
 *
 * @param boolean $raw Wether to return the raw string or a decoded value.
 * @return object
 */
function wpdev_get_input($raw = false) {

	$body = @file_get_contents('php://input'); // phpcs:ignore

	return $raw ? $body : json_decode($body);

} // end wpdev_get_input;

/**
 * Prevents the current page from being cached.
 *
 * @since 2.0.0
 * @return void
 */
function wpdev_no_cache() {

	if (!headers_sent()) {

		nocache_headers();

		header('Pragma: no-cache');

		/*
		 * Let's send something custom so we can
		 * easily spot when no-caching is out fault!
		 */
		wpdev_x_header('X-wpdev-Cache: prevent-caching');

	} // end if;

	do_action('wpdev_no_cache');

} // end wpdev_no_cache;

/**
 * Maybe sends a WPDev X Header.
 *
 * Useful for debugging purposes.
 * These headers can easily be omitted by
 * running add_filter('wpdev_should_send_x_headers', '__return_false');
 *
 * @since 2.0.0
 *
 * @param string $header The header to send. Example: X-wpdev-Caching: prevent-caching.
 * @return void
 */
function wpdev_x_header($header) {

	if (apply_filters('wpdev_should_send_x_headers', defined('WP_DEBUG') && WP_DEBUG)) {

		!headers_sent() && header($header);

	} // end if;

} // end wpdev_x_header;
