<?php
/**
 * Build a production distribution tree under dist/{slug}/, then
 * install dependencies and run Strauss to scope vendor code.
 *
 * Phase 23.A6 GREEN: the framework code lives in
 * `packages/framework/` (the wpdev/framework Composer package).
 * For the dist, the framework is installed as a dependency and
 * scoped by Strauss (the pre-Phase-23 strauss.json excluded
 * WPDev because the framework was a first-party copy; post-23 the
 * framework is a dep and SHOULD be scoped).
 *
 * Steps:
 *   1. Resolve the slug from wpdev.json (legacy project.config.json
 *      accepted as a fallback).
 *   2. Copy the kit's source tree into dist/{slug}/ (excluding
 *      dev-only files like tests/, dev/, node_modules/, etc.).
 *   3. Re-emit a CONSUMER-shaped composer.json into the dist:
 *        - requires wpdev/framework (path repo pointing at the
 *          kit's local packages/framework)
 *        - autoloads {Vendor}\\ → src/ (the user's own modules)
 *   4. Re-emit a CONSUMER-shaped strauss.json into the dist that
 *      DOES NOT exclude WPDev (the framework should be scoped).
 *   5. Run `composer install --no-dev` inside the dist.
 *   6. Run `vendor/bin/strauss` inside the dist.
 *
 * The release flow can fail mid-way (network down, etc.); the
 * script reports each step's status and exits non-zero on
 * failure. CI uses the same `php dev/release/build-dist.php`
 * command the kit's local dev uses.
 *
 * Usage: php dev/release/build-dist.php
 */
declare(strict_types=1);

$root = dirname(__DIR__, 2);

$configPath = $root . '/wpdev.json';
if (!is_file($configPath)) {
    $configPath = $root . '/project.config.json';
}
if (!is_file($configPath)) {
    fwrite(STDERR, "Project config not found (tried wpdev.json / project.config.json) under {$root}\n");
    exit(1);
}

$config = json_decode((string) file_get_contents($configPath), true);
if (!is_array($config) || empty($config['slug'])) {
    fwrite(STDERR, "Project config must contain a slug ({$configPath})\n");
    exit(1);
}

$slug = (string) $config['slug'];
$distRoot = $root . '/dist/' . $slug;

$frameworkPath = $root . '/packages/framework';

/**
 * @param string $dir
 */
function wpdev_rmtree(string $dir): void
{
    if (!is_dir($dir)) {
        return;
    }
    if (DIRECTORY_SEPARATOR === '/') {
        exec('rm -rf ' . escapeshellarg($dir));
        if (!is_dir($dir)) {
            return;
        }
    }
    $items = scandir($dir);
    if ($items === false) {
        return;
    }
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $path = $dir . '/' . $item;
        if (is_dir($path)) {
            wpdev_rmtree($path);
        } else {
            unlink($path);
        }
    }
    rmdir($dir);
}

/**
 * @return array{root: list<string>, any: list<string>}
 */
function wpdev_dist_exclude_patterns(): array
{
    return [
        'root' => [
            'packages',
            'core',
            'tools',
            'skills',
            'migration',
            'docs',
            'build',
            'examples',
            'wp-content',
            'types',
            'tests',
            'dev',
            'dist',
            'coverage',
            '.phpunit.result.cache',
            'phpunit.xml',
            'phpunit.xml.dist',
            'phpstan.neon',
            'phpcs.xml',
            'rector.config.json',
            'tsconfig.json',
            '.eslintrc.cjs',
            '.prettierignore',
            'jest.config.mjs',
            'package.json',
            'package-lock.json',
            'composer.lock',
            'wpdev.example.json',
            'budget-ledger.json',
            'AGENTS.md',
            'CLAUDE.md',
            'README.md',
            'CHANGELOG.md',
            'commitlint.config.cjs',
            'babel.config.js',
            '.npmrc',
            '.gitmodules',
            '.gitignore',
            '.editorconfig',
            '.idea',
            '.claude',
            '.workbuddy-ai',
            '.vscode',
            // Bridge shims are eliminated from source, but defensively excluded
            // here in case legacy artifacts exist in older worktrees.
            'src/Core',
            'src/Support',
            'src/Adapters',
        ],
        'any' => [
            '.git',
            '.github',
            '.husky',
            'node_modules',
            'vendor',
            '.DS_Store',
            '.idea',
            '.claude',
            '.workbuddy-ai',
            '.vscode',
        ],
    ];
}

/**
 * @param string $relative
 * @param array{root?: list<string>, any?: list<string>}|list<string> $exclude
 */
function wpdev_should_exclude(string $relative, array $exclude): bool
{
    $normalized = str_replace('\\', '/', $relative);

    if (isset($exclude['root']) || isset($exclude['any'])) {
        foreach ($exclude['root'] ?? [] as $pattern) {
            if ($normalized === $pattern || str_starts_with($normalized, $pattern . '/')) {
                return true;
            }
        }
        $segments = explode('/', $normalized);
        foreach ($exclude['any'] ?? [] as $pattern) {
            if (in_array($pattern, $segments, true)) {
                return true;
            }
        }
        return false;
    }

    foreach ($exclude as $pattern) {
        if ($normalized === $pattern || str_starts_with($normalized, $pattern . '/')) {
            return true;
        }
        $segments = explode('/', $normalized);
        if (in_array($pattern, $segments, true)) {
            return true;
        }
    }
    return false;
}

/**
 * @param string $src
 * @param string $dest
 * @param list<string> $exclude
 */
function wpdev_copy_tree(string $src, string $dest, array $exclude): void
{
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($src, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );

    foreach ($iterator as $item) {
        /** @var SplFileInfo $item */
        $fullPath = $item->getPathname();
        $relative = substr($fullPath, strlen($src) + 1);

        if (wpdev_should_exclude($relative, $exclude)) {
            continue;
        }

        $target = $dest . '/' . $relative;
        if ($item->isDir()) {
            if (!is_dir($target)) {
                mkdir($target, 0755, true);
            }
            continue;
        }

        $targetDir = dirname($target);
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }
        copy($fullPath, $target);
    }
}

/**
 * @param array<string,mixed> $config
 * @param string $frameworkPath
 * @return string JSON-encoded composer.json
 */
function wpdev_build_dist_composer_json(array $config, string $frameworkPath): string
{
    $globalName = (string) ($config['globalName'] ?? 'WPDev');
    $vendorPrefix = (string) ($config['vendorPrefix'] ?? 'WpdevVendor');
    $vendorNamespaceLower = strtolower($globalName);
    $slug = (string) ($config['slug'] ?? 'wpdev');
    $description = (string) ($config['description'] ?? "{$slug} — WordPress plugin built on wp-starter-kit");
    $phpMin = (string) ($config['phpMinVersion'] ?? '7.4');
    $licenseId = (string) ($config['licenseId'] ?? 'GPL-2.0-or-later');

    // If globalName is WPDev (kit root), map the prefixed namespace in PSR-4 to src/.
    $psr4Map = $globalName === 'WPDev'
        ? ["{$vendorPrefix}\\{$globalName}\\" => 'src/']
        : ["{$globalName}\\" => 'src/'];

    $ftPath = dirname($frameworkPath) . '/php-fault-tolerance';
    $hasFaultTolerance = is_dir($ftPath) && is_file($ftPath . '/composer.json');

    $repositories = [
        [
            'type' => 'path',
            'url' => $frameworkPath,
            'options' => ['symlink' => false],
        ],
    ];
    $require = [
        'php' => ">={$phpMin}",
        'wpdev/framework' => '*@dev',
    ];
    $straussPackages = ['wpdev/framework'];

    if ($hasFaultTolerance) {
        $repositories[] = [
            'type' => 'path',
            'url' => $ftPath,
            'options' => ['symlink' => false],
        ];
        $require['wpdev/php-fault-tolerance'] = '*@dev';
        $straussPackages[] = 'wpdev/php-fault-tolerance';
    }

    $payload = [
        'name' => "{$vendorNamespaceLower}/{$slug}",
        'description' => $description,
        'type' => 'wordpress-plugin',
        'license' => $licenseId,
        'repositories' => $repositories,
        'require' => $require,
        'autoload' => [
            'psr-4' => $psr4Map,
            'files' => [
                'includes/asset-functions.php',
            ],
        ],
        'extra' => [
            'strauss' => [
                'target_directory' => 'vendor-prefixed',
                'namespace_prefix' => $vendorPrefix,
                'classmap_prefix' => $vendorPrefix . '_',
                'constant_prefix' => strtoupper($vendorPrefix) . '_',
                'delete_vendor_files' => false,
                'include_modified_files' => false,
                'packages' => $straussPackages,
                'exclude_from_prefix' => [
                    'namespaces' => [],
                    'file_patterns' => [],
                ],
                'exclude_from_copy' => [
                    'namespaces' => [],
                    'file_patterns' => [],
                ],
            ],
        ],
        'minimum-stability' => 'dev',
        'prefer-stable' => true,
    ];

    return json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
}

/**
 * Rewrite namespace references in all dist PHP files outside vendor directories.
 */
function wpdev_rewrite_php_file_namespace(string $path, string $fromNs, string $toNs): void
{
    if (!is_file($path)) {
        return;
    }
    $content = (string) file_get_contents($path);

    // 1. Quoted string literals with double backslashes (e.g. "WPDev\\Core" or '\WPDev\\Core')
    $updated = preg_replace_callback(
        '/(^|[^A-Za-z0-9_\\\\])(\\\\\\\\)?(' . preg_quote($fromNs, '/') . ')(\\\\\\\\[A-Za-z0-9_]+)/',
        static function ($m) use ($toNs) {
            $toNsDouble = str_replace('\\', '\\\\', $toNs);
            return $m[1] . $m[2] . $toNsDouble . $m[4];
        },
        $content
    );

    // 2. Unquoted PHP code / single backslash (e.g. \WPDev\Core or WPDev\Core)
    $updated = preg_replace_callback(
        '/(^|[^A-Za-z0-9_\\\\])(\\\\)?(' . preg_quote($fromNs, '/') . ')(\\\\[A-Za-z0-9_]+)/',
        static function ($m) use ($toNs) {
            return $m[1] . $m[2] . $toNs . $m[4];
        },
        (string) $updated
    );

    if ($updated !== null && $updated !== $content) {
        file_put_contents($path, $updated);
    }
}

function wpdev_rewrite_namespace_references(string $dir, string $fromNs, string $toNs, bool $skipVendor = true): void
{
    if ($fromNs === $toNs || $fromNs === '' || $toNs === '') {
        return;
    }
    if (!is_dir($dir)) {
        return;
    }
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $item) {
        /** @var SplFileInfo $item */
        if ($item->isDir() || $item->getExtension() !== 'php') {
            continue;
        }
        $path = $item->getPathname();
        if ($skipVendor) {
            $relative = substr($path, strlen($dir) + 1);
            if (strpos($relative, 'vendor/') === 0 || strpos($relative, 'vendor-prefixed/') === 0) {
                continue;
            }
        }
        wpdev_rewrite_php_file_namespace($path, $fromNs, $toNs);
    }
}

/**
 * @param array<string,mixed> $config
 * @return string JSON-encoded strauss.json
 */
function wpdev_build_dist_strauss_json(array $config, string $frameworkPath = ''): string
{
    $vendorPrefix = (string) ($config['vendorPrefix'] ?? 'WpdevVendor');
    $packages = ['wpdev/framework'];
    if ($frameworkPath !== '') {
        $ftPath = dirname($frameworkPath) . '/php-fault-tolerance';
        if (is_dir($ftPath) && is_file($ftPath . '/composer.json')) {
            $packages[] = 'wpdev/php-fault-tolerance';
        }
    }

    $payload = [
        'target_directory' => 'vendor-prefixed',
        'namespace_prefix' => $vendorPrefix,
        'classmap_prefix' => $vendorPrefix . '_',
        'constant_prefix' => strtoupper($vendorPrefix) . '_',
        'delete_vendor_files' => false,
        'include_modified_files' => false,
        'packages' => $packages,
        'exclude_from_prefix' => [
            'namespaces' => [],
            'file_patterns' => [],
        ],
        'exclude_from_copy' => [
            'namespaces' => [],
            'file_patterns' => [],
        ],
    ];

    return json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
}

/**
 * Run a shell command, capture stdout+stderr, return [exitCode, output].
 *
 * @return array{0:int,1:string}
 */
function wpdev_run(string $cmd, string $cwd): array
{
    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $proc = proc_open($cmd, $descriptors, $pipes, $cwd);
    if (!is_resource($proc)) {
        return [1, "Failed to spawn: {$cmd}"];
    }
    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[2]);
    $exit = proc_close($proc);
    $out = trim((string) $stdout) . "\n" . trim((string) $stderr);
    return [$exit, $out];
}

require_once __DIR__ . '/freshness.php';

$skipFreshness = in_array('--skip-freshness', $argv, true);
if (in_array('--with-docs', $argv, true)) {
    fwrite(
        STDERR,
        "dev/release/build-dist.php does not compile docs directly. Use the consumer release CLI (`wpdev release --with-docs` / `packages/create-wp-project/src/release/run-release.js --with-docs`) which delegates to wpdev-manual.\n"
    );
    exit(1);
}
if (!$skipFreshness && !wpdev_check_build_freshness($root)) {
    fwrite(STDERR, "Build outputs are stale. Run 'npm run build' first.\n");
    exit(1);
}

/* -------------------------------------------------------------------- */
/* Step 1: prepare dist tree (clean + copy)                              */
/* -------------------------------------------------------------------- */

wpdev_rmtree($distRoot);
mkdir($distRoot, 0755, true);

$exclude = wpdev_dist_exclude_patterns();
wpdev_copy_tree($root, $distRoot, $exclude);

fwrite(STDOUT, "Built dist tree at {$distRoot}\n");

/* -------------------------------------------------------------------- */
/* Step 2: emit consumer composer.json + strauss.json (Phase 23.A6)     */
/* -------------------------------------------------------------------- */

file_put_contents(
    $distRoot . '/composer.json',
    wpdev_build_dist_composer_json($config, $frameworkPath)
);
file_put_contents(
    $distRoot . '/strauss.json',
    wpdev_build_dist_strauss_json($config, $frameworkPath)
);

fwrite(STDOUT, "Emitted consumer composer.json + strauss.json in dist\n");

/* -------------------------------------------------------------------- */
/* Step 3: composer install --no-dev (install the framework dep)       */
/* -------------------------------------------------------------------- */

[$installExit, $installOut] = wpdev_run(
    'composer install --no-dev --no-interaction --no-progress 2>&1',
    $distRoot
);
if ($installExit !== 0) {
    fwrite(
        STDERR,
        "composer install --no-dev failed in {$distRoot} (exit {$installExit}):\n{$installOut}\n"
    );
    exit($installExit);
}
fwrite(STDOUT, "composer install --no-dev completed in dist\n");

/* -------------------------------------------------------------------- */
/* Step 4: Strauss (scope vendor/) — uses the kit's binary              */
/* -------------------------------------------------------------------- */

$straussBin = $root . '/vendor/bin/strauss';
if (!is_file($straussBin)) {
    fwrite(
        STDERR,
        "Kit vendor/bin/strauss missing — run `composer install` in the kit root first.\n"
    );
    exit(1);
}

[$straussExit, $straussOut] = wpdev_run(
    'php ' . escapeshellarg($straussBin) . ' 2>&1',
    $distRoot
);
if ($straussExit !== 0) {
    fwrite(
        STDERR,
        "vendor/bin/strauss failed in {$distRoot} (exit {$straussExit}):\n{$straussOut}\n"
    );
    exit($straussExit);
}
fwrite(STDOUT, "vendor/bin/strauss completed in dist\n");

$vendorPrefix = (string) ($config['vendorPrefix'] ?? 'WpdevVendor');

$ftPath = dirname($frameworkPath) . '/php-fault-tolerance';
if (is_dir($ftPath . '/src')) {
    $targetFtSrc = $distRoot . '/vendor-prefixed/wpdev/php-fault-tolerance/src';
    if (!is_dir($targetFtSrc)) {
        mkdir($targetFtSrc, 0755, true);
    }
    wpdev_copy_tree($ftPath . '/src', $targetFtSrc, []);
    // Scope Real/, Stub/, and functions.php so php-fault-tolerance classes match the vendor prefix.
    // bootstrap.php's autoloader regex already matches both prefixed and unprefixed namespaces.
    wpdev_rewrite_namespace_references($targetFtSrc . '/Real', 'WPDev', "{$vendorPrefix}\\WPDev", false);
    wpdev_rewrite_namespace_references($targetFtSrc . '/Stub', 'WPDev', "{$vendorPrefix}\\WPDev", false);
    wpdev_rewrite_php_file_namespace($targetFtSrc . '/functions.php', 'WPDev', "{$vendorPrefix}\\WPDev");
}

/* -------------------------------------------------------------------- */
/* Step 5: scope callers and downgrade syntax                           */
/* -------------------------------------------------------------------- */

wpdev_rewrite_namespace_references($distRoot, 'WPDev', "{$vendorPrefix}\\WPDev");
fwrite(STDOUT, "Rewrote namespace references in dist\n");

/* -------------------------------------------------------------------- */
/* Step 6: Rector downgrade to phpMinVersion (Finding #5)              */
/* -------------------------------------------------------------------- */

$rectorBin = $root . '/vendor/bin/rector';
$rectorBuildCfg = $root . '/dev/rector-build.php';
$skipRector = in_array('--skip-rector', $argv, true);

if (!$skipRector && is_file($rectorBin) && is_file($rectorBuildCfg)) {
    putenv("WPDEV_RECTOR_ROOT={$distRoot}");
    [$rectorExit, $rectorOut] = wpdev_run(
        'php ' . escapeshellarg($rectorBin) . ' process ' . escapeshellarg($distRoot) . ' -c ' . escapeshellarg($rectorBuildCfg) . ' --clear-cache 2>&1',
        $distRoot
    );
    if ($rectorExit !== 0) {
        fwrite(STDERR, "rector:build failed in {$distRoot} (exit {$rectorExit}):\n{$rectorOut}\n");
        exit($rectorExit);
    }
    fwrite(STDOUT, "rector downgrade completed in dist\n");
}

// Remove unprefixed framework/vendor packages from vendor/ and dump authoritative autoload AFTER rector
wpdev_rmtree($distRoot . '/vendor/wpdev');
[$dumpExit, $dumpOut] = wpdev_run(
    'composer dump-autoload --no-dev --classmap-authoritative 2>&1',
    $distRoot
);
if ($dumpExit !== 0) {
    fwrite(STDERR, "composer dump-autoload failed in {$distRoot} (exit {$dumpExit}):\n{$dumpOut}\n");
    exit($dumpExit);
}
fwrite(STDOUT, "composer dump-autoload completed in dist\n");

/* -------------------------------------------------------------------- */
/* Step 7: write the .dist-built marker (post-release)                  */
/* -------------------------------------------------------------------- */

$marker = $distRoot . '/.dist-built';
file_put_contents(
    $marker,
    gmdate('c') . "\nframework_scoped=1\n"
);

fwrite(STDOUT, "Built dist tree at {$distRoot}\n");
