<?php
/**
 * Menu builder public API.
 *
 * @package WPDevFramework\Modules\MenuBuilder
 * @since   2.7.0
 */

use WPDevFramework\Modules\MenuBuilder\Menu_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Register admin menu page metadata.
 *
 * @param string               $page_slug Page slug.
 * @param array<string, mixed> $config    Page metadata.
 * @param bool                 $replace   Replace existing slug. Default true.
 * @return bool
 */
function wpdev_register_menu_page( $page_slug, array $config = array(), $replace = true ) {

	return Menu_Registry::register( $page_slug, $config, $replace );

} // end wpdev_register_menu_page;

/**
 * Register a top-level admin menu (hooks WordPress admin_menu).
 *
 * @param string               $slug Page slug.
 * @param array<string, mixed> $args Page args (`context`: admin|network|both, or legacy `network` bool).
 * @return void
 */
function wpdev_register_menu_top( $slug, array $args ) {

	Menu_Registry::register_top( $slug, $args );

} // end wpdev_register_menu_top;

/**
 * Register a submenu admin page.
 *
 * @param string               $parent_slug Parent slug.
 * @param string               $slug        Page slug.
 * @param array<string, mixed> $args        Page args.
 * @return void
 */
function wpdev_register_menu_child( $parent_slug, $slug, array $args ) {

	Menu_Registry::register_child( $parent_slug, $slug, $args );

} // end wpdev_register_menu_child;

/**
 * Get registered menu page config.
 *
 * @param string $page_slug Page slug.
 * @return array<string, mixed>|null
 */
function wpdev_get_menu_page( $page_slug ) {

	return Menu_Registry::get( $page_slug );

} // end wpdev_get_menu_page;

/**
 * Whether a menu page is registered.
 *
 * @param string $page_slug Page slug.
 * @return bool
 */
function wpdev_has_menu_page( $page_slug ) {

	return Menu_Registry::has( $page_slug );

} // end wpdev_has_menu_page;

/**
 * List all registered menu pages.
 *
 * @return array<string, array<string, mixed>>
 */
function wpdev_list_menu_pages() {

	return Menu_Registry::all();

} // end wpdev_list_menu_pages;

/**
 * Unregister a menu page definition.
 *
 * @param string $page_slug Page slug.
 * @return void
 */
function wpdev_unregister_menu_page( $page_slug ) {

	Menu_Registry::unregister( $page_slug );

} // end wpdev_unregister_menu_page;
