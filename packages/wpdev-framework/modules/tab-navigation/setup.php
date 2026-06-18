<?php
/**
 * List/wizard/settings/metabox tabs
 *
 * @package WPDevFramework\Modules\TabNavigation
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;
use WPDevFramework\Modules\TabNavigation\Component_Registry;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/src/class-component-registry.php';
require_once __DIR__ . '/src/class-tab-navigation.php';
require_once __DIR__ . '/src/functions/tab-navigation.php';

Module_Loader::register(
	'tab-navigation',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core' ),
	)
);

Component_Registry::init();
