<?php
/**
 * Licensing helper functions (open-core defaults).
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Optionally attach a license key query arg to a URL.
 *
 * Slim / .org builds pass the URL through unchanged. The wpdev-license addon
 * filters `wpdev_with_license_key_url` to append a real key when present.
 *
 * @since 2.0.0
 * @since 2.10.0 Default is passthrough (no phone-home key leakage).
 *
 * @param string $url URL to attach the license key to.
 * @return string
 */
if (!function_exists('wpdev_with_license_key')) {
function wpdev_with_license_key( $url ) {

	/**
	 * Filter URL after optional license key attachment.
	 *
	 * @since 2.10.0
	 *
	 * @param string $url Original URL (passthrough by default).
	 */
	return (string) apply_filters( 'wpdev_with_license_key_url', (string) $url );

}
}
 // end wpdev_with_license_key;
