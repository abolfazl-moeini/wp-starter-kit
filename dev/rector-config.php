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
 */

declare(strict_types=1);

use Rector\Config\RectorConfig;

return static function (RectorConfig $rector_config, array $options = []): void {
    $src = dirname(__DIR__);

    $skip = [];

    if (!empty($options['include_vendor'])) {
        // Walk every vendor subdir except the rector binary itself.
        $dir = new DirectoryIterator($src . '/vendor');
        foreach ($dir as $file_info) {
            if (!$file_info->isDir() || $file_info->isDot()) {
                continue;
            }
            if (in_array($file_info->getFilename(), ['rector', 'phpunit', 'phpstan'], true)) {
                continue;
            }
            $skip[] = $file_info->getPathname();
        }
    } else {
        $skip[] = $src . '/vendor';
    }

    $skip[] = $src . '/dev';
    $skip[] = $src . '/node_modules';
    $skip[] = $src . '/*/node_modules';

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
