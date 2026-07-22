<?php
/**
 * Admin Panel Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Checks if should use wrap container or not based on user setting.
 *
 * @since 2.0.0
 */
function wpdev_wrap_use_container() {

	echo get_user_setting('wpdev_use_container', false) ? 'admin-lg:wpdev-container admin-lg:wpdev-mx-auto' : '';

} // end wpdev_wrap_use_container;

/**
 * Normalize a settings / wizard section icon class for left-nav rendering.
 *
 * Prefer `dashicons-wpdev-*` (framework icon font; single class is enough).
 * WordPress core icons like `dashicons-megaphone` need the base `dashicons` class.
 *
 * @since 2.7.1
 *
 * @param string $icon Icon class from section config.
 * @return string Space-separated class list safe for esc_attr().
 */
function wpdev_admin_section_icon_class( $icon ) {

	$icon = trim( (string) $icon );

	if ( '' === $icon ) {
		return 'dashicons-wpdev-cog';
	}

	// Already includes the WP dashicons base, or is a wpdev font glyph.
	if ( false !== strpos( $icon, 'dashicons ' ) || 0 === strpos( $icon, 'dashicons-wpdev-' ) ) {
		return $icon;
	}

	// Core WP dashicon slug without the base class (common host mistake).
	if ( 0 === strpos( $icon, 'dashicons-' ) ) {
		return 'dashicons ' . $icon;
	}

	return $icon;

} // end wpdev_admin_section_icon_class;

/**
 * Renders the responsive table single-line.
 *
 * @since 2.0.0
 *
 * @param array $args Main arguments.
 * @param array $first_row The first row of icons + labels.
 * @param array $second_row The second row, on the right.
 * @return string
 */
function wpdev_responsive_table_row($args = array(), $first_row = array(), $second_row = array()) {

	$args = wp_parse_args($args, array(
		'id'     => '',
		'title'  => __('No Title', 'wpdev'),
		'url'    => '#',
		'status' => '',
		'image'  => '',
	));

	return wpdev_get_template_contents('base/responsive-table-row', compact('args', 'first_row', 'second_row'));

} // end wpdev_responsive_table_row;
