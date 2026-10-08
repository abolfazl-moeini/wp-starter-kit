<?php
/**
 * Repeater columns are posted under their own names, not the parent field slug.
 *
 * @package WPDevFramework\Functions
 * @since   2.13.9
 */

defined( 'ABSPATH' ) || exit;

/**
 * Copy posted repeater columns onto a settings payload.
 *
 * Host handlers that keep only registered field keys drop names such as
 * offers_product_id[] and hero_slide_image[]. Those columns stay on the
 * request. Pre-save filters and Settings_Save::resolve() both use this helper
 * so an older embedded Settings class still receives the rows.
 *
 * @since 2.13.9
 *
 * @param array      $settings_to_save Payload about to be saved.
 * @param array|null $sections         Settings sections. Discovered when omitted.
 * @return array
 */
function wpdev_settings_with_repeater_columns( array $settings_to_save, $sections = null ) {

	if ( ! is_array( $sections ) ) {
		$sections = array();
		if ( function_exists( 'wpdev' ) && is_object( wpdev() ) && isset( wpdev()->settings ) && is_object( wpdev()->settings ) && method_exists( wpdev()->settings, 'get_sections' ) ) {
			$discovered = wpdev()->settings->get_sections();
			if ( is_array( $discovered ) ) {
				$sections = $discovered;
			}
		}
	}

	if ( class_exists( '\\WPDevFramework\\Modules\\SettingsPanelBuilder\\Settings_Save' ) ) {
		return \WPDevFramework\Modules\SettingsPanelBuilder\Settings_Save::with_repeater_columns( $sections, $settings_to_save );
	}

	return $settings_to_save;
}
