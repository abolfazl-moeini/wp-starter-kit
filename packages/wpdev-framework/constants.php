<?php
/**
 * Set additional WPDev plugin constants.
 *
 * @package WPDev
 * @since 2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

// Plugin Folder Path
if (!defined('WPDEV_PLUGIN_DIR')) {

	define('WPDEV_PLUGIN_DIR', plugin_dir_path(WPDEV_PLUGIN_FILE));

} // end if;

// Plugin Folder URL
if (!defined('WPDEV_PLUGIN_URL')) {

	define('WPDEV_PLUGIN_URL', plugin_dir_url(WPDEV_PLUGIN_FILE));

} // end if;

// Plugin Root File
if (!defined('WPDEV_PLUGIN_BASENAME')) {

	define('WPDEV_PLUGIN_BASENAME', plugin_basename(WPDEV_PLUGIN_FILE));

} // end if;

// Plugin semver (matches wp-dev.php header).
if ( ! defined( 'WPDEV_VERSION' ) ) {

	define( 'WPDEV_VERSION', '2.5.0' );

} // end if;

// Dev-only: enable WPDev Playground admin menu via the wpdev-playground plugin.
