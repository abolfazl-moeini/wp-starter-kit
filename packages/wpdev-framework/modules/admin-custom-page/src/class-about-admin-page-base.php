<?php
/**
 * WPDev About Admin Page.
 *
 * @package WPDev
 * @subpackage Admin_Pages
 * @since 2.0.0
 */

namespace WPDevFramework\Admin_Pages;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * WPDev About Admin Page.
 */
class About_Admin_Page_Base extends Base_Admin_Page {

	/**
	 * Holds the ID for this page, this is also used as the page slug.
	 *
	 * @var string
	 */
	protected $id = 'wpdev-about';

	/**
	 * Is this a top-level menu or a submenu?
	 *
	 * @since 1.8.2
	 * @var string
	 */
	protected $type = 'submenu';

	/**
	 * Is this a top-level menu or a submenu?
	 *
	 * @since 1.8.2
	 * @var string
	 */
	protected $parent = 'none';

	/**
	 * This page has no parent, so we need to highlight another sub-menu.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	protected $highlight_menu_slug = 'wpdev';

	/**
	 * Should we hide admin notices on this page?
	 *
	 * @since 2.0.0
	 * @var boolean
	 */
	protected $hide_admin_notices = true;

	/**
	 * Should we force the admin menu into a folded state?
	 *
	 * @since 2.0.0
	 * @var boolean
	 */
	protected $fold_menu = true;

	/**
	 * Returns the title of the page.
	 *
	 * @since 2.0.0
	 * @return string Title of the page.
	 */
	public function get_title() {

		return __('About', 'wpdev');

	} // end get_title;

	/**
	 * Returns the title of menu for this page.
	 *
	 * @since 2.0.0
	 * @return string Menu label of the page.
	 */
	public function get_menu_title() {

		return __('WPDev Framework', 'wpdev');

	} // end get_menu_title;

	/**
	 * Allows admins to rename the sub-menu (first item) for a top-level page.
	 *
	 * @since 2.0.0
	 * @return string False to use the title menu or string with sub-menu title.
	 */
	public function get_submenu_title() {

		return __('About', 'wpdev');

	} // end get_submenu_title;

	/**
	 * Every child class should implement the output method to display the contents of the page.
	 *
	 * @since 1.8.2
	 * @return void
	 */
	public function output() {

		wpdev_get_template('about',[
			'dir' => dirname( __DIR__ ) . '/views',
		]);

	} // end output;

	/**
	 * Adds the cure bg image here as well.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_scripts() {

		parent::register_scripts();

		wp_add_inline_style('wpdev-admin', sprintf('
		#wpwrap {
			background: url("%s") right bottom no-repeat;
			background-size: 60%%;	 
		}', wpdev_get_asset('bg-setup.png', 'img')));

	} // end register_scripts;

} // end class About_Admin_Page;
