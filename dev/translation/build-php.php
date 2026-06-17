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

wpdev_color_log('Building PHP translation files...');

foreach (wpdev_list_components() as $component) {
    wpdev_color_log("  Component: $component");
    // wpdev_run_wp_i18n() prepends ['wp', 'i18n']; do not pass 'i18n' again.
    $r = wpdev_run_wp_i18n([
        'make-php',
        SOURCE_ROOT . '/components/' . $component . '/languages',
        SOURCE_ROOT . '/components/' . $component . '/languages',
    ]);
    if ($r['ok']) {
        wpdev_color_log("    OK", 'g');
    } else {
        wpdev_color_log("    SKIP (" . trim($r['stderr']) . ")", 'w');
    }
}

wpdev_color_log('Done.');
