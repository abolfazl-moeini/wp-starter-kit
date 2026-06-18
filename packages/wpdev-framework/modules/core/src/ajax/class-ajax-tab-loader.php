<?php
/**
 * Generic AJAX tab loader (J-06).
 *
 * Extracts the Add-ons page pattern (tabs whose content loads via AJAX) into a
 * reusable core service. Register a callback per tab group; the loader exposes
 * a single admin-ajax endpoint that renders the requested tab.
 *
 * @package WPDevFramework\Core\Ajax
 * @since   2.6.0
 */

namespace WPDevFramework\Core\Ajax;

defined( 'ABSPATH' ) || exit;

/**
 * Registry + endpoint for AJAX-loaded admin tabs.
 */
class Ajax_Tab_Loader {

	/**
	 * Registered tab group callbacks keyed by group slug.
	 *
	 * @var array<string, callable>
	 */
	protected static $groups = array();

	/**
	 * Register the admin-ajax endpoint.
	 *
	 * @since 2.6.0
	 * @return void
	 */
	public static function boot() {

		if ( function_exists( 'wpdev_require_public_function' ) ) {
			wpdev_require_public_function( 'ajax' );
		}

		if ( function_exists( 'wpdev_register_ajax_handler' ) ) {
			wpdev_register_ajax_handler( 'wpdev_load_admin_tab', array( __CLASS__, 'handle' ) );
			return;
		}

		add_action( 'wp_ajax_wpdev_load_admin_tab', array( __CLASS__, 'handle' ) );

	} // end boot;

	/**
	 * Register a tab group renderer.
	 *
	 * @since 2.6.0
	 *
	 * @param string   $group    Tab group slug (usually the page id).
	 * @param callable $callback Receives the requested tab slug; echoes or returns HTML.
	 * @return void
	 */
	public static function register( $group, $callback ) {

		self::$groups[ self::key( $group ) ] = $callback;

	} // end register;

	/**
	 * Whether a tab group is registered.
	 *
	 * @since 2.6.0
	 *
	 * @param string $group Tab group slug.
	 * @return bool
	 */
	public static function has( $group ) {

		return isset( self::$groups[ self::key( $group ) ] );

	} // end has;

	/**
	 * Build the AJAX URL that loads a tab.
	 *
	 * @since 2.6.0
	 *
	 * @param string $group Tab group slug.
	 * @param string $tab   Tab slug.
	 * @return string
	 */
	public static function url( $group, $tab = '' ) {

		return add_query_arg(
			array(
				'action'    => 'wpdev_load_admin_tab',
				'tab_group' => self::key( $group ),
				'tab'       => self::key( $tab ),
				'nonce'     => wp_create_nonce( 'wpdev-ajax-nonce' ),
			),
			admin_url( 'admin-ajax.php' )
		);

	} // end url;

	/**
	 * Handle the AJAX tab request.
	 *
	 * @since 2.6.0
	 * @return void
	 */
	public static function handle() {

		check_ajax_referer( 'wpdev-ajax-nonce', 'nonce' );

		$group = isset( $_REQUEST['tab_group'] ) ? self::key( wp_unslash( $_REQUEST['tab_group'] ) ) : '';
		$tab   = isset( $_REQUEST['tab'] ) ? self::key( wp_unslash( $_REQUEST['tab'] ) ) : '';

		if ( ! self::has( $group ) ) {
			Ajax_Response::error( __( 'Unknown tab group.', 'wpdev' ), 'unknown_tab_group', null, 404 );
			return;
		}

		$callback = self::$groups[ $group ];

		if ( ! is_callable( $callback ) ) {
			Ajax_Response::error( __( 'Tab group is not callable.', 'wpdev' ), 'invalid_tab_callback', null, 500 );
			return;
		}

		ob_start();
		$returned = call_user_func( $callback, $tab );
		$echoed   = ob_get_clean();

		$html = ( is_string( $returned ) && '' !== $returned ) ? $returned : $echoed;

		Ajax_Response::success(
			array(
				'tab'  => $tab,
				'html' => $html,
			)
		);

	} // end handle;

	/**
	 * Normalize a slug without requiring WP at registration time in tests.
	 *
	 * @since 2.6.0
	 *
	 * @param string $value Raw slug.
	 * @return string
	 */
	protected static function key( $value ) {

		if ( function_exists( 'sanitize_key' ) ) {
			return sanitize_key( (string) $value );
		}

		return strtolower( preg_replace( '/[^a-z0-9_\-]/i', '', (string) $value ) );

	} // end key;

} // end class Ajax_Tab_Loader;
