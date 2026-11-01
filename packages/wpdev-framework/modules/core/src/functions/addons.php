<?php
/**
 * Optional bundled addons loader (full zip only).
 *
 * @package WPDevFramework\Core\Functions
 * @since   2.10.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Whether an addon id should load.
 *
 * @since 2.10.0
 *
 * @param string $addon_id Addon folder slug.
 * @return bool
 */
if (!function_exists('wpdev_addon_is_enabled')) {
function wpdev_addon_is_enabled( $addon_id ) {

	/**
	 * Filter whether a bundled addon should load.
	 *
	 * @since 2.10.0
	 *
	 * @param bool   $enabled  Default true.
	 * @param string $addon_id Addon slug.
	 */
	return (bool) apply_filters( 'wpdev_addon_enabled', true, (string) $addon_id );

}
}
 // end wpdev_addon_is_enabled;

/**
 * Absolute path to the addons directory (may not exist on slim builds).
 *
 * @since 2.10.0
 *
 * @return string
 */
if (!function_exists('wpdev_addons_dir')) {
function wpdev_addons_dir() {

	if ( defined( 'WPDEV_ADDONS_DIR' ) ) {
		return trailingslashit( (string) WPDEV_ADDONS_DIR );
	}

	return trailingslashit( WPDEV_PLUGIN_DIR . 'addons' );

}
}
 // end wpdev_addons_dir;

/**
 * Discover and bootstrap bundled addons under WPDEV_ADDONS_DIR.
 *
 * Safe no-op when the directory is missing (slim / .org zip).
 *
 * @since 2.10.0
 *
 * @return void
 */
if (!function_exists('wpdev_load_bundled_addons')) {
function wpdev_load_bundled_addons() {

	static $loaded = false;

	if ( $loaded ) {
		return;
	}

	$loaded = true;

	$dir = wpdev_addons_dir();

	if ( ! is_dir( $dir ) ) {
		/**
		 * Fires after bundled addons have been loaded (or skipped).
		 *
		 * @since 2.10.0
		 */
		do_action( 'wpdev_addons_loaded' );
		return;
	}

	if ( class_exists( '\WPDevFramework\Core\Addon_Autoloader', false ) ) {
		\WPDevFramework\Core\Addon_Autoloader::init();
	}

	$setups = glob( $dir . '*/setup.php' );

	if ( ! is_array( $setups ) ) {
		do_action( 'wpdev_addons_loaded' );
		return;
	}

	sort( $setups );

	foreach ( $setups as $setup ) {

		$addon_id = basename( dirname( $setup ) );

		// Skip archive / private folders.
		if ( 0 === strpos( $addon_id, '_' ) || 0 === strpos( $addon_id, '.' ) ) {
			continue;
		}

		if ( ! wpdev_addon_is_enabled( $addon_id ) ) {
			continue;
		}

		$src = dirname( $setup ) . '/src';

		if ( is_dir( $src ) && class_exists( '\WPDevFramework\Core\Addon_Autoloader', false ) ) {
			\WPDevFramework\Core\Addon_Autoloader::register( $addon_id, $src );
		}

		require_once $setup;

	} // end foreach;

	/**
	 * Fires after bundled addons have been loaded (or skipped).
	 *
	 * @since 2.10.0
	 */
	do_action( 'wpdev_addons_loaded' );

}
}
 // end wpdev_load_bundled_addons;
