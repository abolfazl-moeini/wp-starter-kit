<?php
/**
 * WPDev Core module bootstrap.
 *
 * @package WPDevFramework\Core
 * @since   2.4.0
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/src/class-module-autoloader.php';
require_once __DIR__ . '/src/class-module-loader.php';
require_once __DIR__ . '/src/class-registry-base.php';
require_once __DIR__ . '/src/class-service-registry.php';

use WPDevFramework\Core\Module_Autoloader;
use WPDevFramework\Core\Module_Loader;
use WPDevFramework\Core\Legacy_Shim_Autoloader;
use WPDevFramework\Core\Service_Registry;

Module_Autoloader::init();

require_once __DIR__ . '/src/class-legacy-shim-autoloader.php';

Legacy_Shim_Autoloader::init();

Module_Loader::register(
	'core',
	array(
		'path'         => __DIR__,
		'dependencies' => array(),
		'enabled'      => true,
	)
);

require_once __DIR__ . '/src/legacy-aliases.php';
require_once __DIR__ . '/src/functions-module-managers.php';
if ( ! class_exists( 'WPDevFramework\Core\Table_Registry', false ) ) {
	require_once __DIR__ . '/src/class-table-registry.php';
}
require_once __DIR__ . '/src/functions/tables.php';
require_once __DIR__ . '/src/functions/admin-pages.php';
require_once __DIR__ . '/src/functions/context.php';
require_once __DIR__ . '/src/functions/extension-context.php';
if ( ! class_exists( 'WPDevFramework\Core\Module_View_Registry', false ) ) {
	require_once __DIR__ . '/src/view/class-module-view-registry.php';
}
if ( ! interface_exists( 'WPDevFramework\Core\Contracts\License_Gate', false ) ) {
	require_once __DIR__ . '/src/Contracts/interface-license-gate.php';
}
if ( ! class_exists( 'WPDevFramework\Core\Contracts\Always_Licensed_Gate', false ) ) {
	require_once __DIR__ . '/src/Contracts/class-always-licensed-gate.php';
}
if ( ! class_exists( 'WPDevFramework\Core\Addon_Autoloader', false ) ) {
	require_once __DIR__ . '/src/class-addon-autoloader.php';
}
require_once __DIR__ . '/src/functions/addons.php';
require_once __DIR__ . '/src/functions-module-assets.php';
require_once __DIR__ . '/src/capabilities.php';
if ( ! class_exists( 'WPDevFramework\Core\Capabilities\Capability_Registry', false ) ) {
	require_once __DIR__ . '/src/capabilities/class-capability-registry.php';
}

$wpdev_access_manager_files = array(
	dirname( dirname( __DIR__ ) ) . '/packages/access-manager/access-manager.php',
	dirname( dirname( __DIR__ ) ) . '/dependencies/wpdev-access-manager/access-manager.php',
);

foreach ( $wpdev_access_manager_files as $wpdev_access_manager_file ) {
	if ( is_readable( $wpdev_access_manager_file ) ) {
		require_once $wpdev_access_manager_file;
		break;
	}
} // end foreach;

unset( $wpdev_access_manager_files, $wpdev_access_manager_file );

require_once __DIR__ . '/src/Access/class-permission-registry.php';
require_once __DIR__ . '/src/Access/class-access-policy-registry.php';
require_once __DIR__ . '/src/Access/Exceptions/class-access-denied-exception.php';
require_once __DIR__ . '/src/Services/class-access-service.php';
require_once __DIR__ . '/src/access.php';
require_once __DIR__ . '/src/class-component-registry.php';
require_once __DIR__ . '/src/functions/api-lifecycle.php';
require_once __DIR__ . '/src/functions/routes.php';
require_once __DIR__ . '/src/functions/service.php';
require_once __DIR__ . '/src/installers/functions-migration-callbacks.php';

wpdev_register_module_views( 'core' );

/**
 * Retrieve a core service by id.
 *
 * @since 2.4.0
 *
 * @param string|null $id Service id (ajax, modal, form, screen_options, tour, view).
 * @return mixed
 */
if ( ! function_exists( 'wpdev_services' ) ) {
	function wpdev_services( $id = null ) {
		if ( null === $id ) {
			return Service_Registry::all();
		}

		return Service_Registry::get( $id );
	}
}

add_action(
	'wpdev_init',
	static function () {
		Service_Registry::boot();
	},
	0
);

add_action(
	'plugins_loaded',
	static function () {
		Module_Loader::load_all( dirname( __DIR__ ) );
	},
	5
);

Module_Loader::mark_loaded( 'core' );

add_action(
	'wpdev_modules_loaded',
	static function () {
		wpdev_load_bundled_addons();
	},
	5
);

add_action(
	'wpdev_load',
	static function () {
		if ( ! apply_filters( 'wpdev_module_enabled', true, 'core' ) ) {
			return;
		}

		// Commercial License client boots from addons/wpdev-license when present.
		// Slim core uses Always_Licensed_Gate via wpdev_license_gate().
	}
);

/**
 * Module API lifecycle (uniform contract):
 *
 * - wpdev_init        — service boot, early singletons
 * - wpdev_load        — register entities via wpdev_register_* (use wpdev_on_load())
 * - wpdev_admin_pages — instantiate admin page classes (use wpdev_on_admin_pages())
 * - wpdev_register_forms — ajax modal forms
 *
 * Standalone: wpdev_load_module( 'metabox-builder' ) loads core + declared deps automatically.
 */
