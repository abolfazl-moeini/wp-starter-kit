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
 *   1. Env vars `WPDEV_PREFIX_FROM` / `WPDEV_PREFIX_TO` (legacy `WPDEV_PREFIX_*` OK).
 *   2. `dev/rector.prefix.json` (decoded `from` / `to` keys).
 *   3. No-op if neither is set.
 *
 * Used by the `release` composer script:
 *   `"release": ["@rector:prefix", "@php ./dev/fix-autoloader.php"]`
 *
 * @see docs/vendor-scoping.md
 */

declare(strict_types=1);

$composer_dirs = [
    dirname(__DIR__) . '/vendor/composer',
    dirname(__DIR__) . '/vendor-prefixed/composer',
];

$existing_dirs = array_filter($composer_dirs, 'is_dir');
if (empty($existing_dirs)) {
    fwrite(STDERR, "fix-autoloader: composer directories not found, skipping.\n");
    exit(0);
}

$from = (string) (getenv('WPDEV_PREFIX_FROM') ?: getenv('WPSK_PREFIX_FROM'));
$to   = (string) (getenv('WPDEV_PREFIX_TO') ?: getenv('WPSK_PREFIX_TO'));

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

// On disk, Composer autoloader files store namespace keys with escaped separators: `'OldName\\Sub'`.
$needle      = str_replace('\\', '\\\\', $from);
$replacement = str_replace('\\', '\\\\', $to);
$pattern     = '/([\'"])' . preg_quote($needle, '/') . '(\\\\\\\\)/';

$updated = 0;
foreach ($existing_dirs as $composer_dir) {
    foreach (glob($composer_dir . '/*') ?: [] as $file) {
        if (!is_file($file)) {
            continue;
        }
        $content = (string) file_get_contents($file);
        $rewritten = preg_replace_callback(
            $pattern,
            static function (array $m) use ($replacement): string {
                return $m[1] . $replacement . $m[2];
            },
            $content
        );
        if ($rewritten === null || $rewritten === $content) {
            continue;
        }
        file_put_contents($file, $rewritten);
        $updated++;
    }
}

fwrite(STDOUT, sprintf("fix-autoloader: rewrote %d file(s) in composer autoloader dirs.\n", $updated));
exit(0);
