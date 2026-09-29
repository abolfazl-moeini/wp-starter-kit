<?php
/**
 * Asset Helpers
 *
 * @package WPDevFramework\Functions
 * @since   2.0.11
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Returns the URL for assets inside the assets folder.
 *
 * @since 2.0.0
 *
 * @param string $asset Asset file name with the extention.
 * @param string $assets_dir Assets sub-directory. Defaults to 'img'.
 * @param string $base_dir   Base dir. Defaults to 'assets'.
 * @return string
 */
function wpdev_get_asset($asset, $assets_dir = 'img', $base_dir = 'assets') {

	$original = $asset;

	if (!defined('SCRIPT_DEBUG') || !SCRIPT_DEBUG) {

		$asset = preg_replace('/(?<!\.min)(\.js|\.css)/', '.min$1', $asset);

	} // end if;

	$relative = "$base_dir/$assets_dir/$asset";

	if (
		$asset !== $original
		&& function_exists('wpdev_path')
		&& ! is_readable(wpdev_path($relative))
	) {
		$relative = "$base_dir/$assets_dir/$original";
	}

	return wpdev_url($relative);

} // end wpdev_get_asset;
