<?php
declare(strict_types=1);

/**
 * Return maximum filemtime across all files in a directory.
 */
function wpdev_dir_max_mtime(string $dir): int
{
    if (!is_dir($dir)) {
        return 0;
    }
    $max = 0;
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $item) {
        /** @var SplFileInfo $item */
        if ($item->isFile()) {
            $mtime = $item->getMTime();
            if ($mtime > $max) {
                $max = $mtime;
            }
        }
    }
    return $max;
}

/**
 * Compare module entry sources and dependency sources against built bundles.
 *
 * @return bool true when all bundles are fresh (or no entries exist); false when stale.
 */
function wpdev_check_build_freshness(string $root): bool
{
    $entries = array_merge(
        glob($root . '/src/Modules/*/assets/entries/*.ts') ?: [],
        glob($root . '/src/Modules/*/assets/entries/*.tsx') ?: [],
        glob($root . '/src/Modules/*/assets/entries/*.js') ?: [],
        glob($root . '/src/Modules/*/assets/entries/*.jsx') ?: []
    );

    foreach ($entries as $entry) {
        $moduleDir = basename(dirname(dirname(dirname($entry))));
        $base = basename($entry);
        $name = preg_replace('/\.(ts|tsx|js|jsx)$/', '', $base);
        if ($name === null || $name === '') {
            continue;
        }

        $bundleJs = $root . '/assets/bundles/' . $moduleDir . '-' . $name . '.js';
        $bundlePhp = $root . '/assets/bundles/' . $moduleDir . '-' . $name . '.asset.php';

        if (!is_file($bundleJs) || !is_file($bundlePhp)) {
            return false;
        }

        $bundleMtimeJs = filemtime($bundleJs);
        $bundleMtimePhp = filemtime($bundlePhp);
        if ($bundleMtimeJs === false || $bundleMtimePhp === false) {
            return false;
        }

        // Compare newest source mtime in the module's assets directory vs bundle
        $moduleAssetsDir = $root . '/src/Modules/' . $moduleDir . '/assets';
        $maxSourceMtime = wpdev_dir_max_mtime($moduleAssetsDir);
        if ($maxSourceMtime === 0) {
            $maxSourceMtime = filemtime($entry) ?: 0;
        }

        if ($maxSourceMtime > $bundleMtimeJs || $maxSourceMtime > $bundleMtimePhp) {
            return false;
        }
    }

    // Check shared dependencies entry vs deps bundle
    $depsSourceTs = $root . '/assets/dependencies.ts';
    $depsSourceJs = $root . '/assets/dependencies.js';
    $depsSource = is_file($depsSourceTs) ? $depsSourceTs : (is_file($depsSourceJs) ? $depsSourceJs : null);

    if ($depsSource !== null) {
        $cfgPath = $root . '/wpdev.json';
        if (!is_file($cfgPath)) {
            $cfgPath = $root . '/project.config.json';
        }
        $cfg = is_file($cfgPath) ? json_decode((string) file_get_contents($cfgPath), true) : [];
        $depsBundle = (string) ($cfg['depsBundle'] ?? 'wpdev-starter-deps.js');

        $depsBundleJs = $root . '/assets/bundles/' . $depsBundle;
        $depsBundlePhp = preg_replace('/\.js$/', '.asset.php', $depsBundleJs);

        if (!is_file($depsBundleJs) || !is_file($depsBundlePhp)) {
            return false;
        }

        $depsSourceMtime = filemtime($depsSource);
        $depsJsMtime = filemtime($depsBundleJs);
        $depsPhpMtime = filemtime($depsBundlePhp);

        if ($depsSourceMtime === false || $depsJsMtime === false || $depsPhpMtime === false) {
            return false;
        }

        if ($depsSourceMtime > $depsJsMtime || $depsSourceMtime > $depsPhpMtime) {
            return false;
        }
    }

    return true;
}
