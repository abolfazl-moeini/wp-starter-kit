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
		// Capability cascades to all fields in this section unless explicitly overridden.
		wpdev_register_settings_section(
			'my_addon_general',
			array(
				'title'      => __( 'My Add-on', 'wpdev' ),
				'desc'       => __( 'Settings for my add-on.', 'wpdev' ),
				'icon'       => 'dashicons-wpdev-rocket',
				'capability' => 'my_addon_manage_settings',
			)
		);

		// Inherits 'my_addon_manage_settings' capability from section.
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

		// Sensitive field: overrides section capability with explicit 'manage_options' (least privilege).
		wpdev_register_settings_field(
			'my_addon_general',
			'my_addon_api_key',
			array(
				'title'      => __( 'API Key', 'wpdev' ),
				'desc'       => __( 'Your third-party API key (administrators only).', 'wpdev' ),
				'type'       => 'text',
				'default'    => '',
				'capability' => 'manage_options',
				'require'    => array( 'my_addon_enabled' => 1 ),
			)
		);

		// Embed field: handles Aparat scripts, YouTube, iframes safely without data loss.
		wpdev_register_settings_field(
			'my_addon_general',
			'my_addon_video_embed',
			array(
				'title'   => __( 'Promotional Video Embed', 'wpdev' ),
				'desc'    => __( 'Paste Aparat, YouTube, or iframe embed code. Scripts will safely convert to responsive iframes.', 'wpdev' ),
				'type'    => 'embed',
				'default' => '',
			)
		);

		// WYSIWYG editor: enqueues media and enables media buttons for rich content authoring.
		wpdev_register_settings_field(
			'my_addon_general',
			'my_addon_notice_content',
			array(
				'title'   => __( 'Notice Banner Content', 'wpdev' ),
				'desc'    => __( 'Rich text notice with media library buttons enabled.', 'wpdev' ),
				'type'    => 'wp_editor',
				'default' => '',
				'args'    => array(
					'textarea_rows' => 4,
					'media_buttons' => true,
				),
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
					echo '<div class="wpdev-pad-4">' . esc_html__( 'Read the docs for setup steps.', 'wpdev' ) . '</div>';
				},
			)
		);
	}
);
