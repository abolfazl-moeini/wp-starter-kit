<?php
/**
 * Example 01 — register a modal/ajax form via Form_Service.
 *
 * @package WPDevFramework\Modules
 * @since   2.5.0
 */
defined( 'ABSPATH' ) || exit;

add_action(
	'wpdev_register_forms',
	static function () {
		wpdev_register_form(
			'my_plugin_confirm',
			array(
				'render'  => static function () {
					echo '<p>' . esc_html__( 'Confirm action', 'wpdev' ) . '</p>';
				},
				'handler' => static function () {
					// Persist via model/manager.
				},
			)
		);
	}
);
