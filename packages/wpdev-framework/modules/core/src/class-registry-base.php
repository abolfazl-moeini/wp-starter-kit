<?php
/**
 * Shared registry helpers for uniform module APIs.
 *
 * @package WPDevFramework\Core
 * @since   2.7.0
 */

namespace WPDevFramework\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Collision-safe static registry utilities.
 */
abstract class Registry_Base {

	/**
	 * Sanitize a registry entity id.
	 *
	 * @since 2.7.0
	 *
	 * @param string $id Entity id.
	 * @return string
	 */
	public static function sanitize_id( $id ) {

		if ( function_exists( 'sanitize_key' ) ) {
			return sanitize_key( (string) $id );
		}

		return strtolower( preg_replace( '/[^a-z0-9_\-]/', '', (string) $id ) );

	} // end sanitize_id;

	/**
	 * Register an item with optional replace policy.
	 *
	 * @since 2.7.0
	 *
	 * @param array<string, mixed> $store   Registry store (by reference).
	 * @param string               $id      Entity id.
	 * @param mixed                $value   Stored value.
	 * @param bool                 $replace Whether to replace an existing id.
	 * @return bool True when registered.
	 */
	protected static function store( array &$store, $id, $value, $replace = true ) {

		$id = self::sanitize_id( $id );

		if ( '' === $id ) {
			if ( function_exists( '_doing_it_wrong' ) ) {
				_doing_it_wrong( static::class . '::register', 'Registry id cannot be empty.', '2.7.0' );
			}
			return false;
		}

		if ( isset( $store[ $id ] ) && ! $replace ) {
			if ( function_exists( '_doing_it_wrong' ) ) {
				_doing_it_wrong(
					static::class . '::register',
					sprintf( 'Registry id "%s" is already registered.', $id ),
					'2.7.0'
				);
			}
			return false;
		}

		$store[ $id ] = $value;

		return true;

	} // end store;

} // end abstract class Registry_Base;
