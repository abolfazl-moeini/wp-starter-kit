<?php
/**
 * WPDev Dashboard Admin Page.
 *
 * @package WPDev
 * @subpackage Admin_Pages
 * @since 2.0.24
 */

namespace WPDevFramework\Admin_Pages;

// Exit if accessed directly
defined('ABSPATH') || exit;

use \WPDevFramework\License;
use \WPDevFramework\Installers\Migrator;
use \WPDevFramework\Installers\Core_Installer;
use \WPDevFramework\Installers\Default_Content_Installer;
use \WPDevFramework\Logger;

/**
 * WPDev Dashboard Admin Page.
 */
class Migration_Alert_Admin_Page extends Wizard_Admin_Page {

	/**
	 * Holds the ID for this page, this is also used as the page slug.
	 *
	 * @var string
	 */
	protected $id = 'wpdev-migration-alert';

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
	 * @since 2.0.24
	 * @var string
	 */
	protected $highlight_menu_slug = 'wpdev-settings';

	/**
	 * If this number is greater than 0, a badge with the number will be displayed alongside the menu title
	 *
	 * @since 1.8.2
	 * @var integer
	 */
	protected $badge_count = 0;

	/**
	 * Holds the admin panels where this page should be displayed, as well as which capability to require.
	 *
	 * To add a page to the regular admin (wp-admin/), use: 'admin_menu' => 'capability_here'
	 * To add a page to the network admin (wp-admin/network), use: 'network_admin_menu' => 'capability_here'
	 * To add a page to the user (wp-admin/user) admin, use: 'user_admin_menu' => 'capability_here'
	 *
	 * @since 2.0.24
	 * @var array
	 */
	protected $supported_panels = array(
		'network_admin_menu' => 'manage_network',
	);

	/**
	 * Overrides original construct method.
	 *
	 * We need to override the construct method to make sure
	 * we make the necessary changes to the Wizard page when it's
	 * being run for the first time.
	 *
	 * @since 2.0.24
	 * @return void
	 */
	public function __construct() {

		parent::__construct();

	} // end __construct;

	/**
	 * Returns the logo for the wizard.
	 *
	 * @since 2.0.24
	 * @return string
	 */
	public function get_logo() {

		return wpdev_get_asset('logo.png', 'img');

	} // end get_logo;

	/**
	 * Returns the title of the page.
	 *
	 * @since 2.0.24
	 * @return string Title of the page.
	 */
	public function get_title(): string {

		return sprintf(__('Migration', 'wpdev'));

	} // end get_title;

	/**
	 * Returns the title of menu for this page.
	 *
	 * @since 2.0.24
	 * @return string Menu label of the page.
	 */
	public function get_menu_title() {

		return wpdev()->is_loaded() ? __('WPDev Migration Alert', 'wpdev') : __('WPDev', 'wpdev');

	} // end get_menu_title;

	/**
	 * Returns the sections for this Wizard.
	 *
	 * @since 2.0.24
	 * @return array
	 */
	public function get_sections() {

		return array(
			'alert' => array(
				'title'   => __('Alert!', 'wpdev'),
				'view'    => array($this, 'section_alert'),
				'handler' => array($this, 'handle_proceed'),
			),
		);

	} // end get_sections;

	/**
	 * Displays the content of the final section.
	 *
	 * @since 2.0.24
	 * @return void
	 */
	public function section_alert() {

		wpdev_get_template('wizards/setup/alert', array(
			'screen' => get_current_screen(),
			'page'   => $this,
		));

	} // end section_alert;

	/**
	 * Handles the proceed action.
	 *
	 * @since 2.0.24
	 * @return void
	 */
	public function handle_proceed() {

		delete_network_option(null, 'wpdev_setup_finished');
		delete_network_option(null, 'wpdev_is_migration_done');

		wp_redirect(wpdev_network_admin_url('wpdev-setup'));

		exit;

	} // end handle_proceed;

} // end class Migration_Alert_Admin_Page;
