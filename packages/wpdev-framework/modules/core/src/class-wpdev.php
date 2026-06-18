<?php
/**
 * WPDev main class.
 *
 * @package WPDev
 * @since 2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * WPDev main class
 *
 * This class instantiates our dependencies and load the things
 * our plugin needs to run.
 *
 * @package WPDev
 * @since 2.0.0
 */
final class WPDev {

	use \WPDevFramework\Traits\Singleton, \WPDevFramework\Traits\WPDev_Deprecated;

	/**
	 * Version of the Plugin.
	 *
	 * @since 2.1.0
	 * @var string
	 */
	const VERSION = '2.3.2';

	/**
	 * Version of the Plugin.
	 *
	 * @deprecated use the const version instead.
	 * @var string
	 */
	public $version = '2.3.2';

	/**
	 * Tables registered by WPDev.
	 *
	 * @var array
	 */
	public $tables = array();

	/**
	 * Checks if WPDev was loaded or not.
	 *
	 * This is set to true when all the WPDev requirements are met.
	 *
	 * @since 2.0.0
	 * @var boolean
	 */
	protected $loaded = false;

	/**
	 * Holds an instance of the helper functions layer.
	 *
	 * @since 2.0.0
	 * @var WPDevFramework\Helper
	 */
	public $helper;

	/**
	 * Holds an instance of the notices functions layer.
	 *
	 * @since 2.0.0
	 * @var WPDevFramework\Admin_Notices
	 */
	public $notices;

	/**
	 * Holds an instance of the settings layer.
	 *
	 * @since 2.0.0
	 * @var WPDevFramework\Settings
	 */
	public $settings;

	/**
	 * Holds an instance to the scripts layer.
	 *
	 * @var \WPDevFramework\Scripts
	 */
	public $scripts;

	/**
	 * Holds an instance to the currents layer.
	 *
	 * @var \WPDevFramework\Current
	 */
	public $currents;

	/**
	 * Loads the necessary components into the main class
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {
		/*
		 * Core Helper Functions
		 */
		require_once __DIR__ . '/functions/helper.php';

		/*
		 * Loads the WPDevFramework\Helper class.
		 * @deprecated
		 */
		$this->helper = WPDevFramework\Helper::get_instance();



		/*
		 * Deprecated Classes, functions and more.
		 */
		require_once __DIR__ . '/deprecated/deprecated.php';

		/**
		 * Runs a number of checks and instructs users coming from the previous
		 * version about what steps they need to take to finish the upgrade to version 2.
		 *
		 * - Links to the installer, if version 2 was not properly activated;
		 * - Unloads incompatible add-ons, offering explanations when available;
		 * - Re-adds the updater for add-ons that have new versions available.
		 *
		 * @since 2.0.5
		 */
		\WPDevFramework\Unsupported::init();

		/*
		 * The only core components we need to load
		 * before every other public api are the options
		 * and settings.
		 */
		wpdev_require_public_function( 'fs' );
		wpdev_require_public_function( 'sort' );
		wpdev_require_public_function( 'settings' );

		/*
		 * Set up the text-domain for translations
		 */
		$this->setup_textdomain();

		/*
		 * Loads files containing public functions.
		 */
		$this->load_public_apis();

		do_action('wpdev_init');

		/*
		 * Setup Wizard
		 */

		/*
		 * Loads the WPDev settings helper class.
		 */

		if(is_callable([WPDevFramework\Settings::class, 'get_instance'])) {

			$this->settings = WPDevFramework\Settings::get_instance();
		}

		/*
		 * Rollbacks Support (optional example module).
		 */
		if ( class_exists( '\\WPDev\\Rollback\\Rollback' ) ) {
			\WPDevFramework\Rollback\Rollback::get_instance();
		}

		/*
		 * Check if the WPDev requirements are present.
		 *
		 * Everything we need to run our setup install needs top be loaded before this
		 * and have no dependencies outside of the classes loaded so far.
		 */
		if (WPDevFramework\Requirements::met() === false || WPDevFramework\Requirements::run_setup() === false) {

			return;

		} // end if;

		$this->loaded = true;

		/*
		 * Loads the current site.
		 */
		$this->currents = WPDevFramework\Current::get_instance();

		/*
		 * Loads the WPDev admin notices helper class.
		 */
		$this->notices = WPDevFramework\Admin_Notices::get_instance();

		/*
		 * Loads the WPDev scripts handler
		 */
		$this->scripts = WPDevFramework\Scripts::get_instance();

		/*
		 * Loads tables
		 */
		$this->setup_tables();

		/*
		 * Loads extra components
		 */
		$this->load_extra_components();

		/*
		 * Loads managers
		 */
		$this->load_managers();

		/**
		 * Triggers when all the dependencies were loaded
		 *
		 * Allows plugin developers to add new functionality. For example, support to new
		 * Hosting providers, etc.
		 *
		 * @since 2.0.0
		 */
		do_action('wpdev_load');

		/*
		 * Loads admin pages
		 * @todo: move this to a manager in the future?
		 */
		$this->load_admin_pages();

		do_action('wpdev_register_forms');

	} // end init;

	/**
	 * Returns true if all the requirements are met.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function is_loaded() {

		return $this->loaded;

	} // end is_loaded;

	/**
	 * Setup the plugin text domain to be used in translations.
	 *
	 * @since 0.0.1
	 * @return void
	 */
	public function setup_textdomain() {
		/*
		 * Loads the translation files.
		 */
		load_plugin_textdomain('wpdev', false, dirname((string) WPDEV_PLUGIN_BASENAME) . '/lang');
		load_plugin_textdomain('wpdev-locations', false, dirname((string) WPDEV_PLUGIN_BASENAME) . '/lang');

	} // end setup_textdomain;

	/**
	 * Loads the table objects for our custom tables.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function setup_tables() {

		$this->tables = \WPDevFramework\Loaders\Table_Loader::get_instance();

	} // end setup_tables;

	/**
	 * Loads public apis that should be on the global scope
	 *
	 * This method is responsible for loading and exposing public apis that
	 * plugin developers will use when creating extensions for WPDev.
	 * Things like render functions, helper methods, etc.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function load_public_apis() {

		require_once __DIR__ . '/legacy/load-public-apis.php';

		wpdev_load_public_apis();

	} // end load_public_apis;

	/**
	 * Load extra the WPDev elements
	 *
	 * @since 2.0.0
	 * @return void
	 */
	protected function load_extra_components() {

		require_once __DIR__ . '/legacy/load-extra-components.php';

		wpdev_load_extra_components();

	} // end load_extra_components;

	/**
	 * Load the WPDev Admin Pages.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	protected function load_admin_pages() {

		/**
		 * Domain admin pages register on this hook via examples/* and modules/*.
		 *
		 * @since 2.0.0
		 */
		do_action( 'wpdev_admin_pages' );

		if ( class_exists( 'WPDev\\Admin_Pages\\Migration_Alert_Admin_Page' ) ) {
			new WPDevFramework\Admin_Pages\Migration_Alert_Admin_Page();
		}

		/**
		 * Legacy monolith registration — disabled by default since 2.4.0.
		 * Set filter to true only for rollback during modularization.
		 *
		 * @since 2.4.0
		 *
		 * @param bool $load Whether to load monolith admin pages from legacy/load-monolith-admin-pages.php.
		 */
		if ( ! apply_filters( 'wpdev_load_monolith_admin_pages', false ) ) {
			return;
		}

		require_once wpdev_path( 'modules/core/src/legacy/load-monolith-admin-pages.php' );

		wpdev_load_legacy_monolith_admin_pages();

	} // end load_admin_pages;

	protected function load_managers() {

		require_once __DIR__ . '/legacy/load-managers.php';

		wpdev_load_managers();

	} // end load_managers;

} // end class WPDev;
