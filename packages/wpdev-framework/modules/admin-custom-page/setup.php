<?php
/**
 * Admin custom page example module.
 *
 * @package WPDevFramework\Modules\AdminCustomPage
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;

defined( 'ABSPATH' ) || exit;

Module_Loader::register(
	'admin-custom-page',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core', 'admin-page-builder', 'admin-widget-builder' ),
	)
);

require_once __DIR__ . '/src/functions/admin-bar.php';

add_action(
	'wpdev_load',
	static function () {
		require_once __DIR__ . '/src/class-top-admin-nav-menu.php';
		new \WPDevFramework\Admin_Pages\Top_Admin_Nav_Menu();
	},
	5
);

add_action(
	'wpdev_admin_pages',
	function () {
		require_once __DIR__ . '/src/class-about-admin-page-base.php';

		require_once __DIR__ . '/src/class-about-admin-page-network.php';
		new \WPDevFramework\Admin_Pages\About_Admin_Page_Network();

		require_once __DIR__ . '/src/class-about-admin-page.php';
		new \WPDevFramework\Admin_Pages\About_Admin_Page();
	}
);
