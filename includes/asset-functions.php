<?php
/**
 * BC shims for the asset helper functions originally defined here.
 *
 * The implementation moved to `src/Support/Assets.php` (PSR-4, namespace
 * `WPSK\Support\Assets`) so wp-starter-kit can be installed as a plugin
 * and resolve paths through `plugin_dir_path()` / `plugins_url()` instead
 * of `get_template_directory()`.
 *
 * The functions in this file are kept ONLY for backward compatibility
 * with existing call-sites. New code MUST call `WPSK\Support\Assets::`
 * directly. Each shim is a one-liner that delegates to the corresponding
 * static method on `WPSK\Support\Assets`.
 *
 * @package wp-starter-kit
 */

if ( ! function_exists( 'wpsk_read_project_config' ) ) {
	/**
	 * BC shim → `WPSK\Support\Assets::read_project_config()`.
	 *
	 * @return array<string, mixed>
	 */
	function wpsk_read_project_config() {
		return WPSK\Support\Assets::read_project_config();
	}
}

if ( ! function_exists( 'wpsk_resolve_asset_url' ) ) {
	/**
	 * BC shim — internal URL resolver used by the old `wpsk_*_at()`
	 * helpers. The new class exposes the same logic privately; this
	 * public shim preserves the function entry point for any direct
	 * callers in the wild.
	 *
	 * Contract mirrors the new class: returns the asset's public URL
	 * (relative to the plugin root) when the file resolves to a real
	 * path INSIDE the plugin, or an empty string when the file is
	 * missing or lives outside the plugin. The legacy fallback that
	 * synthesised a `plugins_url('assets/bundles/<basename>')` URL has
	 * been dropped — that guess is wrong for files under any subdir
	 * other than `assets/bundles/`.
	 *
	 * @param string $abs_path Absolute filesystem path to a `.js`/`.css` file.
	 * @return string Public URL of the asset, or `''` when the path
	 *                cannot be resolved to a URL we trust.
	 */
	function wpsk_resolve_asset_url( $abs_path ) {
		// Re-derive against the plugin base the new class uses.
		$paths     = WPSK\Support\Assets::resolve_paths();
		$base_path = rtrim( $paths['base_path'], '/\\' );
		$base_url  = $paths['base_url'];

		$real_abs  = realpath( $abs_path );
		$real_root = realpath( $base_path );

		if ( $real_abs && $real_root && strpos( $real_abs, $real_root ) === 0 ) {
			$relative = ltrim( substr( $real_abs, strlen( $real_root ) ), '/' );
			return $base_url . $relative;
		}

		// File not on disk OR outside the plugin root — caller must decide.
		return '';
	}
}

if ( ! function_exists( 'wpsk_asset_info' ) ) {
	/**
	 * BC shim → `WPSK\Support\Assets::asset_info()`.
	 *
	 * @param string $file_path Absolute or relative path to a `.js`/`.css` file.
	 * @return array
	 */
	function wpsk_asset_info( $file_path ) {
		return WPSK\Support\Assets::asset_info( $file_path );
	}
}

if ( ! function_exists( 'wpsk_bundle_file_path' ) ) {
	/**
	 * BC shim — bundle file path. **Preserved theme-based behaviour**
	 * so legacy `AssetFunctionsTest` keeps passing: the test asserts the
	 * path is `get_template_directory() . '/assets/bundles/...'` and
	 * that contract is load-bearing for existing themes that already
	 * rely on the function. New code should not call this.
	 *
	 * @param string $file_name Bundle file name (e.g. `wpsk-starter-deps.js`).
	 * @return string
	 */
	function wpsk_bundle_file_path( $file_name ) {
		return untrailingslashit( get_template_directory() ) . '/assets/bundles/' . $file_name;
	}
}

if ( ! function_exists( 'wpsk_bundle_file_url' ) ) {
	/**
	 * BC shim — bundle file URL. **Preserved theme-based behaviour**
	 * for the same reason as `wpsk_bundle_file_path()`.
	 *
	 * @param string $file_name Bundle file name (e.g. `wpsk-starter-deps.js`).
	 * @return string
	 */
	function wpsk_bundle_file_url( $file_name ) {
		return untrailingslashit( get_template_directory_uri() ) . '/assets/bundles/' . $file_name;
	}
}

if ( ! function_exists( 'wpsk_enqueue_bundle_script' ) ) {
	/**
	 * BC shim — resolves a bundle file name to its absolute path then
	 * forwards to `WPSK\Support\Assets::enqueue_legacy_bundle_script()`.
	 *
	 * @param string $file_name  JS file name (e.g. `wpsk-starter-deps.js`).
	 * @param array  $extra_deps Extra WP-script handles to merge into deps.
	 * @return bool              `true` if the script was enqueued.
	 */
	function wpsk_enqueue_bundle_script( $file_name, $extra_deps = [] ) {
		return WPSK\Support\Assets::enqueue_legacy_bundle_script(
			wpsk_bundle_file_path( $file_name ),
			$extra_deps
		);
	}
}

if ( ! function_exists( 'wpsk_enqueue_bundle_script_at' ) ) {
	/**
	 * BC shim — test seam for enqueuing a bundle JS file at an absolute path.
	 *
	 * @param string $abs_path   Absolute path to the JS file.
	 * @param array  $extra_deps Extra WP-script handles to merge into deps.
	 * @return bool              `true` if the script was enqueued.
	 */
	function wpsk_enqueue_bundle_script_at( $abs_path, $extra_deps = [] ) {
		return WPSK\Support\Assets::enqueue_legacy_bundle_script( $abs_path, $extra_deps );
	}
}

if ( ! function_exists( 'wpsk_enqueue_bundle_style' ) ) {
	/**
	 * BC shim — resolves a bundle file name to its absolute path then
	 * forwards to `WPSK\Support\Assets::enqueue_legacy_bundle_style()`.
	 *
	 * @param string $file_name  CSS file name (e.g. `style.css`).
	 * @param array  $extra_deps Extra WP-style handles to merge into deps.
	 * @return bool              `true` if the style was enqueued.
	 */
	function wpsk_enqueue_bundle_style( $file_name, $extra_deps = [] ) {
		return WPSK\Support\Assets::enqueue_legacy_bundle_style(
			wpsk_bundle_file_path( $file_name ),
			$extra_deps
		);
	}
}

if ( ! function_exists( 'wpsk_enqueue_bundle_style_at' ) ) {
	/**
	 * BC shim — test seam for enqueuing a bundle CSS file at an absolute path.
	 *
	 * @param string $abs_path   Absolute path to the CSS file.
	 * @param array  $extra_deps Extra WP-style handles to merge into deps.
	 * @return bool              `true` if the style was enqueued.
	 */
	function wpsk_enqueue_bundle_style_at( $abs_path, $extra_deps = [] ) {
		return WPSK\Support\Assets::enqueue_legacy_bundle_style( $abs_path, $extra_deps );
	}
}

if ( ! function_exists( 'wpsk_enqueue_stylesheet' ) ) {
	/**
	 * BC shim — enqueue a stylesheet, preferring the plugin location
	 * when the file lives inside the plugin (so a plugin-mode install
	 * resolves to the correct URL) and falling back to the theme
	 * location for backward compatibility with theme-based installs.
	 *
	 * Resolution order:
	 *   1. `plugin_dir_path() . '/assets/stylesheets/' . $file_name`
	 *      when that absolute path resolves to a real file inside the
	 *      plugin root. This is the wp-starter-kit-as-plugin case.
	 *   2. `get_template_directory() . '/assets/stylesheets/' . $file_name`
	 *      (the legacy behaviour, kept for theme-mode installs that
	 *      ship the stylesheet next to the active theme).
	 *
	 * @param string $file_name  CSS file name (e.g. `style.css`).
	 * @param array  $extra_deps Extra WP-style handles to merge into deps.
	 * @return bool              `true` if the style was enqueued.
	 */
	function wpsk_enqueue_stylesheet( $file_name, $extra_deps = [] ) {
		$plugin_path = function_exists( 'plugin_dir_path' )
			? rtrim( plugin_dir_path( __FILE__ ), '/\\' ) . '/assets/stylesheets/' . $file_name
			: '';

		// Resolve the plugin candidate against the plugin root to make
		// sure we're not fooled by a stray file at the candidate path
		// that lives outside the actual plugin. realpath() returns
		// false when the file is missing — short-circuit to the theme
		// fallback in that case.
		$resolved_plugin = $plugin_path !== '' ? realpath( $plugin_path ) : false;
		$plugin_root     = function_exists( 'plugin_dir_path' )
			? realpath( rtrim( plugin_dir_path( __FILE__ ), '/\\' ) )
			: false;

		$abs_path = ( $resolved_plugin && $plugin_root && strpos( $resolved_plugin, $plugin_root ) === 0 )
			? $resolved_plugin
			: wpsk_stylesheet_file_path( $file_name );

		return WPSK\Support\Assets::enqueue_legacy_bundle_style( $abs_path, $extra_deps );
	}
}

/**
 * Helper: resolve the stylesheet base directory.
 *
 * Returns the active theme's directory in the original theme-mode
 * flow (the legacy default), but switches to the plugin directory
 * when `WPSK_STARTER_PLUGIN_DIR` is defined. The plugin-mode path
 * lets a consumer keep `functions.php` (against the deprecation
 * notice at functions.php:24-47) without getting a broken
 * `<parent-theme>/assets/stylesheets/...` URL pointing at a
 * non-existent location.
 *
 * @return string
 */
function wpsk_stylesheet_base_dir(): string {
	if ( defined( 'WPSK_STARTER_PLUGIN_DIR' ) ) {
		return untrailingslashit( WPSK_STARTER_PLUGIN_DIR );
	}
	return untrailingslashit( get_template_directory() );
}

if ( ! function_exists( 'wpsk_stylesheet_file_path' ) ) {
	/**
	 * BC shim — stylesheet file path. **Preserved theme-based behaviour**
	 * for the same reason as `wpsk_bundle_file_path()`. Plugin-mode
	 * consumers should define `WPSK_STARTER_PLUGIN_DIR` to get the
	 * right base (see `wpsk_stylesheet_base_dir()`).
	 *
	 * @param string $file_name Stylesheet file name (e.g. `style.css`).
	 * @return string
	 */
	function wpsk_stylesheet_file_path( $file_name ) {
		return wpsk_stylesheet_base_dir() . '/assets/stylesheets/' . $file_name;
	}
}

if ( ! function_exists( 'wpsk_stylesheet_file_url' ) ) {
	/**
	 * BC shim — stylesheet file URL. Same plugin-mode switch as
	 * `wpsk_stylesheet_file_path()` — when `WPSK_STARTER_PLUGIN_DIR`
	 * is defined, the URL is built from the plugin's URL, not the
	 * active theme's URL.
	 *
	 * @param string $file_name Stylesheet file name (e.g. `style.css`).
	 * @return string
	 */
	function wpsk_stylesheet_file_url( $file_name ) {
		if ( defined( 'WPSK_STARTER_PLUGIN_DIR' ) && defined( 'WPSK_STARTER_PLUGIN_URL' ) ) {
			return untrailingslashit( WPSK_STARTER_PLUGIN_URL ) . '/assets/stylesheets/' . $file_name;
		}
		return untrailingslashit( get_template_directory_uri() ) . '/assets/stylesheets/' . $file_name;
	}
}

if ( ! function_exists( 'wpsk_get_localize_data' ) ) {
	/**
	 * BC shim → `WPSK\Support\Assets::get_localize_data()`.
	 *
	 * @return array
	 */
	function wpsk_get_localize_data() {
		return WPSK\Support\Assets::get_localize_data();
	}
}
