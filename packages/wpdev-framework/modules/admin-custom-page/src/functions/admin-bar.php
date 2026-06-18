<?php
/**
 * Admin bar registration API.
 *
 * @package WPDevFramework\Modules\AdminCustomPage
 * @since   2.8.0
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/class-admin-bar-node-registry.php';

use WPDevFramework\Modules\AdminCustomPage\Admin_Bar_Node_Registry;

/**
 * Register a WPDev admin bar shortcut node.
 *
 * @since 2.8.0
 *
 * @param string               $id     Node id.
 * @param array<string, mixed> $config Node config.
 * @param bool                 $replace Replace existing id.
 * @return bool
 */
function wpdev_register_admin_bar_node( $id, array $config = array(), $replace = true ) {

	return Admin_Bar_Node_Registry::register( $id, $config, $replace );

} // end wpdev_register_admin_bar_node;
