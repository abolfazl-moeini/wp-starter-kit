<?php
/**
 * Field builder resolver helpers (K1-01).
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.6.0
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'wpdev_field_view_context_map' ) ) {
	/**
	 * Map a field context to its view directory prefix.
	 *
	 * @since 2.6.0
	 *
	 * @return array<string, string>
	 */
	function wpdev_field_view_context_map() {

		/**
		 * Filter the field context -> view-root map.
		 *
		 * @since 2.6.0
		 *
		 * @param array<string, string> $map Context map.
		 */
		return apply_filters(
			'wpdev_field_view_context_map',
			array(
				'settings' => 'settings/fields',
				'admin'    => 'admin-pages/fields',
				'checkout' => 'checkout/fields',
				'frontend' => 'checkout/fields',
			)
		);

	} // end wpdev_field_view_context_map;
}

if ( ! function_exists( 'wpdev_field_view' ) ) {
	/**
	 * Resolve the template path for a field type within a given context.
	 *
	 * Single entry point so consumers (settings, metabox, form-builder, checkout)
	 * stop hardcoding `settings/fields` vs `admin-pages/fields` paths. The type is
	 * normalized the same way Field::get_template_name() does (underscore -> hyphen).
	 *
	 * @since 2.6.0
	 *
	 * @param string $context Field context: settings|admin|checkout|frontend (or a raw view root).
	 * @param string $type    Field type slug.
	 * @return string Template path suitable for wpdev_get_template().
	 */
	function wpdev_field_view( $context, $type ) {

		$map  = wpdev_field_view_context_map();
		$root = isset( $map[ $context ] ) ? $map[ $context ] : $context;

		$type = (string) $type;

		$aliases = array(
			'wp_editor' => 'wp-editor',
			'wp-editor' => 'wp-editor',
		);

		if ( isset( $aliases[ $type ] ) ) {
			$type = $aliases[ $type ];
		}

		$template = str_replace( '_', '-', $type );

		return $root . '/field-' . $template;

	} // end wpdev_field_view;
}

if ( ! function_exists( 'wpdev_field_view_fallback' ) ) {
	/**
	 * Default fallback template for a context (used when a type view is missing).
	 *
	 * @since 2.6.0
	 *
	 * @param string $context Field context.
	 * @return string
	 */
	function wpdev_field_view_fallback( $context ) {

		return wpdev_field_view( $context, 'text' );

	} // end wpdev_field_view_fallback;
}

if ( ! function_exists( 'wpdev_checkout_field_view' ) ) {
	/**
	 * Checkout/signup field view adapter (K7-05).
	 *
	 * @since 2.6.0
	 *
	 * @param string $type Field type slug.
	 * @return string Template path for wpdev_get_template().
	 */
	function wpdev_checkout_field_view( $type ) {

		return wpdev_field_view( 'checkout', $type );

	} // end wpdev_checkout_field_view;
}
