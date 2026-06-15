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
 * --------------------------------------------------------------------------
 * DEPRECATION NOTICE (wp-starter-kit Phase 11)
 * --------------------------------------------------------------------------
 * As of Phase 11, wp-starter-kit is **plugin-first**. New projects should
 * scaffold with `projectType: 'plugin'` (the default) and rely on
 * `{slug}.php` as the primary bootstrap. The `{slug}.php` file:
 *
 *   - declares the WordPress.org plugin headers (Plugin Name, Version,
 *     Requires PHP, Text Domain, ...),
 *   - pulls in `vendor/autoload.php`,
 *   - wires `WPSK\Core\Plugin::boot()` so the WPSK namespace owns the
 *     boot sequence,
 *   - registers activation / deactivation / uninstall hooks,
 *   - calls `load_plugin_textdomain` against the *plugin* languages
 *     directory (not the theme).
 *
 * `functions.php` is kept for two reasons:
 *   1. Backward compatibility: existing projects that were scaffolded
 *      before Phase 11 continue to work.
 *   2. Theme mode: projects that explicitly set `projectType: 'theme'`
 *      in `project.config.json` still get a `functions.php` bootstrap
 *      from the scaffold.
 *
 * This file will be removed in the next major release. New projects
 * should delete it after scaffolding and rely on `{slug}.php`.
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
		$cfg         = wpsk_read_project_config();
		$text_domain = $cfg['textDomain'] ?? 'wpsk-starter';
		load_theme_textdomain( $text_domain, get_template_directory() . '/languages' );
	}
}

if ( ! function_exists( 'wpsk_starter_enqueue_assets' )) {
	/**
	 * Enqueue the deps bundle, localize the data contract, and register
	 * the default stylesheet. Specific bundles (e.g. component JS) are
	 * enqueued by their own bootstrap modules via the same helpers.
	 */
	function wpsk_starter_enqueue_assets(): void {
		// Read branding from project.config.json so that simply editing
		// the config + rebuild is enough to re-brand the kit (localize
		// global name, bundle filename for the deps handle, etc.).
		$cfg         = wpsk_read_project_config();
		$deps_bundle = $cfg['depsBundle'] ?? 'wpsk-starter-deps.js';
		$loc_var     = $cfg['localizeVar'] ?? 'WPSKLoc';
		// Strip .js suffix to derive the WP script handle.
		$handle = substr( $deps_bundle, 0, -3 );

		wpsk_enqueue_bundle_script( $deps_bundle );

		// Localize using the configured var name so that
		// @wpsk/utils/localize (which may have the name define-injected
		// or fallback) can find the payload under the right global.
		wp_localize_script(
			$handle,
			$loc_var,
			wpsk_get_localize_data()
		);

		// Default stylesheet (hashed cache-bust via the .asset.php).
		wpsk_enqueue_stylesheet( 'style.css' );
	}
}
