<?php
declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\Set\ValueObject\DowngradeLevelSetList;

return static function (RectorConfig $rectorConfig): void {
    $targetDir = getenv('RECTOR_TARGET_DIR');
    $paths = [];
    if ($targetDir && is_dir($targetDir)) {
        if (is_dir($targetDir . '/src')) {
            $paths[] = $targetDir . '/src';
        }
        foreach (glob($targetDir . '/*.php') as $mainPhp) {
            $paths[] = $mainPhp;
        }
        if (empty($paths)) {
            $paths[] = $targetDir;
        }
    } else {
        $paths[] = __DIR__;
    }

    $rectorConfig->paths($paths);

    $rectorConfig->sets([
        DowngradeLevelSetList::DOWN_TO_PHP_74,
    ]);

    $rectorConfig->skip([
        '*/vendor/*',
        '*/node_modules/*',
        '*/tests/*',
        '*/dev/*',
        '*/packages/php-fault-tolerance/src/Real/*',
    ]);
};
