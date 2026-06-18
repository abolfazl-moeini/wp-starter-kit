<?php
/**
 * Table registration registry for optional domain tables.
 *
 * @package WPDevFramework\Core
 * @since   2.8.0
 */

namespace WPDevFramework\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Stores table factory callables keyed by Table_Loader property name.
 */
class Table_Registry {

	/**
	 * @var array<string, callable|string>
	 */
	protected static $entries = array();

	/**
	 * Register a table for Table_Loader.
	 *
	 * @param string          $property Table_Loader property name (e.g. product_table).
	 * @param callable|string $factory  Callable returning table instance, or FQCN.
	 * @return void
	 */
	public static function register( $property, $factory ) {

		self::$entries[ (string) $property ] = $factory;

	} // end register;

	/**
	 * Return all registered entries.
	 *
	 * @return array<string, callable|string>
	 */
	public static function all() {

		return self::$entries;

	} // end all;

	/**
	 * Instantiate a registered table or return null when unavailable.
	 *
	 * @param string $property Property name.
	 * @return object|null
	 */
	public static function instantiate( $property ) {

		if ( ! isset( self::$entries[ $property ] ) ) {
			return null;
		}

		$factory = self::$entries[ $property ];

		if ( is_string( $factory ) ) {
			if ( ! class_exists( $factory ) ) {
				return null;
			}

			return new $factory();
		}

		if ( ! is_callable( $factory ) ) {
			return null;
		}

		$instance = call_user_func( $factory );

		return is_object( $instance ) ? $instance : null;

	} // end instantiate;

	/**
	 * Reset registry (unit tests).
	 *
	 * @return void
	 */
	public static function reset() {

		self::$entries = array();

	} // end reset;

} // end class Table_Registry;
