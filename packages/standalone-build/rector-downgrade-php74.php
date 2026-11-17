<?php
declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\Set\ValueObject\DowngradeLevelSetList;

return static function (RectorConfig $rectorConfig): void {
    $targetDir = getenv('RECTOR_TARGET_DIR');
    $paths = [];
    if ($targetDir && is_dir($targetDir)) {
        $paths[] = $targetDir;
        $rectorConfig->cacheDirectory(sys_get_temp_dir() . '/rector_cache_' . md5($targetDir));
    } else {
        $paths[] = __DIR__;
    }

    $rectorConfig->disableParallel();

    $rectorConfig->paths($paths);

    $rectorConfig->sets([
        DowngradeLevelSetList::DOWN_TO_PHP_74,
    ]);

    $skip = [
        '*/node_modules/*',
        '*/tests/*',
        '*/dev/*',
        '*/demo/*',
        '*/examples/*',
        '*/packages/php-fault-tolerance/src/Real/*',
        '*/php-fault-tolerance/src/Real/*',
        '*/vendor/composer/*',
        '*/vendor/bin/*',
        '*/vendor/*/*/vendor/*',
        '*/vendor/symfony/polyfill-*',
        '*/vendor/*/*/tests/*',
        '*/vendor/*/*/test/*',
        '*/vendor/*/*/docs/*',
        '*/vendor/*/*/examples/*',
        '*/vendor/*/*/demo/*',
    ];

    $devToolFallback = [
        'rector',
        'phpunit',
        'phpstan',
        'yoast',
        'sebastian',
        'phar-io',
        'theseer',
        'myclabs',
        'doctrine',
        'nikic',
        'jetbrains',
        'php-stubs',
        'mockery',
        'dealerdirect',
        'squizlabs',
        'wp-coding-standards',
        'phpcsstandards',
        'szepeviktor',
    ];
    foreach ($devToolFallback as $toolName) {
        $skip[] = '*/vendor/' . $toolName . '/*';
        $skip[] = '*/vendor/*/' . $toolName . '/*';
    }

    $installedJsonPath = ($targetDir ?: __DIR__) . '/vendor/composer/installed.json';
    if (is_file($installedJsonPath)) {
        $installedData = json_decode((string) file_get_contents($installedJsonPath), true);
        if (is_array($installedData) && !empty($installedData['dev-package-names'])) {
            foreach ($installedData['dev-package-names'] as $devPkg) {
                $skip[] = '*/vendor/' . $devPkg . '/*';
            }
        }
    }

    $rectorConfig->skip($skip);
};
