<?php
/**
 * Legacy admin tab styles (deprecated).
 *
 * @package WPDevFramework\Functions
 * @since   2.6.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueue legacy tab styles for third-party add-on panels (K4-11).
 *
 * @since 2.6.0
 * @deprecated 2.6.0 Use wpdev_render_tab_navigation() and metabox tabs instead.
 *
 * @return void
 */
function wpdev_enqueue_legacy_admin_tabs() {

	_deprecated_function( __FUNCTION__, '2.6.0', 'wpdev_render_tab_navigation()' );

	if ( ! function_exists( 'wpdev_get_asset' ) || ! function_exists( 'wpdev_get_version' ) ) {
		return;
	}

	wp_enqueue_style(
		'wpdev-legacy-admin-tabs',
		wpdev_get_asset( 'legacy-admin-tabs.css', 'css' ),
		array(),
		wpdev_get_version()
	);

} // end wpdev_enqueue_legacy_admin_tabs;
