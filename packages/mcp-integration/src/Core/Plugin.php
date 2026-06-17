<?php
declare(strict_types=1);

namespace WPDev\MCP\Core;

use WPDev\MCP\Abilities\AbilityRegistry;

/**
 * Static facade for the wp-mcp-integration library.
 *
 * Responsibilities:
 *  - Hold a single ModuleLoader for the lifetime of the request.
 *  - Boot the AbilityRegistry (which hooks wp_abilities_api_init).
 *  - Expose the configured ability namespace prefix and hook prefix.
 *
 * WordPress-optional: every WordPress call is guarded so the class
 * works in unit tests with no WordPress loaded.
 */
final class Plugin
{
    private static bool $booted = false;
    private static bool $modulesBooted = false;
    private static ?ModuleLoader $loader = null;
    /** @var array<string,mixed> */
    private static array $config = [];

    /** @var array<string,mixed> */
    private const DEFAULTS = [
        'hookPrefix' => 'wpdev_mcp',
        'namespace'  => 'my-plugin',
    ];

    private function __construct()
    {
    }

    /**
     * @param array<string,mixed> $config
     */
    public static function boot(array $config = []): void
    {
        if (self::$booted) {
            return;
        }
        self::$config = array_merge(self::DEFAULTS, $config);
        $hook_prefix  = (string) self::$config['hookPrefix'];

        if (self::$loader === null) {
            self::$loader = new ModuleLoader($hook_prefix);
        } else {
            self::$loader->setHookPrefix($hook_prefix);
        }

        // The registry hooks itself onto wp_abilities_api_init.
        AbilityRegistry::instance()->boot();

        self::$booted = true;

        // Boot modules on plugins_loaded when WordPress is present;
        // otherwise boot immediately (tests / CLI).
        if (function_exists('add_action')) {
            \add_action('plugins_loaded', [self::class, 'on_plugins_loaded'], 10, 0);
            // Late load / mu-plugins / wp-cli: plugins_loaded may have already fired.
            if (function_exists('did_action') && did_action('plugins_loaded')) {
                self::on_plugins_loaded();
            }
        } else {
            self::on_plugins_loaded();
        }
    }

    public static function on_plugins_loaded(): void
    {
        if (self::$loader !== null && !self::$modulesBooted) {
            self::$modulesBooted = true;
            self::$loader->boot_all();
        }
    }

    public static function loader(): ModuleLoader
    {
        if (self::$loader === null) {
            self::$loader = new ModuleLoader((string) self::DEFAULTS['hookPrefix']);
        }
        return self::$loader;
    }

    /** @return array<string,mixed> */
    public static function config(): array
    {
        return self::$config === [] ? self::DEFAULTS : self::$config;
    }

    public static function ability_namespace(): string
    {
        return (string) self::config()['namespace'];
    }

    public static function reset_for_tests(): void
    {
        self::$booted = false;
        self::$modulesBooted = false;
        self::$loader = null;
        self::$config = [];
        AbilityRegistry::reset_for_tests();
    }
}