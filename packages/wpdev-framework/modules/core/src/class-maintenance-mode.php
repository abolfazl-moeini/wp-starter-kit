<?php
/**
 * Adds the Maintenance Mode.
 *
 * @package WPDev
 * @subpackage UI
 * @since 2.0.0
 */

namespace WPDevFramework;

use WPDevFramework\Managers\Cache_Manager;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Adds the Maintenance Mode.
 *
 * @since 2.0.0
 */
class Maintenance_Mode {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Initializes
	 *
	 * @since 2.0.0
	 */
	public function init() {

		add_action('wpdev_load', array($this, 'add_settings'));

		if (wpdev_get_setting('maintenance_mode')) {

			$this->hooks();

		} // end if;

	} // end init;

	/**
	 * Adds the additional hooks, when necessary.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function hooks() {

		add_action('wpdev_ajax_toggle_maintenance_mode', array($this, 'toggle_maintenance_mode'));

		if (!is_main_site()) {

			add_action('admin_bar_menu', array($this, 'add_notice_to_admin_bar'), 15);

		} // end if;

		if (self::check_maintenance_mode()) {

			add_filter('pre_option_blog_public', '__return_true');

			if (!is_admin()) {

				add_action('wp', array($this, 'render_page'));

				if (function_exists('wp_robots_no_robots')) {

					add_filter('wp_robots', 'wp_robots_no_robots'); // WordPress 5.7+

				} else {

					add_action('wp_head', 'wp_no_robots', 20);

				} // end if;

			} // end if;

		} // end if;

	} // end hooks;

	/**
	 * Add maintenance mode Notice to Admin Bar
	 *
	 * @since 2.0.0
	 * @param WP_Admin_Bar $wp_admin_bar The Admin Bar class.
	 * @return void
	 */
	public function add_notice_to_admin_bar($wp_admin_bar) {

		if (!current_user_can('manage_options')) {

			return;

		} // end if;

		if (is_admin() || self::check_maintenance_mode()) {

			$args = array(
				'id'     => 'wpdev-maintenance-mode',
				'parent' => 'top-secondary',
				'title'  => __('Maintenance Mode - Active', 'wpdev'),
				'href'   => '#wpdev-site-maintenance-element',
				'meta'   => array(
					'class' => 'wpdev-maintenance-mode ' . (self::check_maintenance_mode() ? '' : 'hidden'),
					'title' => __('This means that your site is not available for visitors at the moment. Only you and other logged users have access to it. Click here to toggle this option.', 'wpdev'),
				),
			);

			$wp_admin_bar->add_node($args);

		} // end if;

	} // end add_notice_to_admin_bar;

	/**
	 * Render page - html filtrable
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_page() {

		if (is_main_site() || current_user_can('read')) {

			return;

		} // end if;

		$text = apply_filters(
			'wpdev_maintenance_mode_text',
			__('Website under planned maintenance. Please check back later.', 'wpdev')
		);

		$title = apply_filters(
			'wpdev_maintenance_mode_title',
			__('Under Maintenance', 'wpdev')
		);

		wp_die($text, $title, 503);

	} // end render_page;

	/**
	 * Check should display maintenance mode
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public static function check_maintenance_mode() {

		return get_site_meta(get_current_blog_id(), 'wpdev_maintenance_mode', true);

	} // end check_maintenance_mode;

	/**
	 * Callback button admin toggle maintenance mode.
	 *
	 * @since 2.0.0
	 * @return mixed
	 */
	public function toggle_maintenance_mode() {

		check_ajax_referer('wpdev_toggle_maintenance_mode', $_POST['_wpnonce']);

		$site_id = \WPDevFramework\Helpers\Hash::decode(wpdev_request('site_hash'), 'site');

		if (!current_user_can_for_blog($site_id, 'manage_options')) {

			return wp_send_json_error(array(
				'message' => __('You do not have the necessary permissions to perform this option.', 'wpdev'),
				'value'   => false,
			));

		} // end if;

		$value = wpdev_request('maintenance_status', false);

		$value = wpdev_string_to_bool($value);

		update_site_meta($site_id, 'wpdev_maintenance_mode', $value);

		$return = array(
			'message' => __('New maintenance settings saved.', 'wpdev'),
			'value'   => $value,
		);

		// Flush the cache so the maintenance mode new status is applied immediately.
		Cache_Manager::get_instance()->flush_known_caches();

		wp_send_json_success($return);

	} // end toggle_maintenance_mode;

	/**
	 * Filter the WPDev settings to add Jumper options
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function add_settings() {

		wpdev_register_settings_field('sites', 'maintenance_mode', array(
			'title'   => __('Site Maintenance Mode', 'wpdev'),
			'desc'    => __('Allow your customers and super admins to quickly take sites offline via a toggle on the site dashboard.', 'wpdev'),
			'type'    => 'toggle',
			'default' => 0,
			'order'   => 23,
		));

	} // end add_settings;

} // end class Maintenance_Mode;
