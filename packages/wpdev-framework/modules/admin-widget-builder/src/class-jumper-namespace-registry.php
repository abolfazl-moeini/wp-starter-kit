<?php
/**
 * Jumper namespace registry.
 *
 * @package WPDevFramework\Modules\AdminWidgetBuilder
 * @since   2.8.0
 */

namespace WPDevFramework\Modules\AdminWidgetBuilder;

use WPDevFramework\Core\Registry_Base;

defined( 'ABSPATH' ) || exit;

/**
 * Registry for logical Jumper namespaces (plugin + section grouping).
 */
class Jumper_Namespace_Registry extends Registry_Base {

	/**
	 * Registered namespaces.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	protected static $namespaces = array();

	/**
	 * Register a Jumper namespace.
	 *
	 * @since 2.8.0
	 *
	 * @param string               $id      Namespace id.
	 * @param array<string, mixed> $config  Namespace config.
	 * @param bool                 $replace Replace existing id.
	 * @return bool
	 */
	public static function register( $id, array $config = array(), $replace = true ) {

		$id        = self::sanitize_id( $id );
		$fallback  = self::humanize_id( $id );
		$normalized = array_merge(
			array(
				'id'       => $id,
				'plugin'   => 'WPDev',
				'label'    => $fallback,
				'icon'     => '',
				'priority' => 100,
			),
			$config
		);

		$normalized['id']       = $id;
		$normalized['plugin']   = trim( (string) $normalized['plugin'] );
		$normalized['label']    = trim( (string) $normalized['label'] );
		$normalized['icon']     = trim( (string) $normalized['icon'] );
		$normalized['priority'] = (int) $normalized['priority'];

		if ( '' === $normalized['plugin'] ) {
			$normalized['plugin'] = 'WPDev';
		}

		if ( '' === $normalized['label'] ) {
			$normalized['label'] = $fallback;
		}

		return self::store( self::$namespaces, $id, $normalized, (bool) $replace );

	} // end register;

	/**
	 * Get a namespace.
	 *
	 * @since 2.8.0
	 *
	 * @param string $id Namespace id.
	 * @return array<string, mixed>|null
	 */
	public static function get( $id ) {

		$id = self::sanitize_id( $id );

		return self::$namespaces[ $id ] ?? null;

	} // end get;

	/**
	 * Whether a namespace exists.
	 *
	 * @since 2.8.0
	 *
	 * @param string $id Namespace id.
	 * @return bool
	 */
	public static function has( $id ) {

		return isset( self::$namespaces[ self::sanitize_id( $id ) ] );

	} // end has;

	/**
	 * List all namespaces.
	 *
	 * @since 2.8.0
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function all_namespaces() {

		return self::$namespaces;

	} // end all_namespaces;

	/**
	 * Unregister a namespace.
	 *
	 * @since 2.8.0
	 *
	 * @param string $id Namespace id.
	 * @return void
	 */
	public static function unregister( $id ) {

		unset( self::$namespaces[ self::sanitize_id( $id ) ] );

	} // end unregister;

	/**
	 * Reset registry state (tests).
	 *
	 * @since 2.8.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$namespaces = array();

	} // end reset;

	/**
	 * Convert a slug into a human-readable label.
	 *
	 * @since 2.8.0
	 *
	 * @param string $id Namespace id.
	 * @return string
	 */
	public static function humanize_id( $id ) {

		$id = str_replace( array( '_', '-' ), ' ', (string) $id );

		if ( function_exists( 'wp_strip_all_tags' ) ) {
			$id = wp_strip_all_tags( $id );
		}

		$id = trim( preg_replace( '/\s+/', ' ', $id ) );

		return '' === $id ? 'General' : ucwords( $id );

	} // end humanize_id;

} // end class Jumper_Namespace_Registry;
