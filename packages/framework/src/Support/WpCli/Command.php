<?php
declare(strict_types=1);

namespace WPDev\Support\WpCli;

/**
 * Minimal base for WP-CLI commands.
 *
 * Same idea as RestHandler / Shortcode: subclass, declare name + description,
 * implement handle(). Register via CliSetup::register().
 *
 * @example
 *   final class StatusCommand extends Command {
 *       public function name(): string { return 'wpdev example-status'; }
 *       public function description(): string { return 'Show status'; }
 *       public function handle(array $args, array $assoc_args): void {
 *           $this->success('OK');
 *       }
 *   }
 *   CliSetup::register(StatusCommand::class);
 */
abstract class Command
{
    /**
     * Full command name as passed to WP_CLI::add_command (e.g. "wpdev status").
     */
    abstract public function name(): string;

    /**
     * One-line description (WP-CLI shortdesc).
     */
    abstract public function description(): string;

    /**
     * Command body. $args = positionals, $assoc_args = --flags / --key=value.
     *
     * @param list<string>         $args
     * @param array<string, mixed> $assoc_args
     */
    abstract public function handle(array $args, array $assoc_args): void;

    /**
     * Optional WP-CLI synopsis (positional / assoc / flag definitions).
     *
     * @return list<array<string, mixed>>
     */
    public function synopsis(): array
    {
        return [];
    }

    /**
     * When to load the command: before_wp_load | after_wp_load | before_registering_contexts | …
     *
     * @see https://make.wordpress.org/cli/handbook/references/internal-api/wp-cli-add-command/
     */
    public function when(): string
    {
        return 'after_wp_load';
    }

    /**
     * Invoked by WP-CLI. Wraps handle() with basic error reporting.
     *
     * @param list<string>         $args
     * @param array<string, mixed> $assoc_args
     */
    final public function run(array $args = [], array $assoc_args = []): void
    {
        try {
            $this->handle($args, $assoc_args);
        } catch (\Throwable $e) {
            $this->error($e->getMessage());
        }
    }

    protected function log(string $message): void
    {
        if ($this->is_cli()) {
            \WP_CLI::log($message);
            return;
        }
        echo $message . PHP_EOL;
    }

    protected function line(string $message = ''): void
    {
        $this->log($message);
    }

    protected function success(string $message): void
    {
        if ($this->is_cli()) {
            \WP_CLI::success($message);
            return;
        }
        echo 'Success: ' . $message . PHP_EOL;
    }

    protected function warning(string $message): void
    {
        if ($this->is_cli()) {
            \WP_CLI::warning($message);
            return;
        }
        echo 'Warning: ' . $message . PHP_EOL;
    }

    /**
     * @param bool $exit When true (default), WP-CLI stops with code 1.
     */
    protected function error(string $message, bool $exit = true): void
    {
        if ($this->is_cli()) {
            \WP_CLI::error($message, $exit);
            return;
        }
        echo 'Error: ' . $message . PHP_EOL;
        if ($exit) {
            throw new \RuntimeException($message);
        }
    }

    protected function is_cli(): bool
    {
        return defined('WP_CLI') && WP_CLI && class_exists('\WP_CLI');
    }
}
