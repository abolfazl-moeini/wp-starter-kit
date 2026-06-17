<?php
/**
 * Global asset helper functions for wp-starter-kit consumers.
 *
 * The implementation delegates to `WPDev\Support\Assets` (PSR-4) so the kit
 * resolves paths through plugin APIs instead of theme directory helpers.
 *
 * Canonical names use the `wpdev_*` prefix. The legacy `wpsk_*` names at the
 * bottom of this file are thin BC shims for one release cycle.
 *
 * @package wp-starter-kit
 */

if ( ! function_exists( 'wpdev_read_project_config' ) ) {
	/**
	 * Read `project.config.json` through the Assets helper.
	 *
	 * @return array<string, mixed>
	 */
	function wpdev_read_project_config() {
		return WPDev\Support\Assets::read_project_config();
	}
}

if ( ! function_exists( 'wpdev_resolve_asset_url' ) ) {
	/**
	 * Resolve a bundle file path to a public URL under the plugin root.
	 *
	 * @param string $abs_path Absolute filesystem path to a `.js`/`.css` file.
	 * @return string Public URL of the asset, or `''` when unresolved.
	 */
	function wpdev_resolve_asset_url( $abs_path ) {
		$paths     = WPDev\Support\Assets::resolve_paths();
		$base_path = rtrim( $paths['base_path'], '/\\' );
		$base_url  = $paths['base_url'];

		$real_abs  = realpath( $abs_path );
		$real_root = realpath( $base_path );

		if ( $real_abs && $real_root && strpos( $real_abs, $real_root ) === 0 ) {
			$relative = ltrim( substr( $real_abs, strlen( $real_root ) ), '/' );
			return $base_url . $relative;
		}

		return '';
	}
}

if ( ! function_exists( 'wpdev_asset_info' ) ) {
	/**
	 * Read the companion `.asset.php` metadata for a bundle file.
	 *
	 * @param string $file_path Absolute or relative path to a `.js`/`.css` file.
	 * @return array
	 */
	function wpdev_asset_info( $file_path ) {
		return WPDev\Support\Assets::asset_info( $file_path );
	}
}

if ( ! function_exists( 'wpdev_bundle_file_path' ) ) {
	/**
	 * Theme-based bundle path (legacy theme-mode contract).
	 *
	 * @param string $file_name Bundle file name (e.g. `wpdev-starter-deps.js`).
	 * @return string
	 */
	function wpdev_bundle_file_path( $file_name ) {
		return untrailingslashit( get_template_directory() ) . '/assets/bundles/' . $file_name;
	}
}

if ( ! function_exists( 'wpdev_bundle_file_url' ) ) {
	/**
	 * Theme-based bundle URL (legacy theme-mode contract).
	 *
	 * @param string $file_name Bundle file name (e.g. `wpdev-starter-deps.js`).
	 * @return string
	 */
	function wpdev_bundle_file_url( $file_name ) {
		return untrailingslashit( get_template_directory_uri() ) . '/assets/bundles/' . $file_name;
	}
}

if ( ! function_exists( 'wpdev_enqueue_bundle_script' ) ) {
	/**
	 * Enqueue a JS bundle from the theme `assets/bundles/` directory.
	 *
	 * @param string $file_name  JS file name.
	 * @param array  $extra_deps Extra WP-script handles.
	 * @return bool
	 */
	function wpdev_enqueue_bundle_script( $file_name, $extra_deps = [] ) {
		return WPDev\Support\Assets::enqueue_legacy_bundle_script(
			wpdev_bundle_file_path( $file_name ),
			$extra_deps
		);
	}
}

if ( ! function_exists( 'wpdev_enqueue_bundle_script_at' ) ) {
	/**
	 * Enqueue a JS bundle from an absolute filesystem path.
	 *
	 * @param string $abs_path   Absolute path to the JS file.
	 * @param array  $extra_deps Extra WP-script handles.
	 * @return bool
	 */
	function wpdev_enqueue_bundle_script_at( $abs_path, $extra_deps = [] ) {
		return WPDev\Support\Assets::enqueue_legacy_bundle_script( $abs_path, $extra_deps );
	}
}

if ( ! function_exists( 'wpdev_enqueue_bundle_style' ) ) {
	/**
	 * Enqueue a CSS bundle from the theme `assets/bundles/` directory.
	 *
	 * @param string $file_name  CSS file name.
	 * @param array  $extra_deps Extra WP-style handles.
	 * @return bool
	 */
	function wpdev_enqueue_bundle_style( $file_name, $extra_deps = [] ) {
		return WPDev\Support\Assets::enqueue_legacy_bundle_style(
			wpdev_bundle_file_path( $file_name ),
			$extra_deps
		);
	}
}

if ( ! function_exists( 'wpdev_enqueue_bundle_style_at' ) ) {
	/**
	 * Enqueue a CSS bundle from an absolute filesystem path.
	 *
	 * @param string $abs_path   Absolute path to the CSS file.
	 * @param array  $extra_deps Extra WP-style handles.
	 * @return bool
	 */
	function wpdev_enqueue_bundle_style_at( $abs_path, $extra_deps = [] ) {
		return WPDev\Support\Assets::enqueue_legacy_bundle_style( $abs_path, $extra_deps );
	}
}

if ( ! function_exists( 'wpdev_enqueue_stylesheet' ) ) {
	/**
	 * Enqueue a global stylesheet from `assets/stylesheets/`.
	 *
	 * @param string $file_name  CSS file name (e.g. `style.css`).
	 * @param array  $extra_deps Extra WP-style handles.
	 * @return bool
	 */
	function wpdev_enqueue_stylesheet( $file_name, $extra_deps = [] ) {
		$plugin_path = function_exists( 'plugin_dir_path' )
			? rtrim( plugin_dir_path( __FILE__ ), '/\\' ) . '/assets/stylesheets/' . $file_name
			: '';

		$resolved_plugin = '' !== $plugin_path ? realpath( $plugin_path ) : false;
		$plugin_root     = function_exists( 'plugin_dir_path' )
			? realpath( rtrim( plugin_dir_path( __FILE__ ), '/\\' ) )
			: false;

		$abs_path = ( $resolved_plugin && $plugin_root && strpos( $resolved_plugin, $plugin_root ) === 0 )
			? $resolved_plugin
			: wpdev_stylesheet_file_path( $file_name );

		return WPDev\Support\Assets::enqueue_legacy_bundle_style( $abs_path, $extra_deps );
	}
}

/**
 * Base directory for stylesheet resolution (plugin dir or active theme).
 *
 * @return string
 */
function wpdev_stylesheet_base_dir(): string {
	if ( defined( 'WPDEV_STARTER_PLUGIN_DIR' ) ) {
		return untrailingslashit( WPDEV_STARTER_PLUGIN_DIR );
	}
	return untrailingslashit( get_template_directory() );
}

if ( ! function_exists( 'wpdev_stylesheet_file_path' ) ) {
	/**
	 * Filesystem path to a stylesheet under `assets/stylesheets/`.
	 *
	 * @param string $file_name Stylesheet file name (e.g. `style.css`).
	 * @return string
	 */
	function wpdev_stylesheet_file_path( $file_name ) {
		return wpdev_stylesheet_base_dir() . '/assets/stylesheets/' . $file_name;
	}
}

if ( ! function_exists( 'wpdev_stylesheet_file_url' ) ) {
	/**
	 * Public URL for a stylesheet under `assets/stylesheets/`.
	 *
	 * @param string $file_name Stylesheet file name (e.g. `style.css`).
	 * @return string
	 */
	function wpdev_stylesheet_file_url( $file_name ) {
		if ( defined( 'WPDEV_STARTER_PLUGIN_DIR' ) && defined( 'WPDEV_STARTER_PLUGIN_URL' ) ) {
			return untrailingslashit( WPDEV_STARTER_PLUGIN_URL ) . '/assets/stylesheets/' . $file_name;
		}
		return untrailingslashit( get_template_directory_uri() ) . '/assets/stylesheets/' . $file_name;
	}
}

if ( ! function_exists( 'wpdev_get_localize_data' ) ) {
	/**
	 * Build the localize payload for the deps bundle.
	 *
	 * @return array
	 */
	function wpdev_get_localize_data() {
		return WPDev\Support\Assets::get_localize_data();
	}
}
