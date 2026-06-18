<?php
/**
 * Example 02 — modal bulk confirm via Modal_Service.
 *
 * @package WPDevFramework\Modules
 * @since   2.5.0
 */
defined( 'ABSPATH' ) || exit;

use WPDevFramework\Modules\TableBuilder\Bulk_Action_Pipeline;

add_action(
	'wpdev_register_forms',
	static function () {
		// bulk_actions is registered by Form_Manager::register_action_forms().
	},
	5
);

// Confirm URL for a list table bulk delete:
// Bulk_Action_Pipeline::get_confirm_url( 'product', array( 'bulk_action' => 'delete' ) );
// Or: wpdev_modal_open( 'bulk_actions', array( 'model' => 'product', 'bulk_action' => 'delete' ) );
