<?php
/**
 * Rector prefix pipeline — renames namespaces at release time.
 *
 * Ported from `sample-plugin/dev/rector-prefix.php`. The original had a
 * HARD-CODED `'BetterStudio' => 'BetterFrameworkPackage'` mapping; this
 * version resolves the mapping from environment variables + a config file
 * so downstream projects can re-brand without forking the framework.
 *
 * Resolution order for the `from => to` pair:
 *   1. Environment variables `WPDEV_PREFIX_FROM` / `WPDEV_PREFIX_TO`
 *      (legacy `WPSK_PREFIX_*` still accepted).
 *   2. `dev/rector.prefix.json` (a small JSON file committed in the
 *      downstream project; the starter repo does not commit it).
 *   3. Fallback: empty mapping (no rewrite) so the pipeline is still a
 *      no-op when neither is configured.
 *
 * Usage:
 *   WPDEV_PREFIX_FROM=OldName WPDEV_PREFIX_TO=NewName composer rector:prefix
 *   — or —
 *   echo '{"from":"OldName","to":"NewName"}' > dev/rector.prefix.json
 *   composer rector:prefix
 *
 * @see docs/vendor-scoping.md
 */

declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\Renaming\Rector\Name\RenameClassRector;
use Rector\Set\ValueObject\SetList;

set_time_limit(0);
ini_set('max_execution_time', '0');

return static function (RectorConfig $rector_config): void {
    $shared = include __DIR__ . '/rector-config.php';
    // include_vendor=true so the autoloader strings in vendor/composer/*.php
    // are rewritten too (they reference the old namespace).
    $shared($rector_config, ['include_vendor' => true]);

    $from = (string) (getenv('WPDEV_PREFIX_FROM') ?: getenv('WPSK_PREFIX_FROM'));
    $to   = (string) (getenv('WPDEV_PREFIX_TO') ?: getenv('WPSK_PREFIX_TO'));

    if (($from === '' || $to === '') && is_file(__DIR__ . '/rector.prefix.json')) {
        $decoded = json_decode((string) file_get_contents(__DIR__ . '/rector.prefix.json'), true);
        if (is_array($decoded)) {
            $from = $from !== '' ? $from : (string) ($decoded['from'] ?? '');
            $to   = $to   !== '' ? $to   : (string) ($decoded['to']   ?? '');
        }
    }

    // No mapping configured: register a benign set so Rector does not
    // prompt to create a default `rector.php`. The set runs but does not
    // change anything in wp-starter-kit's code (it is a no-op rewrite).
    if ($from === '' || $to === '' || $from === $to) {
        $rector_config->sets([
            SetList::DEAD_CODE,
        ]);
        fwrite(STDERR, "rector:prefix: no prefix mapping (env or rector.prefix.json), nothing to do.\n");
        return;
    }

    // Build `from => to` mapping. `from` and `to` can be comma-separated
    // for multi-namespace renames: `WPSK_PREFIX_FROM=OldA,OldB WPSK_PREFIX_TO=NewA,NewB`.
    $namespacePairs = [];
    foreach (explode(',', $from) as $i => $fromPart) {
        $toPart = trim(explode(',', $to)[$i] ?? '');
        $fromPart = trim($fromPart);
        if ($fromPart === '' || $toPart === '') {
            continue;
        }
        $namespacePairs[$fromPart] = $toPart;
    }

    if ($namespacePairs === []) {
        $rector_config->sets([
            SetList::DEAD_CODE,
        ]);
        return;
    }

    // RenameClassRector is the Rector 1.x replacement for the old
    // `RenameNamespaceRector` (removed in 1.0). It rewrites all class
    // references — `use`, type hints, instantiation, FQNs, etc. — using
    // the supplied `oldClass => newClass` map.
    //
    // Note: Rector 1.x does NOT rewrite `namespace OldName;` declarations
    // themselves (that part of the old RenameNamespaceRector was dropped).
    // For a full release rebrand the namespace declaration must be edited
    // by hand or by a custom Rector rule. See deliverable.md "open issues".
    $rector_config->ruleWithConfiguration(
        RenameClassRector::class,
        $namespacePairs
    );
};
