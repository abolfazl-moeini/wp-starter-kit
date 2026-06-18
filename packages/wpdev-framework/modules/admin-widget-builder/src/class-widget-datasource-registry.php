<?php
/**
 * Widget datasource registry — decouple UI elements from managers.
 *
 * @package WPDevFramework\Modules\AdminWidgetBuilder
 * @since   2.5.0
 */

namespace WPDevFramework\Modules\AdminWidgetBuilder;

use WPDevFramework\Core\Registry_Base;

defined( 'ABSPATH' ) || exit;

/**
 * Named datasource callbacks for admin/customer dashboard widgets.
 */
class Widget_Datasource_Registry extends Registry_Base {

	/**
	 * Registered datasource callables.
	 *
	 * @var array<string, callable>
	 */
	protected static $sources = array();

	/**
	 * Register a datasource callback.
	 *
	 * @since 2.5.0
	 *
	 * @param string   $id       Datasource slug.
	 * @param callable $callback Receives context array; returns mixed.
	 * @return void
	 */
	public static function register( $id, $callable, $replace = true ) {

		if ( ! is_callable( $callable ) ) {
			return false;
		}

		return self::store( self::$sources, $id, $callable, (bool) $replace );

	} // end register;

	/**
	 * Get a registered datasource callable.
	 *
	 * @since 2.7.0
	 *
	 * @param string $id Datasource slug.
	 * @return callable|null
	 */
	public static function get( $id ) {

		$id = self::sanitize_id( $id );

		return self::$sources[ $id ] ?? null;

	} // end get;

	/**
	 * List all datasource ids.
	 *
	 * @since 2.7.0
	 *
	 * @return array<string, callable>
	 */
	public static function all() {

		return self::$sources;

	} // end all;

	/**
	 * Unregister a datasource.
	 *
	 * @since 2.7.0
	 *
	 * @param string $id Datasource slug.
	 * @return void
	 */
	public static function unregister( $id ) {

		unset( self::$sources[ self::sanitize_id( $id ) ] );

	} // end unregister;

	/**
	 * Reset registry state (unit tests).
	 *
	 * @since 2.7.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$sources = array();

	} // end reset;

	/**
	 * Resolve a registered datasource.
	 *
	 * @since 2.5.0
	 *
	 * @param string               $id      Datasource slug.
	 * @param array<string, mixed> $context Optional context for the callback.
	 * @return mixed
	 */
	public static function resolve( $id, array $context = array() ) {

		$id = sanitize_key( $id );

		if ( empty( self::$sources[ $id ] ) ) {
			return null;
		}

		return call_user_func( self::$sources[ $id ], $context );

	} // end resolve;

	/**
	 * Whether a datasource is registered.
	 *
	 * @since 2.5.0
	 *
	 * @param string $id Datasource slug.
	 * @return bool
	 */
	public static function has( $id ) {

		return isset( self::$sources[ sanitize_key( $id ) ] );

	} // end has;

} // end class Widget_Datasource_Registry;
