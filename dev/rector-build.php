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

    $phpMin = '7.4';
    $cfgPath = dirname(__DIR__) . '/project.config.json';
    if (is_readable($cfgPath)) {
        $cfg = json_decode((string) file_get_contents($cfgPath), true);
        if (is_array($cfg) && ! empty($cfg['phpMinVersion'])) {
            $phpMin = (string) $cfg['phpMinVersion'];
        }
    }

    $downgradeSets = [
        '7.4' => DowngradeLevelSetList::DOWN_TO_PHP_74,
        '8.0' => DowngradeLevelSetList::DOWN_TO_PHP_80,
        '8.1' => DowngradeLevelSetList::DOWN_TO_PHP_81,
        '8.2' => DowngradeLevelSetList::DOWN_TO_PHP_82,
        '8.3' => DowngradeLevelSetList::DOWN_TO_PHP_83,
    ];
    $target = $downgradeSets[$phpMin] ?? DowngradeLevelSetList::DOWN_TO_PHP_74;

    $rector_config->sets([$target]);
};
