<?php
/**
 * Declarative REST Route helper functions.
 *
 * Provides access to the Route_Registrar primitive.
 *
 * @package WPDevFramework\Core\Functions
 * @since   2.14.0
 */

use WPDevFramework\Core\Rest\Route_Registrar;
use WPDevFramework\Core\Service_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Retrieve the core REST Route_Registrar instance.
 *
 * @return Route_Registrar
 */
if ( ! function_exists( 'wpdev_routes' ) ) {
	function wpdev_routes() {
		static $instance = null;

		if ( function_exists( 'wpdev_services' ) && wpdev_services( 'routes' ) instanceof Route_Registrar ) {
			return wpdev_services( 'routes' );
		}

		if ( null === $instance ) {
			$instance = new Route_Registrar();
			if ( class_exists( Service_Registry::class ) ) {
				Service_Registry::register( 'routes', $instance, false );
			}
		}

		return $instance;
	}
}
