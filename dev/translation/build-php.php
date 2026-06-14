<?php
/**
 * Build per-component .l10n.php files from .po sources (Phase 6).
 *
 * Mirrors `mrlogistic/dev/translation/build-php.php`. Runs
 * `wp i18n make-php` for each component (and the project template dir)
 * to produce the runtime `.l10n.php` files that `load_theme_textdomain`
 * picks up.
 *
 * Invocation: `composer run translation:build:php`.
 */

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

wpsk_color_log('Building PHP translation files...');

foreach (wpsk_list_components() as $component) {
    wpsk_color_log("  Component: $component");
    $r = wpsk_run_wp_i18n([
        'i18n',
        'make-php',
        SOURCE_ROOT . '/components/' . $component . '/languages',
        SOURCE_ROOT . '/components/' . $component . '/languages',
    ]);
    if ($r['ok']) {
        wpsk_color_log("    OK", 'g');
    } else {
        wpsk_color_log("    SKIP (" . trim($r['stderr']) . ")", 'w');
    }
}

wpsk_color_log('Done.');
