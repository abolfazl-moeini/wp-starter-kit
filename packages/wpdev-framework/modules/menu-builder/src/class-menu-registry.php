<?php
/**
 * Admin menu page registry.
 *
 * @package WPDevFramework\Modules\MenuBuilder
 * @since   2.5.0
 */

namespace WPDevFramework\Modules\MenuBuilder;

use WPDevFramework\Core\Registry_Base;

defined( 'ABSPATH' ) || exit;

/**
 * Tracks registered admin pages for introspection and extensions.
 */
class Menu_Registry extends Registry_Base {

	/**
	 * Registered pages keyed by slug.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	protected static $pages = array();

	/**
	 * WordPress admin hook suffixes keyed by page slug (from add_menu_page / add_submenu_page).
	 *
	 * @var array<string, string>
	 */
	protected static $page_hooks = array();

	/**
	 * Register an admin page definition.
	 *
	 * @since 2.5.0
	 *
	 * @param string               $page_slug Page id/slug.
	 * @param array<string, mixed> $config    Page metadata.
	 * @return void
	 */
	public static function register( $page_slug, array $config, $replace = true ) {

		return self::store( self::$pages, $page_slug, $config, (bool) $replace );

	} // end register;

	/**
	 * Whether a page is registered.
	 *
	 * @since 2.7.0
	 *
	 * @param string $page_slug Page id/slug.
	 * @return bool
	 */
	public static function has( $page_slug ) {

		return null !== self::get( $page_slug );

	} // end has;

	/**
	 * Unregister a page definition.
	 *
	 * @since 2.7.0
	 *
	 * @param string $page_slug Page id/slug.
	 * @return void
	 */
	public static function unregister( $page_slug ) {

		unset( self::$pages[ self::sanitize_id( $page_slug ) ] );

	} // end unregister;

	/**
	 * Reset registry state (unit tests).
	 *
	 * @since 2.7.0
	 *
	 * @return void
	 */
	public static function reset() {

		self::$pages      = array();
		self::$page_hooks = array();

	} // end reset;

	/**
	 * Store the WordPress hook suffix for an admin page slug.
	 *
	 * @since 2.7.0
	 *
	 * @param string $page_slug Page slug.
	 * @param string $page_hook Hook suffix returned by add_*_page().
	 * @return void
	 */
	public static function set_page_hook( $page_slug, $page_hook ) {

		$page_slug = \sanitize_key( (string) $page_slug );
		$page_hook = (string) $page_hook;

		if ( '' === $page_slug || '' === $page_hook ) {
			return;
		}

		self::$page_hooks[ $page_slug ] = $page_hook;

		if ( isset( self::$pages[ $page_slug ] ) ) {
			self::$pages[ $page_slug ]['page_hook'] = $page_hook;
		}

	} // end set_page_hook;

	/**
	 * Resolve the admin hook suffix for a registered page slug.
	 *
	 * @since 2.7.0
	 *
	 * @param string $page_slug Page slug.
	 * @return string
	 */
	public static function get_page_hook( $page_slug ) {

		$page_slug = \sanitize_key( (string) $page_slug );

		if ( isset( self::$page_hooks[ $page_slug ] ) ) {
			return (string) self::$page_hooks[ $page_slug ];
		}

		$config = self::get( $page_slug );

		return is_array( $config ) ? (string) ( $config['page_hook'] ?? '' ) : '';

	} // end get_page_hook;

	/**
	 * Get a registered page config.
	 *
	 * @since 2.5.0
	 *
	 * @param string $page_slug Page id/slug.
	 * @return array<string, mixed>|null
	 */
	public static function get( $page_slug ) {

		$page_slug = \sanitize_key( $page_slug );

		return self::$pages[ $page_slug ] ?? null;

	} // end get;

	/**
	 * Return all registered pages.
	 *
	 * @since 2.5.0
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function all() {

		return self::$pages;

	} // end all;

	/**
	 * Declarative API: register a top-level admin menu page (K4-01).
	 *
	 * Unlike register(), this both records the page and wires the WordPress
	 * `admin_menu`/`network_admin_menu` hook so third-party code can add a page
	 * without subclassing Base_Admin_Page.
	 *
	 * @since 2.6.0
	 *
	 * @param string               $slug Page slug.
	 * @param array<string, mixed> $args { title, menu_label, capability, callback, icon, position, network, context }.
	 *     `context` is `admin` | `network` | `both` (preferred over legacy `network` boolean).
	 * @return void
	 */
	public static function register_top( $slug, array $args ) {

		$args = \wp_parse_args(
			$args,
			array(
				'title'      => '',
				'menu_label' => '',
				'capability' => 'manage_options',
				'callback'   => '__return_false',
				'icon'       => 'dashicons-admin-generic',
				'position'   => null,
				'network'    => false,
				'type'       => 'menu',
			)
		);

		self::register( $slug, $args );
		self::hook_menu( $slug, $args, true );

	} // end register_top;

	/**
	 * Declarative API: register a child (submenu) admin page (K4-01).
	 *
	 * @since 2.6.0
	 *
	 * @param string               $parent_slug Parent page slug.
	 * @param string               $slug        Page slug.
	 * @param array<string, mixed> $args        { title, menu_label, capability, callback, network, context }.
	 * @return void
	 */
	public static function register_child( $parent_slug, $slug, array $args ) {

		$args = \wp_parse_args(
			$args,
			array(
				'title'      => '',
				'menu_label' => '',
				'capability' => 'manage_options',
				'callback'   => '__return_false',
				'network'    => false,
				'type'       => 'submenu',
			)
		);

		$args['parent'] = $parent_slug;

		self::register( $slug, $args );
		self::hook_menu( $slug, $args, false );

	} // end register_child;

	/**
	 * Resolve WordPress menu hooks for declarative registration args.
	 *
	 * @since 2.7.0
	 *
	 * @param array<string, mixed> $args Page config.
	 * @return string[] Hook names (admin_menu and/or network_admin_menu).
	 */
	protected static function menu_hooks_for_args( array $args ) {

		if ( ! empty( $args['context'] ) && function_exists( 'wpdev_admin_page_context_to_supported_panels' ) ) {
			$panels = wpdev_admin_page_context_to_supported_panels(
				(string) $args['context'],
				(string) ( $args['capability'] ?? 'manage_options' )
			);

			$hooks = array();

			if ( isset( $panels['admin_menu'] ) ) {
				$hooks[] = 'admin_menu';
			}

			if ( isset( $panels['network_admin_menu'] ) ) {
				$hooks[] = 'network_admin_menu';
			}

			return $hooks;
		}

		return array( ! empty( $args['network'] ) ? 'network_admin_menu' : 'admin_menu' );

	} // end menu_hooks_for_args;

	/**
	 * Wire the WordPress menu hook for a declarative page.
	 *
	 * @since 2.6.0
	 *
	 * @param string               $slug   Page slug.
	 * @param array<string, mixed> $args   Page config.
	 * @param bool                 $is_top Whether this is a top-level page.
	 * @return void
	 */
	protected static function hook_menu( $slug, array $args, $is_top ) {

		if ( ! self::should_wire_wordpress_menu( $slug ) ) {
			return;
		}

		foreach ( self::menu_hooks_for_args( $args ) as $hook ) {

			\add_action(
				$hook,
				static function () use ( $slug, $args, $is_top ) {

				$label = $args['menu_label'] ? $args['menu_label'] : $args['title'];

				if ( $is_top ) {

					$page_hook = \add_menu_page(
						$args['title'],
						$label,
						$args['capability'],
						$slug,
						$args['callback'],
						$args['icon'],
						$args['position']
					);

					if ( is_string( $page_hook ) && '' !== $page_hook ) {
						self::set_page_hook( $slug, $page_hook );
					}

					return;

				} // end if;

				$page_hook = \add_submenu_page(
					$args['parent'],
					$args['title'],
					$label,
					$args['capability'],
					$slug,
					$args['callback']
				);

				if ( is_string( $page_hook ) && '' !== $page_hook ) {
					self::set_page_hook( $slug, $page_hook );
				}

				}
			);

		} // end foreach;

	} // end hook_menu;

	/**
	 * Whether declarative menu registration should wire WordPress admin_menu.
	 *
	 * pg_* slugs register metadata always but hook admin_menu only during playground panel setup/render.
	 *
	 * @since 2.7.0
	 *
	 * @param string $slug Page slug.
	 * @return bool
	 */
	protected static function should_wire_wordpress_menu( $slug ) {

		if ( 0 !== strpos( (string) $slug, 'pg_' ) ) {
			return true;
		}

		if ( function_exists( 'wpdev_playground_is_menu_register_context' ) ) {
			return wpdev_playground_is_menu_register_context();
		}

		if ( class_exists( 'WPDev\\Core\\Playground\\Playground_Loader' ) ) {
			return \WPDevFramework\Core\Playground\Playground_Loader::is_menu_register_context();
		}

		return false;

	} // end should_wire_wordpress_menu;

} // end class Menu_Registry;
