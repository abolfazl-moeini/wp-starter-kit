<?php
/**
 * Dashboard statistics widgets
 *
 * @package WPDevFramework\Modules\AdminWidgetBuilder
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;
use WPDevFramework\Modules\AdminWidgetBuilder\Component_Registry;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/src/class-component-registry.php';
require_once __DIR__ . '/src/class-dashboard-widget-registry.php';
require_once __DIR__ . '/src/class-jumper-namespace-registry.php';
require_once __DIR__ . '/src/class-jumper-command-registry.php';
require_once __DIR__ . '/src/class-jumper-command-providers.php';
require_once __DIR__ . '/src/class-widget-datasource-registry.php';
require_once __DIR__ . '/src/widget-datasource-functions.php';
require_once __DIR__ . '/src/functions/dashboard-widget.php';
require_once __DIR__ . '/src/functions/jumper-command.php';
require_once __DIR__ . '/src/register-widget-datasources.php';

Module_Loader::register(
	'admin-widget-builder',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core', 'admin-page-builder' ),
	)
);

wpdev_register_module_views( 'admin-widget-builder' );

Component_Registry::init();

add_action(
	'wpdev_load',
	static function () {
		if ( ! apply_filters( 'wpdev_module_enabled', true, 'admin-widget-builder' ) ) {
			return;
		}

		\WPDevFramework\UI\Jumper::get_instance();
		\WPDevFramework\UI\Template_Previewer::get_instance();

		\WPDevFramework\Modules\AdminWidgetBuilder\Jumper_Command_Providers::boot();

		/**
		 * Allow modules/plugins to register commands for Jumper.
		 *
		 * @since 2.8.0
		 */
		do_action( 'wpdev_register_jumper_commands' );
	}
);

add_action( 'wpdev_load', 'wpdev_register_default_widget_datasources', 20 );
