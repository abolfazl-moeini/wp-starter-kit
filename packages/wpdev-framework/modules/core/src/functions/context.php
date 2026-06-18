<?php
/**
 * Single-site vs multisite admin context helpers.
 *
 * Independent from playground parity; uses is_multisite() only.
 *
 * @package WPDevFramework\Core
 * @since   2.7.0
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'wpdev_is_network_context' ) ) {

	/**
	 * Whether WPDev should use network-admin semantics (menus, caps, URLs).
	 *
	 * @since 2.7.0
	 * @return bool
	 */
	function wpdev_is_network_context() {

		return function_exists( 'is_multisite' ) && is_multisite();

	} // end wpdev_is_network_context;

	/**
	 * Map a panel hook name for the current install type.
	 *
	 * @since 2.7.0
	 *
	 * @param string $panel Admin panel hook (admin_menu, network_admin_menu, user_admin_menu).
	 * @return string
	 */
	function wpdev_admin_panel_for_context( $panel ) {

		$panel = (string) $panel;

		if ( ! wpdev_is_network_context() && 'network_admin_menu' === $panel ) {
			return 'admin_menu';
		}

		return $panel;

	} // end wpdev_admin_panel_for_context;

	/**
	 * Map a capability for the current install type.
	 *
	 * @since 2.7.0
	 *
	 * @param string $capability Capability slug.
	 * @return string
	 */
	function wpdev_admin_capability_for( $capability ) {

		$capability = (string) $capability;

		if ( ! wpdev_is_network_context() ) {
			if ( 'manage_network' === $capability ) {
				return 'manage_options';
			}

			if ( 'manage_network_plugins' === $capability ) {
				return 'activate_plugins';
			}
		}

		return $capability;

	} // end wpdev_admin_capability_for;

	/**
	 * Translate supported_panels map for single-site (network panel -> site admin).
	 *
	 * @since 2.7.0
	 *
	 * @param array<string, string> $panels Panel hook => capability map.
	 * @return array<string, string>
	 */
	function wpdev_translate_supported_panels( array $panels ) {

		if ( wpdev_is_network_context() || empty( $panels ) ) {
			return $panels;
		}

		$translated = array();

		foreach ( $panels as $panel => $capability ) {
			$panel       = wpdev_admin_panel_for_context( (string) $panel );
			$capability  = wpdev_admin_capability_for( (string) $capability );
			$translated[ $panel ] = $capability;
		}

		return $translated;

	} // end wpdev_translate_supported_panels;

	/**
	 * Whether the current user has a WPDev admin capability in the current context.
	 *
	 * @since 2.7.0
	 *
	 * @param string $capability Capability slug (typically manage_network).
	 * @return bool
	 */
	function wpdev_current_user_can_admin( $capability = 'manage_network' ) {

		if ( ! is_user_logged_in() ) {
			return false;
		}

		return current_user_can( wpdev_admin_capability_for( $capability ) );

	} // end wpdev_current_user_can_admin;

}
