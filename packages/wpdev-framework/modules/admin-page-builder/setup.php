<?php
/**
 * Admin page lifecycle and templates
 *
 * @package WPDevFramework\Modules\AdminPageBuilder
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;
use WPDevFramework\Modules\AdminPageBuilder\Component_Registry;
use WPDevFramework\Modules\AdminPageBuilder\Page_Template_Registry;

defined( 'ABSPATH' ) || exit;

Module_Loader::register(
	'admin-page-builder',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core', 'menu-builder', 'tab-navigation', 'metabox-builder' ),
	)
);

wpdev_register_module_views( 'admin-page-builder' );

Component_Registry::init();

require_once __DIR__ . '/src/class-page-template-registry.php';
require_once __DIR__ . '/src/functions/page-template.php';
require_once __DIR__ . '/src/functions/legacy-tabs.php';

Page_Template_Registry::register( 'list', 'base/list' );
Page_Template_Registry::register( 'edit', 'base/edit' );
Page_Template_Registry::register( 'wizard', 'base/wizard' );
Page_Template_Registry::register( 'settings', 'base/settings' );
Page_Template_Registry::register( 'dash', 'base/dash' );
Page_Template_Registry::register( 'addons', 'base/addons' );
Page_Template_Registry::register( 'addons-ajax-tabs', 'base/addons-ajax-tabs' );
Page_Template_Registry::register( 'addons-details', 'base/addons/details' );
Page_Template_Registry::register( 'centered', 'base/centered' );

/*
 * K4-04: the only remaining layout key. `custom` defers the full page body to a
 * callback so extensions can render arbitrary markup while still inheriting the
 * WPDev admin wrap, title bar and lifecycle hooks.
 */
Page_Template_Registry::register( 'custom', 'base/custom' );
