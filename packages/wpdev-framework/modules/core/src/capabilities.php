<?php
/**
 * Capability helpers.
 *
 * @package WPDevFramework\Core
 * @since   2.5.0
 */

use WPDevFramework\Core\Capabilities\Capability_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Check whether the current user has a capability in an admin context.
 *
 * @since 2.5.0
 *
 * @param string      $cap     Capability slug.
 * @param string|null $context Optional context: network, user, site.
 * @return bool
 */
function wpdev_user_can( $cap, $context = null ) {

	if ( ! is_user_logged_in() ) {
		return false;
	}

	if ( 'network' === $context ) {
		if ( function_exists( 'wpdev_is_network_context' ) && ! wpdev_is_network_context() ) {
			return current_user_can( wpdev_admin_capability_for( $cap ) );
		}

		return is_multisite() && current_user_can( $cap );
	}

	if ( 'user' === $context ) {
		return is_user_admin() && current_user_can( $cap );
	}

	if ( 'site' === $context ) {
		return ! is_network_admin() && ! is_user_admin() && current_user_can( $cap );
	}

	return current_user_can( $cap );

} // end wpdev_user_can;

/**
 * Resolve the capability registered for an admin page slug.
 *
 * @since 2.5.0
 *
 * @param string      $page_slug Page id/slug.
 * @param string|null $context   Optional: network, user, site.
 * @return string|null
 */
function wpdev_page_capability( $page_slug, $context = null ) {

	return Capability_Registry::capability_for_page( $page_slug, $context );

} // end wpdev_page_capability;

/**
 * Resolve the capability required for the current admin panel context.
 *
 * @since 2.5.0
 *
 * @param array<string,string>|null $supported_panels Panel => capability map.
 * @return string
 */
function wpdev_resolve_admin_capability( $supported_panels = null ) {

	return Capability_Registry::resolve_for_context( $supported_panels );

} // end wpdev_resolve_admin_capability;
