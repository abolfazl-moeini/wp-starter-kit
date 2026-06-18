<?php
/**
 * Metabox registry (K6-01).
 *
 * Formal registry above Edit_Page_Widgets trait helpers. Metabox definitions
 * registered here are available for introspection and third-party extensions.
 *
 * @package WPDevFramework\Modules\MetaboxBuilder
 * @since   2.6.0
 */

namespace WPDevFramework\Modules\MetaboxBuilder;

use WPDevFramework\Core\Registry_Base;

defined( 'ABSPATH' ) || exit;

/**
 * Tracks metabox widget definitions keyed by page id.
 */
class Metabox_Registry extends Registry_Base {

	/**
	 * Registered metaboxes: page_id => [ metabox_id => config ].
	 *
	 * @var array<string, array<string, array<string, mixed>>>
	 */
	protected static $metaboxes = array();

	/**
	 * Boot registry hook.
	 *
	 * @since 2.6.0
	 * @return void
	 */
	public static function init() {

		/**
		 * Fires when metabox-builder widgets can be registered.
		 *
		 * @since 2.6.0
		 */
		do_action( 'wpdev_metabox_register' );

	} // end init;

	/**
	 * Register a metabox for an admin page.
	 *
	 * @since 2.6.0
	 *
	 * @param string               $page_id    Admin page slug.
	 * @param string               $metabox_id Metabox id.
	 * @param array<string, mixed> $config     { title, template, context, priority, callback }.
	 * @return void
	 */
	public static function register( $page_id, $metabox_id, array $config, $replace = true ) {

		$page_id    = self::sanitize_id( $page_id );
		$metabox_id = self::sanitize_id( $metabox_id );

		if ( '' === $page_id || '' === $metabox_id ) {
			return false;
		}

		if ( ! isset( self::$metaboxes[ $page_id ] ) ) {
			self::$metaboxes[ $page_id ] = array();
		}

		return self::store( self::$metaboxes[ $page_id ], $metabox_id, $config, (bool) $replace );

	} // end register;

	/**
	 * Whether a metabox is registered.
	 *
	 * @since 2.7.0
	 *
	 * @param string $page_id    Admin page slug.
	 * @param string $metabox_id Metabox id.
	 * @return bool
	 */
	public static function has( $page_id, $metabox_id ) {

		$page_id    = self::sanitize_id( $page_id );
		$metabox_id = self::sanitize_id( $metabox_id );

		return isset( self::$metaboxes[ $page_id ][ $metabox_id ] );

	} // end has;

	/**
	 * Get a single metabox config.
	 *
	 * @since 2.7.0
	 *
	 * @param string $page_id    Admin page slug.
	 * @param string $metabox_id Metabox id.
	 * @return array<string, mixed>|null
	 */
	public static function get( $page_id, $metabox_id ) {

		$page_id    = self::sanitize_id( $page_id );
		$metabox_id = self::sanitize_id( $metabox_id );

		return self::$metaboxes[ $page_id ][ $metabox_id ] ?? null;

	} // end get;

	/**
	 * Unregister a metabox.
	 *
	 * @since 2.7.0
	 *
	 * @param string $page_id    Admin page slug.
	 * @param string $metabox_id Metabox id.
	 * @return void
	 */
	public static function unregister( $page_id, $metabox_id ) {

		$page_id    = self::sanitize_id( $page_id );
		$metabox_id = self::sanitize_id( $metabox_id );

		unset( self::$metaboxes[ $page_id ][ $metabox_id ] );

	} // end unregister;

	/**
	 * Reset registry state (unit tests).
	 *
	 * @since 2.7.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$metaboxes = array();

	} // end reset;

	/**
	 * Get metaboxes for a page.
	 *
	 * @since 2.6.0
	 *
	 * @param string $page_id Admin page slug.
	 * @return array<string, array<string, mixed>>
	 */
	public static function get_for_page( $page_id ) {

		$page_id = sanitize_key( (string) $page_id );

		return self::$metaboxes[ $page_id ] ?? array();

	} // end get_for_page;

	/**
	 * Return all registered metaboxes.
	 *
	 * @since 2.6.0
	 *
	 * @return array<string, array<string, array<string, mixed>>>
	 */
	public static function all() {

		return self::$metaboxes;

	} // end all;

	/**
	 * Render registered metaboxes for a page (public API).
	 *
	 * @since 2.6.0
	 *
	 * @param string $page_id    Admin page slug.
	 * @param string $metabox_id Optional single metabox id.
	 * @return void
	 */
	public static function render( $page_id, $metabox_id = '' ) {

		$boxes = self::get_for_page( $page_id );

		if ( '' !== (string) $metabox_id ) {
			$metabox_id = sanitize_key( (string) $metabox_id );
			$boxes      = isset( $boxes[ $metabox_id ] ) ? array( $metabox_id => $boxes[ $metabox_id ] ) : array();
		}

		foreach ( $boxes as $config ) {
			if ( empty( $config['callback'] ) || ! is_callable( $config['callback'] ) ) {
				continue;
			}

			call_user_func( $config['callback'], $config );
		}

	} // end render;

} // end class Metabox_Registry;
