<?php
/**
 * Admin panel capability registry.
 *
 * @package WPDevFramework\Core\Capabilities
 * @since   2.5.0
 */

namespace WPDevFramework\Core\Capabilities;

defined( 'ABSPATH' ) || exit;

/**
 * Maps admin panels and page slugs to capabilities.
 */
class Capability_Registry {

	/**
	 * Default capability per admin panel hook.
	 *
	 * @var array<string, string>
	 */
	protected static $panel_defaults = array(
		'admin_menu'         => 'manage_options',
		'network_admin_menu' => 'manage_network',
		'user_admin_menu'    => 'manage_options',
	);

	/**
	 * Registered page capabilities keyed by page slug.
	 *
	 * @var array<string, array<string, string>>
	 */
	protected static $pages = array();

	/**
	 * Register capabilities for an admin page slug.
	 *
	 * @since 2.5.0
	 *
	 * @param string               $page_slug         Page id/slug.
	 * @param array<string,string> $supported_panels  Panel => capability map.
	 * @return void
	 */
	public static function register_page( $page_slug, array $supported_panels ) {

		self::$pages[ \sanitize_key( $page_slug ) ] = $supported_panels;

	} // end register_page;

	/**
	 * Resolve capability for the current admin context.
	 *
	 * @since 2.5.0
	 *
	 * @param array<string,string>|null $supported_panels Optional inline map.
	 * @return string
	 */
	public static function resolve_for_context( $supported_panels = null ) {

		if ( is_user_admin() ) {
			$panel = 'user_admin_menu';
		} elseif ( is_network_admin() ) {
			$panel = 'network_admin_menu';
		} else {
			$panel = 'admin_menu';
		}

		if ( is_array( $supported_panels ) && isset( $supported_panels[ $panel ] ) ) {
			return \wpdev_admin_capability_for( $supported_panels[ $panel ] );
		}

		if ( is_array( $supported_panels ) && ! \wpdev_is_network_context() && isset( $supported_panels['network_admin_menu'] ) ) {
			return \wpdev_admin_capability_for( $supported_panels['network_admin_menu'] );
		}

		$default = self::$panel_defaults[ $panel ] ?? 'manage_options';

		return \wpdev_admin_capability_for( $default );

	} // end resolve_for_context;

	/**
	 * Resolve capability for a registered page slug.
	 *
	 * @since 2.5.0
	 *
	 * @param string      $page_slug Page id/slug.
	 * @param string|null $context   Optional: network, user, site. Defaults to current admin context.
	 * @return string|null Capability slug or null when the page is not registered.
	 */
	public static function capability_for_page( $page_slug, $context = null ) {

		$panels = self::get_page_panels( $page_slug );

		if ( null === $panels ) {
			return null;
		}

		if ( null !== $context ) {
			$panel_map = array(
				'network' => 'network_admin_menu',
				'user'    => 'user_admin_menu',
				'site'    => 'admin_menu',
			);

			$panel = $panel_map[ $context ] ?? null;

			if ( $panel && isset( $panels[ $panel ] ) ) {
				return $panels[ $panel ];
			}

			return null;
		}

		return self::resolve_for_context( $panels );

	} // end capability_for_page;

	/**
	 * Get registered panels for a page slug.
	 *
	 * @since 2.5.0
	 *
	 * @param string $page_slug Page id/slug.
	 * @return array<string,string>|null
	 */
	public static function get_page_panels( $page_slug ) {

		$page_slug = \sanitize_key( $page_slug );

		return self::$pages[ $page_slug ] ?? null;

	} // end get_page_panels;

} // end class Capability_Registry;
