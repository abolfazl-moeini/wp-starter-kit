<?php
declare(strict_types=1);

namespace WPDev\Support\WpCli;

/**
 * Central registration for WP-CLI commands (mirrors RestSetup / ShortcodesSetup).
 *
 * Queue command classes with register(), then cli_init() attaches them to WP-CLI.
 * Safe no-op when WP-CLI is not running.
 *
 * @example
 *   CliSetup::register(StatusCommand::class);
 */
final class CliSetup
{
    /** @var array<class-string<Command>> */
    private static array $commands = [];

    private static bool $hooked = false;

    /**
     * Queue a command class (or instance) for registration on cli_init.
     *
     * @param class-string<Command>|Command $command
     */
    public static function register(string|Command $command): bool
    {
        $classname = $command instanceof Command ? get_class($command) : $command;

        if (!class_exists($classname)) {
            return false;
        }
        if (!is_subclass_of($classname, Command::class)) {
            return false;
        }

        if (!in_array($classname, self::$commands, true)) {
            self::$commands[] = $classname;
        }

        self::setup();

        return true;
    }

    /**
     * Attach cli_init hook once (idempotent).
     */
    public static function setup(): void
    {
        if (self::$hooked) {
            return;
        }
        self::$hooked = true;

        if (function_exists('add_action')) {
            add_action('cli_init', [self::class, 'cli_init']);
        }

        // If WP-CLI already booted past cli_init (late register), attach now.
        if (
            self::is_wp_cli()
            && function_exists('did_action')
            && did_action('cli_init')
        ) {
            self::cli_init();
        }
    }

    /**
     * Register every queued command with WP_CLI::add_command().
     */
    public static function cli_init(): void
    {
        if (!self::is_wp_cli()) {
            return;
        }

        foreach (self::$commands as $classname) {
            /** @var Command $command */
            $command = new $classname();
            $name = trim($command->name());
            if ($name === '') {
                continue;
            }

            $args = [
                'shortdesc' => $command->description(),
                'when'      => $command->when(),
            ];

            $synopsis = $command->synopsis();
            if ($synopsis !== []) {
                $args['synopsis'] = $synopsis;
            }

            \WP_CLI::add_command($name, [$command, 'run'], $args);
        }
    }

    /**
     * @return list<class-string<Command>>
     */
    public static function commands(): array
    {
        return self::$commands;
    }

    /** @internal Test isolation. */
    public static function flush(): void
    {
        self::$commands = [];
        self::$hooked = false;
    }

    private static function is_wp_cli(): bool
    {
        return defined('WP_CLI') && WP_CLI && class_exists('\WP_CLI');
    }
}

if (function_exists('add_action')) {
    CliSetup::setup();
}
