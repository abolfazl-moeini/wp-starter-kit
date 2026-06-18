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
 * Returns an array with all the WPDev settings.
 *
 * @return array
 * @since 2.0.0
 */
function wpdev_get_all_settings() {

	return wpdev()->settings?->get_all();

} // end wpdev_get_all_settings;

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
function wpdev_get_setting( $setting, $default = false ) {

	return wpdev()->settings?->get_setting($setting, $default);

} // end wpdev_get_setting;

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
function wpdev_save_setting( $setting, $value ) {

	return wpdev()->settings?->save_setting($setting, $value);

} // end wpdev_save_setting;

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
function wpdev_register_settings_section( $section_slug, $atts, $replace = true ) {

	if ( class_exists( 'WPDev\\Modules\\SettingsPanelBuilder\\Settings_Section_Registry' ) ) {
		\WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry::register( $section_slug, $atts, $replace );
	}

	wpdev()->settings?->add_section( $section_slug, $atts );

} // end wpdev_register_settings_section;

/**
 * Get a registered settings section config.
 *
 * @since 2.7.0
 *
 * @param string $section_slug Section slug.
 * @return array<string, mixed>|null
 */
function wpdev_get_settings_section( $section_slug ) {

	if ( ! class_exists( 'WPDev\\Modules\\SettingsPanelBuilder\\Settings_Section_Registry' ) ) {
		return null;
	}

	return \WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry::get( $section_slug );

} // end wpdev_get_settings_section;

/**
 * Whether a settings section is registered.
 *
 * @since 2.7.0
 *
 * @param string $section_slug Section slug.
 * @return bool
 */
function wpdev_has_settings_section( $section_slug ) {

	if ( ! class_exists( 'WPDev\\Modules\\SettingsPanelBuilder\\Settings_Section_Registry' ) ) {
		return false;
	}

	return \WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry::has( $section_slug );

} // end wpdev_has_settings_section;

/**
 * List all registered settings sections.
 *
 * @since 2.7.0
 *
 * @return array<string, array<string, mixed>>
 */
function wpdev_list_settings_sections() {

	if ( ! class_exists( 'WPDev\\Modules\\SettingsPanelBuilder\\Settings_Section_Registry' ) ) {
		return array();
	}

	return \WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry::all();

} // end wpdev_list_settings_sections;

/**
 * Unregister a settings section.
 *
 * @since 2.7.0
 *
 * @param string $section_slug Section slug.
 * @return void
 */
function wpdev_unregister_settings_section( $section_slug ) {

	if ( class_exists( 'WPDev\\Modules\\SettingsPanelBuilder\\Settings_Section_Registry' ) ) {
		\WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry::unregister( $section_slug );
	}

} // end wpdev_unregister_settings_section;

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
function wpdev_register_settings_field( $section_slug, $field_slug, $atts ) {

	wpdev()->settings?->add_field($section_slug, $field_slug, $atts);

} // end wpdev_register_settings_field;

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

} // end wpdev_register_settings_side_panel;

/**
 * Retrieve the network custom logo.
 *
 * @param  string  $size  The size of the logo. It could be Thumbnail, Medium, Large or Full.
 *
 * @return string With the logo's url.
 */
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

} // end wpdev_get_network_logo;

/**
 * Retrieve the network custom icon.
 *
 * @param  string  $size  The size of the icon in pixels.
 *
 * @return string With the logo's url.
 */
function wpdev_get_network_favicon( $size = '48' ) {

	$custom_icon = get_site_icon_url( $size, wpdev_get_asset( 'badge.png', 'img' ), wpdev_get_main_site_id() );

	return $custom_icon;

} // end wpdev_get_network_favicon;

/**
 * Whether the current user may save playground settings (pg_* sandbox only).
 *
 * @since 2.7.0
 * @return bool
 */
function wpdev_playground_settings_can_save() {

	return current_user_can( 'wpdev_edit_settings' ) || current_user_can( 'manage_options' );

} // end wpdev_playground_settings_can_save;

/**
 * Save field definition matching production Settings_Admin_Page::default_view().
 *
 * @since 2.7.0
 * @return array<string, mixed>
 */
function wpdev_playground_settings_save_field_definition() {

	$save = array(
		'type'            => 'submit',
		'title'           => __( 'Save Settings', 'wpdev' ),
		'classes'         => 'button button-primary button-large wpdev-ml-auto wpdev-w-full md:wpdev-w-auto',
		'wrapper_classes' => 'wpdev-sticky wpdev-bottom-0 wpdev-save-button wpdev-mr-px wpdev-w-full md:wpdev-w-auto',
		'html_attr'       => array(
			'v-on:click' => 'send("window", "wpdev_block_ui", "#wpcontent")',
		),
	);

	if ( ! wpdev_playground_settings_can_save() ) {
		$save['html_attr']['disabled'] = 'disabled';
	}

	return $save;

} // end wpdev_playground_settings_save_field_definition;

/**
 * Process POST save for a pg_* settings section (sandbox keys only).
 *
 * @since 2.7.0
 *
 * @param string $section_slug Section slug.
 * @param string $prefix       Allowed setting key prefix. Default pg_.
 * @return bool True when settings were saved.
 */
function wpdev_playground_settings_process_post_save( $section_slug, $prefix = 'pg_' ) {

	if ( 'POST' !== ( $_SERVER['REQUEST_METHOD'] ?? '' ) ) {
		return false;
	}

	$section_slug = sanitize_key( (string) $section_slug );

	if ( 0 !== strpos( $section_slug, (string) $prefix ) ) {
		return false;
	}

	if ( ! function_exists( 'wp_verify_nonce' ) || ! isset( $_POST['_wpdev_nonce'] ) ) {
		return false;
	}

	$nonce_action = 'saving_' . $section_slug;

	if ( ! wp_verify_nonce( wp_unslash( $_POST['_wpdev_nonce'] ), $nonce_action ) ) {
		return false;
	}

	if ( ! wpdev_playground_settings_can_save() || ! function_exists( 'wpdev' ) || ! wpdev()->settings ) {
		return false;
	}

	$section = wpdev()->settings->get_section( $section_slug );

	if ( empty( $section['fields'] ) ) {
		return false;
	}

	$saved = false;

	foreach ( $section['fields'] as $field_slug => $field ) {
		if ( 'save' === $field_slug || 0 !== strpos( (string) $field_slug, (string) $prefix ) ) {
			continue;
		}

		$field_type = isset( $field['type'] ) ? (string) $field['type'] : '';

		if ( ! isset( $_POST[ $field_slug ] ) ) {
			if ( in_array( $field_type, array( 'toggle', 'checkbox' ), true ) ) {
				if ( function_exists( 'wpdev' ) && wpdev()->settings && method_exists( wpdev()->settings, 'save_setting' ) ) {
					wpdev()->settings->save_setting( $field_slug, 0 );
					$saved = true;
				}
			}

			continue;
		}

		$value = wp_unslash( $_POST[ $field_slug ] );

		if ( function_exists( 'wpdev' ) && wpdev()->settings && method_exists( wpdev()->settings, 'save_setting' ) ) {
			wpdev()->settings->save_setting( $field_slug, $value );
			$saved = true;
		}
	}

	return $saved;

} // end wpdev_playground_settings_process_post_save;

/**
 * Reset pg_* fields in one playground settings section to registered defaults.
 *
 * @since 2.7.0
 *
 * @param string $section_slug Section slug.
 * @param string $prefix       Setting key prefix. Default pg_.
 * @return bool True when fields were reset.
 */
function wpdev_playground_settings_reset_section( $section_slug, $prefix = 'pg_' ) {

	$section_slug = sanitize_key( (string) $section_slug );

	if ( 0 !== strpos( $section_slug, (string) $prefix ) ) {
		return false;
	}

	if ( ! function_exists( 'wpdev' ) || ! wpdev()->settings || ! function_exists( 'wpdev_save_setting' ) ) {
		return false;
	}

	$section = wpdev()->settings->get_section( $section_slug );

	if ( empty( $section['fields'] ) ) {
		return false;
	}

	$reset = false;

	foreach ( $section['fields'] as $field_slug => $field ) {
		if ( 'save' === $field_slug || 0 !== strpos( (string) $field_slug, (string) $prefix ) ) {
			continue;
		}

		if ( array_key_exists( 'default', $field ) ) {
			wpdev_save_setting( $field_slug, $field['default'] );
			$reset = true;
		}
	}

	return $reset;

} // end wpdev_playground_settings_reset_section;

/**
 * Render a live settings section preview (fields UI) for playground or docs.
 *
 * @since 2.7.0
 *
 * @param string               $section_slug Settings section slug (e.g. pg_demo).
 * @param array<string, mixed> $args {
 *     @type bool $include_save           Append Save Settings submit field.
 *     @type bool $embed_in_shell         Omit outer form/wrapper (parent shell owns form).
 *     @type bool $show_section_heading   Output section title heading.
 *     @type bool $show_footer_description Output footer description paragraph.
 * }
 * @return void
 */
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
		$capability = $field['capability'] ?? 'manage_options';

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
		$fields['save'] = wpdev_playground_settings_save_field_definition();

		if ( ! empty( $args['embed_in_shell'] ) ) {
			$fields['save']['wrapper_classes'] = 'wpdev-save-button wpdev-mr-px wpdev-w-full md:wpdev-w-auto';
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
			'field_wrapper_classes' => 'wpdev-w-full wpdev-box-border wpdev-items-center wpdev-flex wpdev-justify-between wpdev-p-4 wpdev-py-5 wpdev-m-0 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-300 wpdev-border-solid',
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

} // end wpdev_render_settings_panel_section;

/**
 * Register default playground settings sections (pg_* sandbox).
 *
 * @since 2.7.0
 * @return void
 */
function wpdev_playground_register_settings_demo_sections() {

	if ( ! function_exists( 'wpdev_playground_bootstrap_settings' ) || ! wpdev_playground_bootstrap_settings() ) {
		return;
	}

	if ( ! function_exists( 'wpdev_register_settings_section' ) ) {
		return;
	}

	$cap = 'manage_options';

	wpdev_register_settings_section(
		'pg_general',
		array(
			'title' => __( 'General', 'wpdev' ),
			'icon'  => 'dashicons-wpdev-cog',
			'order' => 10,
		)
	);

	wpdev_register_settings_field(
		'pg_general',
		'pg_enabled',
		array(
			'type'        => 'toggle',
			'title'       => __( 'Enable module', 'wpdev' ),
			'default'     => 1,
			'capability'  => $cap,
		)
	);

	wpdev_register_settings_field(
		'pg_general',
		'pg_site_name',
		array(
			'type'       => 'text',
			'title'      => __( 'Site label', 'wpdev' ),
			'default'    => __( 'Playground Site', 'wpdev' ),
			'capability' => $cap,
		)
	);

	wpdev_register_settings_field(
		'pg_general',
		'pg_mode',
		array(
			'type'       => 'select',
			'title'      => __( 'Mode', 'wpdev' ),
			'default'    => 'sandbox',
			'capability' => $cap,
			'options'    => array(
				'sandbox' => __( 'Sandbox', 'wpdev' ),
				'live'    => __( 'Live', 'wpdev' ),
			),
		)
	);

	wpdev_register_settings_field(
		'pg_general',
		'pg_default_page',
		array(
			'type'             => 'model',
			'title'            => __( 'Default admin page', 'wpdev' ),
			'default'          => '',
			'capability'       => $cap,
			'model'            => 'page',
			'data-value-field' => 'ID',
			'data-label-field' => 'post_title',
		)
	);

	wpdev_register_settings_section(
		'pg_advanced',
		array(
			'title' => __( 'Advanced', 'wpdev' ),
			'icon'  => 'dashicons-wpdev-tools',
			'order' => 20,
		)
	);

	wpdev_register_settings_field(
		'pg_advanced',
		'pg_notes',
		array(
			'type'       => 'textarea',
			'title'      => __( 'Internal notes', 'wpdev' ),
			'default'    => __( 'Sandbox-only notes for the playground demo.', 'wpdev' ),
			'capability' => $cap,
		)
	);

	wpdev_register_settings_field(
		'pg_advanced',
		'pg_debug',
		array(
			'type'       => 'toggle',
			'title'      => __( 'Debug logging', 'wpdev' ),
			'default'    => 0,
			'capability' => $cap,
		)
	);

	wpdev_register_settings_section(
		'pg_integrations',
		array(
			'title' => __( 'Integrations', 'wpdev' ),
			'icon'  => 'dashicons-wpdev-plug',
			'order' => 30,
		)
	);

	wpdev_register_settings_field(
		'pg_integrations',
		'pg_webhook_url',
		array(
			'type'       => 'text',
			'title'      => __( 'Webhook URL', 'wpdev' ),
			'default'    => 'https://example.test/webhooks/pg-demo',
			'capability' => $cap,
		)
	);

	wpdev_register_settings_field(
		'pg_integrations',
		'pg_api_key',
		array(
			'type'       => 'text',
			'title'      => __( 'API key', 'wpdev' ),
			'default'    => 'pg_sk_demo_00000000',
			'capability' => $cap,
			'require'    => array( 'pg_enabled' => 1 ),
		)
	);

} // end wpdev_playground_register_settings_demo_sections;

/**
 * Render multi-tab settings shell for playground (self-contained wpdev-settings-style UI).
 *
 * @since 2.7.0
 *
 * @param array<string, mixed> $args {
 *     @type string $section_prefix Section id prefix. Default pg_.
 *     @type string $page_slug      Admin page slug for tab links.
 * }
 * @return void
 */
function wpdev_render_settings_panel_playground( array $args = array() ) {

	if ( ! function_exists( 'wpdev_playground_bootstrap_settings' ) || ! wpdev_playground_bootstrap_settings() ) {
		echo '<p>' . esc_html__( 'WPDev settings are not available.', 'wpdev' ) . '</p>';
		return;
	}

	$prefix    = $args['section_prefix'] ?? 'pg_';
	$page_slug = $args['page_slug'] ?? ( isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : 'wpdev-pg-settings-panel-builder' );

	$sections = array();

	foreach ( wpdev()->settings->get_sections() as $slug => $section ) {
		if ( 0 === strpos( (string) $slug, (string) $prefix ) ) {
			$sections[ $slug ] = $section;
		}
	}

	if ( empty( $sections ) ) {
		echo '<p>' . esc_html__( 'No playground settings sections are registered.', 'wpdev' ) . '</p>';
		return;
	}

	if ( function_exists( 'wpdev_sort_by_order' ) ) {
		uasort( $sections, 'wpdev_sort_by_order' );
	}

	$current = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : (string) array_key_first( $sections );

	if ( ! isset( $sections[ $current ] ) ) {
		$current = (string) array_key_first( $sections );
	}

	$panel_base = function_exists( 'wpdev_playground_panel_url' )
		? wpdev_playground_panel_url( $page_slug )
		: ( function_exists( 'admin_url' ) ? admin_url( 'admin.php?page=' . rawurlencode( $page_slug ) ) : '' );

	if ( 'POST' === ( $_SERVER['REQUEST_METHOD'] ?? '' ) && ! empty( $_POST['pg_section_reset'] ) ) {
		$reset_section = sanitize_key( wp_unslash( $_POST['pg_section_reset'] ) );

		if (
			isset( $sections[ $reset_section ] )
			&& function_exists( 'wp_verify_nonce' )
			&& isset( $_POST['_wpdev_nonce'] )
			&& wp_verify_nonce( wp_unslash( $_POST['_wpdev_nonce'] ), 'saving_' . $reset_section )
			&& function_exists( 'wpdev_playground_settings_reset_section' )
			&& wpdev_playground_settings_reset_section( $reset_section, $prefix )
			&& function_exists( 'wp_safe_redirect' )
			&& ! headers_sent()
			&& '' !== $panel_base
		) {
			$join     = ( false !== strpos( $panel_base, '?' ) ) ? '&' : '?';
			$redirect = $panel_base . $join . 'tab=' . rawurlencode( $reset_section ) . '&reset=1';
			wp_safe_redirect( $redirect );
			exit;
		}
	}

	if ( function_exists( 'wpdev_playground_settings_process_post_save' ) && wpdev_playground_settings_process_post_save( $current, $prefix ) ) {
		if ( function_exists( 'wp_safe_redirect' ) && ! headers_sent() && '' !== $panel_base ) {
			$join      = ( false !== strpos( $panel_base, '?' ) ) ? '&' : '?';
			$redirect  = $panel_base . $join . 'tab=' . rawurlencode( $current ) . '&updated=1';
			wp_safe_redirect( $redirect );
			exit;
		}
	}

	if ( function_exists( 'do_action' ) ) {
		do_action( 'wpdev_render_settings' );
	}

	$styling = class_exists( 'WPDev\\Core\\Playground\\Playground_Loader' )
		? \WPDevFramework\Core\Playground\Playground_Loader::panel_styling_classes()
		: 'wpdev-styling';

	echo '<div id="wpdev-playground-settings-body" class="wpdev-playground-settings-shell ' . esc_attr( $styling ) . '">';
	echo '<p class="description">' . esc_html__( 'Self-contained sandbox with multiple tabs and field types. Only pg_* keys are written when you save.', 'wpdev' ) . '</p>';

	if ( function_exists( 'wpdev_request' ) && wpdev_request( 'reset' ) ) {
		echo '<div id="message" class="updated notice wpdev-admin-notice notice-success is-dismissible below-h2"><p>';
		echo esc_html__( 'Section reset to defaults.', 'wpdev' );
		echo '</p></div>';
	} elseif ( function_exists( 'wpdev_request' ) && wpdev_request( 'updated' ) ) {
		echo '<div id="message" class="updated notice wpdev-admin-notice notice-success is-dismissible below-h2"><p>';
		echo esc_html__( 'Settings successfully saved.', 'wpdev' );
		echo '</p></div>';
	}

	echo '<hr class="wp-header-end">';
	echo '<form method="post" class="wpdev-playground-settings-form">';
	echo '<div id="poststuff" class="sm:wpdev-grid sm:wpdev-grid-cols-12 wpdev-gap-4">';

	echo '<div class="sm:wpdev-col-span-4 lg:wpdev-col-span-2">';
	echo '<div class="wpdev-py-4 wpdev-relative">';
	echo '<input data-model="setting" data-value-field="setting_id" data-label-field="title" data-search-field="setting_id" data-max-items="1" selected type="text" placeholder="Search Setting" class="wpdev-w-full" />';
	echo '</div>';
	echo '<div data-wpdev-app="settings_menu" data-state="{}"><ul>';

	foreach ( $sections as $slug => $section ) {
		$join   = ( false !== strpos( $panel_base, '?' ) ) ? '&' : '?';
		$url    = $panel_base . $join . 'tab=' . rawurlencode( $slug );
		$active = ( $current === $slug ) ? 'wpdev-bg-gray-300 wpdev-text-gray-800' : 'wpdev-text-gray-600 hover:wpdev-text-gray-700';
		$icon   = $section['icon'] ?? 'dashicons-admin-generic';

		echo '<li id="tab-selector-' . esc_attr( $slug ) . '" class="wpdev-sticky">';
		echo '<a id="tab-selector-' . esc_attr( $slug ) . '-link" href="' . esc_url( $url ) . '" class="wpdev-block wpdev-py-2 wpdev-px-4 wpdev-no-underline wpdev-text-sm wpdev-rounded ' . esc_attr( $active ) . '">';
		echo '<span class="' . esc_attr( $icon ) . ' wpdev-align-text-bottom wpdev-mr-1"></span>';
		echo esc_html( $section['title'] ?? $slug );
		echo '</a></li>';
	}

	echo '</ul></div></div>';

	echo '<div class="sm:wpdev-col-span-8 lg:wpdev-col-span-6 metabox-holder"><div class="wpdev-relative">';

	if ( function_exists( 'wpdev_render_settings_panel_section' ) ) {
		wpdev_render_settings_panel_section(
			$current,
			array(
				'include_save'            => true,
				'embed_in_shell'          => true,
				'show_section_heading'    => false,
				'show_footer_description' => false,
			)
		);
	}

	echo '<p class="wpdev-mt-4">';
	echo '<button type="submit" name="pg_section_reset" value="' . esc_attr( $current ) . '" class="button">';
	echo esc_html__( 'Reset this section', 'wpdev' );
	echo '</button></p>';

	echo '</div></div>';

	echo '<div class="sm:wpdev-col-span-8 sm:wpdev-col-start-5 lg:wpdev-col-span-3 lg:wpdev-col-start-10 metabox-holder">';
	echo '<div class="postbox"><h2 class="hndle"><span>' . esc_html__( 'Help', 'wpdev' ) . '</span></h2>';
	echo '<div class="inside wpdev-p-4"><p>' . esc_html__( 'Register sections with wpdev_register_settings_section() and fields with wpdev_register_settings_field().', 'wpdev' ) . '</p></div></div>';
	echo '</div>';

	echo '</div>';

	if ( function_exists( 'wp_nonce_field' ) ) {
		wp_nonce_field( 'saving_' . $current, 'saving_' . $current, false );
		wp_nonce_field( 'saving_' . $current, '_wpdev_nonce' );
	}

	echo '</form></div>';

	echo '<script type="text/javascript">';
	echo 'if (typeof wpdev_block_ui === "function") { settings_loader = wpdev_block_ui("#wpdev-playground-settings-body"); }';
	echo 'function remove_block_ui() { if (typeof settings_loader !== "undefined" && settings_loader && typeof settings_loader.unblock === "function") { settings_loader.unblock(); } }';
	echo '</script>';

} // end wpdev_render_settings_panel_playground;

/**
 * Admin Setting Page playground: same shell as settings-panel-builder with module-specific context.
 *
 * @since 2.7.0
 *
 * @param array<string, mixed> $args Optional args passed to wpdev_render_settings_panel_playground().
 * @return void
 */
function wpdev_render_admin_setting_page_playground( array $args = array() ) {

	$defaults = array(
		'section_prefix' => 'pg_',
		'page_slug'      => 'wpdev-pg-admin-setting-page',
	);

	$args = array_merge( $defaults, $args );

	echo '<div class="wpdev-playground-admin-setting-wiring postbox" style="max-width:960px;margin-bottom:16px;">';
	echo '<h2 class="hndle"><span>' . esc_html__( 'Admin Page wiring', 'wpdev' ) . '</span></h2>';
	echo '<div class="inside">';
	echo '<p><code>Settings_Admin_Page</code> ' . esc_html__( 'extends Wizard_Admin_Page and registers the production settings menu (wpdev-settings). On load it boots the settings service, enqueues vue/fields assets, and renders the tabbed settings shell. Saving runs through the settings save pipeline (toggle fields default to off when unchecked).', 'wpdev' ) . '</p>';
	echo '<ol style="margin-left:1.2em;">';
	echo '<li>' . esc_html__( 'Register sections/fields via wpdev_register_settings_section() and wpdev_register_settings_field().', 'wpdev' ) . '</li>';
	echo '<li>' . esc_html__( 'Settings_Admin_Page::page_loaded() prepares the current tab and field state.', 'wpdev' ) . '</li>';
	echo '<li>' . esc_html__( 'POST save persists only keys for the active tab; toggles absent from POST are stored as off.', 'wpdev' ) . '</li>';
	echo '<li>' . esc_html__( 'The playground below reuses the same UI shell with pg_* sandbox keys only.', 'wpdev' ) . '</li>';
	echo '</ol>';
	echo '<p class="description" data-wpdev-marker="Settings_Admin_Page">' . esc_html__( 'Marker: Settings_Admin_Page lifecycle (playground).', 'wpdev' ) . '</p>';
	echo '</div></div>';

	if ( function_exists( 'wpdev_render_settings_panel_playground' ) ) {
		wpdev_render_settings_panel_playground( $args );
	}

} // end wpdev_render_admin_setting_page_playground;
