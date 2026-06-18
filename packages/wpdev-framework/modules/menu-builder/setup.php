<?php
/**
 * Admin menu registration
 *
 * @package WPDevFramework\Modules\MenuBuilder
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;
use WPDevFramework\Modules\MenuBuilder\Component_Registry;

defined( 'ABSPATH' ) || exit;

Module_Loader::register(
	'menu-builder',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core' ),
	)
);

Component_Registry::init();

require_once __DIR__ . '/src/class-menu-registry.php';
require_once __DIR__ . '/src/functions/menu.php';
