<?php
/**
 * Settings save pipeline collaborator (K3-01/K3-03).
 *
 * Owns the per-field value resolution loop used when saving the settings page.
 * Extracted verbatim from Settings::save_settings() so behavior (including the
 * toggle edge case) is unchanged; the caller is responsible for persistence
 * and for firing the before/after hooks.
 *
 * @package WPDevFramework\Modules\SettingsPanelBuilder
 * @since   2.6.0
 */

namespace WPDevFramework\Modules\SettingsPanelBuilder;

use WPDevFramework\UI\Field;

defined( 'ABSPATH' ) || exit;

/**
 * Computes the settings array to persist from posted values + sections.
 */
class Settings_Save {

	/**
	 * Resolve the settings array to save.
	 *
	 * @since 2.6.0
	 *
	 * @param array $sections         Settings sections (with fields).
	 * @param array $saved_settings   Currently saved settings (empty when resetting).
	 * @param array $settings_to_save Posted values.
	 * @param bool  $reset            Whether to reset to defaults.
	 * @return array Computed settings.
	 */
	public static function resolve( array $sections, array $saved_settings, array $settings_to_save, $reset = false ) {

		$settings = array();

		foreach ( $sections as $section_slug => $section ) {

			if ( empty( $section['fields'] ) ) {
				continue;
			}

			foreach ( $section['fields'] as $field_slug => $field_atts ) {

				$field_capability = $field_atts['capability'] ?? 'manage_network';

				if ( function_exists( 'wpdev_admin_capability_for' ) ) {
					$field_capability = wpdev_admin_capability_for( $field_capability );
				}

				if ( function_exists( 'current_user_can' ) && ! current_user_can( $field_capability ) ) {
					if ( ! $reset && isset( $saved_settings[ $field_slug ] ) ) {
						$settings[ $field_slug ] = $saved_settings[ $field_slug ];
					}
					continue;
				}

				$existing_value = isset( $saved_settings[ $field_slug ] ) ? $saved_settings[ $field_slug ] : false;

				$field = new Field( $field_slug, $field_atts );

				$new_value = isset( $settings_to_save[ $field_slug ] ) ? $settings_to_save[ $field_slug ] : $existing_value;

				/*
				 * For the current tab, we need to assume toggle fields default to off
				 * when they are absent from the POST payload.
				 */
				if ( $section_slug === wpdev_request( 'tab', 'general' ) && $field->type === 'toggle' && ! isset( $settings_to_save[ $field_slug ] ) ) {

					$new_value = false;

				} // end if;

				$value = $reset ? $field->default : $new_value;

				$field->set_value( $value );

				if ( $field->get_value() !== null ) {

					$settings[ $field_slug ] = $field->get_value();

				} // end if;

				do_action( 'wpdev_saving_setting', $field_slug, $field, $settings_to_save );

			} // end foreach;

		} // end foreach;

		return $settings;

	} // end resolve;

} // end class Settings_Save;
