<?php
/**
 * Edit screen metabox widgets
 *
 * @package WPDevFramework\Modules\MetaboxBuilder
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;
use WPDevFramework\Modules\MetaboxBuilder\Component_Registry;
use WPDevFramework\Modules\MetaboxBuilder\Metabox_Registry;

defined( 'ABSPATH' ) || exit;

Module_Loader::register(
	'metabox-builder',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core', 'form-builder', 'field-builder', 'tab-navigation', 'table-builder' ),
	)
);

wpdev_register_module_views( 'metabox-builder' );

require_once __DIR__ . '/src/admin/trait-edit-page-widgets.php';
require_once __DIR__ . '/src/class-metabox-registry.php';
require_once __DIR__ . '/src/functions/metabox.php';

Component_Registry::init();
Metabox_Registry::init();
