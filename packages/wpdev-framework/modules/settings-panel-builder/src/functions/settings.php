<?php
/**
 * Settings Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined( 'ABSPATH' ) || exit;

/**
 * Loads dependencies: the option apis.
 */
wpdev_require_public_function( 'options' );

/**
 * Ensure {@see WPDev::$settings} is the Settings singleton.
 *
 * When network setup is unfinished, WPDev::init() returns before assigning
 * `$this->settings`, so facades using `wpdev()->settings?->` would no-op and
 * leave tabs in the section registry without fields.
 *
 * @since 2.8.6
 * @return \WPDevFramework\Settings|null
 */
if (!function_exists('wpdev_ensure_settings')) {
function wpdev_ensure_settings() {

	if ( ! empty( $GLOBALS['wpdev_test_disable_ensure_settings'] ) ) {
		return null;
	}

	if ( isset( $GLOBALS['wpdev_test_mock_settings'] ) ) {
		return $GLOBALS['wpdev_test_mock_settings'];
	}

	if ( function_exists( 'wpdev' ) && is_object( wpdev() ) ) {
		if ( empty( wpdev()->settings ) && class_exists( '\WPDevFramework\Settings' ) ) {
			wpdev()->settings = \WPDevFramework\Settings::get_instance();
		}
		if ( wpdev()->settings instanceof \WPDevFramework\Settings ) {
			return wpdev()->settings;
		}
	}

	if ( class_exists( '\WPDevFramework\Settings' ) ) {
		return \WPDevFramework\Settings::get_instance();
	}

	return null;

}
}
 // end wpdev_ensure_settings;

/**
 * Returns an array with all the WPDev settings.
 *
 * @return array
 * @since 2.0.0
 */
if (!function_exists('wpdev_get_all_settings')) {
function wpdev_get_all_settings() {

	$settings = wpdev_ensure_settings();

	return $settings ? $settings->get_all() : null;

}
}
 // end wpdev_get_all_settings;

/**
 * Get a specific settings from the plugin.
 *
 * @param  string  $setting  Settings name to return.
 * @param  mixed  $default  Default value for the setting if it doesn't exist.
 *
 * @return mixed The value of that setting
 * @since 2.0.0
 *
 */
if (!function_exists('wpdev_get_setting')) {
function wpdev_get_setting( $setting, $default = false ) {

	$settings = wpdev_ensure_settings();

	return $settings ? $settings->get_setting( $setting, $default ) : $default;

}
}
 // end wpdev_get_setting;

/**
 * Saves a specific setting into the database.
 *
 * @param  string  $setting  Option key to save.
 * @param  mixed  $value  New value of the option.
 *
 * @return boolean
 * @since 2.0.0
 *
 */
if (!function_exists('wpdev_save_setting')) {
function wpdev_save_setting( $setting, $value ) {

	$settings = wpdev_ensure_settings();

	return $settings ? $settings->save_setting( $setting, $value ) : false;

}
}
 // end wpdev_save_setting;

/**
 * Get the early registration queue.
 *
 * @return array<int, array<string, mixed>>
 */
if (!function_exists('wpdev_get_early_registration_queue')) {
function wpdev_get_early_registration_queue(): array {
	return $GLOBALS['wpdev_early_registration_queue'] ?? array();
}
}

/**
 * Reset the early registration queue.
 *
 * @return void
 */
if (!function_exists('wpdev_reset_early_registration_queue')) {
function wpdev_reset_early_registration_queue(): void {
	$GLOBALS['wpdev_early_registration_queue'] = array();
}
}

/**
 * Replay deferred early registrations once settings singleton is booted.
 *
 * @param object|null $settings Optional settings instance.
 * @return int Number of replayed items.
 */
if (!function_exists('wpdev_replay_early_registration_queue')) {
function wpdev_replay_early_registration_queue( $settings = null ): int {
	$queue = wpdev_get_early_registration_queue();
	if ( empty( $queue ) ) {
		return 0;
	}

	$target = $settings ?: wpdev_ensure_settings();
	if ( ! $target ) {
		return 0;
	}

	$count = 0;
	foreach ( $queue as $item ) {
		if ( 'section' === ( $item['type'] ?? '' ) ) {
			if ( method_exists( $target, 'add_section' ) ) {
				$target->add_section( $item['slug'], $item['atts'] );
				$count++;
			}
		} elseif ( 'field' === ( $item['type'] ?? '' ) ) {
			if ( method_exists( $target, 'add_field' ) ) {
				$target->add_field( $item['section_slug'], $item['field_slug'], $item['atts'] );
				$count++;
			}
		}
	}

	wpdev_reset_early_registration_queue();
	return $count;
}
}

if ( function_exists( 'add_action' ) ) {
	add_action( 'wpdev_load', 'wpdev_replay_early_registration_queue', 0 );
}

/**
 * Adds a new settings section.
 *
 * Sections are a way to organize correlated settings into one cohesive unit.
 * Developers should be able to add their own sections, if they need to.
 * This is the purpose of this APIs.
 *
 * @param  string  $section_slug  ID of the Section. This is used to register fields to this section later.
 * @param  array  $atts  Section attributes such as title, description and so on.
 *
 * @return void
 * @since 2.0.0
 *
 */
if (!function_exists('wpdev_register_settings_section')) {
function wpdev_register_settings_section( $section_slug, $atts, $replace = true ) {

	if ( class_exists( '\WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry' ) ) {
		\WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry::register( $section_slug, $atts, $replace );
	}

	$settings = wpdev_ensure_settings();
	if ( $settings ) {
		$settings->add_section( $section_slug, $atts );
	} else {
		if ( ! isset( $GLOBALS['wpdev_early_registration_queue'] ) || ! is_array( $GLOBALS['wpdev_early_registration_queue'] ) ) {
			$GLOBALS['wpdev_early_registration_queue'] = array();
		}
		$GLOBALS['wpdev_early_registration_queue'][] = array(
			'type'    => 'section',
			'slug'    => $section_slug,
			'atts'    => $atts,
			'replace' => $replace,
		);
	}

}
}
 // end wpdev_register_settings_section;

/**
 * Get a registered settings section config.
 *
 * @since 2.7.0
 *
 * @param string $section_slug Section slug.
 * @return array<string, mixed>|null
 */
if (!function_exists('wpdev_get_settings_section')) {
function wpdev_get_settings_section( $section_slug ) {

	if ( ! class_exists( '\WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry' ) ) {
		return null;
	}

	return \WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry::get( $section_slug );

}
}
 // end wpdev_get_settings_section;

/**
 * Whether a settings section is registered.
 *
 * @since 2.7.0
 *
 * @param string $section_slug Section slug.
 * @return bool
 */
if (!function_exists('wpdev_has_settings_section')) {
function wpdev_has_settings_section( $section_slug ) {

	if ( ! class_exists( '\WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry' ) ) {
		return false;
	}

	return \WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry::has( $section_slug );

}
}
 // end wpdev_has_settings_section;

/**
 * List all registered settings sections.
 *
 * @since 2.7.0
 *
 * @return array<string, array<string, mixed>>
 */
if (!function_exists('wpdev_list_settings_sections')) {
function wpdev_list_settings_sections() {

	if ( ! class_exists( '\WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry' ) ) {
		return array();
	}

	return \WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry::all();

}
}
 // end wpdev_list_settings_sections;

/**
 * Unregister a settings section.
 *
 * @since 2.7.0
 *
 * @param string $section_slug Section slug.
 * @return void
 */
if (!function_exists('wpdev_unregister_settings_section')) {
function wpdev_unregister_settings_section( $section_slug ) {

	if ( class_exists( '\WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry' ) ) {
		\WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry::unregister( $section_slug );
	}

}
}
 // end wpdev_unregister_settings_section;

/**
 * Adds a new field to a settings section.
 *
 * Fields are settings that admins can actually change.
 * This API allows developers to add new fields to a given settings section.
 *
 * @param  string  $section_slug  Section to which this field will be added to.
 * @param  string  $field_slug  ID of the field. This is used to later retrieve the value saved on this setting.
 * @param  array  $atts  Field attributes such as title, description, tooltip, default value, etc.
 *
 * @return void
 * @since 2.0.0
 *
 */
if (!function_exists('wpdev_register_settings_field')) {
function wpdev_register_settings_field( $section_slug, $field_slug, $atts ) {

	$settings = wpdev_ensure_settings();
	if ( $settings ) {
		$settings->add_field( $section_slug, $field_slug, $atts );
	} else {
		if ( ! isset( $GLOBALS['wpdev_early_registration_queue'] ) || ! is_array( $GLOBALS['wpdev_early_registration_queue'] ) ) {
			$GLOBALS['wpdev_early_registration_queue'] = array();
		}
		$GLOBALS['wpdev_early_registration_queue'][] = array(
			'type'         => 'field',
			'section_slug' => $section_slug,
			'field_slug'   => $field_slug,
			'atts'         => $atts,
		);
	}

}
}
 // end wpdev_register_settings_field;

/**
 * Adds a help side-panel to the settings page.
 *
 * @param  string  $section_slug  Section to which this field will be added to.
 * @param  array  $atts  Side-panel attributes.
 *
 * @return void
 * @since 2.0.0
 *
 */
if (!function_exists('wpdev_register_settings_side_panel')) {
function wpdev_register_settings_side_panel( $section_slug, $atts ) {

	if ( wpdev_request( 'tab', 'general' ) !== $section_slug && $section_slug !== 'all' ) {

		return;

	} // end if;

	$atts = wp_parse_args( $atts, array(
		'title'  => __( 'Side Panel', 'wpdev' ),
		'render' => '__return_false',
		'show'   => '__return_true',
	) );

	$callback = wpdev_get_isset( $atts, 'show', '__return_true' );

	$should_display = is_callable( $callback ) && call_user_func( $callback );

	if ( ! $should_display ) {

		return;

	} // end if;

	$id = sanitize_title( $atts['title'] );

	add_meta_box( "wpdev-{$id}", $atts['title'], function () use ( $atts ) {

		call_user_func( $atts['render'] );

	}, 'wpdev_settings_admin_page', 'side', 'low' );

}
}
 // end wpdev_register_settings_side_panel;

/**
 * Retrieve the network custom logo.
 *
 * @param  string  $size  The size of the logo. It could be Thumbnail, Medium, Large or Full.
 *
 * @return string With the logo's url.
 */
if (!function_exists('wpdev_get_network_logo')) {
function wpdev_get_network_logo( $size = 'full' ) {

	$settings_logo = wp_get_attachment_image_src( wpdev_get_setting( 'company_logo' ), $size ); // phpcs:ignore

	if ( $settings_logo ) {

		return $settings_logo[0];

	} // end if;

	$logo = wpdev_get_asset( 'logo.png', 'img' );

	$custom_logo = wp_get_attachment_image_src( get_theme_mod( 'custom_logo' ), $size );

	if ( ! empty( $custom_logo ) ) {

		$logo = $custom_logo[0];

	} // end if;

	return apply_filters( 'wpdev_get_logo', $logo );

}
}
 // end wpdev_get_network_logo;

/**
 * Retrieve the network custom icon.
 *
 * @param  string  $size  The size of the icon in pixels.
 *
 * @return string With the logo's url.
 */
if (!function_exists('wpdev_get_network_favicon')) {
function wpdev_get_network_favicon( $size = '48' ) {

	$custom_icon = get_site_icon_url( $size, wpdev_get_asset( 'badge.png', 'img' ), wpdev_get_main_site_id() );

	return $custom_icon;

}
}
 // end wpdev_get_network_favicon;

/**
 * Save submit field definition for settings panel previews.
 *
 * @since 2.8.5
 * @return array<string, mixed>
 */
if (!function_exists('wpdev_settings_panel_submit_field_definition')) {
function wpdev_settings_panel_submit_field_definition() {

	$save = array(
		'type'            => 'submit',
		'title'           => __( 'Save Settings', 'wpdev' ),
		'classes'         => 'button button-primary button-large wpdev-mar-l-auto wpdev-full md:wpdev-w-auto',
		'wrapper_classes' => 'wpdev-sticky wpdev-bottom-0 wpdev-save-button wpdev-mar-r-px wpdev-full md:wpdev-w-auto',
		'html_attr'       => array(),
	);

	if ( ! current_user_can( 'wpdev_edit_settings' ) && ! current_user_can( 'manage_options' ) ) {
		$save['html_attr']['disabled'] = 'disabled';
	}

	return $save;

}
}
 // end wpdev_settings_panel_submit_field_definition;

if (!function_exists('wpdev_render_settings_panel_section')) {
function wpdev_render_settings_panel_section( $section_slug, array $args = array() ) {

	$args = wp_parse_args(
		$args,
		array(
			'include_save'            => false,
			'embed_in_shell'          => false,
			'show_section_heading'    => true,
			'show_footer_description' => true,
		)
	);

	if ( ! function_exists( 'wpdev' ) || ! wpdev()->settings ) {
		echo '<p>' . esc_html__( 'WPDev settings are not available.', 'wpdev' ) . '</p>';
		return;
	}

	if ( function_exists( 'wpdev_require_public_function' ) ) {
		wpdev_require_public_function( 'settings' );
	}

	if ( function_exists( 'do_action' ) ) {
		do_action( 'wpdev_render_settings' );
	}

	$section = wpdev()->settings->get_section( $section_slug );

	if ( empty( $section['fields'] ) ) {
		echo '<p>' . esc_html__( 'No fields are registered for this section.', 'wpdev' ) . '</p>';
		return;
	}

	$fields = array();

	foreach ( $section['fields'] as $field_slug => $field ) {
		$capability = $field['capability'] ?? ( $section['capability'] ?? 'manage_options' );

		if ( current_user_can( $capability ) ) {
			$fields[ $field_slug ] = $field;
		}
	}

	if ( empty( $fields ) ) {
		echo '<p>' . esc_html__( 'You do not have permission to view these settings fields.', 'wpdev' ) . '</p>';
		return;
	}

	if ( function_exists( 'wpdev_sort_by_order' ) ) {
		uasort( $fields, 'wpdev_sort_by_order' );
	}

	if ( ! empty( $args['include_save'] ) ) {
		$fields['save'] = wpdev_settings_panel_submit_field_definition();

		if ( ! empty( $args['embed_in_shell'] ) ) {
			$fields['save']['wrapper_classes'] = 'wpdev-save-button wpdev-mar-r-px wpdev-full md:wpdev-w-auto';
		}
	}

	if ( ! class_exists( 'WPDev\\UI\\Form' ) || ! class_exists( 'WPDev\\Settings' ) ) {
		echo '<p>' . esc_html__( 'Form builder is required to render the settings panel preview.', 'wpdev' ) . '</p>';
		return;
	}

	$state = array();

	if ( function_exists( 'wpdev_array_map_keys' ) ) {
		$state = wpdev_array_map_keys( 'wpdev_replace_dashes', \WPDevFramework\Settings::get_instance()->get_all( true ) );
	}

	$form_classes = 'wpdev-modal-form wpdev-widget-list wpdev-striped wpdev--mt-5 wpdev--mx-in';

	if ( empty( $args['embed_in_shell'] ) ) {
		$form_classes .= ' wpdev--mb-in';
	}

	$form = new \WPDevFramework\UI\Form(
		$section_slug,
		$fields,
		array(
			'views'                 => 'admin-pages/fields',
			'classes'               => $form_classes,
			'field_wrapper_classes' => 'wpdev-full wpdev-box-border wpdev-items-center wpdev-row wpdev-justify-between wpdev-pad-4 wpdev-pad-y-5 wpdev-mar-0 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-300 wpdev-border-solid',
			'html_attr'             => array(
				'data-on-load'   => 'remove_block_ui',
				'data-wpdev-app' => str_replace( '-', '_', $section_slug ),
				'data-state'     => wp_json_encode( $state ),
			),
			'wrap_in_form_tag'      => false,
		)
	);

	$section_title = $section['title'] ?? $section_slug;

	if ( ! $args['embed_in_shell'] ) {
		echo '<div class="metabox-holder wpdev-playground-settings-preview wpdev-relative">';

		if ( $args['show_section_heading'] ) {
			echo '<h2>' . esc_html( $section_title ) . '</h2>';
		}

		echo '<form method="post">';
	}

	$form->render();

	if ( ! $args['embed_in_shell'] ) {
		echo '</form>';
		echo '</div>';

		if ( $args['show_footer_description'] ) {
			echo '<p class="description">' . esc_html__( 'Live preview of fields registered for this section via wpdev_register_settings_field(). Saving from this playground page does not persist to production settings.', 'wpdev' ) . '</p>';
		}
	}

}
}
 // end wpdev_render_settings_panel_section;

/**
 * Register default playground settings sections (pg_* sandbox).
 *
 * @since 2.7.0
 * @return void
 */
