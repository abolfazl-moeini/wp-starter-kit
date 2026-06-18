<?php
/**
 * Service registry for WPDev core services.
 *
 * @package WPDevFramework\Core
 * @since   2.4.0
 */

namespace WPDevFramework\Core;

use WPDevFramework\Core\Contracts\Service_Contract;
use WPDevFramework\Core\Services\Ajax_Service;
use WPDevFramework\Core\Services\Form_Service;
use WPDevFramework\Core\Services\Modal_Service;
use WPDevFramework\Core\Services\Screen_Options_Service;
use WPDevFramework\Core\Services\Tour_Service;
use WPDevFramework\Core\Services\View_Service;

defined( 'ABSPATH' ) || exit;

/**
 * Central registry for core framework services.
 */
class Service_Registry extends Registry_Base {

	/**
	 * Registered service instances keyed by id.
	 *
	 * @var array<string, Service_Contract>
	 */
	protected static $services = array();

	/**
	 * Boot core services and register defaults.
	 *
	 * @return void
	 */
	public static function boot() {

		self::register( 'ajax', new Ajax_Service() );
		self::register( 'form', new Form_Service() );
		self::register( 'modal', new Modal_Service() );
		self::register( 'screen_options', new Screen_Options_Service() );
		self::register( 'tour', new Tour_Service() );
		self::register( 'view', new View_Service() );

		foreach ( self::$services as $service ) {
			if ( method_exists( $service, 'boot' ) ) {
				$service->boot();
			}
		}

		/**
		 * Allow modules to register additional services.
		 *
		 * @since 2.4.0
		 *
		 * @param Service_Registry $registry Registry instance (static facade).
		 */
		do_action( 'wpdev_register_services', __CLASS__ );

	} // end boot;

	/**
	 * Register a service.
	 *
	 * @param string            $id      Service identifier.
	 * @param Service_Contract  $service Service instance.
	 * @return void
	 */
	public static function register( $id, Service_Contract $service, $replace = true ) {

		return self::store( self::$services, $id, $service, (bool) $replace );

	} // end register;

	/**
	 * Unregister a service.
	 *
	 * @since 2.7.0
	 *
	 * @param string $id Service identifier.
	 * @return void
	 */
	public static function unregister( $id ) {

		unset( self::$services[ self::sanitize_id( $id ) ] );

	} // end unregister;

	/**
	 * List registered service ids.
	 *
	 * @since 2.7.0
	 *
	 * @return string[]
	 */
	public static function list_ids() {

		return array_keys( self::$services );

	} // end list_ids;

	/**
	 * Reset registry state (unit tests).
	 *
	 * @since 2.7.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$services = array();

	} // end reset;

	/**
	 * Retrieve a registered service.
	 *
	 * @param string $id Service identifier.
	 * @return Service_Contract|null
	 */
	public static function get( $id ) {

		return self::$services[ $id ] ?? null;

	} // end get;

	/**
	 * Check if a service is registered.
	 *
	 * @param string $id Service identifier.
	 * @return bool
	 */
	public static function has( $id ) {

		return isset( self::$services[ $id ] );

	} // end has;

	/**
	 * Return all registered services.
	 *
	 * @return array<string, Service_Contract>
	 */
	public static function all() {

		return self::$services;

	} // end all;

} // end class Service_Registry;
