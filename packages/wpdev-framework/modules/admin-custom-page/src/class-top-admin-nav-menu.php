<?php
/**
 * Admin bar shortcuts menu
 *
 * Adds the shortcuts menu to the admin bar.
 *
 * @category   WPDev
 * @package    WPDev
 * @author     Gustavo Modesto <gustavo@wpdev.ir>
 * @since      2.0.0
 */

namespace WPDevFramework\Admin_Pages;

use WPDevFramework\Modules\AdminCustomPage\Admin_Bar_Node_Registry;
use WPDevFramework\Settings;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * This class adds the top bar admin navigation menu
 *
 * @since 2.0.0
 */
class Top_Admin_Nav_Menu {

	/**
	 * Adds the hooks and actions
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function __construct() {

		add_action('admin_bar_menu', array($this, 'add_top_bar_menus'), 50);

	} // end __construct;

	/**
	 * Adds the WPDev top-bar shortcut menu
	 *
	 * @since 1.1.0
	 * @param \WP_Admin_Bar $wp_admin_bar The admin bar identifier.
	 * @return void
	 */
	public function add_top_bar_menus($wp_admin_bar) {

    // Only for super admins
		if (!current_user_can('manage_network')) {

			return;

		} // end if;

    // Add Parent element
		$parent = array(
			'id'    => 'wpdev',
			'title' => __('WPDev Framework', 'wpdev'),
			'href'  => current_user_can('wpdev_read_dashboard') ? network_admin_url('admin.php?page=wpdev') : '#',
			'meta'  => array(
				'class' => 'wpdev-top-menu',
				'title' => __('Go to the dashboard', 'wpdev'),
			)
		);

		$container = array(
			'id'     => 'wpdev-settings-group',
			'parent' => 'wpdev',
			'group'  => true,
			'title'  => __('Settings Container', 'wpdev'),
			'href'   => '#',
			'meta'   => array(
				'class' => 'wpdev-top-menu ab-sub-secondary',
				'title' => __('Go to the settings page', 'wpdev'),
			)
		);

    // Settings
		$settings = array(
			'id'     => 'wpdev-settings',
			'parent' => 'wpdev-settings-group',
			'title'  => __('Settings', 'wpdev'),
			'href'   => network_admin_url('admin.php?page=wpdev-settings'),
			'meta'   => array(
				'class' => 'wpdev-top-menu ab-sub-secondary',
				'title' => __('Go to the settings page', 'wpdev'),
			)
		);

		/**
		 * Add items to the top bar.
		 */
		$wp_admin_bar->add_node($parent);

		foreach ( Admin_Bar_Node_Registry::sorted_nodes() as $node ) {
			$capability = $node['capability'] ?? '';

			if ( '' !== $capability && ! current_user_can( $capability ) ) {
				continue;
			}

			$wp_admin_bar->add_node(
				array(
					'id'     => $node['id'],
					'parent' => $node['parent'],
					'title'  => $node['title'],
					'href'   => $node['href'],
					'meta'   => $node['meta'],
				)
			);
		}

		if (current_user_can('wpdev_read_settings')) {

			$wp_admin_bar->add_node($container);
			$wp_admin_bar->add_node($settings);

		} //end if;

		/*
		 * Add the sub-menus.
		 */
		$settings_tabs = Settings::get_instance()->get_sections();

		$has_addons = false;

		foreach ($settings_tabs as $tab => $tab_info) {

			if (wpdev_get_isset($tab_info, 'invisible')) {

				continue;

			} // end if;

			$parent = 'wpdev-settings';

			if (wpdev_get_isset($tab_info, 'addon', false)) {

				$parent = 'wpdev-settings-addons';

			} // end if;

			$settings_tab = array(
				'id'     => 'wpdev-settings-' . $tab,
				'parent' => $parent,
				'title'  => $tab_info['title'],
				'href'   => network_admin_url('admin.php?page=wpdev-settings&tab=') . $tab,
				'meta'   => array(
					'class' => 'wpdev-top-menu',
					'title' => __('Go to the settings page', 'wpdev'),
				)
			);

			$wp_admin_bar->add_node($settings_tab);

			$addons_item = array(
				'id'     => 'wpdev-settings-addons',
				'parent' => 'wpdev-settings-group',
				'title'  => __('Add-ons', 'wpdev'),
				'href'   => wpdev_network_admin_url('wpdev-addons'),
				'meta'   => array(
					'class' => 'wpdev-top-menu ab-sub-secondary',
					'title' => __('Go to the add-ons page', 'wpdev'),
				),
			);

			$wp_admin_bar->add_node($addons_item);

		} // end foreach;

		/**
		 * Allow extensions (and the Menu_Registry) to add their own admin-bar
		 * nodes under the WPDev parent instead of hardcoding them here (K4-03).
		 *
		 * @since 2.6.0
		 *
		 * @param \WP_Admin_Bar $wp_admin_bar Admin bar instance.
		 */
		do_action('wpdev_admin_bar_menu', $wp_admin_bar);

	} // end add_top_bar_menus;

}  // end class Top_Admin_Nav_Menu;
