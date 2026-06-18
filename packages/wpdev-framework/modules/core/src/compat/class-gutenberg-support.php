<?php
/**
 * Gutenberg Support
 *
 * Allows WPDev to filter Gutenberg thingys.
 *
 * @since       1.9.14
 * @author      Arindo Duque
 * @category    Admin
 * @package     WPDev/Compat
 * @version     0.0.1
 */

namespace WPDevFramework\Compat;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Adds support to Gutenberg filters.
 *
 * @since 2.0.0
 */
class Gutenberg_Support {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Filterable function that let users decide if they want to remove
	 * Gutenberg support and modifications by wpdev.
	 *
	 * @since 1.9.14
	 * @return bool
	 */
	public function should_load() {

		if (function_exists('has_blocks')) {

			return true;

		} // end if;

		return apply_filters('wpdev_gutenberg_support_should_load', true);

	} // end should_load;

	/**
	 * Initializes the Class, if we need it.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {

		if ($this->should_load()) {

			add_action('admin_enqueue_scripts', array($this, 'add_scripts'));

		} // end if;

	} // end init;

	/**
	 * Adds the Gutenberg Filters scripts.
	 *
	 * @since 1.9.14
	 * @return void
	 */
	public function add_scripts() {

		wp_register_script('wpdev-gutenberg-support', wpdev_get_module_asset_url('core', 'gutenberg-support.js', 'js'), array('jquery'), wpdev_get_version(), true);

    // translators: the placeholder is replaced with the network name.
		$preview_message = apply_filters('wpdev_gutenberg_support_preview_message', sprintf(__('<strong>%s</strong> is generating the preview...', 'wpdev'), get_network_option(null, 'site_name')));

		wp_localize_script('wpdev-gutenberg-support', 'wpdev_gutenberg', array(
			'logo'                => esc_url(wpdev_get_network_logo()),
			'replacement_message' => $preview_message,
		));

		wp_enqueue_script('wpdev-gutenberg-support');

	} // end add_scripts;

} // end class Gutenberg_Support;
