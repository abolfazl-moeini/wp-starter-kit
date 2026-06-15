<?php
declare(strict_types=1);

namespace WPSK\Core;

// phpcs:disable WordPress.Files.FileName.NotHyphenatedLowercase
// phpcs:disable WordPress.Files.FileName.InvalidClassFileName
// PSR-4 autoload (`WPSK\\` => `src/`) maps `WPSK\Core\Plugin` to
// `Plugin.php` exactly. The WPCS FileName rules would require
// `class-plugin.php` (PSR-4 cannot resolve that), so they are
// disabled locally for this one file. The other WPCS rules still
// apply — see the rest of this file for snake_case / yoda /
// escaping / docblock compliance.

/**
 * Static facade for the wp-starter-kit plugin.
 *
 * Responsibilities:
 *  - Locate and cache the project configuration JSON
 *    (`project.config.json` in the plugin root).
 *  - Hold a single {@see ModuleLoader} instance for the lifetime of
 *    the request / CLI run / unit test.
 *  - Hook into WordPress at `plugins_loaded` (or `init` if the
 *    earlier hook is unavailable) at priority 10.
 *  - Fire the `{$hook_prefix}_plugin_loaded` action so feature
 *    modules and third-party code can run after the plugin is up.
 *
 * The class is intentionally theme-agnostic: every path it
 * resolves is anchored to the *plugin* root (the directory that
 * contains this file's parent's parent), never to the active
 * theme directory.
 */
final class Plugin {

	/**
	 * Singleton instance. `null` until {@see Plugin::boot()} runs.
	 *
	 * @var Plugin|null
	 */
	private static ?self $instance = null;

	/**
	 * Module loader that owns every registered feature module.
	 *
	 * @var ModuleLoader|null
	 */
	private static ?ModuleLoader $loader = null;

	/**
	 * Override path for `project.config.json`. Resolved at boot
	 * time and cached for the rest of the request.
	 *
	 * @var string|null
	 */
	private static ?string $config_path = null;

	/**
	 * Parsed contents of `project.config.json`.
	 *
	 * @var array<string,mixed>|null
	 */
	private static ?array $config_cache = null;

	/**
	 * The hook name fired by {@see Plugin::boot()}. Stored on the
	 * instance so tests can observe what would have been passed to
	 * `do_action()` without having to spy on the global WordPress
	 * function (which is a no-op in the project's test bootstrap).
	 *
	 * @var string|null
	 */
	private static ?string $last_hook = null;

	/**
	 * Whether {@see Plugin::boot()} has run in this process.
	 *
	 * @var bool
	 */
	private static bool $booted = false;

	/**
	 * Disable instantiation — the class is used statically.
	 */
	private function __construct() {
	}

	/**
	 * Boot the plugin.
	 *
	 * Idempotent: a second call is a no-op. When the test bootstrap
	 * provides `add_action()` and `do_action()` shims, the loader
	 * is wired into WordPress; otherwise the loader is initialised
	 * and the `plugin_loaded` hook is recorded for later inspection.
	 *
	 * @param string|null $config_path Optional override for the
	 *                                 project.config.json location.
	 *                                 Production code lets this be
	 *                                 null and the file is resolved
	 *                                 from the plugin root.
	 *
	 * @throws \RuntimeException When project.config.json cannot be
	 *                           located or read.
	 */
	public static function boot( ?string $config_path = null ): void {
		if ( true === self::$booted ) {
			return;
		}

		$config     = self::config( $config_path );
		$hook_prefix = isset( $config['hookPrefix'] ) && is_string( $config['hookPrefix'] )
			? $config['hookPrefix']
			: 'wpsk';

		// When boot() is called with an explicit config path, the
		// config() helper does not cache (it treats the path as a
		// one-off read). Cache the result explicitly so other
		// observers (e.g. Plugin::loaded_config()) can read it back
		// without re-parsing the file.
		if ( null !== $config_path ) {
			self::$config_cache = $config;
		}

		self::$loader    = new ModuleLoader( $hook_prefix );
		self::$instance  = new self();
		self::$booted    = true;
		self::$last_hook = $hook_prefix . '_plugin_loaded';

		// Wire into WordPress. add_action is a no-op shim in the
		// project's test bootstrap, so this is safe in unit tests.
		if ( function_exists( 'add_action' ) ) {
			\add_action( 'plugins_loaded', array( self::class, 'on_plugins_loaded' ), 10, 0 );
			\add_action( 'init', array( self::class, 'on_plugins_loaded' ), 10, 0 );
		}

		if ( function_exists( 'do_action' ) ) {
			\do_action( self::$last_hook );
		}
	}

	/**
	 * Hook target registered on `plugins_loaded` / `init`. Boot all
	 * registered modules and fire the `_modules_loaded` action.
	 */
	public static function on_plugins_loaded(): void {
		if ( null === self::$loader ) {
			return;
		}
		self::$loader->boot_all();
	}

	/**
	 * Return the module loader, creating it on demand if {@see
	 * Plugin::boot()} has not run yet. Useful for code that needs
	 * to register a module before boot() finishes.
	 */
	/**
	 * Test seam / optional accessor for the booted singleton.
	 *
	 * @return self|null
	 */
	public static function instance(): ?self {
		return self::$instance;
	}

	public static function loader(): ModuleLoader {
		if ( null === self::$loader ) {
			self::$loader = new ModuleLoader( 'wpsk' );
		}
		return self::$loader;
	}

	/**
	 * Read and return `project.config.json` as an associative
	 * array. The file is resolved relative to the *plugin* root
	 * (the directory that contains `src/Core/Plugin.php`'s
	 * grandparent), never to the active theme.
	 *
	 * @param string|null $override_path Optional override path
	 *                                   for the config file.
	 *
	 * @return array<string,mixed>
	 *
	 * @throws \RuntimeException When the file is missing.
	 */
	public static function config( ?string $override_path = null ): array {
		if ( null !== self::$config_cache && null === $override_path ) {
			return self::$config_cache;
		}

		$path = $override_path ?? self::resolve_default_config_path();

		if ( ! is_file( $path ) || ! is_readable( $path ) ) {
			// The path is escaped before being placed in the user-
			// facing error message so the WPCS escape-output rule
			// is satisfied even though the string ends up in an
			// exception, not a render context.
			throw new \RuntimeException(
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
				sprintf( 'project.config.json not found at %s', $path )
			);
		}

		$raw = file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		if ( false === $raw ) {
			throw new \RuntimeException(
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
				sprintf( 'Failed to read project.config.json at %s', $path )
			);
		}

		$decoded = json_decode( $raw, true );
		if ( ! is_array( $decoded ) ) {
			throw new \RuntimeException(
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
				sprintf( 'project.config.json at %s did not decode as an object/array', $path )
			);
		}

		if ( null === $override_path ) {
			self::$config_cache = $decoded;
		}
		return $decoded;
	}

	/**
	 * Test seam: did {@see Plugin::boot()} run in this process?
	 *
	 * @return bool
	 */
	public static function is_booted(): bool {
		return self::$booted;
	}

	/**
	 * Test seam: the hook name Plugin::boot() would have fired.
	 *
	 * @return string|null
	 */
	public static function last_loaded_hook(): ?string {
		return self::$last_hook;
	}

	/**
	 * Test seam: the config that was loaded by the most recent
	 * call to {@see Plugin::boot()}.
	 *
	 * @return array<string,mixed>
	 */
	public static function loaded_config(): array {
		return self::$config_cache ?? array();
	}

	/**
	 * Reset all static state. Intended for test isolation only.
	 *
	 * @internal
	 */
	public static function reset_for_tests(): void {
		self::$instance     = null;
		self::$loader       = null;
		self::$config_path  = null;
		self::$config_cache = null;
		self::$last_hook    = null;
		self::$booted       = false;
	}

	/**
	 * Resolve the default `project.config.json` path from the
	 * plugin root. The file lives two directories up from this
	 * file: `src/Core/Plugin.php` → `src/` → plugin root.
	 */
	private static function resolve_default_config_path(): string {
		if ( null !== self::$config_path ) {
			return self::$config_path;
		}
		// __DIR__ === src/Core (this file lives there)
		// dirname(__DIR__, 2) === plugin root
		$plugin_root = dirname( __DIR__, 2 );
		return $plugin_root . '/project.config.json';
	}
}
