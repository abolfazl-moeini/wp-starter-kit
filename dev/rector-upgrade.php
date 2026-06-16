<?php
/**
 * Rector upgrade pipeline — modernises PHP and applies quality / dead-code
 * / naming set.
 *
 * Ported from `sample-plugin/dev/rector-upgrade.php`. The original listed
 * individual `Rector::class` rules (Rector 0.x style); this version uses
 * the Rector 1.x set-based API (the only API that survived the 0.x → 1.x
 * migration). Behaviour is equivalent for the wp-starter-kit use case —
 * upgrade to PHP 8.1 + code-quality / dead-code / naming cleanups.
 *
 * Usage: `composer rector:upgrade`.
 *
 * @see docs/vendor-scoping.md
 */

declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\Set\ValueObject\LevelSetList;
use Rector\Set\ValueObject\SetList;

set_time_limit(0);
ini_set('max_execution_time', '0');

return static function (RectorConfig $rector_config): void {
    $shared = include __DIR__ . '/rector-config.php';
    $shared($rector_config);

    $rector_config->sets([
        LevelSetList::UP_TO_PHP_81,
        SetList::CODE_QUALITY,
        SetList::DEAD_CODE,
        SetList::NAMING,
    ]);
};
