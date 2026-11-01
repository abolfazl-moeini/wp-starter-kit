<?php
/**
 * Extension context filters (playground parity, menu wiring).
 *
 * Core exposes filter hooks; wpdev-playground hooks them when active.
 *
 * @package WPDevFramework\Core\Functions
 * @since   2.8.5
 */

defined( 'ABSPATH' ) || exit;

/**
 * Whether WPDev should use site-admin storage and URLs instead of network admin.
 *
 * @since 2.8.5
 * @return bool
 */
if (!function_exists('wpdev_uses_site_admin_context')) {
function wpdev_uses_site_admin_context() {

	return (bool) apply_filters( 'wpdev_uses_site_admin_context', false );

}
}
 // end wpdev_uses_site_admin_context;

/**
 * Whether pg_* sandbox menus may wire WordPress admin_menu hooks.
 *
 * @since 2.8.5
 * @return bool
 */
if (!function_exists('wpdev_is_menu_register_context')) {
function wpdev_is_menu_register_context() {

	return (bool) apply_filters( 'wpdev_menu_register_context', false );

}
}
 // end wpdev_is_menu_register_context;
