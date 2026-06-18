<?php
/**
 * Module-scoped asset helpers.
 *
 * @package WPDevFramework\Core
 * @since   2.5.0
 */

defined( 'ABSPATH' ) || exit;

use WPDevFramework\Core\Module_Loader;

/**
 * Normalize a filesystem path for cross-platform comparisons.
 *
 * @since 2.8.2
 *
 * @param string $path Path.
 * @return string
 */
function wpdev_normalize_path( $path ) {

	if ( function_exists( 'wp_normalize_path' ) ) {
		return wp_normalize_path( (string) $path );
	}

	return str_replace( '\\', '/', (string) $path );

} // end wpdev_normalize_path;

/**
 * Whether a path is the same as or nested under a root directory.
 *
 * @since 2.8.2
 *
 * @param string $path Candidate path.
 * @param string $root Root directory.
 * @return bool
 */
function wpdev_path_is_within( $path, $root ) {

	$path = wpdev_normalize_path( $path );
	$root = wpdev_normalize_path( rtrim( (string) $root, '/\\' ) );

	return $path === $root || str_starts_with( $path, $root . '/' );

} // end wpdev_path_is_within;

/**
 * Return URL for a module asset, falling back to plugin assets/.
 *
 * @since 2.5.0
 *
 * @param string $module_id  Module slug (e.g. table-builder).
 * @param string $asset      File name (e.g. list-tables.js).
 * @param string $assets_dir Subdirectory under assets/ (js, css, img).
 * @return string
 */
function wpdev_get_module_asset_url( $module_id, $asset, $assets_dir = 'js' ) {

	if ( ! defined( 'SCRIPT_DEBUG' ) || ! SCRIPT_DEBUG ) {
		$asset = preg_replace( '/(?<!\.min)(\.js|\.css)/', '.min$1', (string) $asset );
	}

	$modules = Module_Loader::all();

	if ( empty( $modules[ $module_id ]['path'] ) ) {
		return wpdev_get_asset( $asset, $assets_dir );
	}

	$module_root = wpdev_normalize_path( rtrim( (string) $modules[ $module_id ]['path'], '/\\' ) );
	$base_dir    = $module_root . '/assets/' . $assets_dir . '/';
	$file        = $base_dir . $asset;

	if ( ! is_readable( $file ) && str_contains( $asset, '.min.' ) ) {
		$file = $base_dir . str_replace( '.min.', '.', $asset );
	}

	if ( ! is_readable( $file ) ) {
		return wpdev_get_asset( $asset, $assets_dir );
	}

	$file_norm   = wpdev_normalize_path( $file );
	$plugin_root = wpdev_normalize_path(
		rtrim( defined( 'WPDEV_PLUGIN_DIR' ) ? WPDEV_PLUGIN_DIR : wpdev_path( '' ), '/\\' )
	);

	if ( wpdev_path_is_within( $module_root, $plugin_root ) ) {
		$relative = ltrim( substr( $file_norm, strlen( $plugin_root ) ), '/' );

		return wpdev_url( $relative );
	}

	$relative_from_module = ltrim( substr( $file_norm, strlen( $module_root ) ), '/' );
	$setup                = $module_root . '/setup.php';
	$url                  = '';

	if ( is_readable( $setup ) && function_exists( 'plugins_url' ) ) {
		$url = plugins_url( $relative_from_module, $setup );
	}

	/**
	 * Filter module asset URL when the module root lives outside the framework plugin.
	 *
	 * @since 2.8.2
	 *
	 * @param string $url         Resolved URL (may be empty).
	 * @param string $module_id   Module id.
	 * @param string $relative    Path relative to module root.
	 * @param string $module_root Absolute module root path.
	 */
	return apply_filters( 'wpdev_module_asset_url', $url, $module_id, $relative_from_module, $module_root );

} // end wpdev_get_module_asset_url;

/**
 * Register or enqueue a script from a module assets directory.
 *
 * @since 2.5.0
 *
 * @param string $module_id      Module slug.
 * @param string $handle         Script handle.
 * @param string $asset          File name under assets/js/.
 * @param array  $deps           Script dependencies.
 * @param bool   $enqueue        True to enqueue; false to register only.
 * @return void
 */
function wpdev_enqueue_module_script( $module_id, $handle, $asset, $deps = array(), $enqueue = false ) {

	$src = wpdev_get_module_asset_url( $module_id, $asset, 'js' );

	if ( ! wp_script_is( $handle, 'registered' ) ) {
		wp_register_script( $handle, $src, $deps, wpdev_get_version() );
	}

	if ( $enqueue ) {
		wp_enqueue_script( $handle );
	}

} // end wpdev_enqueue_module_script;

/**
 * Register a module views directory for template resolution.
 *
 * @since 2.5.0
 *
 * @param string      $module_id Module slug.
 * @param string|null $path      Optional absolute views root.
 * @return void
 */
function wpdev_register_module_views( $module_id, $path = null ) {

	\WPDevFramework\Core\Module_View_Registry::register( $module_id, $path );

} // end wpdev_register_module_views;

/**
 * Return the license gate implementation.
 *
 * @since 2.5.0
 *
 * @return \WPDevFramework\Core\Contracts\License_Gate
 */
function wpdev_license_gate() {

	/**
	 * Filter the license gate instance.
	 *
	 * @since 2.5.0
	 *
	 * @param \WPDevFramework\Core\Contracts\License_Gate $gate Default License singleton.
	 */
	return apply_filters( 'wpdev_license_gate', \WPDevFramework\License::get_instance() );

} // end wpdev_license_gate;
