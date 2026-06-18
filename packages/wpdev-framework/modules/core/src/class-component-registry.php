<?php
/**
 * Shared component registry (K8-01).
 *
 * @package WPDevFramework\Core
 * @since   2.6.0
 */

namespace WPDevFramework\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Central component store keyed by module slug.
 */
class Component_Registry extends Registry_Base {

	/**
	 * Components: module => [ id => config ].
	 *
	 * @var array<string, array<string, array<string, mixed>>>
	 */
	protected static $components = array();

	/**
	 * Boot a module registry hook (K8-02).
	 *
	 * @since 2.6.0
	 *
	 * @param string $module Module slug.
	 * @return void
	 */
	public static function init( $module ) {

		$module = sanitize_key( (string) $module );

		/**
		 * Fires when a builder module may register components.
		 *
		 * @since 2.6.0
		 */
		do_action( "wpdev_{$module}_register" );

	} // end init;

	/**
	 * Register a component for a module.
	 *
	 * @since 2.6.0
	 *
	 * @param string               $module Module slug.
	 * @param string               $id     Component id.
	 * @param array<string, mixed> $args   Configuration.
	 * @return void
	 */
	public static function register( $module, $id, array $args, $replace = true ) {

		$module = self::sanitize_id( $module );
		$id     = self::sanitize_id( $id );

		if ( ! isset( self::$components[ $module ] ) ) {
			self::$components[ $module ] = array();
		}

		return self::store( self::$components[ $module ], $id, $args, (bool) $replace );

	} // end register;

	/**
	 * Whether a component is registered.
	 *
	 * @since 2.7.0
	 *
	 * @param string $module Module slug.
	 * @param string $id     Component id.
	 * @return bool
	 */
	public static function has( $module, $id ) {

		return null !== self::get( $module, $id );

	} // end has;

	/**
	 * Unregister a component.
	 *
	 * @since 2.7.0
	 *
	 * @param string $module Module slug.
	 * @param string $id     Component id.
	 * @return void
	 */
	public static function unregister( $module, $id ) {

		$module = self::sanitize_id( $module );
		$id     = self::sanitize_id( $id );

		unset( self::$components[ $module ][ $id ] );

	} // end unregister;

	/**
	 * Reset registry state (unit tests).
	 *
	 * @since 2.7.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$components = array();

	} // end reset;

	/**
	 * Get a component.
	 *
	 * @since 2.6.0
	 *
	 * @param string $module Module slug.
	 * @param string $id     Component id.
	 * @return array<string, mixed>|null
	 */
	public static function get( $module, $id ) {

		$module = sanitize_key( (string) $module );
		$id     = sanitize_key( (string) $id );

		return self::$components[ $module ][ $id ] ?? null;

	} // end get;

	/**
	 * Return all components for a module.
	 *
	 * @since 2.6.0
	 *
	 * @param string $module Module slug.
	 * @return array<string, array<string, mixed>>
	 */
	public static function all( $module ) {

		$module = sanitize_key( (string) $module );

		return self::$components[ $module ] ?? array();

	} // end all;

} // end class Component_Registry;
