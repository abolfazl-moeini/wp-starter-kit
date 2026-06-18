<?php
/**
 * Legacy domain manager boot (extracted from WPDev bootstrap).
 *
 * Domain managers boot from example setup.php via wpdev_boot_module_manager().
 *
 * @package WPDevFramework\Core\Legacy
 * @since   2.5.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Boot a manager unless its module already boots it on wpdev_load.
 *
 * @param string $module_id     Module slug.
 * @param string $manager_class Manager FQCN.
 * @return void
 */
function wpdev_maybe_boot_manager( $module_id, $manager_class ) {

	if ( function_exists( 'wpdev_module_boots_managers' ) && wpdev_module_boots_managers( $module_id ) ) {
		return;
	}

	if ( class_exists( $manager_class ) ) {
		$manager_class::get_instance();
	}

} // end wpdev_maybe_boot_manager;

/**
 * Boot framework managers only (domain managers load from examples).
 *
 * @return void
 */
function wpdev_load_managers() {

	if ( ! apply_filters( 'wpdev_module_enabled', true, 'core' ) ) {
		WPDevFramework\License::get_instance();
	}

	if ( ! \WPDevFramework\Core\Service_Registry::has( 'view' ) ) {
		WPDevFramework\Views::get_instance();
	}

} // end wpdev_load_managers;
