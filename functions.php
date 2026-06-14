<?php
/**
 * WP-Starter-Kit — root functions.php template.
 *
 * This file is the minimal scaffold the starter project ships with. It:
 *   1. Loads the asset helper API (autoloaded by Composer, but the include
 *      is defensive in case the autoloader is not registered yet, e.g. when
 *      the file is loaded by WP directly during theme switch).
 *   2. Loads the theme text domain (`wpsk-starter`).
 *   3. Wires the standard `wp_enqueue_scripts` handler that:
 *        - enqueues the deps bundle using `wpsk_enqueue_bundle_script()`,
 *        - localizes the deps bundle with `wpsk_get_localize_data()`,
 *        - enqueues a default stylesheet using `wpsk_enqueue_bundle_style()`.
 *
 * The text domain and function prefix are scaffold-generated from
 * `project.config.json` (`textDomain: wpsk-starter`, `phpFunctionPrefix: wpsk_`).
 * After scaffolding, re-branding is done by editing `project.config.json` and
 * running the build pipeline (do NOT hand-rewrite this file's strings).
 *
 * NOTE: This file is loaded by WordPress inside the active theme. The
 * `defined('ABSPATH')` guard prevents direct browser access.
 *
 * @package wp-starter-kit
 */

defined( 'ABSPATH' ) || exit;

// Defensive include: composer.json `autoload.files` already pulls this in,
// but loading it here keeps the file usable without the autoloader.
$wpsk_asset_functions = __DIR__ . '/includes/asset-functions.php';
if (is_readable( $wpsk_asset_functions )) {
	require_once $wpsk_asset_functions;
}

add_action( 'after_setup_theme', 'wpsk_starter_setup_theme' );
add_action( 'wp_enqueue_scripts', 'wpsk_starter_enqueue_assets' );

if ( ! function_exists( 'wpsk_starter_setup_theme' )) {
	/**
	 * Load translations for the starter theme.
	 *
	 * The text domain matches `project.config.json → textDomain`
	 * (`wpsk-starter`). The `.mo` files live under
	 * `<theme>/languages/`.
	 */
	function wpsk_starter_setup_theme(): void {
		load_theme_textdomain( 'wpsk-starter', get_template_directory() . '/languages' );
	}
}

if ( ! function_exists( 'wpsk_starter_enqueue_assets' )) {
	/**
	 * Enqueue the deps bundle, localize the data contract, and register
	 * the default stylesheet. Specific bundles (e.g. component JS) are
	 * enqueued by their own bootstrap modules via the same helpers.
	 */
	function wpsk_starter_enqueue_assets(): void {
		// Deps bundle: `project.config.json → depsBundle` (e.g.
		// `wpsk-starter-deps.js`). The handle is derived from the
		// filename (`.js` stripped).
		wpsk_enqueue_bundle_script( 'wpsk-starter-deps.js' );

		// Localize the deps handle so `@wpsk/utils/localize.js` can read
		// `api.url` / `api.nonce` / `api_x.url` / `api_x.nonce`.
		wp_localize_script(
			'wpsk-starter-deps',
			'WPSKLoc',
			wpsk_get_localize_data()
		);

		// Default stylesheet (hashed cache-bust via the .asset.php).
		wpsk_enqueue_bundle_style( 'style.css' );
	}
}
