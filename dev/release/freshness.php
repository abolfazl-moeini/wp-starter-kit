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
    $cfgPath = $root . '/wpdev.json';
    if (!is_file($cfgPath)) {
        $cfgPath = $root . '/project.config.json';
    }
    $cfg = is_file($cfgPath) ? json_decode((string) file_get_contents($cfgPath), true) : [];
    if (!is_array($cfg)) {
        $cfg = [];
    }
    $cfgMtime = is_file($cfgPath) ? (filemtime($cfgPath) ?: 0) : 0;

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
        if (!is_string($name) || $name === '') {
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

        // Compare newest source mtime (and wpdev.json mtime) vs bundle
        $moduleAssetsDir = $root . '/src/Modules/' . $moduleDir . '/assets';
        $maxSourceMtime = wpdev_dir_max_mtime($moduleAssetsDir);
        if ($maxSourceMtime === 0) {
            $maxSourceMtime = filemtime($entry) ?: 0;
        }
        $effectiveSourceMtime = max($maxSourceMtime, $cfgMtime);

        if ($effectiveSourceMtime > $bundleMtimeJs || $effectiveSourceMtime > $bundleMtimePhp) {
            return false;
        }
    }

    // Check shared dependencies entry vs deps bundle
    $depsSourceTs = $root . '/assets/dependencies.ts';
    $depsSourceJs = $root . '/assets/dependencies.js';
    $depsSource = is_file($depsSourceTs) ? $depsSourceTs : (is_file($depsSourceJs) ? $depsSourceJs : null);

    if ($depsSource !== null) {
        $depsBundle = (string) ($cfg['depsBundle'] ?? 'wpdev-starter-deps.js');

        $depsBundleJs = $root . '/assets/bundles/' . $depsBundle;
        $depsBundlePhp = preg_replace('/\.js$/', '.asset.php', $depsBundleJs);

        if (!is_string($depsBundlePhp) || $depsBundlePhp === $depsBundleJs || !is_file($depsBundleJs) || !is_file($depsBundlePhp)) {
            return false;
        }

        $depsSourceMtime = filemtime($depsSource);
        $depsJsMtime = filemtime($depsBundleJs);
        $depsPhpMtime = filemtime($depsBundlePhp);

        if ($depsSourceMtime === false || $depsJsMtime === false || $depsPhpMtime === false) {
            return false;
        }

        $effectiveDepsMtime = max($depsSourceMtime, $cfgMtime);
        if ($effectiveDepsMtime > $depsJsMtime || $effectiveDepsMtime > $depsPhpMtime) {
            return false;
        }

        // Verify shared Preact vendor bundle when uiFramework === 'preact'
        if (($cfg['uiFramework'] ?? '') === 'preact') {
            if (!is_file($root . '/assets/bundles/preact.js') || !is_file($root . '/assets/bundles/preact.asset.php')) {
                return false;
            }
        }
    }

    // Check style entry points (wpdev.json build.styleEntryPoints or legacy build.config.json)
    $styleEntries = [];
    if (isset($cfg['build']['styleEntryPoints']) && is_array($cfg['build']['styleEntryPoints'])) {
        $styleEntries = $cfg['build']['styleEntryPoints'];
    } elseif (is_file($root . '/build.config.json')) {
        $buildCfg = json_decode((string) file_get_contents($root . '/build.config.json'), true);
        $styleEntries = is_array($buildCfg) ? ($buildCfg['styleEntryPoints'] ?? []) : [];
    }

    foreach ($styleEntries as $styleEntry) {
        $absStyle = $root . '/' . ltrim((string) $styleEntry, '/');
        if (!is_file($absStyle)) {
            continue;
        }
        $assetPhp = preg_replace('/\.css$/i', '.asset.php', $absStyle);
        if (!is_string($assetPhp) || $assetPhp === $absStyle || !is_file($assetPhp)) {
            return false;
        }
        $styleMtime = filemtime($absStyle);
        $assetMtime = filemtime($assetPhp);
        if ($styleMtime === false || $assetMtime === false || $styleMtime > $assetMtime) {
            return false;
        }
    }

    return true;
}
