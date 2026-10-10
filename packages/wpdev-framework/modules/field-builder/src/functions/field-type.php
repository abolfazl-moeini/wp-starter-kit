<?php
/**
 * Field type public API (uniform wpdev_register_* facade).
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.7.0
 */

use WPDevFramework\Modules\FieldBuilder\Field_Type_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Register a custom field type.
 *
 * @since 2.7.0
 *
 * @param string               $type    Field type slug.
 * @param array<string, mixed> $config  Optional sanitize/validate config.
 * @param bool                 $replace Replace existing type. Default true.
 * @return bool
 */
if (!function_exists('wpdev_register_field_type')) {
function wpdev_register_field_type( $type, array $config = array(), $replace = true ) {

	return Field_Type_Registry::register( $type, $config, $replace );

}
}
 // end wpdev_register_field_type;

/**
 * Get a field type config.
 *
 * @since 2.7.0
 *
 * @param string $type Field type slug.
 * @return array<string, mixed>|null
 */
if (!function_exists('wpdev_get_field_type')) {
function wpdev_get_field_type( $type ) {

	return Field_Type_Registry::get( $type );

}
}
 // end wpdev_get_field_type;

/**
 * Whether a field type is registered.
 *
 * @since 2.7.0
 *
 * @param string $type Field type slug.
 * @return bool
 */
if (!function_exists('wpdev_has_field_type')) {
function wpdev_has_field_type( $type ) {

	return Field_Type_Registry::has( $type );

}
}
 // end wpdev_has_field_type;

/**
 * List all registered field types.
 *
 * @since 2.7.0
 *
 * @return array<string, array<string, mixed>>
 */
if (!function_exists('wpdev_list_field_types')) {
function wpdev_list_field_types() {

	return Field_Type_Registry::all();

}
}
 // end wpdev_list_field_types;

/**
 * Unregister a field type.
 *
 * @since 2.7.0
 *
 * @param string $type Field type slug.
 * @return void
 */
if (!function_exists('wpdev_unregister_field_type')) {
function wpdev_unregister_field_type( $type ) {

	Field_Type_Registry::unregister( $type );

}
}
 // end wpdev_unregister_field_type;
