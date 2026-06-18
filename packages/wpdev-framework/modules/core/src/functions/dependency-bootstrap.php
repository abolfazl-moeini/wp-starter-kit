<?php
/**
 * Bootstraps per-module dependency autoloading for early contexts (plugin + sunrise).
 *
 * @package WPDevFramework\Core
 * @since   2.7.0
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'wpdev_bootstrap_dependency_manager' ) ) {

	/**
	 * Initialize Dependency_Manager and register the core vendor manifest.
	 *
	 * @since 2.7.0
	 *
	 * @param string $plugin_root Absolute plugin root path.
	 * @return void
	 */
	function wpdev_bootstrap_dependency_manager( $plugin_root ) {

		$plugin_root = rtrim( (string) $plugin_root, '/\\' );

		if ( ! class_exists( '\WPDevFramework\Core\Dependency_Manager', false ) ) {
			require_once $plugin_root . '/modules/core/src/class-dependency-manager.php';
		}

		if ( isset( $GLOBALS['wpdev_composer_autoloader'] ) ) {
			\WPDevFramework\Core\Dependency_Manager::set_legacy_loader( $GLOBALS['wpdev_composer_autoloader'] );
		}

		\WPDevFramework\Core\Dependency_Manager::init();
		\WPDevFramework\Core\Dependency_Manager::register_module_from_path( 'core', $plugin_root . '/modules/core' );

		wpdev_ensure_namespace_autoloader( $plugin_root );

	} // end wpdev_bootstrap_dependency_manager;

	/**
	 * Ensure the WPDev namespace autoloader vendor class is loadable.
	 *
	 * Required before WPDevFramework\Autoloader::init() in sunrise and plugin boot.
	 *
	 * @since 2.7.0
	 *
	 * @param string $plugin_root Absolute plugin root path.
	 * @return void
	 */
	function wpdev_ensure_namespace_autoloader( $plugin_root ) {

		$class = 'WPDev\\Dependencies\\Pablo_Pacheco\\WP_Namespace_Autoloader\\WP_Namespace_Autoloader';

		if ( class_exists( $class, false ) ) {
			return;
		}

		if ( class_exists( '\WPDevFramework\Core\Dependency_Manager', false ) ) {
			\WPDevFramework\Core\Dependency_Manager::autoload( $class );
		}

		if ( class_exists( $class, false ) ) {
			return;
		}

		$file = rtrim( (string) $plugin_root, '/\\' ) . '/modules/core/dependencies/pablo-sg-pacheco/wp-namespace-autoloader/src/WP_Namespace_Autoloader.php';

		if ( is_readable( $file ) ) {
			require_once $file;
		}

	} // end wpdev_ensure_namespace_autoloader;

}
