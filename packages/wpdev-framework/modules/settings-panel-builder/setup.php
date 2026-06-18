<?php
/**
 * Settings sections, save pipeline, side panels
 *
 * @package WPDevFramework\Modules\SettingsPanelBuilder
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;
use WPDevFramework\Modules\SettingsPanelBuilder\Component_Registry;

defined( 'ABSPATH' ) || exit;

Module_Loader::register(
	'settings-panel-builder',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core', 'field-builder', 'form-builder', 'tab-navigation' ),
	)
);

wpdev_register_module_views( 'settings-panel-builder' );

Component_Registry::init();

require_once __DIR__ . '/src/class-settings.php';
require_once __DIR__ . '/src/class-settings-section-registry.php';
require_once __DIR__ . '/src/class-settings-storage.php';
require_once __DIR__ . '/src/class-settings-save.php';
