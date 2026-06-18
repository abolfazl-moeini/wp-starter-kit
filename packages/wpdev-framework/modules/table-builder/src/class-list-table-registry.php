<?php
/**
 * List table registry.
 *
 * @package WPDevFramework\Modules\TableBuilder
 * @since   2.5.0
 */

namespace WPDevFramework\Modules\TableBuilder;

use WPDevFramework\Core\Registry_Base;

defined( 'ABSPATH' ) || exit;

/**
 * Registers list table classes and optional declarative configs.
 */
class List_Table_Registry extends Registry_Base {

	/**
	 * Registered tables keyed by table id.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	protected static $tables = array();

	/**
	 * Register a list table.
	 *
	 * @since 2.5.0
	 *
	 * @param string                    $table_id     Table id slug.
	 * @param string                    $class_name   Fully-qualified list table class.
	 * @param Table_Config|null         $config       Optional declarative config.
	 * @return void
	 */
	public static function register( $table_id, $class_name, $config = null, $replace = true ) {

		return self::store(
			self::$tables,
			$table_id,
			array(
				'class'  => $class_name,
				'config' => $config,
			),
			(bool) $replace
		);

	} // end register;

	/**
	 * Whether a list table is registered.
	 *
	 * @since 2.7.0
	 *
	 * @param string $table_id Table id slug.
	 * @return bool
	 */
	public static function has( $table_id ) {

		return null !== self::get( $table_id );

	} // end has;

	/**
	 * Unregister a list table.
	 *
	 * @since 2.7.0
	 *
	 * @param string $table_id Table id slug.
	 * @return void
	 */
	public static function unregister( $table_id ) {

		unset( self::$tables[ self::sanitize_id( $table_id ) ] );

	} // end unregister;

	/**
	 * Reset registry state (unit tests).
	 *
	 * @since 2.7.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$tables = array();

	} // end reset;

	/**
	 * Get registration entry for a table id.
	 *
	 * @since 2.5.0
	 *
	 * @param string $table_id Table id slug.
	 * @return array<string, mixed>|null
	 */
	public static function get( $table_id ) {

		$table_id = \sanitize_key( $table_id );

		return self::$tables[ $table_id ] ?? null;

	} // end get;

	/**
	 * Return all registrations.
	 *
	 * @since 2.5.0
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function all() {

		return self::$tables;

	} // end all;

} // end class List_Table_Registry;
