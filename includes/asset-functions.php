<?php
/**
 * Asset helper functions for wp-starter-kit.
 *
 * Ported from mrlogistic/functions.php (the `ml_*` family). The prefix is
 * scaffold-generated from `project.config.json -> phpFunctionPrefix`
 * (currently `wpsk_`). At a future release we may read the config at boot
 * and rename; for now the prefix is hardcoded to match the seeded
 * `project.config.json` (`wpsk_`).
 *
 * Helpers in this file:
 *   - wpsk_asset_info(string $file_path): array
 *   - wpsk_bundle_file_path(string $file_name): string
 *   - wpsk_bundle_file_url(string $file_name): string
 *   - wpsk_enqueue_bundle_script(string $file_name, array $extra_deps = []): bool
 *   - wpsk_enqueue_bundle_style(string $file_name, array $extra_deps = []): bool
 *   - wpsk_get_localize_data(): array
 *
 * @package wp-starter-kit
 */

if ( ! function_exists( 'wpsk_asset_info' ) ) {
	/**
	 * Read the companion `.asset.php` file for a JS or CSS asset and return
	 * its array shape (typically `['dependencies' => [...], 'hash' => '...',
	 * 'internal_packages' => [...]]`).
	 *
	 * Returns `[]` when the path does not end in `.js`/`.css`, or when the
	 * companion file does not exist. The mrlogistic `ml_asset_info` returns
	 * `[]` in both cases and we preserve that contract.
	 *
	 * @param string $file_path Absolute or relative path to a `.js`/`.css` file.
	 * @return array
	 */
	function wpsk_asset_info( $file_path ) {
		if ( ! preg_match( '#(.+)\.(?:js|css)$#', $file_path, $match ) ) {
			return [];
		}

		$asset_file = $match[1] . '.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return [];
		}

		$data = include $asset_file;

		return is_array( $data ) ? $data : [];
	}
}

if ( ! function_exists( 'wpsk_bundle_file_path' ) ) {
	/**
	 * Resolve the absolute filesystem path of a bundle file under
	 * `<theme>/assets/bundles/`.
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
	 * Resolve the public URL of a bundle file under
	 * `<theme-uri>/assets/bundles/`.
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
	 * Enqueue a bundle JS file using the asset file for cache-busting and
	 * dependency merging. The bundle handle is the file name without `.js`
	 * (e.g. `wpsk-starter-deps.js` -> handle `wpsk-starter-deps`).
	 *
	 * @param string $file_name  JS file name (e.g. `wpsk-starter-deps.js`).
	 * @param array  $extra_deps Extra WP-script handles to merge into deps.
	 * @return bool              `true` if the script was enqueued.
	 */
	function wpsk_enqueue_bundle_script( $file_name, $extra_deps = [] ) {
		return wpsk_enqueue_bundle_script_at(
			wpsk_bundle_file_path( $file_name ),
			$extra_deps
		);
	}
}

if ( ! function_exists( 'wpsk_enqueue_bundle_script_at' ) ) {
	/**
	 * Enqueue a bundle JS file given an absolute path. Test seam so unit
	 * tests can point at a temp dir without faking `get_template_directory`.
	 *
	 * @param string $abs_path   Absolute path to the JS file.
	 * @param array  $extra_deps Extra WP-script handles to merge into deps.
	 * @return bool              `true` if the script was enqueued.
	 */
	function wpsk_enqueue_bundle_script_at( $abs_path, $extra_deps = [] ) {
		$handle  = substr( basename( $abs_path ), 0, -3 ); // Strip ".js".
		$info    = wpsk_asset_info( $abs_path );
		$version = $info['hash'] ?? false;
		$deps    = array_merge( $extra_deps, $info['dependencies'] ?? [] );

		$url = wpsk_bundle_file_url( basename( $abs_path ) );
		if ( $version ) {
			$url = add_query_arg( 'id', $version, $url );
		}

		wp_enqueue_script( $handle, $url, $deps, $version, true );

		return true;
	}
}

if ( ! function_exists( 'wpsk_enqueue_bundle_style' ) ) {
	/**
	 * Enqueue a bundle CSS file using the asset file for cache-busting and
	 * dependency merging. The bundle handle is the file name without `.css`.
	 *
	 * @param string $file_name  CSS file name (e.g. `style.css`).
	 * @param array  $extra_deps Extra WP-style handles to merge into deps.
	 * @return bool              `true` if the style was enqueued.
	 */
	function wpsk_enqueue_bundle_style( $file_name, $extra_deps = [] ) {
		return wpsk_enqueue_bundle_style_at(
			wpsk_bundle_file_path( $file_name ),
			$extra_deps
		);
	}
}

if ( ! function_exists( 'wpsk_enqueue_bundle_style_at' ) ) {
	/**
	 * Enqueue a bundle CSS file given an absolute path. Test seam so unit
	 * tests can point at a temp dir without faking `get_template_directory`.
	 *
	 * @param string $abs_path   Absolute path to the CSS file.
	 * @param array  $extra_deps Extra WP-style handles to merge into deps.
	 * @return bool              `true` if the style was enqueued.
	 */
	function wpsk_enqueue_bundle_style_at( $abs_path, $extra_deps = [] ) {
		$handle  = substr( basename( $abs_path ), 0, -4 ); // Strip ".css".
		$info    = wpsk_asset_info( $abs_path );
		$version = $info['hash'] ?? false;
		$deps    = array_merge( $extra_deps, $info['dependencies'] ?? [] );

		$url = wpsk_bundle_file_url( basename( $abs_path ) );
		if ( $version ) {
			$url = add_query_arg( 'id', $version, $url );
		}

		wp_enqueue_style( $handle, $url, $deps, $version );

		return true;
	}
}

if ( ! function_exists( 'wpsk_get_localize_data' ) ) {
	/**
	 * Build the localize payload (shape consumed by `@wpsk/utils/localize.js`
	 * via `localize.get('api.url')` and friends).
	 *
	 * Shape:
	 *   [
	 *     'api'   => array( 'url' => ..., 'nonce' => ... ),
	 *     'api_x' => array( 'url' => ..., 'nonce' => ... ),
	 *   ]
	 *
	 * `api` is the standard WP REST namespace (`/wp-json/`). `api_x` is the
	 * secondary API (Laravel proxy, custom endpoint). Both nonces match the
	 * mrlogistic contract used by `rest-utils` on the JS side.
	 *
	 * @return array
	 */
	function wpsk_get_localize_data() {
		return [
			'api'   => [
				'url'   => sanitize_url( rest_url() ),
				'nonce' => wp_create_nonce( 'wp_rest' ),
			],
			'api_x' => [
				'url'   => sanitize_url( rest_url( 'wpsk-starter/v1/' ) ),
				'nonce' => wp_create_nonce( 'wpsk_rest' ),
			],
		];
	}
}
