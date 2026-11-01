<?php
/**
 * Autoloader for optional bundled addons under addons/{slug}/src/.
 *
 * @package WPDevFramework\Core
 * @since   2.10.0
 */

namespace WPDevFramework\Core;

defined( 'ABSPATH' ) || exit;

if ( class_exists( __NAMESPACE__ . '\Addon_Autoloader', false ) ) {
	return;
}

/**
 * Maps registered addon id → absolute src directory for PSR-4-ish loading.
 *
 * Addon classes should live under WPDevFramework\Addons\{PascalSlug}\*.
 */
class Addon_Autoloader {

	/**
	 * @var bool
	 */
	protected static $initialized = false;

	/**
	 * @var array<string, string> addon_id => absolute path to src/
	 */
	protected static $roots = array();

	/**
	 * Register the autoloader (idempotent).
	 *
	 * @return void
	 */
	public static function init() {

		if ( self::$initialized ) {
			return;
		}

		self::$initialized = true;

		spl_autoload_register( array( __CLASS__, 'autoload' ), true, true );

	} // end init;

	/**
	 * Register an addon source root.
	 *
	 * @param string $addon_id Addon folder slug (e.g. wpdev-updater).
	 * @param string $src_dir  Absolute path to the addon's src/ directory.
	 * @return void
	 */
	public static function register( $addon_id, $src_dir ) {

		$addon_id = (string) $addon_id;
		$src_dir  = trailingslashit( (string) $src_dir );

		if ( '' === $addon_id || ! is_dir( $src_dir ) ) {
			return;
		}

		self::$roots[ $addon_id ] = $src_dir;

	} // end register;

	/**
	 * @param string $class Fully-qualified class name.
	 * @return void
	 */
	public static function autoload( $class ) {

		if ( 0 !== strpos( $class, 'WPDevFramework\\Addons\\' ) ) {
			return;
		}

		$relative = substr( $class, strlen( 'WPDevFramework\\Addons\\' ) );
		$parts    = explode( '\\', $relative );

		if ( count( $parts ) < 2 ) {
			return;
		}

		$pascal_slug = array_shift( $parts );
		$addon_id    = self::pascal_to_addon_id( $pascal_slug );

		if ( ! isset( self::$roots[ $addon_id ] ) ) {
			// Fallback: try hyphenated folder matching the pascal conversion of full id.
			foreach ( self::$roots as $id => $root ) {
				if ( self::addon_id_to_pascal( $id ) === $pascal_slug ) {
					$addon_id = $id;
					break;
				}
			}
		}

		if ( ! isset( self::$roots[ $addon_id ] ) ) {
			return;
		}

		$file = self::$roots[ $addon_id ] . 'class-' . self::class_file_name( end( $parts ) ) . '.php';

		// Prefer nested path mirroring namespace after the addon segment.
		$nested = self::$roots[ $addon_id ];
		foreach ( $parts as $i => $segment ) {
			if ( $i === count( $parts ) - 1 ) {
				$nested .= 'class-' . self::class_file_name( $segment ) . '.php';
			} else {
				$nested .= strtolower( preg_replace( '/([a-z])([A-Z])/', '$1-$2', $segment ) ) . '/';
			}
		}

		if ( is_readable( $nested ) ) {
			require_once $nested;
			return;
		}

		if ( is_readable( $file ) ) {
			require_once $file;
		}

	} // end autoload;

	/**
	 * @param string $pascal PascalCase slug (e.g. WpdevUpdater).
	 * @return string
	 */
	protected static function pascal_to_addon_id( $pascal ) {

		$kebab = strtolower( preg_replace( '/([a-z0-9])([A-Z])/', '$1-$2', $pascal ) );

		return $kebab;

	} // end pascal_to_addon_id;

	/**
	 * @param string $addon_id e.g. wpdev-updater.
	 * @return string e.g. WpdevUpdater
	 */
	protected static function addon_id_to_pascal( $addon_id ) {

		return str_replace( ' ', '', ucwords( str_replace( array( '-', '_' ), ' ', $addon_id ) ) );

	} // end addon_id_to_pascal;

	/**
	 * @param string $class_base Final class segment.
	 * @return string kebab class file stem without "class-" prefix.
	 */
	protected static function class_file_name( $class_base ) {

		return strtolower( preg_replace( '/([a-z0-9])([A-Z])/', '$1-$2', $class_base ) );

	} // end class_file_name;

} // end class Addon_Autoloader;
