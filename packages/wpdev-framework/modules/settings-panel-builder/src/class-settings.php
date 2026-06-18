<?php
/**
 * WPDev settings helper class.
 *
 * @package WPDev
 * @subpackage Settings
 * @since 2.0.0
 */


namespace WPDevFramework;

use WPDevFramework\UI\Field;
use WPDevFramework\Modules\SettingsPanelBuilder\Settings_Storage;
use WPDevFramework\Modules\SettingsPanelBuilder\Settings_Save;
use WPDevFramework\Modules\SettingsPanelBuilder\Settings_Section_Registry;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * WPDev settings helper class.
 *
 * @since 2.0.0
 */
class Settings {

	use \WPDevFramework\Traits\Singleton,\WPDevFramework\Traits\WPDev_Settings_Deprecated;

	/**
	 * Keeps the key used to access settings.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	const KEY = 'v2_settings';

	/**
	 * Holds the array containing all the saved settings.
	 *
	 * @since 2.0.0
	 * @var array|null
	 */
	private $settings = null;

	/**
	 * Storage collaborator (K3-01).
	 *
	 * @since 2.6.0
	 * @var Settings_Storage|null
	 */
	private $storage = null;

	/**
	 * Holds the sections of the settings page.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $sections = null;

	/**
	 * Lazily resolve the storage collaborator.
	 *
	 * @since 2.6.0
	 * @return Settings_Storage
	 */
	private function storage() {

		if ( null === $this->storage ) {
			$this->storage = new Settings_Storage();
		}

		return $this->storage;

	} // end storage;

	/**
	 * Runs on singleton instantiation.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {

		$this->get_all();

		add_action('wpdev_load', array($this, 'default_sections'), 1);

		add_action('init', array($this, 'handle_legacy_filters'), 2);

		add_action('wpdev_render_settings', array($this, 'handle_legacy_scripts'));

		add_filter('pre_site_option_registration', array($this, 'force_registration_status'), 10, 3);

		add_filter('pre_site_option_add_new_users', array($this, 'force_add_new_users'), 10, 3);

		add_filter('pre_site_option_menu_items', array($this, 'force_plugins_menu'), 10, 3);

	} // end init;

	/**
	 * Change the current status of the registration on WordPress MS.
	 *
	 * @since 2.0.0
	 *
	 * @param string $status The registration status.
	 * @param string $option Option name, in this case, 'registration'.
	 * @param int    $network_id The id of the network being accessed.
	 * @return string
	 */
	public function force_registration_status($status, $option, $network_id) {

		global $current_site;

		if ($network_id !== $current_site->id) {

			return $status;

		} // end if;

		$status = wpdev_get_setting('enable_registration') ? 'all' : $status;

		return $status;

	} // end force_registration_status;

	/**
	 * Change the current status of the add_new network option.
	 *
	 * @since 2.0.0
	 *
	 * @param string $status The add_new_users status.
	 * @param string $option Option name, in this case, 'add_new_user'.
	 * @param int    $network_id The id of the network being accessed.
	 * @return string
	 */
	public function force_add_new_users($status, $option, $network_id) {

		global $current_site;

		if ($network_id !== $current_site->id) {

			return $status;

		} // end if;

		return wpdev_get_setting('add_new_users', true);

	} // end force_add_new_users;

	/**
	 * Change the current status of the add_new network option.
	 *
	 * @since 2.0.0
	 *
	 * @param array|bool $status The add_new_users status.
	 * @param string     $option Option name, in this case, 'add_new_user'.
	 * @param int        $network_id The id of the network being accessed.
	 * @return string
	 */
	public function force_plugins_menu($status, $option, $network_id) {

		global $current_site;

		if ($network_id !== $current_site->id || is_bool($status)) {

			return $status;

		} // end if;

		$status['plugins'] = wpdev_get_setting('menu_items_plugin', true);

		return $status;

	} // end force_plugins_menu;

	/**
	 * Get all the settings from WPDev
	 *
	 * @param bool $check_caps If we should remove the settings the user does not have rights to see.
	 * @return array Array containing all the settings
	 */
	public function get_all($check_caps = false) {

		$storage = $this->storage();

		if ($storage->is_empty()) {

			$this->settings = $this->save_settings(array(), true);

			return $this->settings;

		} // end if;

		if ($check_caps) {} // phpcs:ignore;

		$this->settings = $storage->all();

		return $this->settings;

	} // end get_all;

	/**
	 * Get a specific settings from the plugin
	 *
	 * @since  1.1.5 Let's we pass default values in case nothing is found.
	 * @since  1.4.0 Now we can filter settings we get.
	 *
	 * @param  string $setting Settings name to return.
	 * @param  mixed  $default Default value for the setting if it doesn't exist.
	 * @return mixed The value of that setting
	 */
	public function get_setting($setting, $default = false) {

		// Ensure defaults are installed on first access.
		$this->get_all();

		return $this->storage()->get($setting, $default);

	} // end get_setting;

	/**
	 * Saves a specific setting into the database
	 *
	 * @param string $setting Option key to save.
	 * @param mixed  $value   New value of the option.
	 * @return boolean
	 */
	public function save_setting($setting, $value) {

		$status = $this->storage()->set($setting, $value);

		$this->settings = $this->storage()->all();

		return $status;

	} // end save_setting;

	/**
	 * Save WPDev Settings
	 *
	 * This function loops through the settings sections and saves the settings
	 * after validating them.
	 *
	 * @since 2.0.0
	 *
	 * @param array   $settings_to_save Array containing the settings to save.
	 * @param boolean $reset If true, WPDev will override the saved settings with the default values.
	 * @return array
	 */
	public function save_settings($settings_to_save = array(), $reset = false) {

		$sections = $this->get_sections();

		$saved_settings = !$reset ? $this->storage()->all() : array();

		do_action('wpdev_before_save_settings', $settings_to_save);

		// K3-01/K3-03: per-field resolution lives in the Settings_Save collaborator.
		$settings = Settings_Save::resolve($sections, $saved_settings, $settings_to_save, $reset);

		/**
		 * Allow developers to filter settings before save by WPDev.
		 *
		 * @since 2.0.18
		 *
		 * @param array  $settings         The settings to be saved.
		 * @param array  $settings_to_save The new settings to add.
		 * @param string $saved_settings   The current settings saved.
		 */
		$settings = apply_filters('wpdev_pre_save_settings', $settings, $settings_to_save, $saved_settings);

		$this->storage()->replace($settings);

		$this->settings = $settings;

		do_action('wpdev_after_save_settings', $settings, $settings_to_save, $saved_settings);

		return $settings;

	} // end save_settings;

	/**
	 * Returns the list of sections and their respective fields.
	 *
	 * @since 1.1.0
	 * @todo Order sections by the order parameter.
	 * @todo Order fields by the order parameter.
	 * @return array
	 */
	public function get_sections() {

		$sections = array(
			/*
			 * Add a default invisible section that we can use
			 * to register settings that will not have a control.
			 */
			'core' => array(
				'invisible' => true,
				'order'     => 1_000_000,
				'fields'    => apply_filters( 'wpdev_settings_section_core_fields', array() ),
			),
		);

		if ( class_exists( Settings_Section_Registry::class ) ) {
			foreach ( Settings_Section_Registry::all() as $slug => $config ) {
				if ( ! isset( $sections[ $slug ] ) ) {
					$sections[ $slug ] = $config;
					continue;
				}

				$sections[ $slug ] = array_merge( $sections[ $slug ], $config );
			}
		}

		$this->sections = apply_filters( 'wpdev_settings_get_sections', $sections );

		uasort( $this->sections, 'wpdev_sort_by_order' );

		return $this->sections;

	} // end get_sections;

	/**
	 * Returns a particular settings section.
	 *
	 * @since 2.0.0
	 *
	 * @param string $section_name The slug of the section to return.
	 * @return array
	 */
	public function get_section($section_name = 'general') {

		$sections = $this->get_sections();

		return wpdev_get_isset($sections, $section_name, array(
			'fields' => array(),
		));

	} // end get_section;

	/**
	 * Adds a new settings section.
	 *
	 * Sections are a way to organize correlated settings into one cohesive unit.
	 * Developers should be able to add their own sections, if they need to.
	 * This is the purpose of this APIs.
	 *
	 * @since 2.0.0
	 *
	 * @param string $section_slug ID of the Section. This is used to register fields to this section later.
	 * @param array  $atts Section attributes such as title, description and so on.
	 * @return void
	 */
	public function add_section($section_slug, $atts) {

		/*
		 * K3-02: mirror the section into Settings_Section_Registry so it acts as
		 * the canonical, introspectable source of sections (the filter below
		 * keeps the legacy rendering flow intact).
		 */
		if (class_exists(Settings_Section_Registry::class)) {

			Settings_Section_Registry::register($section_slug, $atts);

		} // end if;

		add_filter('wpdev_settings_get_sections', function($sections) use ($section_slug, $atts) {

			$default_order = (count($sections) + 1) * 10;

			$atts = wp_parse_args($atts, array(
				'icon'       => 'dashicons-wpdev-cog',
				'order'      => $default_order,
				'capability' => 'manage_network',
			));

			$atts['fields'] = apply_filters("wpdev_settings_section_{$section_slug}_fields", array());

			$sections[$section_slug] = $atts;

			return $sections;

		});

	} // end add_section;

	/**
	 * Adds a new field to a settings section.
	 *
	 * Fields are settings that admins can actually change.
	 * This API allows developers to add new fields to a given settings section.
	 *
	 * @since 2.0.0
	 *
	 * @param string $section_slug Section to which this field will be added to.
	 * @param string $field_slug ID of the field. This is used to later retrieve the value saved on this setting.
	 * @param array  $atts Field attributes such as title, description, tooltip, default value, etc.
	 * @return void
	 */
	public function add_field($section_slug, $field_slug, $atts) {
		/*
		 * Adds the field to the desired fields array.
		 */
		add_filter("wpdev_settings_section_{$section_slug}_fields", function($fields) use ($field_slug, $atts) {
			/*
			 * We no longer support settings with hyphens.
			 */
			if (strpos($field_slug, '-') !== false) {

				_doing_it_wrong($field_slug, __('Dashes are no longer supported when registering a setting. You should change it to underscores in later versions.', 'wpdev'), '2.0.0');

			} // end if;

			$default_order = (count($fields) + 1) * 10;

			$atts = wp_parse_args($atts, array(
				'setting_id'        => $field_slug,
				'title'             => '',
				'desc'              => '',
				'order'             => $default_order,
				'default'           => null,
				'capability'        => 'manage_network',
				'wrapper_html_attr' => array(),
				'require'           => array(),
				'html_attr'         => array(),
				'value'             => fn() => wpdev_get_setting($field_slug),
				'display_value'     => fn() => wpdev_get_setting($field_slug),
				'img'               => function() use ($field_slug) {

					$img_id = wpdev_get_setting($field_slug);

					if (!$img_id) {

						return '';

					} // end if;

					$custom_logo_args = wp_get_attachment_image_src($img_id, 'full');

					return $custom_logo_args ? $custom_logo_args[0] : '';

				},
			));

			/**
			 * Adds v-model
			 */
			if (wpdev_get_isset($atts, 'type') !== 'submit') {

				$atts['html_attr']['v-model']     = wpdev_replace_dashes($field_slug);
				$atts['html_attr']['true-value']  = '1';
				$atts['html_attr']['false-value'] = '0';

			} // end if;

			$atts['html_attr']['id'] = $field_slug;

			/**
			 * Handle selectize.
			 */
			$model_name = wpdev_get_isset($atts['html_attr'], 'data-model');

			if ($model_name) {

				if (function_exists("wpdev_get_{$model_name}") || $model_name === 'page') {

					$original_html_attr = $atts['html_attr'];

					$atts['html_attr'] = function() use ($field_slug, $model_name, $atts, $original_html_attr) {

						$value = wpdev_get_setting($field_slug);

						if ($model_name === 'page') {

							$new_attrs['data-selected'] = get_post($value);

						} else {

							$data_selected              = call_user_func("wpdev_get_{$model_name}", $value);
							$new_attrs['data-selected'] = $data_selected->to_search_results();

						} // end if;

						$new_attrs['data-selected'] = json_encode($new_attrs['data-selected']);

						return array_merge($original_html_attr, $new_attrs);

					};

				} // end if;

			} // end if;

			if (!empty($atts['require'])) {

				$require_rules = array();

				foreach ($atts['require'] as $attr => $value) {

					$attr = str_replace('-', '_', $attr);

					$value = json_encode($value);

					$require_rules[] = "require('{$attr}', {$value})";

				} // end foreach;

				$atts['wrapper_html_attr']['v-show']  = implode(' && ', $require_rules);
				$atts['wrapper_html_attr']['v-cloak'] = 'v-cloak';

			} // end if;

			$fields[$field_slug] = $atts;

			return $fields;

		});

		/*
		 * Makes sure we install the default value if it is not set yet.
		 */
		if (isset($atts['default']) && $atts['default'] !== null && !$this->storage()->has($field_slug)) {

			$this->save_setting($field_slug, $atts['default']);

		} // end if;

	} // end add_field;

	/**
	 * Register the WPDev default sections and fields.
	 *
	 * @since 2.0.0
	 * @return void
	 */

	/**
	 * Register the WPDev default sections and fields.
	 *
	 * Domain sections are registered via wpdev_settings_register_default_sections.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function default_sections() {

		/**
		 * Register WPDev-owned default settings sections.
		 *
		 * @since 2.6.0
		 *
		 * @param Settings $settings Settings instance.
		 */
		do_action( 'wpdev_settings_register_default_sections', $this );

	} // end default_sections;

	/**
	 * Tries to determine the location of the company based on the admin IP.
	 *
	 * @since 2.0.0
	 * @return string
	 */
	public function get_default_company_country() {

		$geolocation = \WPDevFramework\Geolocation::geolocate_ip('', true);

		return $geolocation['country'];

	} // end get_default_company_country;

} // end class Settings;
