<?php
/**
 * WPDev Dashboard Admin Page.
 *
 * @package WPDev
 * @subpackage Admin_Pages
 * @since 2.0.0
 */

namespace WPDevFramework\Admin_Pages;

use \WPDevFramework\Settings;
use \WPDevFramework\UI\Form;
use \WPDevFramework\UI\Field;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * WPDev Dashboard Admin Page.
 */
class Settings_Admin_Page extends Wizard_Admin_Page {

	/**
	 * Holds the ID for this page, this is also used as the page slug.
	 *
	 * @var string
	 */
	protected $id = 'wpdev-settings';

	/**
	 * Is this a top-level menu or a submenu?
	 *
	 * @since 1.8.2
	 * @var string
	 */
	protected $type = 'submenu';

	/**
	 * Dashicon to be used on the menu item. This is only used on top-level menus
	 *
	 * @since 1.8.2
	 * @var string
	 */
	protected $menu_icon = 'dashicons-wpdev-wpdev';

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
		'network_admin_menu' => 'wpdev_read_settings',
		'admin_menu' => 'wpdev_read_settings',
	);

	/**
	 * Should we hide admin notices on this page?
	 *
	 * @since 2.0.0
	 * @var boolean
	 */
	protected $hide_admin_notices = false;

	/**
	 * Should we force the admin menu into a folded state?
	 *
	 * @since 2.0.0
	 * @var boolean
	 */
	protected $fold_menu = false;

	/**
	 * Holds the section slug for the URLs.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	protected $section_slug = 'tab';

	/**
	 * Defines if the step links on the side are clickable or not.
	 *
	 * @since 2.0.0
	 * @var boolean
	 */
	protected $clickable_navigation = true;

	/**
	 * Settings uses the wizard layout but keeps the WP admin menu expanded.
	 *
	 * @since 2.7.0
	 * @return void
	 */
	public function add_admin_body_classes() {

		parent::add_admin_body_classes();

		add_filter(
			'admin_body_class',
			function ( $classes ) {
				// Wizard defaults and playground parity may still add `folded`.
				return preg_replace( '/\s*\bfolded\b/', '', (string) $classes ) . ' ';
			},
			100
		);

	} // end add_admin_body_classes;

	/**
	 * Allow child classes to register scripts and styles that can be loaded on the output function, for example.
	 *
	 * @since 1.8.2
	 * @return void
	 */
	public function register_scripts() {

		wp_enqueue_editor();

		parent::register_scripts();

		/*
		 * Adds Vue.
		 */
		wp_enqueue_script('wpdev-vue-apps');

		wp_enqueue_script('wpdev-fields');

		wp_enqueue_style('wp-color-picker');

	} // end register_scripts;

	/**
	 * Registers widgets to the edit page.
	 *
	 * This implementation register the default save widget.
	 * Child classes that wish to inherit that widget while registering other,
	 * can do such by adding a parent::register_widgets() to their own register_widgets() method.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_widgets() {

		parent::register_widgets();

		wpdev_register_settings_side_panel('general', array(
			'title'  => __('Add-ons', 'wpdev'),
			'render' => array($this, 'render_addons_side_panel'),
		));

		wpdev_register_settings_side_panel('login-and-registration', array(
			'title'  => __('Checkout Forms', 'wpdev'),
			'render' => array($this, 'render_checkout_forms_side_panel'),
		));

		wpdev_register_settings_side_panel('integrations', array(
			'title'  => __('Add-ons', 'wpdev'),
			'render' => array($this, 'render_addons_side_panel'),
		));

		wpdev_register_settings_side_panel('sites', array(
			'title'  => __('Template Previewer', 'wpdev'),
			'render' => array($this, 'render_site_template_side_panel'),
		));

		wpdev_register_settings_side_panel('sites', array(
			'title'  => __('Placeholder Editor', 'wpdev'),
			'render' => array($this, 'render_site_placeholders_side_panel'),
		));

		wpdev_register_settings_side_panel('payment-gateways', array(
			'title'  => __('Invoices', 'wpdev'),
			'render' => array($this, 'render_invoice_side_panel'),
		));

		wpdev_register_settings_side_panel('payment-gateways', array(
			'title'  => __('Additional Gateways', 'wpdev'),
			'render' => array($this, 'render_gateways_addons_side_panel'),
		));

		wpdev_register_settings_side_panel('emails', array(
			'title'  => __('System Emails', 'wpdev'),
			'render' => array($this, 'render_system_emails_side_panel'),
		));

		wpdev_register_settings_side_panel('emails', array(
			'title'  => __('Email Template', 'wpdev'),
			'render' => array($this, 'render_email_template_side_panel'),
		));

		wpdev_register_settings_side_panel('all', array(
			'title'  => __('Your License', 'wpdev'),
			'render' => array($this, 'render_account_side_panel'),
			'show'   => array(\WPDevFramework\License::get_instance(), 'is_not_whitelabel'),
		));

	} // end register_widgets;

	// phpcs:disable

	/**
	 * Renders the addons side panel
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_addons_side_panel() { ?>

		<div class="wpdev-widget-inset">

			<div class="wpdev-p-4">

				<span class="wpdev-text-gray-700 wpdev-font-bold wpdev-uppercase wpdev-tracking-wide wpdev-text-xs">
					<?php _e('WPDev Add-ons', 'wpdev'); ?>
				</span>

				<div class="wpdev-py-2">
					<img class="wpdev-w-full" alt="<?php esc_attr_e('WPDev Add-ons', 'wpdev'); ?>" src="<?php echo wpdev_get_asset('sidebar/add-ons.png'); ?>">
				</div>

				<p class="wpdev-text-gray-600 wpdev-p-0 wpdev-m-0">
					<?php _e('You can extend WPDev\'s functionality by installing one of our add-ons!', 'wpdev'); ?>
				</p>

			</div>

			<div class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300">
				<a class="button wpdev-w-full wpdev-text-center" href="<?php echo wpdev_network_admin_url('wpdev-addons'); ?>">
					<?php _e('Check our Add-ons &rarr;', 'wpdev'); ?>
				</a>
			</div>

		</div>

		<?php

	} // end render_addons_side_panel;

	/**
	 * Renders the account side panel
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_account_side_panel() {

		$customer = \WPDevFramework\License::get_instance()->get_customer();

		$license = \WPDevFramework\License::get_instance()->get_license();

		?>

		<div class="wpdev-widget-inset">

			<?php if (empty($customer) || empty($license)) : ?>

				<div class="wpdev-p-4">

					<span class="wpdev-p-2 wpdev-bg-red-100 wpdev-text-red-600 wpdev-rounded wpdev-block">
						<?php _e('Your copy of WPDev is not currently active. That means you will not have access to plugin updates and add-ons.', 'wpdev'); ?>
					</span>

				</div>

				<div class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300">
					<a id="wpdev-activate-license-key-button" class="button wpdev-w-full wpdev-text-center wubox" title="<?php esc_attr_e('Activate WPDev', 'wpdev'); ?>" href="<?php echo wpdev_get_form_url('license_activation'); ?>">
						<?php _e('Activate WPDev &rarr;', 'wpdev'); ?>
					</a>
				</div>

			<?php else : ?>

				<div class="wpdev-p-4">

					<span class="wpdev-text-gray-700 wpdev-font-bold wpdev-uppercase wpdev-tracking-wide wpdev-text-xs">
						<?php _e('Registered to', 'wpdev'); ?>
					</span>

					<p class="wpdev-text-gray-700 wpdev-p-0 wpdev-m-0 wpdev-mt-2">
						<?php printf('%s %s', $customer->first, $customer->last); ?>
						<span class="wpdev-text-xs wpdev-text-gray-600 wpdev-block"><?php echo $customer->email; ?></span>
						<span class="
							wpdev-flex wpdev-items-center wpdev-justify-between
							wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-rounded
							wpdev-bg-gray-100 wpdev-text-gray-600
							wpdev-py-1 wpdev-px-2
							wpdev-mt-3
							wpdev-text-xs
						">
							<?php echo substr_replace((string) $license->secret_key, str_repeat('*', 16), 4, 24); ?>
							<a
								title="<?php esc_attr_e('Deactivate WPDev License', 'wpdev'); ?>"
								class="dashicons dashicons-trash wpdev-text-red-600 wubox"
								href="<?php echo wpdev_get_form_url('license_deactivation'); ?>"
							></a>
						</span>
					</p>

				</div>

				<!-- <?php if (current_user_can('wpdev_license')) : ?>

					<div class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300">
						<a id="wpdev-manage-account-button" class="button wpdev-w-full wpdev-text-center wubox" href="<?php echo wpdev_get_form_url('license_activation'); ?>">
							<?php _e('Manage your Account &rarr;', 'wpdev'); ?>
						</a>
					</div>

				<?php endif; ?> -->

			<?php endif; ?>

		</div>

		<?php

	} // end render_account_side_panel;

	/**
	 * Renders the addons side panel
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_gateways_addons_side_panel() { ?>

		<div class="wpdev-widget-inset">

			<div class="wpdev-p-4">

				<span class="wpdev-text-gray-700 wpdev-font-bold wpdev-uppercase wpdev-tracking-wide wpdev-text-xs">
					<?php _e('Accept Payments wherever you are', 'wpdev'); ?>
				</span>

				<div class="wpdev-py-2">
					<img class="wpdev-w-full" alt="<?php esc_attr_e('Accept payments wherever you are', 'wpdev'); ?>" src="<?php echo wpdev_get_asset('sidebar/gateway-add-ons.png'); ?>">
				</div>

				<p class="wpdev-text-gray-600 wpdev-p-0 wpdev-m-0">
					<?php _e('We are constantly adding support to new payment gateways that can be installed as add-ons.', 'wpdev'); ?>
				</p>

			</div>

			<div class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300">
				<a class="button wpdev-w-full wpdev-text-center" href="<?php echo wpdev_network_admin_url('wpdev-addons', array('tab' => 'gateways')); ?>">
					<?php _e('Check our supported Gateways &rarr;', 'wpdev'); ?>
				</a>
			</div>

		</div>

		<?php

	} // end render_gateways_addons_side_panel;

	/**
	 * Renders the addons side panel
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_checkout_forms_side_panel() { ?>

		<div class="wpdev-widget-inset">

			<div class="wpdev-p-4">

				<span class="wpdev-text-gray-700 wpdev-font-bold wpdev-uppercase wpdev-tracking-wide wpdev-text-xs">
					<?php _e('Checkout Forms', 'wpdev'); ?>
				</span>

				<div class="wpdev-py-2">
					<img class="wpdev-w-full" alt="<?php esc_attr_e('Checkout Forms', 'wpdev'); ?>" src="<?php echo wpdev_get_asset('sidebar/checkout-forms.png'); ?>">
				</div>

				<p class="wpdev-text-gray-600 wpdev-p-0 wpdev-m-0">
					<?php _e('You can create multiple Checkout Forms for different occasions (seasonal campaigns, launches, etc)!', 'wpdev'); ?>
				</p>

			</div>

			<?php
			$checkout_forms_admin_url = apply_filters( 'wpdev_settings_checkout_forms_admin_url', '' );
			if ( $checkout_forms_admin_url && current_user_can( 'wpdev_edit_checkout_forms' ) ) : ?>

				<div class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300">
					<a class="button wpdev-w-full wpdev-text-center" href="<?php echo esc_url( $checkout_forms_admin_url ); ?>">
						<?php _e('Manage Checkout Forms &rarr;', 'wpdev'); ?>
					</a>
				</div>

			<?php endif; ?>

		</div>

		<?php

	} // end render_checkout_forms_side_panel;

	/**
	 * Renders the site template side panel
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_site_template_side_panel() { ?>

		<div class="wpdev-widget-inset">

			<div class="wpdev-p-4">

				<span class="wpdev-text-gray-700 wpdev-font-bold wpdev-uppercase wpdev-tracking-wide wpdev-text-xs">
					<?php _e('Customize the Template Previewer', 'wpdev'); ?>
				</span>

				<div class="wpdev-py-2">
					<img class="wpdev-w-full" alt="<?php esc_attr_e('Customize the Template Previewer', 'wpdev'); ?>" src="<?php echo wpdev_get_asset('sidebar/site-template.png'); ?>">
				</div>

				<p class="wpdev-text-gray-600 wpdev-p-0 wpdev-m-0">
					<?php _e('Did you know that you can customize colors, logos, and more options of the Site Template Previewer top-bar?', 'wpdev'); ?>
				</p>

			</div>

			<?php if (current_user_can('wpdev_edit_sites')) : ?>

				<div class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300">
					<a class="button wpdev-w-full wpdev-text-center" target="_blank" href="<?php echo wpdev_network_admin_url('wpdev-customize-template-previewer'); ?>">
						<?php _e('Go to Customizer &rarr;', 'wpdev'); ?>
					</a>
				</div>

			<?php endif; ?>

		</div>

		<?php

	} // end render_site_template_side_panel;

	/**
	 * Renders the site placeholder side panel
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_site_placeholders_side_panel() { ?>

		<div class="wpdev-widget-inset">

			<div class="wpdev-p-4">

				<span class="wpdev-text-gray-700 wpdev-font-bold wpdev-uppercase wpdev-tracking-wide wpdev-text-xs">
					<?php _e('Customize the Template Placeholders', 'wpdev'); ?>
				</span>

				<div class="wpdev-py-2">
					<img class="wpdev-w-full" alt="<?php esc_attr_e('Customize the Template Placeholders', 'wpdev'); ?>" src="<?php echo wpdev_get_asset('sidebar/template-placeholders.png'); ?>">
				</div>

				<p class="wpdev-text-gray-600 wpdev-p-0 wpdev-m-0">
					<?php _e('If you are using placeholder substitutions inside your site templates, use this tool to add, remove, or change the default content of those placeholders.', 'wpdev'); ?>
				</p>

			</div>

			<?php if (current_user_can('wpdev_edit_sites')) : ?>

				<div class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300">
					<a class="button wpdev-w-full wpdev-text-center" target="_blank" href="<?php echo wpdev_network_admin_url('wpdev-template-placeholders'); ?>">
						<?php _e('Edit Placeholders &rarr;', 'wpdev'); ?>
					</a>
				</div>

			<?php endif; ?>

		</div>

		<?php

	} // end render_site_placeholders_side_panel;

	/**
	 * Renders the invoice side panel
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_invoice_side_panel() { ?>

		<div class="wpdev-widget-inset">

			<div class="wpdev-p-4">

				<span class="wpdev-text-gray-700 wpdev-font-bold wpdev-uppercase wpdev-tracking-wide wpdev-text-xs">
					<?php _e('Customize the Invoice Template', 'wpdev'); ?>
				</span>

				<div class="wpdev-py-2">
					<img class="wpdev-w-full" alt="<?php esc_attr_e('Customize the Invoice Template', 'wpdev'); ?>" src="<?php echo wpdev_get_asset('sidebar/invoice-template.png'); ?>">
				</div>

				<p class="wpdev-text-gray-600 wpdev-p-0 wpdev-m-0">
					<?php _e('Did you know that you can customize colors, logos, and more options of the Invoice PDF template?', 'wpdev'); ?>
				</p>

			</div>

			<?php if (current_user_can('wpdev_edit_payments')) : ?>

				<div class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300">
					<a class="button wpdev-w-full wpdev-text-center" target="_blank" href="<?php echo wpdev_network_admin_url('wpdev-customize-invoice-template'); ?>">
						<?php _e('Go to Customizer &rarr;', 'wpdev'); ?>
					</a>
				</div>

			<?php endif; ?>

		</div>

		<?php

	} // end render_invoice_side_panel;

	/**
	 * Renders system emails side panel.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_system_emails_side_panel() { ?>

		<div class="wpdev-widget-inset">

			<div class="wpdev-p-4">

				<span class="wpdev-text-gray-700 wpdev-font-bold wpdev-uppercase wpdev-tracking-wide wpdev-text-xs">
					<?php _e('Customize System Emails', 'wpdev'); ?>
				</span>

				<div class="wpdev-py-2">
					<img class="wpdev-w-full" alt="<?php esc_attr_e('Customize System Emails', 'wpdev'); ?>" src="<?php echo wpdev_get_asset('sidebar/system-emails.png'); ?>">
				</div>

				<p class="wpdev-text-gray-600 wpdev-p-0 wpdev-m-0">
					<?php _e('You can completely customize the contents of the emails sent out by WPDev when particular events occur, such as Account Creation, Payment Failures, etc.', 'wpdev'); ?>
				</p>

			</div>

			<?php
			$system_emails_admin_url = apply_filters( 'wpdev_settings_system_emails_admin_url', '' );
			if ( $system_emails_admin_url && current_user_can( 'wpdev_edit_broadcasts' ) ) : ?>

				<div class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300">
					<a class="button wpdev-w-full wpdev-text-center" target="_blank" href="<?php echo esc_url( $system_emails_admin_url ); ?>">
						<?php _e('Customize System Emails &rarr;', 'wpdev'); ?>
					</a>
				</div>

			<?php endif; ?>

		</div>

		<?php

	} // end render_system_emails_side_panel;

	/**
	 * Renders the email template side panel.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_email_template_side_panel() { ?>

		<div class="wpdev-widget-inset">

			<div class="wpdev-p-4">

				<span class="wpdev-text-gray-700 wpdev-font-bold wpdev-uppercase wpdev-tracking-wide wpdev-text-xs">
					<?php _e('Customize Email Template', 'wpdev'); ?>
				</span>

				<div class="wpdev-py-2">
					<img class="wpdev-w-full" alt="<?php esc_attr_e('Customize Email Template', 'wpdev'); ?>" src="<?php echo wpdev_get_asset('sidebar/email-template.png'); ?>">
				</div>

				<p class="wpdev-text-gray-600 wpdev-p-0 wpdev-m-0">
					<?php _e('If your network is using the HTML email option, you can customize the look and feel of the email template.', 'wpdev'); ?>
				</p>

			</div>

			<?php if (current_user_can('wpdev_edit_broadcasts')) : ?>

				<div class="wpdev-p-4 wpdev-bg-gray-100 wpdev-border-solid wpdev-border-0 wpdev-border-t wpdev-border-gray-300">
					<a class="button wpdev-w-full wpdev-text-center" target="_blank" href="<?php echo wpdev_network_admin_url('wpdev-customize-email-template'); ?>">
						<?php _e('Customize Email Template &rarr;', 'wpdev'); ?>
					</a>
				</div>

			<?php endif; ?>

		</div>

		<?php

	} // end render_email_template_side_panel;

	// phpcs:enable

	/**
	 * Returns the title of the page.
	 *
	 * @since 2.0.0
	 * @return string Title of the page.
	 */
	public function get_title() {

		return __('Settings', 'wpdev');

	} // end get_title;

	/**
	 * Returns the title of menu for this page.
	 *
	 * @since 2.0.0
	 * @return string Menu label of the page.
	 */
	public function get_menu_title() {

		return __('Settings', 'wpdev');

	} // end get_menu_title;

	/**
	 * Every child class should implement the output method to display the contents of the page.
	 *
	 * @since 1.8.2
	 * @return void
	 */
	public function output() {
		/*
		 * Enqueue the base Dashboard Scripts
		 */
		wp_enqueue_media();
		wp_enqueue_script('dashboard');
		wp_enqueue_style('wp-color-picker');
		wp_enqueue_script('wp-color-picker');
		wp_enqueue_script('media');
		wp_enqueue_script('wpdev-vue');
		wp_enqueue_script('wpdev-selectizer');

		do_action('wpdev_render_settings');

		$template = class_exists( 'WPDev\\Modules\\AdminPageBuilder\\Page_Template_Registry' )
			? \WPDevFramework\Modules\AdminPageBuilder\Page_Template_Registry::resolve( 'settings', 'base/settings' )
			: 'base/settings';

		wpdev_get_template( $template, array(
			'screen'               => get_current_screen(),
			'page'                 => $this,
			'classes'              => '',
			'sections'             => $this->get_sections(),
			'current_section'      => $this->get_current_section(),
			'clickable_navigation' => $this->clickable_navigation,
		));

	} // end output;

	/**
	 * Returns the list of settings sections.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_sections() {

		return wpdev()->settings->get_sections();

	} // end get_sections;

	/**
	 * Default handler for step submission. Simply redirects to the next step.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function default_handler() {

		if (!current_user_can('wpdev_edit_settings')) {

			wp_die(__('You do not have the permissions required to change settings.', 'wpdev'));

		} // end if;

		if (!isset($_POST['active_gateways']) && wpdev_request('tab') === 'payment-gateways') {

			$_POST['active_gateways'] = array();

		} // end if;

		wpdev()->settings->save_settings($_POST);

		wp_redirect(add_query_arg('updated', 1, wpdev_get_current_url()));

		exit;

	} // end default_handler;

	/**
	 * Default method for views.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function default_view() {

		$sections = $this->get_sections();

		$section_slug = $this->get_current_section();

		$section = $this->current_section;

		$fields = array_filter($section['fields'], fn($item) => current_user_can($item['capability']));

		uasort($fields, 'wpdev_sort_by_order');

		/*
		 * Get Field to save
		 */
		$fields['save'] = array(
			'type'            => 'submit',
			'title'           => __('Save Settings', 'wpdev'),
			'classes'         => 'button button-primary button-large wpdev-ml-auto wpdev-w-full md:wpdev-w-auto',
			'wrapper_classes' => 'wpdev-sticky wpdev-bottom-0 wpdev-save-button wpdev-mr-px wpdev-w-full md:wpdev-w-auto',
			'html_attr'       => array(
				'v-on:click' => 'send("window", "wpdev_block_ui", "#wpcontent")'
			),
		);

		if (!current_user_can('wpdev_edit_settings')) {

			$fields['save']['html_attr']['disabled'] = 'disabled';

		} // end if;

		$form = new Form($section_slug, $fields, array(
			'views'                 => 'admin-pages/fields',
			'classes'               => 'wpdev-modal-form wpdev-widget-list wpdev-striped wpdev--mt-5 wpdev--mx-in wpdev--mb-in',
			'field_wrapper_classes' => 'wpdev-w-full wpdev-box-border wpdev-items-center wpdev-flex wpdev-justify-between wpdev-p-4 wpdev-py-5 wpdev-m-0 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-300 wpdev-border-solid',
			'html_attr'             => array(
				'style'        => '',
				'data-on-load' => 'remove_block_ui',
				'data-wpdev-app'  => str_replace('-', '_', $section_slug),
				'data-state'   => json_encode(wpdev_array_map_keys('wpdev_replace_dashes', Settings::get_instance()->get_all(true))),
			),
		));

		$form->render();

	} // end default_view;

} // end class Settings_Admin_Page;
