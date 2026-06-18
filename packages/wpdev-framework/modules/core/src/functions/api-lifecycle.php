<?php
/**
 * Uniform module API lifecycle helpers.
 *
 * Register entities on wpdev_load; instantiate admin pages on wpdev_admin_pages.
 *
 * @package WPDevFramework\Core\Functions
 * @since   2.7.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Run a callback when WPDev modules are loaded and ready for registration.
 *
 * @since 2.7.0
 *
 * @param callable $callback Registration callback.
 * @param int      $priority Hook priority. Default 10.
 * @return void
 */
function wpdev_on_load( $callback, $priority = 10 ) {

	if ( ! is_callable( $callback ) ) {
		return;
	}

	add_action( 'wpdev_load', $callback, (int) $priority );

} // end wpdev_on_load;

/**
 * Run a callback when admin page classes should be instantiated.
 *
 * @since 2.7.0
 *
 * @param callable $callback Page bootstrap callback.
 * @param int      $priority Hook priority. Default 10.
 * @return void
 */
function wpdev_on_admin_pages( $callback, $priority = 10 ) {

	if ( ! is_callable( $callback ) ) {
		return;
	}

	add_action( 'wpdev_admin_pages', $callback, (int) $priority );

} // end wpdev_on_admin_pages;

/**
 * Whether a module has been bootstrapped by Module_Loader.
 *
 * @since 2.7.0
 *
 * @param string $module_id Module slug.
 * @return bool
 */
function wpdev_module_is_loaded( $module_id ) {

	if ( ! class_exists( '\WPDevFramework\Core\Module_Loader' ) ) {
		return false;
	}

	return \WPDevFramework\Core\Module_Loader::is_loaded( $module_id );

} // end wpdev_module_is_loaded;

/**
 * Load a single module (and its declared dependencies) standalone.
 *
 * Requires core to be registered. Typically called after core/setup.php.
 *
 * @since 2.7.0
 *
 * @param string $module_id   Module slug (e.g. metabox-builder).
 * @param string $modules_dir Optional absolute path to modules/. Defaults to plugin modules dir.
 * @return bool True when the module was loaded.
 */
function wpdev_load_module( $module_id, $modules_dir = '' ) {

	if ( ! class_exists( '\WPDevFramework\Core\Module_Loader' ) ) {
		return false;
	}

	if ( '' === $modules_dir && defined( 'WPDEV_PLUGIN_FILE' ) ) {
		$modules_dir = dirname( WPDEV_PLUGIN_FILE ) . '/modules';
	}

	return \WPDevFramework\Core\Module_Loader::load_standalone( $module_id, $modules_dir );

} // end wpdev_load_module;
