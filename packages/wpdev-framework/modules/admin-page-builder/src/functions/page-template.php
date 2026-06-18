<?php
/**
 * Admin page template public API.
 *
 * @package WPDevFramework\Modules\AdminPageBuilder
 * @since   2.7.0
 */

use WPDevFramework\Modules\AdminPageBuilder\Page_Template_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Register a page layout template view path.
 *
 * @param string $layout_type Layout slug (list, edit, wizard, ...).
 * @param string $view_path   View path relative to module views root.
 * @param bool   $replace     Replace existing layout. Default true.
 * @return bool
 */
function wpdev_register_page_template( $layout_type, $view_path, $replace = true ) {

	return Page_Template_Registry::register( $layout_type, $view_path, $replace );

} // end wpdev_register_page_template;

/**
 * Resolve layout to view path.
 *
 * @param string $layout_type Layout slug.
 * @param string $default     Fallback path.
 * @return string
 */
function wpdev_resolve_page_template( $layout_type, $default = '' ) {

	return Page_Template_Registry::resolve( $layout_type, $default );

} // end wpdev_resolve_page_template;

/**
 * Whether a page template is registered.
 *
 * @param string $layout_type Layout slug.
 * @return bool
 */
function wpdev_has_page_template( $layout_type ) {

	return Page_Template_Registry::has( $layout_type );

} // end wpdev_has_page_template;

/**
 * List registered page templates.
 *
 * @return array<string, string>
 */
function wpdev_list_page_templates() {

	return Page_Template_Registry::all();

} // end wpdev_list_page_templates;

/**
 * Unregister a page template.
 *
 * @param string $layout_type Layout slug.
 * @return void
 */
function wpdev_unregister_page_template( $layout_type ) {

	Page_Template_Registry::unregister( $layout_type );

} // end wpdev_unregister_page_template;
