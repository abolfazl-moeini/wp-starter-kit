<?php
/**
 * Translation pipeline bootstrap for wp-starter-kit (Phase 6).
 *
 * Pure helpers live in packages/translation/src/index.js (Node) so they
 * can be unit-tested without spawning wp i18n commands. The functions
 * here are thin wrappers that resolve the source root, define a list
 * of components (anything in components/X/script.js), spawn wp i18n
 * make-pot for each component, and call the JS helper to build the map
 * file.
 *
 * The PHP-side scripts in dev/translation/generate-*.php + build-*.php
 * require this file and then call these helpers.
 *
 * This file intentionally does NOT depend on symfony/process or
 * wpdev/console (sample-plugins wp-cli wrapper) so it works in the
 * TDD suite with just PHPUnit + Node.
 */

declare(strict_types=1);

require_once __DIR__ . '/colors.php';

// Canonical source root (override via env for tests).
if (!defined('SOURCE_ROOT')) {
    define('SOURCE_ROOT', getenv('WPSK_SOURCE_ROOT') ?: dirname(__DIR__, 2));
}

// TRANSLATION_HELPER points at the helper shipped with wp-starter-kit, NOT
// at SOURCE_ROOT/packages/... (which is the project under test, not the
// starter). The helper is at <starter-root>/packages/translation/src/.
if (!defined('TRANSLATION_HELPER')) {
    define(
        'TRANSLATION_HELPER',
        // dirname(__DIR__, 2) = the wp-starter-kit repo root (because this
        // file lives in <root>/dev/translation/bootstrap.php).
        dirname(__DIR__, 2) . '/packages/translation/src/index.js'
    );
}

/**
 * List components: anything in components/X/ that contains a script.js.
 *
 * @return string[]
 */
function wpsk_list_components(): array
{
    $out = [];
    foreach (glob(SOURCE_ROOT . '/components/*/script.js') ?: [] as $file) {
        $out[] = basename(dirname($file));
    }
    sort($out);
    return $out;
}

/**
 * Run a Node helper and return its parsed JSON output.
 *
 * @param string $op       one of parseMapFile, isTranslationValid, etc.
 * @param array  $payload  passed to the JS function as positional args
 * @return array           ok bool, result mixed, optional error string
 */
function wpsk_run_translation_helper(string $op, array $payload): array
{
    $cmd = ['node', TRANSLATION_HELPER, $op, base64_encode(json_encode($payload))];
    $env = ['PATH' => getenv('PATH')];

    $proc = proc_open(
        $cmd,
        [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes,
        SOURCE_ROOT ?: getcwd(),
        $env
    );
    if (!is_resource($proc)) {
        return ['ok' => false, 'error' => 'proc_open failed for: ' . implode(' ', $cmd)];
    }
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exit = proc_close($proc);
    if ($exit !== 0) {
        return ['ok' => false, 'error' => "node exited $exit: $stderr"];
    }
    $decoded = json_decode(trim($stdout), true);
    return is_array($decoded)
        ? $decoded
        : ['ok' => false, 'error' => 'non-JSON output: ' . $stdout];
}

/**
 * Run a wp i18n command. Returns ok bool, stdout, stderr, exit.
 *
 * If wp is not on PATH (typical in CI), returns ok=false with a
 * helpful message -- the calling script is expected to surface this.
 *
 * @param string[] $argv
 */
function wpsk_run_wp_i18n(array $argv): array
{
    $cmd = array_merge(['wp', 'i18n'], $argv);
    $env = ['PATH' => getenv('PATH')];

    $proc = proc_open(
        $cmd,
        [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes,
        SOURCE_ROOT ?: getcwd(),
        $env
    );
    if (!is_resource($proc)) {
        return ['ok' => false, 'stdout' => '', 'stderr' => 'proc_open failed'];
    }
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exit = proc_close($proc);
    return [
        'ok'     => $exit === 0,
        'stdout' => $stdout,
        'stderr' => $stderr,
        'exit'   => $exit,
    ];
}

/**
 * Build a .script.pot file for a component by calling wp i18n make-pot.
 *
 * @return string relative pot path (e.g. /components/foo/foo.script.pot)
 *         or empty string on failure.
 */
function wpsk_make_script_pot(string $component_name): string
{
    $pot_rel = '/components/' . $component_name . '/' . $component_name . '.script.pot';
    $scan    = '/components/' . $component_name;
    $r = wpsk_run_wp_i18n([
        'make-pot',
        SOURCE_ROOT . $scan,
        SOURCE_ROOT . $pot_rel,
        '--ignore-domain',
        '--skip-php',
        '--skip-blade',
        '--skip-block-json',
        '--skip-theme-json',
        '--skip-audit',
    ]);
    return $r['ok'] ? $pot_rel : '';
}

/**
 * Build the source-to-bundle map file for a component.
 *
 * @return string relative map path, or empty string on failure.
 */
function wpsk_build_map_file(string $component_name, string $pot_rel): string
{
    $pot_abs = SOURCE_ROOT . $pot_rel;
    if (!is_file($pot_abs)) return '';

    $bundle = $component_name . '.js';
    $res = wpsk_run_translation_helper('parseMapFile', [
        'potContents' => (string) file_get_contents($pot_abs),
        'bundleName'   => $bundle,
    ]);
    if (!($res['ok'] ?? false) || !is_array($res['result'] ?? null)) return '';

    $map_dir = SOURCE_ROOT . '/assets/map';
    if (!is_dir($map_dir)) mkdir($map_dir, 0777, true);
    $map_file = $map_dir . '/' . $component_name . '.map.json';
    file_put_contents($map_file, json_encode($res['result'], JSON_PRETTY_PRINT));
    return '/assets/map/' . $component_name . '.map.json';
}
