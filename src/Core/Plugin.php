<?php
declare(strict_types=1);

namespace WPSK\Core;

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
 *  - Fire the `{$hookPrefix}_plugin_loaded` action so feature
 *    modules and third-party code can run after the plugin is up.
 *
 * The class is intentionally theme-agnostic: every path it
 * resolves is anchored to the *plugin* root (the directory that
 * contains this file's parent's parent), never to the active
 * theme directory.
 */
final class Plugin
{
    /**
     * Singleton instance. `null` until {@see Plugin::boot()} runs.
     */
    private static ?self $instance = null;

    /**
     * Module loader that owns every registered feature module.
     */
    private static ?ModuleLoader $loader = null;

    /**
     * Override path for `project.config.json`. Resolved at boot
     * time and cached for the rest of the request.
     */
    private static ?string $configPath = null;

    /**
     * Parsed contents of `project.config.json`.
     *
     * @var array<string,mixed>|null
     */
    private static ?array $configCache = null;

    /**
     * The hook name fired by {@see Plugin::boot()}. Stored on the
     * instance so tests can observe what would have been passed to
     * `do_action()` without having to spy on the global WordPress
     * function (which is a no-op in the project's test bootstrap).
     */
    private static ?string $lastHook = null;

    /**
     * Whether {@see Plugin::boot()} has run in this process.
     */
    private static bool $booted = false;

    /**
     * Disable instantiation — the class is used statically.
     */
    private function __construct()
    {
    }

    /**
     * Boot the plugin.
     *
     * Idempotent: a second call is a no-op. When the test bootstrap
     * provides `add_action()` and `do_action()` shims, the loader
     * is wired into WordPress; otherwise the loader is initialised
     * and the `plugin_loaded` hook is recorded for later inspection.
     *
     * @param string|null $configPath Optional override for the
     *                                project.config.json location.
     *                                Production code lets this be
     *                                null and the file is resolved
     *                                from the plugin root.
     *
     * @throws \RuntimeException when project.config.json cannot be
     *                           located or read.
     */
    public static function boot(?string $configPath = null): void
    {
        if (self::$booted) {
            return;
        }

        $config = self::config($configPath);
        $hookPrefix = isset($config['hookPrefix']) && is_string($config['hookPrefix'])
            ? $config['hookPrefix']
            : 'wpsk';

        // When boot() is called with an explicit config path, the
        // config() helper does not cache (it treats the path as a
        // one-off read). Cache the result explicitly so other
        // observers (e.g. Plugin::loaded_config()) can read it back
        // without re-parsing the file.
        if ($configPath !== null) {
            self::$configCache = $config;
        }

        self::$loader = new ModuleLoader($hookPrefix);
        self::$instance = new self();
        self::$booted = true;
        self::$lastHook = $hookPrefix . '_plugin_loaded';

        // Wire into WordPress. add_action is a no-op shim in the
        // project's test bootstrap, so this is safe in unit tests.
        if (function_exists('add_action')) {
            \add_action('plugins_loaded', [self::class, 'on_plugins_loaded'], 10, 0);
            \add_action('init', [self::class, 'on_plugins_loaded'], 10, 0);
        }

        if (function_exists('do_action')) {
            \do_action(self::$lastHook);
        }
    }

    /**
     * Hook target registered on `plugins_loaded` / `init`. Boot all
     * registered modules and fire the `_modules_loaded` action.
     */
    public static function on_plugins_loaded(): void
    {
        if (self::$loader === null) {
            return;
        }
        self::$loader->boot_all();
    }

    /**
     * Return the module loader, creating it on demand if {@see
     * Plugin::boot()} has not run yet. Useful for code that needs
     * to register a module before boot() finishes.
     */
    public static function loader(): ModuleLoader
    {
        if (self::$loader === null) {
            self::$loader = new ModuleLoader('wpsk');
        }
        return self::$loader;
    }

    /**
     * Read and return `project.config.json` as an associative
     * array. The file is resolved relative to the *plugin* root
     * (the directory that contains `src/Core/Plugin.php`'s
     * grandparent), never to the active theme.
     *
     * @return array<string,mixed>
     *
     * @throws \RuntimeException when the file is missing.
     */
    public static function config(?string $overridePath = null): array
    {
        if (self::$configCache !== null && $overridePath === null) {
            return self::$configCache;
        }

        $path = $overridePath ?? self::resolveDefaultConfigPath();

        if (!is_file($path) || !is_readable($path)) {
            throw new \RuntimeException(
                sprintf('project.config.json not found at %s', $path)
            );
        }

        $raw = file_get_contents($path);
        if ($raw === false) {
            throw new \RuntimeException(
                sprintf('Failed to read project.config.json at %s', $path)
            );
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException(
                sprintf('project.config.json at %s did not decode as an object/array', $path)
            );
        }

        if ($overridePath === null) {
            self::$configCache = $decoded;
        }
        return $decoded;
    }

    /**
     * Test seam: did {@see Plugin::boot()} run in this process?
     */
    public static function is_booted(): bool
    {
        return self::$booted;
    }

    /**
     * Test seam: the hook name Plugin::boot() would have fired.
     */
    public static function last_loaded_hook(): ?string
    {
        return self::$lastHook;
    }

    /**
     * Test seam: the config that was loaded by the most recent
     * call to {@see Plugin::boot()}.
     *
     * @return array<string,mixed>
     */
    public static function loaded_config(): array
    {
        return self::$configCache ?? [];
    }

    /**
     * Reset all static state. Intended for test isolation only.
     *
     * @internal
     */
    public static function reset_for_tests(): void
    {
        self::$instance = null;
        self::$loader = null;
        self::$configPath = null;
        self::$configCache = null;
        self::$lastHook = null;
        self::$booted = false;
    }

    /**
     * Resolve the default `project.config.json` path from the
     * plugin root. The file lives two directories up from this
     * file: `src/Core/Plugin.php` → `src/` → plugin root.
     */
    private static function resolveDefaultConfigPath(): string
    {
        if (self::$configPath !== null) {
            return self::$configPath;
        }
        // __DIR__ === src/Core (this file lives there)
        // dirname(__DIR__, 2) === plugin root
        $pluginRoot = dirname(__DIR__, 2);
        return $pluginRoot . '/project.config.json';
    }
}
