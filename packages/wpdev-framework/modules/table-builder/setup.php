<?php
/**
 * List tables, bulk ajax, screen options
 *
 * @package WPDevFramework\Modules\TableBuilder
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;
use WPDevFramework\Modules\TableBuilder\Component_Registry;

defined( 'ABSPATH' ) || exit;

Module_Loader::register(
	'table-builder',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core', 'tab-navigation' ),
	)
);

Component_Registry::init();

require_once __DIR__ . '/src/class-table-config.php';
require_once __DIR__ . '/src/class-list-table-registry.php';
require_once __DIR__ . '/src/functions/list-table.php';
require_once __DIR__ . '/src/class-bulk-action-pipeline.php';
require_once __DIR__ . '/src/functions/playground-table.php';
