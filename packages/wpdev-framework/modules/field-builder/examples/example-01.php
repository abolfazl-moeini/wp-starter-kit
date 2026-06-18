<?php
/**
 * Example 01 — register a field type with sanitize/validate hooks.
 *
 * @package WPDevFramework\Modules
 * @since   2.5.0
 */
defined( 'ABSPATH' ) || exit;

use WPDevFramework\Modules\FieldBuilder\Field_Type_Registry;

add_action(
	'wpdev_load',
	static function () {
		Field_Type_Registry::register(
			'my_slug',
			array(
				'sanitize' => static function ( $value ) {
					return sanitize_text_field( (string) $value );
				},
			)
		);

		add_filter(
			'wpdev_field_validate_my_slug',
			static function ( $value, $field ) {
				return $value;
			},
			10,
			2
		);
	},
	20
);
