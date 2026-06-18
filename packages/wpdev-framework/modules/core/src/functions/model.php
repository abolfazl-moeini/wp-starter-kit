<?php
/**
 * Model Helper Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Cast a list of models to a list of arrays containing the model properties.
 *
 * @since 2.0.0
 *
 * @param \WPDevFramework\Models\Base_Model $model The model to cast to array.
 * @return array
 */
function wpdev_cast_model_to_array($model) {

	if (is_a($model, '\\WPDev\\Models\\Base_Model')) {

		$model = $model->to_array();

	} // end if;

	return $model;

} // end wpdev_cast_model_to_array;

/**
 * Converts a list of Model objects to a list of ID => $label_field
 *
 * @since 2.0.0
 *
 * @param array  $models The list of models to convert.
 * @param string $label_field The name of the field to use.
 * @return array
 */
function wpdev_models_to_options($models, $label_field = 'name') {

	$options_list = array();

	foreach ($models as $model) {

		$options_list[$model->get_id()] = call_user_func(array($model, "get_{$label_field}"));

	} // end foreach;

	return $options_list;

} // end wpdev_models_to_options;

/**
 * Get the schema of a particular model.
 *
 * @since 2.0.11
 *
 * @param string $class_name The fully qualified model name.
 * @return array
 */
function wpdev_model_get_schema($class_name) {

	$schema = array();

	if (method_exists($class_name, 'get_schema')) {

		$schema = $class_name::get_schema();

	} // end if;

	return $schema;

} // end wpdev_model_get_schema;

/**
 * Returns a list of required fields form a model schema.
 *
 * @since 2.0.11
 *
 * @param string $class_name The fully qualified model name.
 * @return array
 */
function wpdev_model_get_required_fields($class_name) {

	$required_fields = array();

	if (method_exists($class_name, 'validation_rules')) {

		$validation_rules = (new $class_name)->validation_rules();

		foreach ($validation_rules as $field => $validation_rule) {

			if (strpos((string) $validation_rule, 'required|') !== false || $validation_rule === 'required') {

				$required_fields[] = $field;

			} // end if;

		} // end foreach;

	} // end if;

	return $required_fields;

} // end wpdev_model_get_required_fields;

/**
 * Returns the physical table name for a registered wu_* custom table.
 *
 * @since 2.5.0
 *
 * @param string $name Table slug (e.g. products, productmeta).
 * @return string
 */
function wpdev_get_db_table( $name ) {

	global $wpdb;

	$name = ltrim( (string) $name, 'wu_' );
	$key  = 'wu_' . $name;

	if ( isset( $wpdb->{$key} ) ) {
		return $wpdb->{$key};
	}

	return $wpdb->base_prefix . $key;

} // end wpdev_get_db_table;
