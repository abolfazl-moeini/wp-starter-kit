<?php
/**
 * WPSK\TestTools\Patch\Cli — CLI entry point for the patch system.
 *
 * Ported from sample-plugin/packages/php-test-tools/src/Patch/Cli.php
 * with the following reconciliations (Phase 7.0 / §6.0):
 *
 *   1. Namespace: `WPDevTest\PHPTestTools\Patch` → `WPSK\TestTools\Patch`
 *      (unified across the wp-starter-kit port; the caller used to import
 *      a totally different namespace, `BetterStudioTest\TestTools\Patch`).
 *   2. Signature: `init(array $patches)` → `init(string $root, array $config)`
 *      so the caller can pass a single root and a flat `name => patch_path`
 *      map, matching `tests/patch/plugins-patches.php`.
 *   3. Config shape: no more `[$patch_file, $root]` tuples — the
 *      `plugins-patches.php` config is a flat string map.
 *   4. Private dep: `WPDev\Cli\Console\Tools` removed; replaced with
 *      `GitPatch` (symfony/process) + a local ANSI helper for colour logs.
 *
 * Errors are caught + recorded in the static `$errors` array (so PHPUnit
 * tests can assert on them) instead of being thrown out of `init()`.
 *
 * @see /Users/moeini/Documents/ideas/extend-kit/plan.md §6.0.2
 */

declare(strict_types=1);

namespace WPSK\TestTools\Patch;

use Throwable;

final class Cli
{
    /**
     * Buffer of error messages collected during the last `init()` call.
     * Used by tests to assert on the failure path without re-throwing.
     *
     * @var string[]
     */
    public static $errors = [];

    /**
     * Apply every patch in `$config` under `$root`.
     *
     * @param string $root   Root directory passed to `git -C <root> apply`.
     * @param array<string,string> $config Flat map of `name => /abs/patch/path`.
     */
    public static function init(string $root, array $config): void
    {
        self::$errors = [];

        if (!is_dir($root)) {
            self::log_error(sprintf('Patch root directory not found: %s', $root));
            return;
        }
        if ($config === []) {
            self::log('No patches configured.');
            return;
        }

        $git_patch = new GitPatch();

        foreach ($config as $name => $patch_file) {
            self::log(sprintf('Apply %s Patch', (string) $name));
            try {
                $git_patch->apply((string) $patch_file, $root);
            } catch (Throwable $error) {
                self::log_error($error->getMessage());
            }
        }

        if (self::$errors === []) {
            self::log_success('Done');
        }
    }

    /**
     * Reset the error buffer (public for tests).
     */
    public static function reset_errors(): void
    {
        self::$errors = [];
    }

    /**
     * @return string[]
     */
    public static function get_errors(): array
    {
        return self::$errors;
    }

    /**
     * Local replacement for the private `WPDev\Cli\Console\Tools::color_log`.
     * Plain echo with an ANSI green prefix — works in any TTY.
     */
    private static function log(string $msg): void
    {
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        echo self::ansi($msg, '32') . "\n";
    }

    private static function log_success(string $msg): void
    {
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        echo self::ansi($msg . ' [OK]', '32') . "\n";
    }

    private static function log_error(string $msg): void
    {
        self::$errors[] = $msg;
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        echo self::ansi($msg, '31') . "\n";
    }

    private static function ansi(string $msg, string $code): string
    {
        if (getenv('NO_COLOR') !== false) {
            return $msg;
        }

        return sprintf("\033[%sm%s\033[0m", $code, $msg);
    }
}
