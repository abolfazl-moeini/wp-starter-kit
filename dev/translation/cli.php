<?php
/**
 * CLI shim for `dev/translation/bootstrap.php` so it can be exercised
 * directly via `php bootstrap.php <verb> [args...]` in tests and from
 * the dev/translation/generate-*.php + build-*.php scripts.
 *
 * Verbs:
 *   list                              — print JSON-encoded component names
 *   helper <op> <json-payload>        — call a JS helper, print its JSON
 *   wp-i18n <wp-argv...>              — call `wp i18n <wp-argv>`, print JSON
 *   build-map <component> <pot-rel>   — build the .map.json for a component
 *
 * The shim exists purely so PHPUnit can `proc_open` a fresh process per
 * test (avoiding the `SOURCE_ROOT` constant redefinition problem) and so
 * the dev scripts can share the same code path.
 *
 * NB: this shim does NOT implement the wp-cli call (it just delegates
 * to `wpdev_run_wp_i18n` in bootstrap.php). It is also not part of the
 * user-facing composer scripts — those live in dev/translation/*.php.
 */

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$verb = $argv[1] ?? '';

switch ($verb) {
    case 'list':
        fwrite(STDOUT, json_encode(wpdev_list_components()));
        break;

    case 'helper':
        $op = $argv[2] ?? '';
        $payloadJson = $argv[3] ?? '{}';
        $payload = json_decode($payloadJson, true) ?: [];
        fwrite(STDOUT, json_encode(wpdev_run_translation_helper($op, $payload)));
        break;

    case 'wp-i18n':
        $rest = array_slice($argv, 2);
        fwrite(STDOUT, json_encode(wpdev_run_wp_i18n($rest)));
        break;

    case 'build-map':
        $component = $argv[2] ?? '';
        $pot_rel = $argv[3] ?? '';
        fwrite(STDOUT, json_encode(wpdev_build_map_file($component, $pot_rel)));
        break;

    default:
        fwrite(STDERR, "unknown verb: $verb\n");
        exit(2);
}
