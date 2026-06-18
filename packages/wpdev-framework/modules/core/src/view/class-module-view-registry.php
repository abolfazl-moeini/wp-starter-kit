<?php
/**
 * Module view root registry for template resolution.
 *
 * @package WPDevFramework\Core
 * @since   2.5.0
 */

namespace WPDevFramework\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Maps module ids to view directory roots (searched in registration order).
 */
class Module_View_Registry {

	/**
	 * Registered view roots keyed by module id.
	 *
	 * @var array<string, string>
	 */
	protected static $roots = array();

	/**
	 * Register a module views directory.
	 *
	 * @since 2.5.0
	 *
	 * @param string      $module_id Module slug.
	 * @param string|null $path      Absolute path to views root; defaults to {module}/views.
	 * @return void
	 */
	public static function register( $module_id, $path = null ) {

		if ( null === $path ) {
			$modules = Module_Loader::all();

			if ( empty( $modules[ $module_id ]['path'] ) ) {
				return;
			}

			$path = rtrim( $modules[ $module_id ]['path'], '/\\' ) . '/views';
		}

		if ( is_dir( $path ) ) {
			self::$roots[ $module_id ] = rtrim( $path, '/\\' );
		}

	} // end register;

	/**
	 * Locate a view file under registered module roots.
	 *
	 * @since 2.5.0
	 *
	 * @param string $view View slug (e.g. taxes/list).
	 * @return string Absolute path or empty string.
	 */
	public static function locate( $view ) {

		$view = ltrim( str_replace( '\\', '/', (string) $view ), '/' );
		$view = preg_replace( '/\.php$/', '', $view );

		foreach ( self::$roots as $root ) {
			$path = $root . '/' . $view . '.php';

			if ( is_readable( $path ) ) {
				return $path;
			}
		}

		return '';

	} // end locate;

} // end class Module_View_Registry;
