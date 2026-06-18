<?php
/**
 * Documentation Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.11
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Returns the content.
 *
 * @since 2.0.0
 *
 * @param  string $slug The slug of the link to be returned.
 * @param  bool   $return_default If we should return a default value.
 * @return string
 */
function wpdev_get_documentation_url($slug, $return_default = true) {

	return \WPDevFramework\Documentation::get_instance()->get_link($slug, $return_default);

} // end wpdev_get_documentation_url;
