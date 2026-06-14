<?php
/**
 * Generate per-component .script.pot + map.json files (Phase 6).
 *
 * Mirrors `mrlogistic/dev/translation/generate-script.php` but with:
 *   - the SOURCE_ROOT / TRANSLATION_HELPER constants from bootstrap.php
 *   - the JS helper (packages/translation/src/index.js) for map building
 *   - no dependency on `symfony/process` (uses proc_open directly)
 *
 * Invocation: `composer run translation:generate:script` (or :generate
 * which also runs :php).
 */

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

/** @var string $argv */
$generated = [];
$failed    = [];

wpsk_color_log('Generating script translation files...');

foreach (wpsk_list_components() as $component) {
    wpsk_color_log("  Component: $component");

    $pot_rel = wpsk_make_script_pot($component);
    if ($pot_rel === '') {
        wpsk_color_log("    make-script-pot: SKIP (wp i18n not available or no strings)", 'w');
        $failed[] = $component;
        continue;
    }
    wpsk_color_log("    make-script-pot: " . $pot_rel, 'g');

    $map_rel = wpsk_build_map_file($component, $pot_rel);
    if ($map_rel === '') {
        wpsk_color_log("    build-map: SKIP", 'w');
        $failed[] = $component;
        continue;
    }
    wpsk_color_log("    build-map:    " . $map_rel, 'g');
    $generated[] = $component;
}

wpsk_color_log(sprintf(
    'Done. %d component(s) generated, %d failed.',
    count($generated),
    count($failed)
));
