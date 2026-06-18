<?php
/**
 * Example 03 — a third-party plugin registering its own settings (K3-06).
 *
 * Shows the declarative settings API: two sections, several field types, and a
 * help side panel. Sections land in Settings_Section_Registry (K3-02) and the
 * save pipeline (Settings_Save) persists them like core settings.
 *
 * @package WPDevFramework\Modules
 * @since   2.6.0
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'wpdev_load',
	static function () {

		// --- Section 1: General -------------------------------------------------
		wpdev_register_settings_section(
			'my_addon_general',
			array(
				'title' => __( 'My Add-on', 'wpdev' ),
				'desc'  => __( 'Settings for my add-on.', 'wpdev' ),
				'icon'  => 'dashicons-wpdev-rocket',
			)
		);

		wpdev_register_settings_field(
			'my_addon_general',
			'my_addon_enabled',
			array(
				'title'   => __( 'Enable Feature', 'wpdev' ),
				'desc'    => __( 'Turn the add-on on or off.', 'wpdev' ),
				'type'    => 'toggle',
				'default' => 1,
			)
		);

		wpdev_register_settings_field(
			'my_addon_general',
			'my_addon_api_key',
			array(
				'title'   => __( 'API Key', 'wpdev' ),
				'desc'    => __( 'Your third-party API key.', 'wpdev' ),
				'type'    => 'text',
				'default' => '',
				'require' => array( 'my_addon_enabled' => 1 ),
			)
		);

		// --- Section 2: Advanced ------------------------------------------------
		wpdev_register_settings_section(
			'my_addon_advanced',
			array(
				'title' => __( 'My Add-on: Advanced', 'wpdev' ),
				'desc'  => __( 'Advanced add-on options.', 'wpdev' ),
				'icon'  => 'dashicons-wpdev-tools',
			)
		);

		wpdev_register_settings_field(
			'my_addon_advanced',
			'my_addon_mode',
			array(
				'title'   => __( 'Mode', 'wpdev' ),
				'type'    => 'select',
				'default' => 'live',
				'options' => array(
					'live'    => __( 'Live', 'wpdev' ),
					'sandbox' => __( 'Sandbox', 'wpdev' ),
				),
			)
		);

		// --- Help side panel (K3-05) -------------------------------------------
		wpdev_register_settings_side_panel(
			'my_addon_general',
			array(
				'title'  => __( 'Need help?', 'wpdev' ),
				'render' => static function () {
					echo '<div class="wpdev-p-4">' . esc_html__( 'Read the docs for setup steps.', 'wpdev' ) . '</div>';
				},
			)
		);
	}
);
