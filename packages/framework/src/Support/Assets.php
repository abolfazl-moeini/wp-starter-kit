<?php
namespace WPDev\Support;

/**
 * Asset loading helpers for wp-starter-kit — the PSR-4 successor to the
 * theme-based `wpdev_*` functions in `includes/asset-functions.php`.
 *
 * The original helpers read paths from the active theme's directory
 * because wp-starter-kit historically shipped as a parent theme. It is
 * now a plugin (installable into `wp-content/plugins/`), so this class
 * resolves paths through `plugin_dir_path()` / `plugins_url()` instead.
 *
 * Two changes from the legacy helpers:
 *  - Path resolution is plugin-based, not theme-based.
 *  - `enqueue_bundle_script()` now wires `wp_set_script_translations()`
 *    so localized strings work out of the box. The legacy `wpdev_`
 *    helpers did not — that gap is what plan.v2.md flagged.
 *
 * @package wp-starter-kit
 */
final class Assets {

	/**
	 * Plugin-side base paths for asset files.
	 *
	 * Returned shape:
	 *   base_path : filesystem root of the plugin (trailing slash, from
	 *               `plugin_dir_path()`).
	 *   base_url  : public URL prefix of the plugin (trailing slash, from
	 *               `plugins_url('')`).
	 *
	 * @return array{base_path: string, base_url: string}
	 */
	public static function resolve_paths(): array {
		// __FILE__ resolves to src/Support/Assets.php inside the plugin;
		// plugin_dir_path() strips the file path and returns the plugin
		// root with a trailing slash — that is what we want for base_path.
		$base_path = plugin_dir_path( __FILE__ );

		// plugins_url('') returns the plugin's public URL prefix with a
		// trailing slash, e.g. http://example.test/wp-content/plugins/wp-starter-kit/.
		$base_url = plugins_url( '' );

		return [
			'base_path' => $base_path,
			'base_url'  => $base_url,
		];
	}

	/**
	 * Read the companion `.asset.php` sidecar for a `.js`/`.css` file and
	 * return its array shape. Mirrors the legacy `wpdev_asset_info()`
	 * contract: returns `[]` when the path is not `.js`/`.css` or when
	 * the sidecar does not exist.
	 *
	 * @param string $rel_path Absolute or plugin-relative path to a `.js`/`.css` file.
	 * @return array<string, mixed>
	 */
	public static function asset_info( string $rel_path ): array {
		if ( ! preg_match( '#(.+)\.(?:js|css)$#', $rel_path, $match )) {
			return [];
		}

		$asset_file = $match[1] . '.asset.php';

		if ( ! file_exists( $asset_file )) {
			return [];
		}

		$data = include $asset_file;

		return is_array( $data ) ? $data : [];
	}

	/**
	 * Enqueue a bundle JS file using the asset sidecar for cache-busting,
	 * dependency merging, and (new) translation loading.
	 *
	 * The signature is `(handle, rel_path, extra_deps)` so callers can use
	 * a stable WP handle independently of the file name — unlike the
	 * legacy `wpdev_enqueue_bundle_script` which derived the handle from
	 * the file basename. The new contract is required to align with
	 * `wp_register_script()` + `wp_enqueue_script()` + the
	 * `wp_set_script_translations()` gap fix.
	 *
	 * @param string $handle     WP script handle.
	 * @param string $rel_path   Path to the `.js` file (absolute or
	 *                           plugin-relative).
	 * @param array  $extra_deps Extra WP-script handles to merge with the
	 *                           sidecar's `dependencies`.
	 * @return bool              `true` once the script is registered and
	 *                           enqueued.
	 */
	public static function register_bundle_script(
		string $handle,
		string $rel_path,
		array $extra_deps = []
	): bool {
		$info    = self::asset_info( $rel_path );
		$version = $info['hash'] ?? false;
		$deps    = array_merge( $extra_deps, $info['dependencies'] ?? [] );

		$url = self::resolve_asset_url( $rel_path );
		if ($version) {
			$url = add_query_arg( 'id', $version, $url );
		}

		wp_register_script( $handle, $url, $deps, $version, true );

		$config = self::read_project_config();
		$domain = $config['textDomain'] ?? 'default';

		$paths             = self::resolve_paths();
		$asset_dir         = self::guess_translations_dir_for( $rel_path, $paths['base_path'] );
		$translations_path = '' !== $asset_dir
			? $asset_dir
			: rtrim( $paths['base_path'], '/\\' ) . '/languages';

		wp_set_script_translations( $handle, $domain, $translations_path );

		return true;
	}

	/**
	 * Enqueue a bundle JS file. When `$rel_path` is omitted, the handle must
	 * already be registered via {@see self::register_bundle_script()}.
	 *
	 * @param string $handle     WP script handle.
	 * @param string $rel_path   Path to the `.js` file, or empty to enqueue only.
	 * @param array  $extra_deps Extra WP-script handles (register path only).
	 * @return bool              `true` once the script is enqueued.
	 */
	public static function enqueue_bundle_script(
		string $handle,
		string $rel_path = '',
		array $extra_deps = []
	): bool {
		if ( '' !== $rel_path ) {
			self::register_bundle_script( $handle, $rel_path, $extra_deps );
		}

		wp_enqueue_script( $handle );

		return true;
	}

	/**
	 * Enqueue a bundle CSS file using the asset sidecar for cache-busting
	 * and dependency merging.
	 *
	 * @param string $handle     WP style handle.
	 * @param string $rel_path   Path to the `.css` file.
	 * @param array  $extra_deps Extra WP-style handles to merge with the
	 *                           sidecar's `dependencies`.
	 * @return bool              `true` once the style is registered and
	 *                           enqueued.
	 */
	public static function enqueue_bundle_style(
		string $handle,
		string $rel_path,
		array $extra_deps = []
	): bool {
		$info    = self::asset_info( $rel_path );
		$version = $info['hash'] ?? false;
		$deps    = array_merge( $extra_deps, $info['dependencies'] ?? [] );

		$url = self::resolve_asset_url( $rel_path );
		if ($version) {
			$url = add_query_arg( 'id', $version, $url );
		}

		wp_register_style( $handle, $url, $deps, $version );
		wp_enqueue_style( $handle );

		return true;
	}

	/**
	 * Build the localize payload (shape consumed by `@wpdev/utils/localize.js`).
	 *
	 * Shape:
	 *   api   => ['url' => ..., 'nonce' => ...]   standard WP REST namespace
	 *   api_x => ['url' => ..., 'nonce' => ...]   secondary API (Laravel proxy)
	 *
	 * @return array<string, array{url: string, nonce: string}>
	 */
	public static function get_localize_data(): array {
		$config      = self::read_project_config();
		$slug        = $config['slug'] ?? 'wpdev-starter';
		$hook_prefix = $config['hookPrefix'] ?? 'wpdev';

		return [
			'api'   => [
				'url'   => sanitize_url( rest_url() ),
				'nonce' => wp_create_nonce( 'wp_rest' ),
			],
			'api_x' => [
				'url'   => sanitize_url( rest_url( $slug . '/v1/' ) ),
				'nonce' => wp_create_nonce( $hook_prefix . '_rest' ),
			],
		];
	}

	/**
	 * Load `project.config.json` from the plugin root (cached per request).
	 *
	 * Reads the file that lives next to `wpdev-starter.php` (i.e. the
	 * plugin's own root), NOT a theme directory. This is the plugin
	 * equivalent of the legacy `wpdev_read_project_config()` and must
	 * read from the plugin root so the localize data and translation
	 * domain stay in sync with the project.
	 *
	 * @return array<string, mixed>
	 */
	public static function read_project_config(): array {
		static $cache = null;

		if (null !== $cache) {
			return $cache;
		}

		$paths       = self::resolve_paths();
		$config_path = rtrim( $paths['base_path'], '/\\' ) . '/project.config.json';

		if ( ! is_readable( $config_path )) {
			$cache = [];
			return $cache;
		}

        // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- reading a local JSON config, not a remote URL.
		$decoded = json_decode( (string) file_get_contents( $config_path ), true );
		$cache   = is_array( $decoded ) ? $decoded : [];

		return $cache;
	}

	// ------------------------------------------------------------------
	// Legacy shims — preserve the original wpdev_* function contracts so
	// existing call-sites (and the legacy AssetFunctionsTest, EnqueueTest,
	// LocalizeTest suites) keep working unchanged. The new front door is
	// `enqueue_bundle_script()` / `enqueue_bundle_style()` above.
	// ------------------------------------------------------------------

	/**
	 * Legacy shim for `wpdev_enqueue_bundle_script_at()` — the test seam
	 * the old `wpdev_*` functions used. Derives the handle from the file
	 * basename and calls `wp_enqueue_script()` directly (no `register`,
	 * no `wp_set_script_translations()`).
	 *
	 * @param string $abs_path   Absolute path to the JS file.
	 * @param array  $extra_deps Extra WP-script handles to merge into deps.
	 * @return bool              `true` once the script is enqueued.
	 */
	public static function enqueue_legacy_bundle_script( string $abs_path, array $extra_deps = [] ): bool {
		$handle  = substr( basename( $abs_path ), 0, -3 ); // strip ".js".
		$info    = self::asset_info( $abs_path );
		$version = $info['hash'] ?? false;
		$deps    = array_merge( $extra_deps, $info['dependencies'] ?? [] );

		$url = self::resolve_asset_url( $abs_path );
		if ($version) {
			$url = add_query_arg( 'id', $version, $url );
		}

		wp_enqueue_script( $handle, $url, $deps, $version, true );

		return true;
	}

	/**
	 * Legacy shim for `wpdev_enqueue_bundle_style_at()` — the test seam
	 * the old `wpdev_*` functions used. Derives the handle from the file
	 * basename and calls `wp_enqueue_style()` directly.
	 *
	 * @param string $abs_path   Absolute path to the CSS file.
	 * @param array  $extra_deps Extra WP-style handles to merge into deps.
	 * @return bool              `true` once the style is enqueued.
	 */
	public static function enqueue_legacy_bundle_style( string $abs_path, array $extra_deps = [] ): bool {
		$handle  = substr( basename( $abs_path ), 0, -4 ); // strip ".css".
		$info    = self::asset_info( $abs_path );
		$version = $info['hash'] ?? false;
		$deps    = array_merge( $extra_deps, $info['dependencies'] ?? [] );

		$url = self::resolve_asset_url( $abs_path );
		if ($version) {
			$url = add_query_arg( 'id', $version, $url );
		}

		wp_enqueue_style( $handle, $url, $deps, $version );

		return true;
	}

	// ------------------------------------------------------------------
	// Internals
	// ------------------------------------------------------------------

	/**
	 * Map an absolute filesystem path to a public URL relative to the
	 * plugin root. Mirrors the legacy `wpdev_resolve_asset_url()` shape:
	 * if the file lives inside the plugin root, the relative subpath is
	 * preserved; otherwise fall back to a basename URL through
	 * `plugins_url()`.
	 *
	 * @param string $abs_path Absolute filesystem path to a `.js`/`.css` file.
	 * @return string
	 */
	private static function resolve_asset_url( string $abs_path ): string {
		$paths     = self::resolve_paths();
		$base_path = rtrim( $paths['base_path'], '/\\' );
		$base_url  = $paths['base_url'];

		$real_abs  = realpath( $abs_path );
		$real_root = realpath( $base_path );

		if ($real_abs && $real_root && strpos( $real_abs, $real_root ) === 0) {
			$relative = ltrim( substr( $real_abs, strlen( $real_root ) ), '/' );
			return $base_url . $relative;
		}

		// File not on disk OR outside the plugin root — caller must decide.
		// Returning '' makes the failure mode explicit; the previous
		// guess-the-subdir fallback silently produced 404 URLs for any
		// file under a non-bundles subdir (assets/stylesheets/, etc).
		return '';
	}

	/**
	 * Best-effort guess at a `wp_set_script_translations()`-compatible
	 * path for a bundle file. Looks for a sibling `languages/` directory
	 * next to the file; falls back to the plugin-root `languages/`
	 * directory when the file is outside the plugin (e.g. inside a
	 * test temp dir).
	 *
	 * @param string $abs_path  Absolute path to the bundle file.
	 * @param string $base_path Plugin root filesystem path (trailing slash optional).
	 * @return string Absolute path to a translations directory, or '' when none found.
	 */
	private static function guess_translations_dir_for(
		string $abs_path,
		string $base_path
	): string {
		$dir = dirname( $abs_path );
		if (is_dir( $dir . '/languages' )) {
			return $dir . '/languages';
		}

		$real_dir  = realpath( $dir );
		$real_root = realpath( rtrim( $base_path, '/\\' ) );
		if ($real_dir && $real_root && strpos( $real_dir, $real_root ) === 0) {
			// Walk up until we find a `languages` directory inside the plugin.
			$candidate = $real_root . '/languages';
			if (is_dir( $candidate )) {
				return $candidate;
			}
		}

		return '';
	}
}
