<?php
/**
 * Widget datasource helpers.
 *
 * @package WPDevFramework\Modules\AdminWidgetBuilder
 * @since   2.5.0
 */

use WPDevFramework\Modules\AdminWidgetBuilder\Widget_Datasource_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Register a widget datasource callback.
 *
 * @since 2.5.0
 *
 * @param string   $id       Datasource slug.
 * @param callable $callback Callback.
 * @return void
 */
function wpdev_register_widget_datasource( $id, $callable, $replace = true ) {

	return Widget_Datasource_Registry::register( $id, $callable, $replace );

} // end wpdev_register_widget_datasource;

/**
 * Whether a widget datasource is registered.
 *
 * @since 2.7.0
 *
 * @param string $id Datasource slug.
 * @return bool
 */
function wpdev_has_widget_datasource( $id ) {

	return Widget_Datasource_Registry::has( $id );

} // end wpdev_has_widget_datasource;

/**
 * List registered widget datasources.
 *
 * @since 2.7.0
 *
 * @return array<string, callable>
 */
function wpdev_list_widget_datasources() {

	return Widget_Datasource_Registry::all();

} // end wpdev_list_widget_datasources;

/**
 * Unregister a widget datasource.
 *
 * @since 2.7.0
 *
 * @param string $id Datasource slug.
 * @return void
 */
function wpdev_unregister_widget_datasource( $id ) {

	Widget_Datasource_Registry::unregister( $id );

} // end wpdev_unregister_widget_datasource;

/**
 * Resolve a widget datasource.
 *
 * @since 2.5.0
 *
 * @param string               $id      Datasource slug.
 * @param array<string, mixed> $context Optional context.
 * @return mixed
 */
function wpdev_widget_datasource( $id, array $context = array() ) {

	return Widget_Datasource_Registry::resolve( $id, $context );

} // end wpdev_widget_datasource;
