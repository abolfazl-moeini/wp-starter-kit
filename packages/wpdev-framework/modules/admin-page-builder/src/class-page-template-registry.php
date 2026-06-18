<?php
/**
 * Admin page template registry.
 *
 * @package WPDevFramework\Modules\AdminPageBuilder
 * @since   2.5.0
 */

namespace WPDevFramework\Modules\AdminPageBuilder;

use WPDevFramework\Core\Registry_Base;

defined( 'ABSPATH' ) || exit;

/**
 * Maps page layout types to view paths resolved by wpdev_get_template().
 */
class Page_Template_Registry extends Registry_Base {

	/**
	 * Registered templates keyed by layout slug.
	 *
	 * @var array<string, string>
	 */
	protected static $templates = array();

	/**
	 * Register a page layout template path (without .php).
	 *
	 * @since 2.5.0
	 *
	 * @param string $layout_type Layout slug (list, edit, wizard, etc.).
	 * @param string $view_path  View path relative to module views root.
	 * @return void
	 */
	public static function register( $layout_type, $view_path, $replace = true ) {

		return self::store( self::$templates, $layout_type, $view_path, (bool) $replace );

	} // end register;

	/**
	 * Get a registered template path.
	 *
	 * @since 2.7.0
	 *
	 * @param string $layout_type Layout slug.
	 * @return string|null
	 */
	public static function get( $layout_type ) {

		$layout_type = self::sanitize_id( $layout_type );

		return self::$templates[ $layout_type ] ?? null;

	} // end get;

	/**
	 * Whether a layout is registered.
	 *
	 * @since 2.7.0
	 *
	 * @param string $layout_type Layout slug.
	 * @return bool
	 */
	public static function has( $layout_type ) {

		return isset( self::$templates[ self::sanitize_id( $layout_type ) ] );

	} // end has;

	/**
	 * Unregister a layout template.
	 *
	 * @since 2.7.0
	 *
	 * @param string $layout_type Layout slug.
	 * @return void
	 */
	public static function unregister( $layout_type ) {

		unset( self::$templates[ self::sanitize_id( $layout_type ) ] );

	} // end unregister;

	/**
	 * Reset registry state (unit tests).
	 *
	 * @since 2.7.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$templates = array();

	} // end reset;

	/**
	 * Resolve a layout type to a view path.
	 *
	 * @since 2.5.0
	 *
	 * @param string $layout_type Layout slug.
	 * @param string $default     Fallback view path.
	 * @return string
	 */
	public static function resolve( $layout_type, $default = '' ) {

		$layout_type = \sanitize_key( $layout_type );

		if ( isset( self::$templates[ $layout_type ] ) ) {
			return self::$templates[ $layout_type ];
		}

		return $default;

	} // end resolve;

	/**
	 * Return all registered templates.
	 *
	 * @since 2.5.0
	 *
	 * @return array<string, string>
	 */
	public static function all() {

		return self::$templates;

	} // end all;

} // end class Page_Template_Registry;
