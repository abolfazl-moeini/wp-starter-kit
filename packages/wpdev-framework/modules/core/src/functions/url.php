<?php
/**
 * URL Helper Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Returns the current URL.
 *
 * @since 2.0.0
 * @return string
 */
if (!function_exists('wpdev_get_current_url')) {
function wpdev_get_current_url() {
	/*
	 * When doing ajax requests, we don't want the admin-ajax URL, but
	 * the initiator URL.
	 */
	if (wp_doing_ajax() && isset($_SERVER['HTTP_REFERER'])) {

		return $_SERVER['HTTP_REFERER'];

	} // end if;

	return (is_ssl() ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];

}
}
 // end wpdev_get_current_url;

/**
 * Replaces or removes the scheme from a URL.
 *
 * @since 2.0.0
 *
 * @param string $url The URL to process.
 * @param string $new_scheme An empty string, https, or http.
 * @return string
 */
if (!function_exists('wpdev_replace_scheme')) {
function wpdev_replace_scheme($url, $new_scheme = '') {

	return preg_replace('(^https?://)', $new_scheme, $url);

}
}
 // end wpdev_replace_scheme;

/**
 * Build a WPDev admin.php URL for the correct admin area (site vs network).
 *
 * Prefers where the page slug is registered (`Capability_Registry` panels):
 * - only `admin_menu` → site admin (`wp-admin`)
 * - only `network_admin_menu` → network admin (`wp-admin/network`)
 * - both or unknown → current request context (`is_network_admin()`)
 *
 * The legacy name is kept for backward compatibility; callers should not switch
 * to raw `network_admin_url( 'admin.php?page=…' )`.
 *
 * @since 2.0.0
 *
 * @param string $path  WPDev page slug (may include extra query fragments after `&`).
 * @param array  $query URL query parameters.
 * @return string
 */
if (!function_exists('wpdev_network_admin_url')) {
function wpdev_network_admin_url($path, $query = array()) {

	$page_slug = (string) $path;

	if ( false !== strpos( $page_slug, '&' ) ) {
		$page_slug = strstr( $page_slug, '&', true );
	}

	$page_slug  = sanitize_key( $page_slug );
	$admin_path = sprintf( 'admin.php?page=%s', $path );

	if ( function_exists( 'wpdev_is_network_context' ) && ! wpdev_is_network_context() ) {
		$url = admin_url( $admin_path );
	} else {
		$url = wpdev_resolve_admin_page_base_url( $admin_path, $page_slug );
	}

	return add_query_arg( $query, $url );

}
}
 // end wpdev_network_admin_url;

/**
 * Resolve site vs network base URL for a registered (or unknown) admin page.
 *
 * @since 2.12.1
 *
 * @param string $admin_path Path passed to admin_url / network_admin_url (e.g. admin.php?page=…).
 * @param string $page_slug  Sanitized page id.
 * @return string
 */
if (!function_exists('wpdev_resolve_admin_page_base_url')) {
function wpdev_resolve_admin_page_base_url( $admin_path, $page_slug ) {

	$panels = null;

	if ( class_exists( '\WPDevFramework\Core\Capabilities\Capability_Registry' ) ) {
		$panels = \WPDevFramework\Core\Capabilities\Capability_Registry::get_page_panels( $page_slug );
	}

	$has_site    = is_array( $panels ) && isset( $panels['admin_menu'] );
	$has_network = is_array( $panels ) && isset( $panels['network_admin_menu'] );

	if ( $has_site && ! $has_network ) {
		return admin_url( $admin_path );
	}

	if ( $has_network && ! $has_site ) {
		return network_admin_url( $admin_path );
	}

	// Both panels registered, or page not in the registry yet — follow current admin.
	if ( function_exists( 'is_network_admin' ) && is_network_admin() ) {
		return network_admin_url( $admin_path );
	}

	return admin_url( $admin_path );

}
}
 // end wpdev_resolve_admin_page_base_url;

/**
 * Get the light ajax implementation URL.
 *
 * @since 2.0.0
 *
 * @param null|string $when The wpdev-when parameter to be used, defaults to plugins_loaded.
 * @param array       $query_args List of additional query args to add to the final URL.
 * @param int         $site_id The site to use as a base.
 * @param null|string $scheme URL scheme. Follows the same rules as the scheme param of get_home_url.
 * @return string
 */
if (!function_exists('wpdev_ajax_url')) {
function wpdev_ajax_url($when = null, $query_args = array(), $site_id = false, $scheme = null) {

	if (empty($site_id)) {

		$site_id = get_current_blog_id();

	} // end if;

	$base_url = get_home_url($site_id, '', $scheme);

	if (!is_array($query_args)) {

		$query_args = array();

	} // end if;

	$query_args['wpdev-ajax'] = 1;
	$query_args['r']       = wp_create_nonce('wpdev-ajax-nonce');

	if ($when) {

		$query_args['wpdev-when'] = base64_encode($when);

	} // end if;

	$url = add_query_arg($query_args, $base_url);

	return apply_filters('wpdev_ajax_url', $url, $query_args, $when, $site_id);

}
}
 // end wpdev_ajax_url;

/**
 * Build a raw nonce URL suitable for JSON responses (without HTML-encoded &amp; entities).
 *
 * @since 2.14.0
 *
 * @param string     $url    Raw action URL.
 * @param int|string $action Nonce action name.
 * @param string     $name   Query argument name for nonce. Default '_wpnonce'.
 * @return string Raw URL with nonce query argument.
 */
if ( ! function_exists( 'wpdev_nonce_url_for_json' ) ) {
function wpdev_nonce_url_for_json( $url, $action = -1, $name = '_wpnonce' ) {

	$nonce = function_exists( 'wp_create_nonce' ) ? wp_create_nonce( $action ) : '';

	return add_query_arg( $name, $nonce, $url );

}
}
// end wpdev_nonce_url_for_json;
