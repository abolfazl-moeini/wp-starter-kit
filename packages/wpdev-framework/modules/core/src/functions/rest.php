<?php
/**
 * REST API Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.11
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Get a endpoint nice-name from a class name.
 *
 * Example: '\WPDevFramework\Models\Product' will return 'product'.
 *
 * @since 2.0.11
 *
 * @param string $class_name The class name. The class needs to exist.
 * @return string
 */
function wpdev_rest_get_endpoint_from_class_name($class_name) {

	$endpoint = $class_name;

	if (class_exists($class_name)) {

		$last_segment = explode('\\', $class_name);

		$endpoint = strtolower(end($last_segment));

	} // end if;

	return $endpoint;

} // end wpdev_rest_get_endpoint_from_class_name;

/**
 * Searches the hard-coded schemas for a arguments list.
 *
 * @since 2.0.11
 *
 * @param string  $class_name The class name. The class needs to exist.
 * @param string  $context The context. One of two values - create or update.
 * @param boolean $force_generate If we should try to generate the args when nothing is found.
 * @return array
 */
function wpdev_rest_get_endpoint_schema($class_name, $context = 'create', $force_generate = false) {

	$from_cache = false;

	$schema = array();

	$endpoint = wpdev_rest_get_endpoint_from_class_name($class_name);

	$schema_file = wpdev_path( "modules/core/src/api/schemas/$endpoint-$context.php" );

	if (file_exists($schema_file) && apply_filters('wpdev_rest_get_endpoint_schema_use_cache', true)) {

		$schema = include $schema_file;

		$from_cache = true;

	} // end if;

	if (empty($schema) && $from_cache === false && $force_generate) {

		$schema = wpdev_rest_generate_schema($class_name, $context);

	} // end if;

	return $schema;

}  // end wpdev_rest_get_endpoint_schema;

/**
 * Generates the rest schema for a class name.
 *
 * @since 2.0.11
 *
 * @param string $class_name The class name of the model.
 * @param string $context The context. Can be create or update.
 * @return array
 */
function wpdev_rest_generate_schema($class_name, $context = 'create') {

	$required_fields = wpdev_model_get_required_fields($class_name);

	$schema = wpdev_reflection_parse_object_arguments($class_name);

	foreach ($schema as $argument_name => &$argument) {

		$argument['type'] = wpdev_rest_treat_argument_type($argument['type']);

		$argument['required'] = $context === 'create' ? in_array($argument_name, $required_fields, true) : false;

		$schema[$argument_name] = $argument;

	} // end foreach;

	return $schema;

} // end wpdev_rest_generate_schema;

/**
 * Treat argument types to perform additional validations.
 *
 * @since 2.0.11
 *
 * @param string $type The type detected.
 * @return string
 */
function wpdev_rest_treat_argument_type($type) {

	$type = (string) $type;

	if ($type === 'bool') {

		$type = 'boolean';

	} elseif ($type === 'int') {

		$type = 'integer';

	} elseif ($type === 'float') {

		$type = 'number';

	} // end if;

	return $type;

} // end wpdev_rest_treat_argument_type;
