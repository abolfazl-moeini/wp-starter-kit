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
