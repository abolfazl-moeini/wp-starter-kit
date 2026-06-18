<?php
/**
 * WPDev Dashboard Admin Page.
 *
 * @package WPDev
 * @subpackage Admin_Pages
 * @since 2.0.0
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
class Setup_Wizard_Admin_Page extends Wizard_Admin_Page {

	/**
     * Holds the ID for this page, this is also used as the page slug.
     *
     * @var string
     */
	protected $id = 'wpdev-setup';

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
	 * @since 2.0.0
	 * @var array
	 */
	protected $supported_panels = array(
		'network_admin_menu' => 'manage_network',
	);

	/**
	 * The customer license, if it exists.
	 *
	 * @since 2.0.0
	 * @var object
	 */
	public $license;

	/**
	 * The customer object, if it exists.
	 *
	 * @since 2.0.0
	 * @var object
	 */
	public $customer;

	/**
     * Is this an old install migrating.
     *
     * @since 2.0.0
     * @var bool|null
     */
	private ?bool $is_migration = null;

	/**
	 * The integration object, if it exists.
	 *
	 * @since 2.2.0
	 * @var mixed
	 */
	protected $integration;

	/**
	 * Overrides original construct method.
	 *
	 * We need to override the construct method to make sure
	 * we make the necessary changes to the Wizard page when it's
	 * being run for the first time.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function __construct() {

		if (!$this->is_core_loaded()) {

			require_once dirname( __DIR__, 2 ) . '/core/src/functions/documentation.php';

			/**
			 * Loads the necessary apis.
			 */
			wpdev()->load_public_apis();

			$this->highlight_menu_slug = false;

			$this->type = 'menu';

			$this->position = 10_101_010;

			$this->menu_icon = 'dashicons-wpdev-wpdev';

			add_action('admin_enqueue_scripts', array($this, 'register_scripts'));

		} // end if;

		parent::__construct();

		add_action('admin_action_download_migration_logs', array($this, 'download_migration_logs'));

		/*
		 * Serve the installers
		 */
		wpdev_require_public_function( 'ajax' );
		wpdev_register_ajax_handler(
			'wpdev_setup_install',
			array( $this, 'setup_install' ),
			array(
				'capability' => 'manage_network',
			)
		);

		/*
		 * Load installers
		 */
		add_action('wpdev_handle_ajax_installers', array(Core_Installer::get_instance(), 'handle'), 10, 3);
		add_action('wpdev_handle_ajax_installers', array(Default_Content_Installer::get_instance(), 'handle'), 10, 3);
		add_action('wpdev_handle_ajax_installers', array(Migrator::get_instance(), 'handle'), 10, 3);

		/*
		 * Redirect on activation
		 */
		add_action('wpdev_activation', array($this, 'redirect_to_wizard'));

	} // end __construct;

	/**
	 * Download the migration logs.
	 *
	 * @since 2.0.7
	 * @return void
	 */
	public function download_migration_logs() {

		check_admin_referer('download_migration_logs', 'nonce');

		$path = Logger::get_logs_folder();

		$file = $path . Migrator::LOG_FILE_NAME . '.log';

		$file_name = str_replace($path, '', $file);

		header('Content-Type: application/octet-stream');

		header("Content-Disposition: attachment; filename=$file_name");

		header('Pragma: no-cache');

		readfile($file);

		exit;

	} // end download_migration_logs;

	/**
	 * Loads the extra elements we need on the wizard itself.
	 *
	 * @since 1.8.2
	 * @return void
	 */
	public function page_loaded() {

		parent::page_loaded();

		$this->license = \WPDevFramework\License::get_instance()->get_license();

		$this->customer = \WPDevFramework\License::get_instance()->get_customer();

		$this->set_settings();

	} // end page_loaded;

	/**
	 * Checks if this is a migration or not.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function is_migration() {

		if ($this->is_migration === null) {

			$this->is_migration = Migrator::is_legacy_network();

		} // end if;

		return $this->is_migration;

	} // end is_migration;

	/**
	 * Adds missing setup from settings when WPDev is not fully loaded.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function set_settings() {

		wpdev()->settings->default_sections();

	} // end set_settings;

	/**
	 * Redirects to the wizard, if we need to.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function redirect_to_wizard() {

		if (!\WPDevFramework\Requirements::run_setup() && wpdev_request('page') !== 'wpdev-setup') {

			wp_redirect(wpdev_network_admin_url('wpdev-setup'));

			exit;

		} // end if;

	} // end redirect_to_wizard;

	/**
	 * Handles the ajax actions for installers and migrators.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function setup_install() {

		global $wpdb;

		if ( ! wpdev_current_user_can_admin( 'manage_network' ) ) {

			wpdev_require_public_function( 'ajax' );
			wpdev_ajax_error_wp_error( new \WP_Error( 'not-allowed', __( 'Permission denied.', 'wpdev' ) ), 403 );

		} // end if;

		/*
		 * Load tables.
		 */
		wpdev()->tables = \WPDevFramework\Loaders\Table_Loader::get_instance();

		$installer = wpdev_request('installer', '');

		/*
		 * Installers should hook into this filter
		 */
		$status = apply_filters('wpdev_handle_ajax_installers', true, $installer, $this);

		if ( is_wp_error( $status ) ) {

			wpdev_require_public_function( 'ajax' );
			wpdev_ajax_error_wp_error( $status );

		} // end if;

		wpdev_require_public_function( 'ajax' );
		wpdev_ajax_success( null, 'setup_installed' );

	} // end setup_install;

	/**
	 * Check if the core was loaded.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function is_core_loaded() {

		return \WPDevFramework\Requirements::met() && \WPDevFramework\Requirements::run_setup();

	} // end is_core_loaded;

	/**
	 * Returns the logo for the wizard.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public function get_logo() {

		return wpdev_get_asset('logo.png', 'img');

	} // end get_logo;

	/**
	 * Returns the title of the page.
	 *
	 * @since 2.0.0
	 * @return string Title of the page.
	 */
	public function get_title(): string {

		return sprintf(__('Installation', 'wpdev'));

	} // end get_title;

	/**
	 * Returns the title of menu for this page.
	 *
	 * @since 2.0.0
	 * @return string Menu label of the page.
	 */
	public function get_menu_title() {

		return wpdev()->is_loaded() ? __('WPDev Install', 'wpdev') : __('WPDev', 'wpdev');

	} // end get_menu_title;

	/**
	 * Returns the sections for this Wizard.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_sections() {

		$allowed = \WPDevFramework\License::get_instance()->allowed();

		$sections = array(
			'welcome'      => array(
				'title'       => __('Welcome', 'wpdev'),
				'description' => implode('<br><br>', array(
					__('...and thanks for choosing WPDev!', 'wpdev'),
					__('This quick setup wizard will make sure your server is correctly setup, help you configure your new network, and migrate data from previous WPDev versions if necessary.', 'wpdev'),
					__('You will also have the option of importing default content. It should take 10 minutes or less!', 'wpdev')
				)),
				'next_label'  => __('Get Started &rarr;', 'wpdev'),
				'back'        => false,
			),
			'checks'       => array(
				'title'       => __('Pre-install Checks', 'wpdev'),
				'description' => __('Now it is time to see if this machine has what it takes to run WPDev well!', 'wpdev'),
				'next_label'  => \WPDevFramework\Requirements::met() ? __('Go to the Next Step &rarr;', 'wpdev') : __('Check Again', 'wpdev'),
				'handler'     => array($this, 'handle_checks'),
				'back'        => false,
				'fields'      => array(
					'requirements' => array(
						'type' => 'note',
						'desc' => array($this, 'renders_requirements_table'),
					)
				),
			),
			'activation'   => array(
				'title'       => __('License Activation', 'wpdev'),
				'description' => __('Let\'s make sure you are able to keep your copy up-to-date with our latest updates via admin panel notifications and more.', 'wpdev'),
				'handler'     => array($this, 'handle_activation'),
				'next_label'  => __('Agree & Activate &rarr;', 'wpdev'),
				'back'        => false,
				'skip'        => $allowed,
				'fields'      => array(
					'terms'       => array(
						'type' => 'note',
						'desc' => array($this, '_terms_of_support'),
					),
					'license_key' => array(
						'type'            => 'text',
						'title'           => __('License Key', 'wpdev'),
						'placeholder'     => __('E.g. sk_***********', 'wpdev'),
						'tooltip'         => __('Your WPDev License Key', 'wpdev'),
						'desc'            => array($this, '_desc_and_validation_error'),
						'wrapper_classes' => $allowed ? 'wpdev-hidden' : '',
						'html_attr'       => array(
							$allowed ? 'disabled' : 'data-none' => 'disabled',
						),
					),
					'license'     => array(
						'wrapper_classes' => $allowed ? 'sm:wpdev-w-auto sm:wpdev-block' : 'sm:wpdev-w-auto wpdev-hidden',
						'classes'         => 'sm:wpdev--mx-6 sm:wpdev--mt-4 sm:wpdev--mb-6',
						'type'            => 'note',
						'desc'            => array($this, '_current_license'),
					),
				),
			),
			'installation' => array(
				'title'       => __('Installation', 'wpdev'),
				'description' => __('Now, let\'s update your database and install the Sunrise.php file, which are necessary for the correct functioning of WPDev.', 'wpdev'),
				'next_label'  => Core_Installer::get_instance()->all_done() ? __('Go to the Next Step &rarr;', 'wpdev') : __('Install', 'wpdev'),
				'fields'      => array(
					'terms' => array(
						'type' => 'note',
						'desc' => fn() => $this->render_installation_steps(Core_Installer::get_instance()->get_steps(), false),
					),
				),
			),
		);

		/*
		 * In case of migrations, add different sections.
		 */
		if ($this->is_migration()) {

			$dry_run = wpdev_request('dry-run', true);

			$next = true;

			$errors = Migrator::get_instance()->get_errors();

			$back_traces = Migrator::get_instance()->get_back_traces();

			$next_label = __('Migrate!', 'wpdev');

			$description = __('No errors found during dry run! Now it is time to actually migrate! <br><br><strong>We strongly recommend creating a backup of your database before moving forward with the migration.</strong>', 'wpdev');

			if ($dry_run) {

				$next_label = __('Run Check', 'wpdev');

				$description = __('It seems that you were running WPDev 1.X on this network. This migrator will convert the data from the old version to the new one.', 'wpdev') . '<br><br>' . __('First, let\'s run a test migration to see if we can spot any potential errors.', 'wpdev');

			} // end if;

			$fields = array(
				'migration' => array(
					'type' => 'note',
					'desc' => fn() => $this->render_installation_steps(Migrator::get_instance()->get_steps(), false),
				),
			);

			if ($errors) {

				$subject = 'Errors on migrating my network';

				$user = wp_get_current_user();

				$message_lines = array(
					'Hi there,',
					sprintf('My name is %s.', $user->display_name),
					sprintf('License Key: %s', License::get_instance()->get_license_key()),
					'I tried to migrate my network from version 1 to version 2, but was not able to do it successfully...',
					'Here are the error messages I got:',
					sprintf('```%s%s%s```', PHP_EOL, implode(PHP_EOL, $errors), PHP_EOL),
					sprintf('```%s%s%s```', PHP_EOL, $back_traces ? implode(PHP_EOL, $back_traces) : 'No backtraces found.', PHP_EOL),
					'Kind regards.'
				);

				$message = implode(PHP_EOL . PHP_EOL, $message_lines);

				$description = __('The dry run test detected issues during the test migration. Please, <a class="wpdev-trigger-support" href="#">contact our support team</a> to get help migrating from 1.X to version 2.', 'wpdev');

				$next = true;

				$next_label = __('Try Again!', 'wpdev');

				$error_list = '<strong>' . __('List of errors detected:', 'wpdev') . '</strong><br><br>';

				$errors[] = sprintf('<br><a href="%2$s" class="wpdev-no-underline wpdev-text-red-500 wpdev-font-bold"><span class="dashicons-wpdev-download wpdev-mr-2"></span>%1$s</a>', __('Download migration error log', 'wpdev'), add_query_arg(array(
					'action' => 'download_migration_logs',
					'nonce'  => wp_create_nonce('download_migration_logs'),
				), network_admin_url('admin.php')));

				$errors[] = sprintf('<br><a href="%2$s" class="wpdev-no-underline wpdev-text-red-500 wpdev-font-bold"><span class="dashicons-wpdev-back-in-time wpdev-mr-2"></span>%1$s</a>', __('Rollback to version 1.10.13', 'wpdev'), add_query_arg(array(
					'page'    => 'wpdev-rollback',
					'version' => '1.10.13',
					'type'    => 'select-version',
				), network_admin_url('admin.php')));

				$error_list .= implode('<br>', $errors);

				$fields = array_merge(array(
					'errors' => array(
						'type'    => 'note',
						'classes' => 'wpdev-flex-grow',
						'desc'    => function() use ($error_list) {

							/** Reset errors */
							Migrator::get_instance()->session->set('errors', array());

							return sprintf('<div class="wpdev-mt-0 wpdev-p-4 wpdev-bg-red-100 wpdev-border wpdev-border-solid wpdev-border-red-200 wpdev-rounded-sm wpdev-text-red-500">%s</div>', $error_list);

						},
					),
				), $fields);

			} // end if;

			$sections['migration'] = array(
				'title'       => __('Migration', 'wpdev'),
				'description' => $description,
				'next_label'  => $next_label,
				'skip'        => false,
				'next'        => $next,
				'handler'     => array($this, 'handle_migration'),
				'fields'      => $fields,
			);

		} else {

			$sections['your-company'] = array(
				'title'       => __('Your Company', 'wpdev'),
				'description' => __('Before we move on, let\'s configure the basic settings of your network, shall we?', 'wpdev'),
				'handler'     => array($this, 'handle_save_settings'),
				'fields'      => array($this, 'get_general_settings'),
			);

			$sections['defaults'] = array(
				'title'       => __('Default Content', 'wpdev'),
				'description' => __('Starting from scratch can be scarry, specially when first starting out. In this step, you can create default content to have a starting point for your network. Everything can be customized later.', 'wpdev'),
				'next_label'  => Default_Content_Installer::get_instance()->all_done() ? __('Go to the Next Step &rarr;', 'wpdev') : __('Install', 'wpdev'),
				'fields'      => array(
					'terms' => array(
						'type' => 'note',
						'desc' => fn() => $this->render_installation_steps(Default_Content_Installer::get_instance()->get_steps()),
					),
				),
			);

		} // end if;

		$sections['done'] = array(
			'title' => __('Ready!', 'wpdev'),
			'view'  => array($this, 'section_ready'),
		);

		/**
		 * Allow developers to add additional setup wizard steps.
		 *
		 * @since 2.0.0
		 *
		 * @param array  $sections Current sections.
		 * @param bool   $is_migration If this is a migration or not.
		 * @param object $this The current instance.
		 * @return array
		 */
		return apply_filters('wpdev_setup_wizard', $sections, $this->is_migration(), $this);

	} // end get_sections;

	/**
	 * Returns the general settings to add to the wizard.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_general_settings() {
		/*
		 * Get the general fields for company and currency.
		 */
		$general_fields = \WPDevFramework\Settings::get_instance()->get_section('general')['fields'];

		/*
		 * Unset a couple of undesired settings
		 */
		$fields_to_unset = array(
			'error_reporting_header',
			'enable_error_reporting',
			'advanced_header',
			'uninstall_wipe_tables',
		);

		foreach ($fields_to_unset as $field_to_unset) {

			unset($general_fields[$field_to_unset]);

		} // end foreach;

		// Adds a fake first field to bypass some styling issues with the top-border
		$fake_field = array(
			array(
				'type' => 'hidden',
			),
		);

		$fields = array_merge($fake_field, $general_fields);

		return apply_filters('wpdev_setup_get_general_settings', $fields);

	} // end get_general_settings;

	/**
	 * Returns the payment settings to add to the setup wizard.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_payment_settings() {
		/*
		 * Get the general fields for company and currency.
		 */
		$payment_fields = \WPDevFramework\Settings::get_instance()->get_section('payment-gateways')['fields'];

		$fields_to_unset = array(
			'main_header',
		);

		foreach ($fields_to_unset as $field_to_unset) {

			unset($payment_fields[$field_to_unset]);

		} // end foreach;

		$fields = array_merge($payment_fields);

		return apply_filters('wpdev_setup_get_payment_settings', $fields);

	} // end get_payment_settings;

	/**
	 * Shows the description and possible error.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public function _desc_and_validation_error() {

		ob_start();

		echo __('Your license key starts with "sk_".', 'wpdev');

		$error = wpdev_request('error', false);

		if ($error) :

		// phpcs:disable ?>

			<span class="wpdev-text-red-500 wpdev-ml-1">

				&mdash; <?php echo is_string($error) ? $error : __('Invalid License Key.', 'wpdev'); ?>

			</span>

<?php

		endif;

		return ob_get_clean();

	} // end _desc_and_validation_error;

	/**
	 * Displays the block about the current license.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public function _current_license() {

		ob_start();

		if (\WPDevFramework\License::get_instance()->allowed()) : // phpcs:ignore ?>

			<span class="wpdev-py-4 wpdev-px-6 wpdev-bg-green-100 wpdev-block wpdev-text-green-500">
			<?php printf(__('Your license key was already validated, %1$s. To change your license, go to our <a href="%2$s" class="wpdev-no-underline">Settings Page</a>.', 'wpdev'), $this->customer->first, wpdev_network_admin_url('wpdev-settings')); ?>
			</span>

			<?php

		// phpcs:enable

		endif;

		return ob_get_clean();

	} // end _current_license;

	/**
	 * Render the installation steps table.
	 *
	 * @since 2.0.0
	 *
	 * @param array   $steps The list of steps.
	 * @param boolean $checks If we should add the checkbox for selection or not.
	 * @return string
	 */
	public function render_installation_steps($steps, $checks = true) {

		wp_localize_script('wpdev-setup-wizard', 'wpdev_setup', $steps);

		wp_localize_script('wpdev-setup-wizard', 'wpdev_setup_settings', array(
			'dry_run'               => wpdev_request('dry-run', true),
			'generic_error_message' => __('A server error happened while processing this item.', 'wpdev'),
			'nonce'                 => wp_create_nonce( 'wpdev-ajax-nonce' ),
		));

		wp_enqueue_script('wpdev-setup-wizard');

		return wpdev_get_template_contents('wizards/setup/installation_steps', array(
			'page'   => $this,
			'steps'  => $steps,
			'checks' => $checks,
            'dir'    => (__DIR__ . '/views'),
		));

	} // end render_installation_steps;

	/**
	 * Renders the terms of support.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public function _terms_of_support() {

		return wpdev_get_template_contents('wizards/setup/support_terms',[
                'dir'    => (__DIR__ . '/views'),
        ]);

	} // end _terms_of_support;

	/**
	 * Renders the requirements tables.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public function renders_requirements_table() {

		global $wp_version;

		$requirements = array(
			'php'       => array(
				'name'                => __('PHP', 'wpdev'),
				'help'                => wpdev_get_documentation_url('wpdev-requirements'),
				'required_version'    => \WPDevFramework\Requirements::$php_version,
				'recommended_version' => \WPDevFramework\Requirements::$php_recommended_version,
				'installed_version'   => phpversion(),
				'pass_requirements'   => version_compare(phpversion(), \WPDevFramework\Requirements::$php_version, '>='),
				'pass_recommendation' => version_compare(phpversion(), \WPDevFramework\Requirements::$php_recommended_version, '>=')
			),
			'wordpress' => array(
				'name'                => __('WordPress', 'wpdev'),
				'help'                => wpdev_get_documentation_url('wpdev-requirements'),
				'required_version'    => \WPDevFramework\Requirements::$wp_version,
				'recommended_version' => \WPDevFramework\Requirements::$wp_recommended_version,
				'installed_version'   => $wp_version,
				'pass_requirements'   => version_compare(phpversion(), \WPDevFramework\Requirements::$wp_version, '>='),
				'pass_recommendation' => version_compare(phpversion(), \WPDevFramework\Requirements::$wp_recommended_version, '>=')
			),
		);

		$plugin_requirements = array(
			'multisite' => array(
				'name'              => __('WordPress Multisite', 'wpdev'),
				'help'              => wpdev_get_documentation_url('wpdev-requirements'),
				'condition'         => __('Installed & Activated', 'wpdev'),
				'pass_requirements' => is_multisite(),
			),
			'wpdev' => array(
				'name'              => __('WPDev', 'wpdev'),
				'help'              => wpdev_get_documentation_url('wpdev-requirements'),
				'condition'         => function_exists( 'wpdev_is_network_context' ) && ! wpdev_is_network_context()
					? __( 'Activated', 'wpdev' )
					: ( apply_filters( 'WPDev_skip_network_active_check', false ) ? __( 'Bypassed via filter', 'wpdev' ) : __( 'Network Activated', 'wpdev' ) ),
				'pass_requirements' => function_exists( 'wpdev_is_network_context' ) && ! wpdev_is_network_context()
					? ( function_exists( 'is_plugin_active' ) ? is_plugin_active( WPDEV_PLUGIN_BASENAME ) : true )
					: \WPDevFramework\Requirements::is_network_active(),
			),
			'wp-cron'   => array(
				'name'              => __('WordPress Cron', 'wpdev'),
				'help'              => wpdev_get_documentation_url('wpdev-requirements'),
				'condition'         => __('Activated', 'wpdev'),
				'pass_requirements' => \WPDevFramework\Requirements::check_wp_cron(),
			),
		);

		return wpdev_get_template_contents('wizards/setup/requirements_table', array(
			'requirements'        => $requirements,
			'plugin_requirements' => $plugin_requirements,
            'dir'    => (__DIR__ . '/views'),
		));

	} // end renders_requirements_table;

	/**
	 * Displays the content of the final section.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function section_ready() {

		update_network_option(null, 'wpdev_setup_finished', true);

		/**
		 * Mark the migration as done, if this was a migration.
		 *
		 * @since 2.0.7
		 */
		if (Migrator::is_legacy_network()) {

			update_network_option(null, 'wpdev_is_migration_done', true);

		} // end if;

		wpdev_enqueue_async_action('wpdev_async_take_screenshot', array(
			'site_id' => wpdev_get_main_site_id(),
		), 'site');

		wpdev_get_template('wizards/setup/ready', array(
			'screen' => get_current_screen(),
			'page'   => $this,
            'dir'    => (__DIR__ . '/views'),
		));

	} // end section_ready;

	/**
	 * Handles the requirements check.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_checks() {

		if (\WPDevFramework\Requirements::met() === false) {

			wp_redirect(add_query_arg());

			exit;

		} // end if;

		wp_redirect($this->get_next_section_link());

		exit;

	} // end handle_checks;

	/**
	 * Handles the saving of setting steps.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_save_settings() {

		$this->set_settings();

		$step = wpdev_request('step');

		if ($step === 'your-company') {

			$fields_to_save = $this->get_general_settings();

		} elseif ($step === 'payment-gateways') {

			$fields_to_save = $this->get_payment_settings();

		} else {

			return;

		} // end if;

		$settings_to_save = array_intersect_key($_POST, $fields_to_save);

		\WPDevFramework\Settings::get_instance()->save_settings($settings_to_save);

		wp_redirect($this->get_next_section_link());

		exit;

	} // end handle_save_settings;

	/**
	 * Handles the migration step and checks for a test run.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_migration() {

		$dry_run = wpdev_request('dry-run', true);

		$errors = Migrator::get_instance()->get_errors();

		if ($dry_run) {

			$url = add_query_arg('dry-run', empty($errors) ? 0 : 1);

		} else {

			if (empty($errors)) {

				$url = remove_query_arg('dry-run', $this->get_next_section_link());

			} else {

				$url = add_query_arg('dry-run', 0);

			} // end if;

		} // end if;

		wp_redirect($url);

		exit;

	} // end handle_migration;

	/**
	 * Handles the activation of a given integration.
	 *
	 * @since 2.0.0
	 * @return void|WP_Error
	 */
	public function handle_activation() {

		$license = License::get_instance();

		/*
		 * Already activated.
		 */
		if ($license->allowed()) {

			wp_redirect($this->get_next_section_link());

			exit;

		} // end if;

		$activation_results = $license->activate(wpdev_request('license_key'));

		if (is_wp_error($activation_results)) {

			$_REQUEST['error'] = $activation_results->get_error_message();

		} else {

			wp_redirect($this->get_next_section_link());

			exit;

		} // end if;

	} // end handle_activation;

	/**
	 * Handles the configuration of a given integration.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_configuration() {

		if ($_POST['submit'] === '1') {

			$this->integration->setup_constants($_POST);

			$redirect_url = $this->get_next_section_link();

			wp_redirect($redirect_url);

			exit;

		} // end if;

	} // end handle_configuration;

	/**
	 * Handles the testing of a given configuration.
	 *
	 * @todo Move Vue to a scripts management class.
	 * @since 2.0.0
	 * @return void
	 */
	public function section_test() {

		wp_enqueue_script('wpdev-vue');

		wpdev_get_template('wizards/host-integrations/test', array(
			'screen'      => get_current_screen(),
			'page'        => $this,
			'integration' => $this->integration,
            'dir'    => (__DIR__ . '/views'),
		));

	} // end section_test;

	/**
	 * Adds the necessary missing scripts if WPDev was not loaded.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_scripts() {

		if ( wpdev()->is_loaded() === false) {

			wp_enqueue_style('wpdev-styling', wpdev_get_module_asset_url('core', 'framework.css', 'css'), false, wpdev_get_version());

			wp_enqueue_style('wpdev-admin', wpdev_get_module_asset_url('core', 'admin.css', 'css'), array('wpdev-styling'), wpdev_get_version());

			/*
			* Adds tipTip
			*/
			wp_enqueue_script('wpdev-tiptip', wpdev_get_module_asset_url('core', 'lib/tiptip.js', 'js'));

			/*
			* Adds jQueryBlockUI
			*/
			wp_enqueue_script('wpdev-block-ui', wpdev_get_module_asset_url('core', 'lib/jquery.blockUI.js', 'js'), array('jquery'));

			wp_register_script('wpdev-fields', wpdev_get_module_asset_url('field-builder', 'fields.js', 'js'), array('jquery'));

			/*
			* Localize components
			*/
			wp_localize_script('wpdev-fields', 'wpdev_fields', array(
				'l10n' => array(
					'image_picker_title'       => __('Select an Image.', 'wpdev'),
					'image_picker_button_text' => __('Use this image', 'wpdev'),
				),
			));

			wp_register_script('wpdev-functions', wpdev_get_module_asset_url('core', 'functions.js', 'js'), array('jquery'));

			wp_register_script('wubox', wpdev_get_module_asset_url('core', 'wubox.js', 'js'), array('wpdev-functions'));

			wp_localize_script('wubox', 'wuboxL10n', array(
				'next'             => __('Next &gt;'),
				'prev'             => __('&lt; Prev'),
				'image'            => __('Image'),
				'of'               => __('of'),
				'close'            => __('Close'),
				'noiframes'        => __('This feature requires inline frames. You have iframes disabled or your browser does not support them.'),
				'loadingAnimation' => includes_url('js/thickbox/loadingAnimation.gif'),
			));

			wp_add_inline_script('wpdev-setup-wizard-polyfill', 'document.addEventListener("DOMContentLoaded", () => wpdev_initialize_imagepicker());', 'after');

		} // end if;

		wp_enqueue_script('wpdev-setup-wizard-polyfill', wpdev_get_module_asset_url('wizard', 'setup-wizard-polyfill.js', 'js'), array('jquery', 'wpdev-fields', 'wpdev-functions', 'wubox'), wpdev_get_version());

		wp_enqueue_media();

		wp_register_script('wpdev-setup-wizard', wpdev_get_module_asset_url('wizard', 'setup-wizard.js', 'js'), array('jquery'), wpdev_get_version());

		wp_add_inline_style('wpdev-admin', sprintf('
		body.wpdev-page-wpdev-setup #wpwrap {
			background: url("%s") right bottom no-repeat;
			background-size: 90%%;
		}', wpdev_get_asset('bg-setup.png', 'img')));

	} // end register_scripts;

} // end class Setup_Wizard_Admin_Page;
