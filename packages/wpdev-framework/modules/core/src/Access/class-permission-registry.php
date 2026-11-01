<?php
/**
 * Permission Catalog Registry.
 *
 * Manages registered permissions, native base capabilities, owners,
 * scopes, and risk levels according to the access plan specification.
 *
 * @package WPDevFramework\Core\Access
 * @since   2.13.1
 */

namespace WPDevFramework\Core\Access;

use WPDev\Access\Validator\Strict_Validator;
use WPDev\Access\Exceptions\Validation_Exception;

defined( 'ABSPATH' ) || exit;

class Permission_Registry {

	/**
	 * Registered permissions keyed by permission ID.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	protected static $permissions = array();

	/**
	 * Register a permission in the catalog.
	 *
	 * Preserves dots in IDs (e.g. acme.orders.view) without destructive sanitize_key() mangling.
	 *
	 * @param string $id      Permission identifier (e.g. 'myplugin.orders.view').
	 * @param array  $config  Configuration array (owner, capability, scope, risk, label, etc.).
	 * @param bool   $replace Whether to replace an existing permission with the same ID.
	 * @return bool True if registered successfully, false otherwise.
	 * @throws Validation_Exception If validation fails or owner collision occurs.
	 */
	public static function register( $id, array $config = array(), $replace = true ) {

		$id = trim( (string) $id );

		Strict_Validator::validate_permission_config( $id, $config );

		$owner = trim( (string) $config['owner'] );

		// Owner collision check: replacement is only permitted for the SAME owner.
		if ( isset( self::$permissions[ $id ] ) ) {
			$existing = self::$permissions[ $id ];

			if ( $existing['owner'] !== $owner ) {
				throw new Validation_Exception(
					sprintf( 'Owner collision on permission "%s": already registered by "%s", attempted overwrite by "%s".', $id, $existing['owner'], $owner ),
					'owner'
				);
			}

			if ( ! $replace ) {
				return false;
			}
		}

		$normalized = array_merge(
			array(
				'id'             => $id,
				'owner'          => $owner,
				'module'         => isset( $config['module'] ) ? (string) $config['module'] : '',
				'capability'     => isset( $config['capability'] ) ? trim( (string) $config['capability'] ) : '',
				'scope'          => isset( $config['scope'] ) ? (string) $config['scope'] : 'site',
				'risk'           => isset( $config['risk'] ) ? (string) $config['risk'] : 'read',
				'default_grants' => isset( $config['default_grants'] ) && is_array( $config['default_grants'] ) ? $config['default_grants'] : array(),
				'label'          => isset( $config['label'] ) ? (string) $config['label'] : '',
				'description'    => isset( $config['description'] ) ? (string) $config['description'] : '',
				'policy'         => isset( $config['policy'] ) ? (string) $config['policy'] : null,
				'qualifier'      => isset( $config['qualifier'] ) ? $config['qualifier'] : null,
				'public'         => false,
				'schema_version' => isset( $config['schema_version'] ) ? $config['schema_version'] : 1,
			),
			$config
		);

		$normalized['id']     = $id;
		$normalized['owner']  = $owner;
		$normalized['public'] = isset( $config['public'] ) && true === $config['public'];

		self::$permissions[ $id ] = $normalized;

		return true;

	} // end register;

	/**
	 * Retrieve a registered permission by ID.
	 *
	 * @param string $id Permission identifier.
	 * @return array<string, mixed>|null Permission definition or null if not registered.
	 */
	public static function get( $id ) {

		$id = trim( (string) $id );

		return isset( self::$permissions[ $id ] ) ? self::$permissions[ $id ] : null;

	} // end get;

	/**
	 * Check whether a permission is registered.
	 *
	 * @param string $id Permission identifier.
	 * @return bool
	 */
	public static function has( $id ) {

		$id = trim( (string) $id );

		return isset( self::$permissions[ $id ] );

	} // end has;

	/**
	 * List all registered permissions.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function list() {

		return self::$permissions;

	} // end list;

	/**
	 * Unregister a permission by ID.
	 *
	 * @param string $id Permission identifier.
	 * @return void
	 */
	public static function unregister( $id ) {

		$id = trim( (string) $id );

		unset( self::$permissions[ $id ] );

	} // end unregister;

	/**
	 * Count registered permissions.
	 *
	 * @return int
	 */
	public static function count() {

		return count( self::$permissions );

	} // end count;

	/**
	 * Reset the registry state (for testing).
	 *
	 * @return void
	 */
	public static function reset() {

		self::$permissions = array();

	} // end reset;

} // end class Permission_Registry;
