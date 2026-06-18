<?php
/**
 * Dashboard widget public API (uniform wpdev_register_* facade).
 *
 * @package WPDevFramework\Modules\AdminWidgetBuilder
 * @since   2.7.0
 */

use WPDevFramework\Modules\AdminWidgetBuilder\Dashboard_Widget_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Register a WPDev dashboard statistics widget.
 *
 * @since 2.7.0
 *
 * @param string               $id      Widget id.
 * @param array<string, mixed> $config  Widget configuration.
 * @param bool                 $replace Replace existing id. Default true.
 * @return bool
 */
function wpdev_register_dashboard_widget( $id, array $config = array(), $replace = true ) {

	return Dashboard_Widget_Registry::register( $id, $config, $replace );

} // end wpdev_register_dashboard_widget;

/**
 * Get a dashboard widget config.
 *
 * @since 2.7.0
 *
 * @param string $id Widget id.
 * @return array<string, mixed>|null
 */
function wpdev_get_dashboard_widget( $id ) {

	return Dashboard_Widget_Registry::get( $id );

} // end wpdev_get_dashboard_widget;

/**
 * Whether a dashboard widget is registered.
 *
 * @since 2.7.0
 *
 * @param string $id Widget id.
 * @return bool
 */
function wpdev_has_dashboard_widget( $id ) {

	return Dashboard_Widget_Registry::has( $id );

} // end wpdev_has_dashboard_widget;

/**
 * List all registered dashboard widgets.
 *
 * @since 2.7.0
 *
 * @return array<string, array<string, mixed>>
 */
function wpdev_list_dashboard_widgets() {

	return Dashboard_Widget_Registry::all_widgets();

} // end wpdev_list_dashboard_widgets;

/**
 * Unregister a dashboard widget.
 *
 * @since 2.7.0
 *
 * @param string $id Widget id.
 * @return void
 */
function wpdev_unregister_dashboard_widget( $id ) {

	Dashboard_Widget_Registry::unregister( $id );

} // end wpdev_unregister_dashboard_widget;
