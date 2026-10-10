<?php
/**
 * List table public API.
 *
 * @package WPDevFramework\Modules\TableBuilder
 * @since   2.7.0
 */

use WPDevFramework\Modules\TableBuilder\List_Table_Registry;
use WPDevFramework\Modules\TableBuilder\Table_Config;

defined( 'ABSPATH' ) || exit;

/**
 * Register a list table class (and optional declarative config).
 *
 * @param string            $table_id   Table id slug.
 * @param string            $class_name List table class name.
 * @param Table_Config|null $config     Optional declarative config.
 * @param bool              $replace    Replace existing id. Default true.
 * @return bool
 */
if (!function_exists('wpdev_register_list_table')) {
function wpdev_register_list_table( $table_id, $class_name, $config = null, $replace = true ) {

	return List_Table_Registry::register( $table_id, $class_name, $config, $replace );

}
}
 // end wpdev_register_list_table;

/**
 * Get list table registration entry.
 *
 * @param string $table_id Table id slug.
 * @return array<string, mixed>|null
 */
if (!function_exists('wpdev_get_list_table')) {
function wpdev_get_list_table( $table_id ) {

	return List_Table_Registry::get( $table_id );

}
}
 // end wpdev_get_list_table;

/**
 * Whether a list table is registered.
 *
 * @param string $table_id Table id slug.
 * @return bool
 */
if (!function_exists('wpdev_has_list_table')) {
function wpdev_has_list_table( $table_id ) {

	return List_Table_Registry::has( $table_id );

}
}
 // end wpdev_has_list_table;

/**
 * List all registered list tables.
 *
 * @return array<string, array<string, mixed>>
 */
if (!function_exists('wpdev_list_list_tables')) {
function wpdev_list_list_tables() {

	return List_Table_Registry::all();

}
}
 // end wpdev_list_list_tables;

/**
 * Unregister a list table.
 *
 * @param string $table_id Table id slug.
 * @return void
 */
if (!function_exists('wpdev_unregister_list_table')) {
function wpdev_unregister_list_table( $table_id ) {

	List_Table_Registry::unregister( $table_id );

}
}
 // end wpdev_unregister_list_table;
