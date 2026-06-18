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
function wpdev_register_service( $id, Service_Contract $service, $replace = true ) {

	return Service_Registry::register( $id, $service, $replace );

} // end wpdev_register_service;

/**
 * Whether a service is registered.
 *
 * @param string $id Service id.
 * @return bool
 */
function wpdev_has_service( $id ) {

	return Service_Registry::has( $id );

} // end wpdev_has_service;

/**
 * List registered service ids.
 *
 * @return string[]
 */
function wpdev_list_services() {

	return Service_Registry::list_ids();

} // end wpdev_list_services;

/**
 * Unregister a service.
 *
 * @param string $id Service id.
 * @return void
 */
function wpdev_unregister_service( $id ) {

	Service_Registry::unregister( $id );

} // end wpdev_unregister_service;
