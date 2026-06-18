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
function wpdev_tour_api() {

	if ( function_exists( 'wpdev_services' ) ) {
		$service = wpdev_services( 'tour' );

		if ( $service instanceof Tour_Service ) {
			return $service;
		}
	}

	return Tours::get_instance();

} // end wpdev_tour_api;

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
function wpdev_create_tour( $id, $steps = array(), $once = true ) {

	$api = wpdev_tour_api();

	if ( $api instanceof Tour_Service ) {
		$api->create_tour( $id, $steps, $once );
		return;
	}

	$api->create_tour( $id, $steps, $once );

} // end wpdev_create_tour;
