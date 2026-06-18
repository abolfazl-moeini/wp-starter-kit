<?php
/**
 * A trait to be included in entities to WP_Settings Class depecrated methods.
 *
 * @package WPDev
 * @subpackage Deprecated
 * @since 2.0.0
 */

namespace WPDevFramework\Traits;

/**
 * WPDev_Settings_Deprecated trait.
 */
trait WPDev_Settings_Deprecated {

	/**
	 * Adds the legacy scripts.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_legacy_scripts() {
    /*
     * Mailchimp: Backwards compatibility.
     */
		if (wp_script_is('wpdev-mailchimp', 'registered')) {

			wp_enqueue_script('wpdev-mailchimp');

		} // end if;

	} // end handle_legacy_scripts;

	/**
	 * Handle legacy hooks to support old versions of our add-ons.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_legacy_filters() {

		$legacy_settings = array();

    /*
     * Fetch Extra Sections
     */
		$sections = apply_filters_deprecated('wpdev_settings_sections', array(array()), '2.0.0', 'wpdev_register_settings_section()');

		foreach ($sections as $section_key => $section) {

			if ($section_key === 'activation') {

				continue; // No activation stuff;

			} // end if;

			$legacy_settings = array_merge($legacy_settings, $section['fields']);

		} // end foreach;

		$filters = array(
			'wpdev_settings_section_general',
			'wpdev_settings_section_network',
			'wpdev_settings_section_domain_mapping',
			'wpdev_settings_section_payment_gateways',
			'wpdev_settings_section_emails',
			'wpdev_settings_section_styling',
			'wpdev_settings_section_tools',
			'wpdev_settings_section_advanced',
		);

		foreach ($filters as $filter) {

			$message = __('Adding setting sections directly via filters is no longer supported.');

			$legacy_settings = apply_filters_deprecated($filter, array($legacy_settings), '2.0.0', 'wpdev_register_settings_field()', $message);

		} // end foreach;

		if ($legacy_settings) {

			$this->add_section('other', array(
				'title' => __('Other', 'wpdev'),
				'desc'  => __('Other', 'wpdev'),
			));

			foreach ($legacy_settings as $setting_key => $setting) {

				if (strpos((string) $setting_key, 'license_key_') !== false) {

					continue; // Remove old license key fields

				} // end if;

				$this->add_field('other', $setting_key, $setting);

			} // end foreach;

		} // end if;

	} // end handle_legacy_filters;

} // end trait WPDev_Settings_Deprecated;
