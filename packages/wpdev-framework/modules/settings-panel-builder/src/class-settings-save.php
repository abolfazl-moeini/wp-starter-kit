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
	 * Apply values resolved from this runtime's registered fields without
	 * removing fields owned by another consumer of the shared option.
	 *
	 * @since 2.6.1
	 *
	 * @param array $saved_settings Latest full shared option value.
	 * @param array $resolved_settings Values resolved for registered fields.
	 * @return array Full shared option value with owned fields updated.
	 */
	public static function merge_with_saved( array $saved_settings, array $resolved_settings ) {

		return array_replace( $saved_settings, $resolved_settings );

	} // end merge_with_saved;

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

		$page_capability = function_exists( 'apply_filters' )
			? apply_filters( 'wpdev_settings_current_page_capability', null )
			: null;

		foreach ( $sections as $section_slug => $section ) {

			if ( empty( $section['fields'] ) ) {
				continue;
			}

			$section_capability = $section['capability'] ?? null;

			foreach ( $section['fields'] as $field_slug => $field_atts ) {

				$field_raw_cap  = $field_atts['capability'] ?? null;
				$can_save_field = false;

				if ( ! empty( $field_raw_cap ) && 'manage_network' !== $field_raw_cap ) {
					// Explicit non-default capability: strictly check user capability, or full admin privileges.
					$check_cap      = function_exists( 'wpdev_admin_capability_for' ) ? wpdev_admin_capability_for( $field_raw_cap ) : $field_raw_cap;
					$can_save_field = function_exists( 'current_user_can' ) && (
						current_user_can( $check_cap )
						|| current_user_can( 'wpdev_edit_settings' )
						|| current_user_can( 'manage_network' )
						|| ( function_exists( 'is_multisite' ) && ! is_multisite() && current_user_can( 'manage_options' ) )
						|| ( ! function_exists( 'is_multisite' ) && current_user_can( 'manage_options' ) )
					);
				} else {
					// Default manage_network or inherited capability.
					if ( function_exists( 'current_user_can' ) ) {
						if ( current_user_can( 'wpdev_edit_settings' ) || current_user_can( 'manage_network' ) ) {
							$can_save_field = true;
						} elseif ( function_exists( 'is_multisite' ) && ! is_multisite() && current_user_can( 'manage_options' ) ) {
							$can_save_field = true;
						} elseif ( ! function_exists( 'is_multisite' ) && current_user_can( 'manage_options' ) ) {
							$can_save_field = true;
						} elseif ( ! empty( $section_capability ) && 'manage_network' !== $section_capability && current_user_can( $section_capability ) ) {
							$can_save_field = true;
						} elseif ( ! empty( $page_capability ) && is_string( $page_capability ) && 'manage_network' !== $page_capability && current_user_can( $page_capability ) ) {
							$can_save_field = true;
						}
					}
				}

				if ( ! $can_save_field ) {
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
