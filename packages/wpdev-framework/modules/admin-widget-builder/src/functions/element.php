<?php
/**
 * Element Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.5
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Triggers the setup_preview hooks for all registered elements.
 *
 * @since 2.0.5
 * @return void
 */
function wpdev_element_setup_preview() {

	!did_action('wpdev_element_preview') && do_action('wpdev_element_preview');

} // end wpdev_element_setup_preview;
