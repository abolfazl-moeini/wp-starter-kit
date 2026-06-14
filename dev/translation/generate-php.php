<?php
/**
 * Generate per-component + template .php.pot files (Phase 6).
 *
 * Mirrors `mrlogistic/dev/translation/generate-php.php`. Runs `wp i18n
 * make-pot` for each component (PHP source only) plus a top-level
 * template scan. The wp-cli invocations are gated by the PATH; if wp
 * is missing, this script is a no-op (a warning is logged).
 *
 * Invocation: `composer run translation:generate:php`.
 */

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

wpsk_color_log('Generating PHP translation files...');

foreach (wpsk_list_components() as $component) {
    wpsk_color_log("  Component: $component");
    $rel = '/components/' . $component . '/' . $component . '.php.pot';
    $r = wpsk_run_wp_i18n([
        'make-pot',
        SOURCE_ROOT . '/components/' . $component,
        SOURCE_ROOT . $rel,
        '--ignore-domain',
        '--skip-js',
        '--skip-blade',
        '--skip-block-json',
        '--skip-theme-json',
        '--skip-audit',
    ]);
    if ($r['ok']) {
        wpsk_color_log("    " . $rel, 'g');
    } else {
        wpsk_color_log("    " . $rel . ' — wp i18n not available, skip', 'w');
    }
}

wpsk_color_log('Done.');
