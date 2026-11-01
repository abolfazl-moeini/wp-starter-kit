<?php
/**
 * Legacy extra component boot (extracted from WPDev bootstrap).
 *
 * @package WPDevFramework\Core\Legacy
 * @since   2.5.0
 * @since   2.8.1 Domain component boot moved to owning examples. SSO,
 *                limits, checkout UI, customer-panel UI, taxes, site
 *                template placeholders, and checkout classes are no longer
 *                referenced from this file. Whitelabel remains framework-owned.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Boot framework-only services.
 *
 * Domain-owned components (SSO, limits, checkout UI, customer-panel UI,
 * taxes, site templates) are booted by their owning example setup files.
 * Whitelabel settings remain framework-owned (`WPDevFramework\Whitelabel`
 * in modules/core) and are booted here.
 *
 * @return void
 */
function wpdev_load_extra_components() {

	if ( ! \WPDevFramework\Core\Service_Registry::has( 'tour' ) ) {
		if ( ! class_exists( '\WPDevFramework\Core\Tour\Tours', false ) ) {
			require_once dirname( __DIR__ ) . '/tour/class-tours.php';
		}
		\WPDevFramework\Core\Tour\Tours::get_instance();
	}

	\WPDevFramework\Maintenance_Mode::get_instance();

	\WPDevFramework\Builders\Block_Editor\Block_Editor_Widget_Manager::get_instance();

	if ( ! \WPDevFramework\Core\Service_Registry::has( 'ajax' ) ) {
		\WPDevFramework\Light_Ajax::get_instance();
		\WPDevFramework\Ajax::get_instance();
	}

	\WPDevFramework\API::get_instance();
	// The register endpoint is SaaS-domain code: both its REST schema and its
	// request handler dereference memberships/payments/sites/checkout models
	// that are absent from installs without those examples.
	if ( \WPDevFramework\API\Register_Endpoint::domain_schema_classes_available() ) {
		\WPDevFramework\API\Register_Endpoint::get_instance();
	}
	\WPDevFramework\Documentation::get_instance();

	\WPDevFramework\Dashboard_Statistics::get_instance();
	\WPDevFramework\User_Switching::get_instance();
	\WPDevFramework\Compat\Legacy_Shortcodes::get_instance();
	\WPDevFramework\Compat\Gutenberg_Support::get_instance();

	\WPDevFramework\Compat\Elementor_Compat::get_instance();
	\WPDevFramework\Compat\General_Compat::get_instance();

	// Multisite-only: shared users table + per-site account scoping.
	if ( is_multisite() ) {
		\WPDevFramework\Compat\Multiple_Accounts_Compat::get_instance();
	}
	\WPDevFramework\Dashboard_Widgets::get_instance();
	\WPDevFramework\Admin_Themes_Compatibility::get_instance();
	\WPDevFramework\Cron::get_instance();

	// Framework settings tab: admin.php?page=wpdev-settings&tab=whitelabel
	\WPDevFramework\Whitelabel::get_instance();
} // end wpdev_load_extra_components;
