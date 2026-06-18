<?php
/**
 * Admin settings page example module.
 *
 * @package WPDevFramework\Modules\AdminSettingPage
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;

defined( 'ABSPATH' ) || exit;

Module_Loader::register(
	'admin-setting-page',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core', 'settings-panel-builder', 'admin-page-builder' ),
	)
);

add_action(
	'wpdev_init',
	function () {
		wpdev()->settings = \WPDevFramework\Settings::get_instance();
	}
);

add_action(
	'wpdev_admin_pages',
	function () {
		require_once __DIR__ . '/src/class-settings-admin-page.php';

		new \WPDevFramework\Admin_Pages\Settings_Admin_Page();
	},
	10
);
