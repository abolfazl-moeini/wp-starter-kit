<?php
/**
 * Access Policy Registry.
 *
 * Manages registered AccessManager policies, qualifiers, owners,
 * and policy versions according to the access plan specification.
 *
 * @package WPDevFramework\Core\Access
 * @since   2.13.1
 */

namespace WPDevFramework\Core\Access;

use WPDev\Access\Validator\Strict_Validator;
use WPDev\Access\Exceptions\Validation_Exception;

defined( 'ABSPATH' ) || exit;

class Access_Policy_Registry {

	/**
	 * Registered policies keyed by policy ID.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	protected static $policies = array();

	/**
	 * Register an access policy.
	 *
	 * @param string $id      Policy identifier (e.g. 'myplugin_orders').
	 * @param array  $config  Configuration array (qualifier, owner, version, etc.).
	 * @param bool   $replace Whether to replace an existing policy with the same ID.
	 * @return bool True if registered successfully, false otherwise.
	 * @throws Validation_Exception If validation fails or owner collision occurs.
	 */
	public static function register( $id, array $config = array(), $replace = true ) {

		$id = trim( (string) $id );

		Strict_Validator::validate_policy_config( $id, $config );

		$owner = trim( (string) $config['owner'] );

		// Owner collision check: replacement is only permitted for the SAME owner.
		if ( isset( self::$policies[ $id ] ) ) {
			$existing = self::$policies[ $id ];

			if ( $existing['owner'] !== $owner ) {
				throw new Validation_Exception(
					sprintf( 'Owner collision on policy "%s": already registered by "%s", attempted overwrite by "%s".', $id, $existing['owner'], $owner ),
					'owner'
				);
			}

			if ( ! $replace ) {
				return false;
			}
		}

		$normalized = array_merge(
			array(
				'id'        => $id,
				'owner'     => $owner,
				'qualifier' => $config['qualifier'],
				'version'   => isset( $config['version'] ) ? (string) $config['version'] : '1.0.0',
			),
			$config
		);

		self::$policies[ $id ] = $normalized;

		return true;

	} // end register;

	/**
	 * Retrieve a registered policy by ID.
	 *
	 * @param string $id Policy identifier.
	 * @return array<string, mixed>|null Policy definition or null if not registered.
	 */
	public static function get( $id ) {

		$id = trim( (string) $id );

		return isset( self::$policies[ $id ] ) ? self::$policies[ $id ] : null;

	} // end get;

	/**
	 * Check whether a policy is registered.
	 *
	 * @param string $id Policy identifier.
	 * @return bool
	 */
	public static function has( $id ) {

		$id = trim( (string) $id );

		return isset( self::$policies[ $id ] );

	} // end has;

	/**
	 * List all registered policies.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function list() {

		return self::$policies;

	} // end list;

	/**
	 * Unregister a policy by ID.
	 *
	 * @param string $id Policy identifier.
	 * @return void
	 */
	public static function unregister( $id ) {

		$id = trim( (string) $id );

		unset( self::$policies[ $id ] );

	} // end unregister;

	/**
	 * Count registered policies.
	 *
	 * @return int
	 */
	public static function count() {

		return count( self::$policies );

	} // end count;

	/**
	 * Reset the registry state (for testing).
	 *
	 * @return void
	 */
	public static function reset() {

		self::$policies = array();

	} // end reset;

} // end class Access_Policy_Registry;
