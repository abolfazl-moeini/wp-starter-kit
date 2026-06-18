<?php
/**
 * Maps checkout signup fields to field-builder definitions (K7-05).
 *
 * @package WPDevFramework\Modules\FieldBuilder\Adapters
 * @since   2.6.0
 */

namespace WPDevFramework\Modules\FieldBuilder\Adapters;

defined( 'ABSPATH' ) || exit;

/**
 * Adapter between wpdev-checkout Signup_Field classes and field-builder views.
 */
class Checkout_Signup_Field_Adapter {

	/**
	 * Field view context for checkout editor fields.
	 *
	 * @since 2.6.0
	 * @return string
	 */
	public static function view_context() {

		return 'checkout';

	} // end view_context;

	/**
	 * Convert a signup field instance to field-builder field attributes.
	 *
	 * @since 2.6.0
	 *
	 * @param object $signup_field Signup field instance.
	 * @return array<string, mixed>
	 */
	public static function to_field_args( $signup_field ) {

		$type = 'text';

		if ( is_object( $signup_field ) && method_exists( $signup_field, 'get_type' ) ) {
			$type = $signup_field->get_type();
		}

		$args = array(
			'type'  => $type,
			'title' => is_object( $signup_field ) && method_exists( $signup_field, 'get_title' )
				? $signup_field->get_title()
				: '',
			'desc'  => is_object( $signup_field ) && method_exists( $signup_field, 'get_description' )
				? $signup_field->get_description()
				: '',
		);

		/**
		 * Filter mapped checkout signup field args before rendering.
		 *
		 * @since 2.6.0
		 *
		 * @param array<string, mixed> $args         Field attributes.
		 * @param object               $signup_field Signup field instance.
		 */
		return apply_filters( 'wpdev_checkout_signup_field_args', $args, $signup_field );

	} // end to_field_args;

	/**
	 * Resolve the field template path for a signup field type.
	 *
	 * @since 2.6.0
	 *
	 * @param string $type Signup field type slug.
	 * @return string
	 */
	public static function view_for_type( $type ) {

		if ( ! function_exists( 'wpdev_field_view' ) ) {
			return 'checkout/fields/field-' . sanitize_key( $type );
		}

		return wpdev_field_view( self::view_context(), $type );

	} // end view_for_type;

} // end class Checkout_Signup_Field_Adapter;
