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

		$settings_to_save = self::with_repeater_columns( $sections, $settings_to_save );

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
						} elseif ( ! empty( $section_capability ) && 'manage_network' !== $section_capability && 'wpdev_read_settings' !== $section_capability && current_user_can( $section_capability ) ) {
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
				$current_tab    = wpdev_request( 'tab', 'general' );
				$is_current_tab = ( $section_slug === $current_tab )
					|| ( 'general' === $current_tab && ( 'general' === $section_slug || substr( (string) $section_slug, -8 ) === '_general' || ( isset( $section['tab'] ) && 'general' === $section['tab'] ) ) );

				if ( $is_current_tab && $field->type === 'toggle' && ! isset( $settings_to_save[ $field_slug ] ) ) {

					$new_value = false;

				} // end if;

				/*
				 * Repeater controls post one array per subfield (image[], link[])
				 * instead of the parent slug. A copied parent value is the previous
				 * save, so column arrays replace it. No columns on this tab means
				 * the form was submitted with every row removed.
				 */
				$repeater_fields = ( isset( $field_atts['fields'] ) && is_array( $field_atts['fields'] ) ) ? $field_atts['fields'] : array();

				if ( ! $reset && 'repeater' === $field->type && array() !== $repeater_fields ) {

					$assembled = self::repeater_rows_from_columns( $repeater_fields, $settings_to_save );

					if ( null !== $assembled ) {

						$new_value = $assembled;

					} elseif ( $is_current_tab ) {

						$new_value = array();

					} // end if;

					if ( is_array( $new_value ) ) {

						$settings[ $field_slug ] = $new_value;

						do_action( 'wpdev_saving_setting', $field_slug, $field, $settings_to_save );

						continue;

					} // end if;

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

	/**
	 * Copy posted repeater columns onto the save payload.
	 *
	 * Host handlers that keep only registered field keys drop names such as
	 * hero_slide_image[]. Those columns stay on the request and must travel
	 * with the payload so pre-save filters can still see them.
	 *
	 * @since 2.13.9
	 *
	 * @param array $sections         Settings sections.
	 * @param array $settings_to_save Payload about to be saved.
	 * @return array
	 */
	public static function with_repeater_columns( array $sections, array $settings_to_save ) {

		foreach ( $sections as $section ) {

			if ( empty( $section['fields'] ) || ! is_array( $section['fields'] ) ) {
				continue;
			}

			foreach ( $section['fields'] as $field_atts ) {

				if ( ! is_array( $field_atts ) || 'repeater' !== ( $field_atts['type'] ?? '' ) ) {
					continue;
				}

				$subfields = ( isset( $field_atts['fields'] ) && is_array( $field_atts['fields'] ) ) ? $field_atts['fields'] : array();

				foreach ( $subfields as $sub_key => $sub_atts ) {

					unset( $sub_atts );

					$post_key = rtrim( (string) $sub_key, '[]' );

					if ( '' === $post_key || array_key_exists( $post_key, $settings_to_save ) ) {
						continue;
					}

					if ( ! isset( $_POST[ $post_key ] ) || ! is_array( $_POST[ $post_key ] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
						continue;
					}

					$column = $_POST[ $post_key ]; // phpcs:ignore WordPress.Security.NonceVerification.Missing

					$settings_to_save[ $post_key ] = function_exists( 'wp_unslash' ) ? wp_unslash( $column ) : stripslashes_deep( $column );

				} // end foreach;

			} // end foreach;

		} // end foreach;

		return $settings_to_save;

	} // end with_repeater_columns;

	/**
	 * Zip column-major repeater input into row arrays.
	 *
	 * @since 2.13.9
	 *
	 * @param array $subfields        Repeater subfield definitions, keyed by post name.
	 * @param array $settings_to_save Payload that already includes column arrays.
	 * @return array|null Null when none of the subfields were posted as arrays.
	 */
	private static function repeater_rows_from_columns( array $subfields, array $settings_to_save ) {

		$columns = array();
		$count   = 0;
		$found   = false;

		foreach ( $subfields as $sub_key => $sub_atts ) {

			unset( $sub_atts );

			$post_key = rtrim( (string) $sub_key, '[]' );

			if ( '' === $post_key || ! isset( $settings_to_save[ $post_key ] ) || ! is_array( $settings_to_save[ $post_key ] ) ) {
				continue;
			}

			$found                 = true;
			$columns[ $post_key ]  = $settings_to_save[ $post_key ];
			$count                 = max( $count, count( $settings_to_save[ $post_key ] ) );

		} // end foreach;

		if ( ! $found ) {
			return null;
		}

		$rows = array();

		for ( $i = 0; $i < $count; $i++ ) {

			$row = array();

			foreach ( $subfields as $sub_key => $sub_atts ) {

				unset( $sub_atts );

				$post_key = rtrim( (string) $sub_key, '[]' );

				if ( '' === $post_key ) {
					continue;
				}

				$row[ $post_key ] = $columns[ $post_key ][ $i ] ?? '';

			} // end foreach;

			$rows[] = $row;

		} // end for;

		return $rows;

	} // end repeater_rows_from_columns;

} // end class Settings_Save;
