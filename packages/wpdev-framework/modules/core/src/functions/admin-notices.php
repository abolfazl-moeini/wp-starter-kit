<?php
/**
 * Admin notices public API.
 *
 * @package WPDevFramework\Functions
 * @since   2.8.6
 */

defined( 'ABSPATH' ) || exit;

/**
 * Queue an admin notice for the network / site / user admin chrome.
 *
 * Types map to WordPress `notice-{type}` colors: `info` (blue), `warning`
 * (amber), `error` (red), `success` (green).
 *
 * Each action button supports:
 * - `title` (required) — button label (HTML allowed for arrows).
 * - `url` (required) — href.
 * - `style` — `primary` | `secondary` (default `secondary`).
 * - `primary` — bool shorthand for `style => primary`.
 * - `target` — e.g. `_blank`.
 * - `class` — extra CSS classes on the `<a>`.
 *
 * @since 2.8.6
 *
 * @param string         $message         Notice body. Supports HTML.
 * @param string         $type            `info`|`warning`|`error`|`success`.
 * @param string         $panel           `admin`|`network-admin`|`user`.
 * @param string|false   $dismissible_key Unique key for per-user dismiss, or false.
 * @param array<int,array<string,mixed>> $actions Button configs.
 * @return bool True when the notice was queued.
 */
if (!function_exists('wpdev_add_admin_notice')) {
function wpdev_add_admin_notice( $message, $type = 'info', $panel = 'admin', $dismissible_key = false, $actions = array() ) {

	if ( ! function_exists( 'wpdev' ) || ! wpdev() || empty( wpdev()->notices ) ) {
		return false;
	}

	wpdev()->notices->add( $message, $type, $panel, $dismissible_key, $actions );

	return true;

}
}
 // end wpdev_add_admin_notice;
