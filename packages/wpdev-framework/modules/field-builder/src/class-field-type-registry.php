<?php
/**
 * Field type registry and sanitize contract.
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.5.0
 */

namespace WPDevFramework\Modules\FieldBuilder;

use WPDevFramework\Core\Registry_Base;

defined( 'ABSPATH' ) || exit;

/**
 * Registers field types and delegates sanitize/validate hooks.
 */
class Field_Type_Registry extends Registry_Base {

	/**
	 * Registered field types.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	protected static $types = array();

	/**
	 * Register a field type.
	 *
	 * @since 2.5.0
	 *
	 * @param string               $type   Field type slug.
	 * @param array<string, mixed> $config Optional config (sanitize callback, etc.).
	 * @return void
	 */
	public static function register( $type, array $config = array(), $replace = true ) {

		return self::store( self::$types, $type, $config, (bool) $replace );

	} // end register;

	/**
	 * Whether a field type is registered.
	 *
	 * @since 2.7.0
	 *
	 * @param string $type Field type slug.
	 * @return bool
	 */
	public static function has( $type ) {

		return null !== self::get( $type );

	} // end has;

	/**
	 * Return all registered field types.
	 *
	 * @since 2.7.0
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function all() {

		return self::$types;

	} // end all;

	/**
	 * Unregister a field type.
	 *
	 * @since 2.7.0
	 *
	 * @param string $type Field type slug.
	 * @return void
	 */
	public static function unregister( $type ) {

		unset( self::$types[ self::sanitize_id( $type ) ] );

	} // end unregister;

	/**
	 * Reset registry state (unit tests).
	 *
	 * @since 2.7.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$types = array();

	} // end reset;

	/**
	 * Get a registered field type config.
	 *
	 * @since 2.5.0
	 *
	 * @param string $type Field type slug.
	 * @return array<string, mixed>|null
	 */
	public static function get( $type ) {

		$type = \sanitize_key( $type );

		return self::$types[ $type ] ?? null;

	} // end get;

	/**
	 * Sanitize a field value using type config and validation hooks.
	 *
	 * @since 2.5.0
	 *
	 * @param string               $type  Field type slug.
	 * @param mixed                $value Raw value.
	 * @param array<string, mixed> $field Field definition.
	 * @return mixed
	 */
	public static function sanitize( $type, $value, array $field = array() ) {

		$type   = sanitize_key( $type );
		$config = self::get( $type );

		if ( isset( $config['sanitize'] ) && is_callable( $config['sanitize'] ) ) {
			$value = call_user_func( $config['sanitize'], $value, $field );
		}

		/**
		 * Validate/sanitize a field value for a registered type.
		 *
		 * @since 2.5.0
		 *
		 * @param mixed                $value Sanitized value.
		 * @param array<string, mixed> $field Field definition.
		 */
		return apply_filters( "wpdev_field_validate_{$type}", $value, $field );

	} // end sanitize;

} // end class Field_Type_Registry;
