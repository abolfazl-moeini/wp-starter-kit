<?php
/**
 * Build per-component .json translation files from .po sources (Phase 6).
 *
 * Mirrors `mrlogistic/dev/translation/build-script.php`. Runs
 * `wp i18n make-json` for each component and merges internal-package
 * translations into the same JSON output files.
 *
 * Invocation: `composer run translation:build:script` (or :build
 * which also runs :php).
 */

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

wpsk_color_log('Building script JSON translation files...');

foreach (wpsk_list_components() as $component) {
    wpsk_color_log("  Component: $component");

    $map_file   = SOURCE_ROOT . '/assets/map/' . $component . '.map.json';
    $asset_file = SOURCE_ROOT . '/assets/bundles/' . $component . '.asset.php';

    if (!is_file($map_file)) {
        wpsk_color_log("    map missing — run translation:generate first", 'w');
        continue;
    }
    if (!is_file($asset_file)) {
        wpsk_color_log("    bundle asset missing — run npm run build first", 'w');
        continue;
    }

    // wpsk_run_wp_i18n() prepends ['wp', 'i18n']; do not pass 'i18n' again.
    $r = wpsk_run_wp_i18n([
        'make-json',
        SOURCE_ROOT . '/components/' . $component . '/languages',
        SOURCE_ROOT . '/assets/translations',
        "--use-map=$map_file",
        '--no-purge',
    ]);

    if (!$r['ok']) {
        wpsk_color_log("    wp i18n make-json: SKIP (" . trim($r['stderr']) . ")", 'w');
        continue;
    }
    wpsk_color_log("    wp i18n make-json: OK", 'g');
}

wpsk_color_log('Done.');
