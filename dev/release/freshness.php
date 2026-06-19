<?php
declare(strict_types=1);

/**
 * Compare module entry sources against built bundles.
 *
 * @return bool true when all bundles are fresh (or no entries exist); false when stale.
 */
function wpdev_check_build_freshness(string $root): bool
{
    $entriesPattern = $root . '/src/Modules/*/assets/entries/*.{ts,js}';
    $entries = array_merge(
        glob($root . '/src/Modules/*/assets/entries/*.ts') ?: [],
        glob($root . '/src/Modules/*/assets/entries/*.js') ?: []
    );

    foreach ($entries as $entry) {
        $moduleDir = basename(dirname(dirname(dirname($entry))));
        $base = basename($entry);
        $name = preg_replace('/\.(ts|js)$/', '', $base);
        if ($name === null || $name === '') {
            continue;
        }

        $bundleJs = $root . '/assets/bundles/' . $moduleDir . '-' . $name . '.js';
        $bundlePhp = $root . '/assets/bundles/' . $moduleDir . '-' . $name . '.asset.php';

        if (!is_file($bundleJs) && !is_file($bundlePhp)) {
            return false;
        }

        $entryMtime = filemtime($entry);
        if ($entryMtime === false) {
            return false;
        }

        if (is_file($bundleJs)) {
            $bundleMtime = filemtime($bundleJs);
            if ($bundleMtime === false || $entryMtime > $bundleMtime) {
                return false;
            }
        }

        if (is_file($bundlePhp)) {
            $bundleMtime = filemtime($bundlePhp);
            if ($bundleMtime === false || $entryMtime > $bundleMtime) {
                return false;
            }
        }
    }

    return true;
}