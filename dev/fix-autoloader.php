<?php
/**
 * fix-autoloader.php — updates vendor/composer/*.php after a Rector prefix
 * run so the autoloader string-replace maps still resolve the renamed
 * namespace.
 *
 * Ported from `sample-plugin/dev/fix-autoloader.php`. The original replaced
 * the HARD-CODED `BetterStudio\\` string; this version reads the same
 * `from => to` mapping used by `dev/rector-prefix.php` (env vars first,
 * then `dev/rector.prefix.json`), so the operation is dynamic.
 *
 * Resolution order matches `rector-prefix.php`:
 *   1. Env vars `WPSK_PREFIX_FROM` / `WPSK_PREFIX_TO`.
 *   2. `dev/rector.prefix.json` (decoded `from` / `to` keys).
 *   3. No-op if neither is set.
 *
 * Used by the `release` composer script:
 *   `"release": ["@rector:prefix", "@php ./dev/fix-autoloader.php"]`
 *
 * @see docs/vendor-scoping.md
 */

declare(strict_types=1);

$composer_dir = dirname(__DIR__) . '/vendor/composer';

if (!is_dir($composer_dir)) {
    fwrite(STDERR, "fix-autoloader: vendor/composer not found, skipping.\n");
    exit(0);
}

$from = (string) getenv('WPSK_PREFIX_FROM');
$to   = (string) getenv('WPSK_PREFIX_TO');

if (($from === '' || $to === '') && is_file(__DIR__ . '/rector.prefix.json')) {
    $decoded = json_decode((string) file_get_contents(__DIR__ . '/rector.prefix.json'), true);
    if (is_array($decoded)) {
        $from = $from !== '' ? $from : (string) ($decoded['from'] ?? '');
        $to   = $to   !== '' ? $to   : (string) ($decoded['to']   ?? '');
    }
}

if ($from === '' || $to === '' || $from === $to) {
    fwrite(STDERR, "fix-autoloader: no prefix mapping (env or rector.prefix.json), skipping.\n");
    exit(0);
}

// On disk, namespaced strings appear with escaped separators: `OldName\\Sub`.
$needle      = str_replace('\\', '\\\\', $from);
$replacement = str_replace('\\', '\\\\', $to);

$updated = 0;
foreach (glob($composer_dir . '/*') as $file) {
    if (!is_file($file)) {
        continue;
    }
    $content = (string) file_get_contents($file);
    if (strstr($content, $needle) === false) {
        continue;
    }
    file_put_contents($file, str_replace($needle, $replacement, $content));
    $updated++;
}

fwrite(STDOUT, sprintf("fix-autoloader: rewrote %d file(s) in vendor/composer/.\n", $updated));
exit(0);
