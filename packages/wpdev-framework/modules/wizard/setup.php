<?php
/**
 * Setup wizard and Sunrise bootstrap module.
 *
 * @package WPDevFramework\Modules\Wizard
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;

defined( 'ABSPATH' ) || exit;

Module_Loader::register(
	'wizard',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core', 'admin-page-builder' ),
	)
);

add_action(
	'wpdev_init',
	static function () {
		require_once __DIR__ . '/src/class-setup-wizard-admin-page.php';

		new WPDevFramework\Admin_Pages\Setup_Wizard_Admin_Page();

		require_once __DIR__ . '/src/class-sunrise.php';
		WPDevFramework\Sunrise::manage_sunrise_updates();
	}
);
