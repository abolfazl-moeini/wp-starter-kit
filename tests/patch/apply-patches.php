<?php
/**
 * Apply a set of git patches to the project before running tests.
 *
 * Phase 7.0 reconciliation of the sample-plugin apply-patches.php:
 *   - imports `WPDev\TestTools\Patch` (unified, NOT the
 *     `BetterStudioTest\TestTools\` alias the source used).
 *   - calls `Cli::init($root, $config)` with the correct two-arg signature
 *     (the source's `init(array $patches)` was broken).
 *   - $config is a flat `name => /abs/path/to/patch` map — no
 *     `[$patch_file, $root]` tuples.
 *
 * Invocation: `composer test:pre` (or `php tests/patch/apply-patches.php`
 * directly). The script is a no-op when `tests/patch/plugins-patches.php`
 * returns an empty array, which is the default for the wp-starter-kit
 * starter (downstream projects add their own patches to that file).
 */

declare(strict_types=1);

$root = dirname(__DIR__, 2);

require $root . '/vendor/autoload.php';

use WPDev\TestTools\Patch\Cli;

$config = require $root . '/tests/patch/plugins-patches.php';

Cli::init($root, $config);

exit(Cli::get_errors() === [] ? 0 : 1);
