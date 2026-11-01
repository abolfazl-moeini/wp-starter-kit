<?php
/**
 * Tour registration helpers.
 *
 * @package WPDevFramework\Functions
 * @since   2.5.0
 */

defined( 'ABSPATH' ) || exit;

use WPDevFramework\Core\Services\Tour_Service;
use WPDevFramework\Core\Tour\Tours;

/**
 * Return the tour API (service when booted, otherwise legacy singleton).
 *
 * @since 2.5.0
 *
 * @return Tour_Service|Tours
 */
if (!function_exists('wpdev_tour_api')) {
function wpdev_tour_api() {

	if ( function_exists( 'wpdev_services' ) ) {
		$service = wpdev_services( 'tour' );

		if ( $service instanceof Tour_Service ) {
			return $service;
		}
	}

	return Tours::get_instance();

}
}
 // end wpdev_tour_api;

/**
 * Register a Shepherd.js tour.
 *
 * @since 2.5.0
 *
 * @param string               $id    Tour id.
 * @param array<int, mixed>    $steps Tour steps.
 * @param bool                 $once  Show once per user.
 * @return void
 */
if (!function_exists('wpdev_create_tour')) {
function wpdev_create_tour( $id, $steps = array(), $once = true ) {

	$api = wpdev_tour_api();

	if ( $api instanceof Tour_Service ) {
		$api->create_tour( $id, $steps, $once );
		return;
	}

	$api->create_tour( $id, $steps, $once );

}
}
 // end wpdev_create_tour;

/**
 * Check whether a tour has been marked as finished/seen for a user.
 *
 * @since 2.9.0
 *
 * @param string $id      Tour id.
 * @param int    $user_id Optional user id.
 * @return bool
 */
if (!function_exists('wpdev_is_tour_finished')) {
function wpdev_is_tour_finished( $id, $user_id = 0 ) {

	$api = wpdev_tour_api();

	if ( $api instanceof Tour_Service ) {
		return $api->is_tour_finished( $id, $user_id );
	}

	return $api->is_tour_finished( $id, $user_id );

}
}
 // end wpdev_is_tour_finished;

/**
 * Mark a tour as finished/seen for a user.
 *
 * @since 2.9.0
 *
 * @param string $id      Tour id.
 * @param int    $user_id Optional user id.
 * @return bool
 */
if (!function_exists('wpdev_mark_tour_finished')) {
function wpdev_mark_tour_finished( $id, $user_id = 0 ) {

	$api = wpdev_tour_api();

	if ( $api instanceof Tour_Service ) {
		return $api->mark_tour_finished( $id, $user_id );
	}

	return $api->mark_tour_finished( $id, $user_id );

}
}
 // end wpdev_mark_tour_finished;

/**
 * Reset a tour seen flag for a user so it can be shown again naturally.
 *
 * @since 2.9.0
 *
 * @param string $id      Tour id.
 * @param int    $user_id Optional user id.
 * @return bool
 */
if (!function_exists('wpdev_reset_tour')) {
function wpdev_reset_tour( $id, $user_id = 0 ) {

	$api = wpdev_tour_api();

	if ( $api instanceof Tour_Service ) {
		return $api->reset_tour( $id, $user_id );
	}

	return $api->reset_tour( $id, $user_id );

}
}
 // end wpdev_reset_tour;
