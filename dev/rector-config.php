<?php
/**
 * Shared Rector config for wp-starter-kit's dev tooling pipeline.
 *
 * Ported from `sample-plugin/dev/rector-config.php` with the
 * framework-agnostic bits preserved (path + skip rules, parallel) and the
 * `betterstudio`-specific vendor skip removed.
 *
 * The optional `$options` array is passed in by the calling script
 * (`rector-upgrade.php`, `rector-prefix.php`, `rector-build.php`).
 *
 *   $options = [
 *       'include_vendor' => bool  // walk vendor/* subdirs instead of skipping
 *                                 // them entirely (used by rector-prefix).
 *       'include_tests'  => bool  // do NOT skip the tests/ tree.
 *   ];
 *
 * WordPress function stubs are loaded so Rector can resolve WP function
 * signatures in the `includes/` tree.
 *
 * Keep in sync with `packages/create-wp-project/src/rector/rector-config.php`
 * (emitted into consumer projects as `dev/rector-config.php`).
 */

declare(strict_types=1);

use Rector\Config\RectorConfig;

return static function (RectorConfig $rector_config, array $options = []): void {
    $src = dirname(__DIR__);

    $skip = [];

    // Parse vendor/composer/installed.json to identify dev packages and installation status.
    $isNoDevInstalled = false;
    $devPackages = [];
    $installedJsonPath = $src . '/vendor/composer/installed.json';
    if (is_file($installedJsonPath)) {
        $installedRaw = (string) file_get_contents($installedJsonPath);
        $installedData = json_decode($installedRaw, true);
        if (is_array($installedData)) {
            $isNoDevInstalled = array_key_exists('dev', $installedData) && $installedData['dev'] === false;
            if (!empty($installedData['dev-package-names']) && is_array($installedData['dev-package-names'])) {
                $devPackages = $installedData['dev-package-names'];
            }
        }
    }

    $includeRuntimeVendor = !empty($options['include_runtime_vendor'])
        || !empty($options['include_vendor'])
        || getenv('WPDEV_RECTOR_INCLUDE_VENDOR') === '1'
        || ($isNoDevInstalled && !empty($options['auto_vendor_on_nodev']));

    if ($includeRuntimeVendor && is_dir($src . '/vendor')) {
        // Skip Composer internal autoloader and bin
        $skip[] = $src . '/vendor/composer';
        $skip[] = $src . '/vendor/bin';
        $skip[] = '*/vendor/*/*/vendor/*';

        // Skip any known dev packages from installed.json
        foreach ($devPackages as $devPkg) {
            $skip[] = $src . '/vendor/' . $devPkg;
        }

        // Defensive fallback skips for dev tooling, stubs, and polyfills
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
            $skip[] = $src . '/vendor/' . $toolName;
            $skip[] = '*/vendor/' . $toolName . '/*';
            $skip[] = '*/vendor/*/' . $toolName . '/*';
        }

        // Polyfills should not be downgraded (they already polyfill syntax/functions)
        $skip[] = '*/vendor/symfony/polyfill-*';

        // Skip non-production code inside third-party packages
        $skip[] = '*/vendor/*/*/tests/*';
        $skip[] = '*/vendor/*/*/test/*';
        $skip[] = '*/vendor/*/*/docs/*';
        $skip[] = '*/vendor/*/*/examples/*';
        $skip[] = '*/vendor/*/*/demo/*';
    } else {
        $skip[] = $src . '/vendor';
    }

    $skip[] = $src . '/dev';
    $skip[] = $src . '/node_modules';
    $skip[] = $src . '/*/node_modules';
    $skip[] = $src . '/vendor-prefixed';
    // Dual-load Real/ tree is intentional PHP 8.1+; Stub/ is the <8.1 path.
    $skip[] = $src . '/packages/php-fault-tolerance/src/Real';
    $skip[] = '*/php-fault-tolerance/src/Real/*';
    $skip[] = '*/php-fault-tolerance/src/Real';

    if (empty($options['include_tests'])) {
        $skip[] = $src . '/tests';
    }

    $rector_config->paths([$src]);
    $rector_config->skip($skip);

    // WordPress function stubs so Rector can resolve WP function signatures
    // when scanning the `includes/` tree.
    $wp_stubs = $src . '/vendor/php-stubs/wordpress-stubs/wordpress-stubs.php';
    if (is_file($wp_stubs)) {
        $rector_config->autoloadPaths([$wp_stubs]);
    }

    $rector_config->fileExtensions(['php']);
    $rector_config->parallel(200, 32, 40);
};
