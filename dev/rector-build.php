<?php
/**
 * Rector build pipeline — downgrades PHP to 7.2 for distribution.
 *
 * Ported from `sample-plugin/dev/rector-build.php`. Identical behaviour;
 * only the namespace + import paths are reconciled.
 *
 * Usage: `composer rector:build`.
 */

declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\Set\ValueObject\DowngradeLevelSetList;

set_time_limit(0);
ini_set('max_execution_time', '0');

return static function (RectorConfig $rector_config): void {
    $shared = include __DIR__ . '/rector-config.php';
    $shared($rector_config);

    $rector_config->sets([
        DowngradeLevelSetList::DOWN_TO_PHP_72,
    ]);
};
