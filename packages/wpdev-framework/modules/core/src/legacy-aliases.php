<?php
/**
 * Backward compatibility class aliases for modularization.
 *
 * @package WPDevFramework\Core
 * @since   2.4.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Core service aliases (legacy inc classes remain canonical until full migration).
 */
$class_aliases = array(
	// Builder bridges — map new namespaces to existing inc implementations.
	'WPDev\\Modules\\FieldBuilder\\Field'                   => 'WPDev\\UI\\Field',
	'WPDev\\Modules\\FormBuilder\\Form'                     => 'WPDev\\UI\\Form',
	'WPDev\\Modules\\SettingsPanelBuilder\\Settings'        => 'WPDev\\Settings',
	'WPDev\\Modules\\MenuBuilder\\Base_Admin_Page'          => 'WPDev\\Admin_Pages\\Base_Admin_Page',
	'WPDev\\Modules\\AdminPageBuilder\\Base_Admin_Page'     => 'WPDev\\Admin_Pages\\Base_Admin_Page',
	'WPDev\\Modules\\AdminPageBuilder\\List_Admin_Page'     => 'WPDev\\Admin_Pages\\List_Admin_Page',
	'WPDev\\Modules\\AdminPageBuilder\\Edit_Admin_Page'     => 'WPDev\\Admin_Pages\\Edit_Admin_Page',
	'WPDev\\Modules\\AdminPageBuilder\\Wizard_Admin_Page'   => 'WPDev\\Admin_Pages\\Wizard_Admin_Page',
	'WPDev\\Modules\\AdminPageBuilder\\Settings_Admin_Page' => 'WPDev\\Admin_Pages\\Settings_Admin_Page',
	'WPDev\\Modules\\TableBuilder\\Base_List_Table'         => 'WPDev\\List_Tables\\Base_List_Table',
	'WPDev\\Modules\\MetaboxBuilder\\Edit_Admin_Page'       => 'WPDev\\Admin_Pages\\Edit_Admin_Page',
);

foreach ( $class_aliases as $alias => $original ) {
	if ( class_exists( $original ) && ! class_exists( $alias, false ) ) {
		class_alias( $original, $alias );
	}
}

/**
 * Deprecated hook aliases — legacy hooks continue to fire; new modules may also listen to wpdev_modules_loaded.
 */
add_action(
	'wpdev_modules_loaded',
	static function () {
		/**
		 * Deprecated. Use wpdev_modules_loaded instead.
		 *
		 * @since 2.4.0
		 */
		do_action( 'wpdev_panel_examples_loaded' );
	},
	100
);
