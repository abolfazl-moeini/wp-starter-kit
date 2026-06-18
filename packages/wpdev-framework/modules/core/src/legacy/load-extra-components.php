<?php
/**
 * Legacy extra component boot (extracted from WPDev bootstrap).
 *
 * @package WPDevFramework\Core\Legacy
 * @since   2.5.0
 * @since   2.8.1 Domain component boot moved to owning examples. SSO,
 *                limits, whitelabel, checkout UI, customer-panel UI,
 *                taxes, site template placeholders, and checkout classes
 *                are no longer referenced from this file.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Boot framework-only services.
 *
 * Domain-owned components (SSO, limits, whitelabel settings, checkout
 * UI, customer-panel UI, taxes, site templates) are booted by their
 * owning example setup files. This function only wires services that
 * belong to the framework itself.
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
	\WPDevFramework\API\Register_Endpoint::get_instance();
	\WPDevFramework\Documentation::get_instance();

	\WPDevFramework\Dashboard_Statistics::get_instance();
	\WPDevFramework\User_Switching::get_instance();
	\WPDevFramework\Compat\Legacy_Shortcodes::get_instance();
	\WPDevFramework\Compat\Gutenberg_Support::get_instance();

	if ( defined( 'WPDEV_EXAMPLES_DIR' ) ) {
		\WPDevFramework\Compat\Product_Compat::get_instance();
		\WPDevFramework\Compat\Discount_Code_Compat::get_instance();
	}

	\WPDevFramework\Compat\Elementor_Compat::get_instance();
	\WPDevFramework\Compat\General_Compat::get_instance();

	\WPDevFramework\Compat\Multiple_Accounts_Compat::get_instance();
	\WPDevFramework\Dashboard_Widgets::get_instance();
	\WPDevFramework\Admin_Themes_Compatibility::get_instance();
	\WPDevFramework\Cron::get_instance();
} // end wpdev_load_extra_components;
