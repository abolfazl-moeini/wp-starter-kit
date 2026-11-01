<?php
/**
 * Core service registry public API.
 *
 * @package WPDevFramework\Core\Functions
 * @since   2.7.0
 */

use WPDevFramework\Core\Contracts\Service_Contract;
use WPDevFramework\Core\Service_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Register a core service.
 *
 * @param string            $id      Service id.
 * @param Service_Contract  $service Service instance.
 * @param bool              $replace Replace existing id. Default true.
 * @return bool
 */
if ( ! function_exists( 'wpdev_register_service' ) ) {
	function wpdev_register_service( $id, Service_Contract $service, $replace = true ) {
		return Service_Registry::register( $id, $service, $replace );
	}
}

if ( ! function_exists( 'wpdev_has_service' ) ) {
	function wpdev_has_service( $id ) {
		return Service_Registry::has( $id );
	}
}

if ( ! function_exists( 'wpdev_list_services' ) ) {
	function wpdev_list_services() {
		return Service_Registry::list_ids();
	}
}

if ( ! function_exists( 'wpdev_unregister_service' ) ) {
	function wpdev_unregister_service( $id ) {
		Service_Registry::unregister( $id );
	}
}
