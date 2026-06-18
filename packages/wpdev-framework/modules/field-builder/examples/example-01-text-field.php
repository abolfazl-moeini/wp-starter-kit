<?php
/**
 * Example — register a text field type and render via admin field template.
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.5.0
 */
defined( 'ABSPATH' ) || exit;

use WPDevFramework\Modules\FieldBuilder\Field_Type_Registry;

add_action(
	'wpdev_load',
	static function () {
		Field_Type_Registry::register( 'my_text', array( 'sanitize' => 'sanitize_text_field' ) );
	},
	20
);

// Templates resolve from modules/field-builder/views/admin-pages/fields/field-text.php
