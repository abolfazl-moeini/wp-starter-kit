<?php
/**
 * Admin field types and sanitize contract
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;
use WPDevFramework\Modules\FieldBuilder\Component_Registry;
use WPDevFramework\Modules\FieldBuilder\Field_Type_Registry;

defined( 'ABSPATH' ) || exit;

Module_Loader::register(
	'field-builder',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core' ),
	)
);

// selectizer.js, vue-apps.js, fields.js canonical: modules/field-builder/assets/js/

wpdev_register_module_views( 'field-builder' );

require_once __DIR__ . '/src/functions/field.php';
require_once __DIR__ . '/src/functions/field-type.php';
require_once __DIR__ . '/src/adapters/class-checkout-signup-field-adapter.php';
require_once __DIR__ . '/src/class-field-relationship.php';
require_once __DIR__ . '/src/class-advanced-fields-registry.php';
require_once __DIR__ . '/src/functions/advanced-fields.php';
require_once __DIR__ . '/src/class-meta-store.php';

Component_Registry::init();

require_once __DIR__ . '/src/class-field-type-registry.php';

/*
 * Field type registry (K1-04..K1-08). Each type declares its family and an
 * optional sanitize callback. The validate filter wpdev_field_validate_{type}
 * (K1-10) always runs via Field_Type_Registry::sanitize() and Field::sanitize().
 */

// Input family (K1-04).
Field_Type_Registry::register( 'text', array( 'family' => 'input', 'sanitize' => 'sanitize_text_field' ) );
Field_Type_Registry::register(
	'textarea',
	array(
		'family'   => 'input',
		'sanitize' => static function ( $value, $field ) {
			if ( ! empty( $field['allow_html'] ) ) {
				if ( function_exists( 'current_user_can' ) && current_user_can( 'unfiltered_html' ) ) {
					return stripslashes( (string) $value );
				}
				if ( function_exists( 'wpdev_sanitize_embed_html' ) ) {
					return wpdev_sanitize_embed_html( $value );
				}
				if ( function_exists( 'wp_filter_post_kses' ) ) {
					return stripslashes( wp_filter_post_kses( addslashes( (string) $value ) ) );
				}
				return function_exists( 'wp_kses_post' ) ? wp_kses_post( $value ) : strip_tags( (string) $value );
			}
			return function_exists( 'sanitize_textarea_field' ) ? sanitize_textarea_field( (string) $value ) : strip_tags( (string) $value );
		},
	)
);
Field_Type_Registry::register(
	'number',
	array(
		'family'   => 'input',
		'sanitize' => static function ( $value, $field ) {
			$value = floatval( $value );

			if ( isset( $field['min'] ) && false !== $field['min'] && '' !== $field['min'] && $value < (float) $field['min'] ) {
				return (float) $field['min'];
			}

			if ( isset( $field['max'] ) && false !== $field['max'] && '' !== $field['max'] && $value > (float) $field['max'] ) {
				return (float) $field['max'];
			}

			return $value;
		},
	)
);
Field_Type_Registry::register( 'email', array( 'family' => 'input', 'sanitize' => 'sanitize_email' ) );
Field_Type_Registry::register( 'url', array( 'family' => 'input', 'sanitize' => 'esc_url_raw' ) );
Field_Type_Registry::register( 'password', array( 'family' => 'input', 'sanitize' => 'sanitize_text_field' ) );
Field_Type_Registry::register( 'hidden', array( 'family' => 'input', 'sanitize' => 'sanitize_text_field' ) );
Field_Type_Registry::register( 'header', array( 'family' => 'input', 'sanitize' => '__return_null' ) );
Field_Type_Registry::register( 'html', array( 'family' => 'input', 'sanitize' => null ) );
Field_Type_Registry::register( 'embed', array( 'family' => 'input', 'sanitize' => 'wpdev_sanitize_embed_html' ) );

// Choice family (K1-05).
Field_Type_Registry::register( 'select', array( 'family' => 'choice', 'sanitize' => 'sanitize_text_field' ) );
Field_Type_Registry::register( 'multiselect', array( 'family' => 'choice', 'sanitize' => null ) );
Field_Type_Registry::register( 'select2', array( 'family' => 'choice', 'sanitize' => null ) );
Field_Type_Registry::register( 'radio', array( 'family' => 'choice', 'sanitize' => 'sanitize_text_field' ) );
Field_Type_Registry::register( 'checkbox', array( 'family' => 'choice', 'sanitize' => 'rest_sanitize_boolean' ) );
Field_Type_Registry::register( 'multi_checkbox', array( 'family' => 'choice', 'sanitize' => null ) );
Field_Type_Registry::register( 'toggle', array( 'family' => 'choice', 'sanitize' => 'rest_sanitize_boolean' ) );

// Upload family (K1-06).
Field_Type_Registry::register( 'upload', array( 'family' => 'upload', 'sanitize' => 'wpdev_sanitize_media_field' ) );
Field_Type_Registry::register( 'image', array( 'family' => 'upload', 'sanitize' => 'wpdev_sanitize_media_field' ) );
Field_Type_Registry::register( 'file', array( 'family' => 'upload', 'sanitize' => 'wpdev_sanitize_media_field' ) );
Field_Type_Registry::register( 'icon', array( 'family' => 'upload', 'sanitize' => 'sanitize_text_field' ) );

// Model / ajax select (K1-07).
Field_Type_Registry::register( 'model', array( 'family' => 'model', 'ajax' => true, 'sanitize' => null ) );

// Advanced family (K1-08).
Field_Type_Registry::register( 'code-editor', array( 'family' => 'advanced', 'sanitize' => null ) );
Field_Type_Registry::register( 'color', array( 'family' => 'advanced', 'sanitize' => 'sanitize_hex_color' ) );
// Admin-pages chrome uses views/admin-pages/fields/field-color-picker.php (Vue + wpColorPicker).
Field_Type_Registry::register( 'color-picker', array( 'family' => 'advanced', 'sanitize' => 'sanitize_hex_color' ) );
Field_Type_Registry::register( 'date', array( 'family' => 'advanced', 'sanitize' => 'sanitize_text_field' ) );
Field_Type_Registry::register( 'datetime', array( 'family' => 'advanced', 'sanitize' => 'sanitize_text_field' ) );
Field_Type_Registry::register( 'wp_editor', array( 'family' => 'advanced', 'sanitize' => 'wp_kses_post' ) );
Field_Type_Registry::register( 'repeater', array( 'family' => 'advanced', 'sanitize' => null ) );
Field_Type_Registry::register( 'group', array( 'family' => 'advanced', 'sanitize' => null ) );

// Action (K1-09).
Field_Type_Registry::register( 'ajax_button', array( 'family' => 'action', 'ajax' => true, 'sanitize' => '__return_null' ) );
