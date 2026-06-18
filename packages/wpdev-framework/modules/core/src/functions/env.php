<?php
/**
 * Environment Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.11
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Picks content to return depending on the environment.
 *
 * This is useful when creating layouts that will be used on the front-end as well as
 * the backend (admin panel). You can use this function to pick the content to return
 * according to the environment. Can be used both for HTML, but is must useful when
 * dealing with CSS classes.
 *
 * E.g. <?php echo wpdev_env_picker('wpdev-m-0', 'wpdev--mx-3 wpdev--my-2'); ?>
 * In the backend, this will return the classes 'wpdev--mx-3 wpdev--my-2',
 * while it will return wpdev-m-0 omn the frontend.
 *
 * Values can be anything, but will usually be strings.
 *
 * @since 2.0.0
 *
 * @param mixed $frontend_content Content to return on the frontend.
 * @param mixed $backend_content  Content to return on the backend.
 * @param bool  $is_admin You can manually pass the is_admin result, if need be.
 * @return mixed
 */
function wpdev_env_picker($frontend_content, $backend_content, $is_admin = null) {

	$is_admin = is_null($is_admin) ? is_admin() : $is_admin;

	return $is_admin ? $backend_content : $frontend_content;

} // end wpdev_env_picker;
