<?php
/**
 * Example 01 — register page layout templates.
 *
 * @package WPDevFramework\Modules
 * @since   2.5.0
 */
defined( 'ABSPATH' ) || exit;

use WPDevFramework\Modules\AdminPageBuilder\Page_Template_Registry;

add_action(
	'wpdev_load',
	static function () {
		Page_Template_Registry::register( 'my-list', 'my-plugin/custom-list' );
		Page_Template_Registry::register( 'addons-ajax-tabs', 'base/addons-ajax-tabs' );
	},
	5
);
