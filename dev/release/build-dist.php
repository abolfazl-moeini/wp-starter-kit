<?php
/**
 * Build a production distribution tree under dist/{slug}/, then
 * install dependencies and run Strauss to scope vendor code.
 *
 * Phase 23.A6 GREEN: the framework code lives in
 * `packages/framework/` (the wpsk/framework Composer package).
 * For the dist, the framework is installed as a dependency and
 * scoped by Strauss (the pre-Phase-23 strauss.json excluded
 * WPSK because the framework was a first-party copy; post-23 the
 * framework is a dep and SHOULD be scoped).
 *
 * Steps:
 *   1. Resolve the slug from project.config.json.
 *   2. Copy the kit's source tree into dist/{slug}/ (excluding
 *      dev-only files like tests/, dev/, node_modules/, etc.).
 *   3. Re-emit a CONSUMER-shaped composer.json into the dist:
 *        - requires wpsk/framework (path repo pointing at the
 *          kit's local packages/framework)
 *        - autoloads {Vendor}\\ → src/ (the user's own modules)
 *   4. Re-emit a CONSUMER-shaped strauss.json into the dist that
 *      DOES NOT exclude WPSK (the framework should be scoped).
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

$configPath = $root . '/project.config.json';
if (!is_file($configPath)) {
    fwrite(STDERR, "project.config.json not found at {$configPath}\n");
    exit(1);
}

$config = json_decode((string) file_get_contents($configPath), true);
if (!is_array($config) || empty($config['slug'])) {
    fwrite(STDERR, "project.config.json must contain a slug\n");
    exit(1);
}

$slug = (string) $config['slug'];
$distRoot = $root . '/dist/' . $slug;

$frameworkPath = $root . '/packages/framework';

/**
 * @param string $dir
 */
function wpsk_rmtree(string $dir): void
{
    if (!is_dir($dir)) {
        return;
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
            wpsk_rmtree($path);
        } else {
            unlink($path);
        }
    }
    rmdir($dir);
}

/**
 * @return list<string>
 */
function wpsk_dist_exclude_patterns(): array
{
    return [
        'tests',
        'dev',
        'node_modules',
        'vendor',
        'dist',
        '.git',
        '.github',
        '.husky',
        'coverage',
        '.phpunit.result.cache',
        'phpunit.xml',
        'phpstan.neon',
        'phpcs.xml',
        'rector.config.json',
        'tsconfig.json',
        '.eslintrc.cjs',
        '.prettierignore',
        'jest.config.mjs',
        'package-lock.json',
        'composer.lock',
        // Phase 23.A2b: the kit's `src/Core` + `src/Support` are
        // 1-line bridge shims that re-include the framework files
        // from the kit's own `packages/framework/`. In the dist
        // the framework is installed as a Composer dependency
        // (wpsk/framework) under vendor/, so the shims are dead
        // (and worse: they'd load the wrong path at runtime).
        // Exclude them from the dist tree.
        'src/Core',
        'src/Support',
    ];
}

/**
 * @param string $relative
 * @param list<string> $exclude
 */
function wpsk_should_exclude(string $relative, array $exclude): bool
{
    $normalized = str_replace('\\', '/', $relative);
    foreach ($exclude as $pattern) {
        if ($normalized === $pattern || str_starts_with($normalized, $pattern . '/')) {
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
function wpsk_copy_tree(string $src, string $dest, array $exclude): void
{
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($src, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );

    foreach ($iterator as $item) {
        /** @var SplFileInfo $item */
        $fullPath = $item->getPathname();
        $relative = substr($fullPath, strlen($src) + 1);

        if (wpsk_should_exclude($relative, $exclude)) {
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
function wpsk_build_dist_composer_json(array $config, string $frameworkPath): string
{
    $globalName = (string) ($config['globalName'] ?? 'WPSK');
    $vendorNamespaceLower = strtolower($globalName);
    $slug = (string) ($config['slug'] ?? 'wpsk');
    $description = (string) ($config['description'] ?? "{$slug} — WordPress plugin built on wp-starter-kit");
    $phpMin = (string) ($config['phpMinVersion'] ?? '7.4');
    $licenseId = (string) ($config['licenseId'] ?? 'GPL-2.0-or-later');

    // The vendor namespace root is the consumer's globalName. The
    // framework's WPSK\\ namespace is shipped as a dependency
    // (wpsk/framework) and resolved via the path repo.
    $payload = [
        'name' => "{$vendorNamespaceLower}/{$slug}",
        'description' => $description,
        'type' => 'wordpress-plugin',
        'license' => $licenseId,
        'repositories' => [
            [
                'type' => 'path',
                'url' => $frameworkPath,
                // symlink:false forces composer to MIRROR the
                // framework files into vendor/ instead of
                // symlinking. Strauss's vendoring step assumes
                // real on-disk files at vendor/{vendor}/{name}/
                // — symlinked paths confuse the Finders
                // (strauss 0.8.1 can't traverse the symlink +
                // dist-relative path correctly). The mirror
                // adds a few KB to the dist but keeps the
                // release flow hermetic.
                'options' => ['symlink' => false],
            ],
        ],
        'require' => [
            'php' => ">={$phpMin}",
            // wpsk/framework: *@dev is the path-repo-friendly
            // form (it accepts the dev-main version that path
            // repos resolve to). For the published-mode dep
            // (Phase 23.B), the require would be a pinned semver.
            'wpsk/framework' => '*@dev',
        ],
        'autoload' => [
            'psr-4' => [
                "{$globalName}\\" => 'src/',
            ],
        ],
        // Strauss reads config from composer.json extra/strauss
        // (NOT the standalone strauss.json file). Whitelist only
        // wpsk/framework so Strauss does not traverse
        // brianhenryie/strauss's symfony deps (array PSR-4 paths
        // crash FileEnumerator on strauss 0.11.x).
        'extra' => [
            'strauss' => [
                'target_directory' => 'vendor-prefixed',
                'namespace_prefix' => (string) ($config['vendorPrefix'] ?? 'WpskVendor'),
                'classmap_prefix' => ((string) ($config['vendorPrefix'] ?? 'WpskVendor')) . '_',
                'constant_prefix' => strtoupper((string) ($config['vendorPrefix'] ?? 'WpskVendor')) . '_',
                'delete_vendor_files' => true,
                'include_modified_files' => false,
                'packages' => ['wpsk/framework'],
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
        // Path repos resolve to `dev-main`. Accept dev versions
        // so the dist can install the framework from the local
        // path repo without an explicit override.
        'minimum-stability' => 'dev',
        'prefer-stable' => true,
    ];

    return json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
}

/**
 * @param array<string,mixed> $config
 * @return string JSON-encoded strauss.json
 */
function wpsk_build_dist_strauss_json(array $config): string
{
    $vendorPrefix = (string) ($config['vendorPrefix'] ?? 'WpskVendor');
    $payload = [
        'target_directory' => 'vendor-prefixed',
        'namespace_prefix' => $vendorPrefix,
        'classmap_prefix' => $vendorPrefix . '_',
        'constant_prefix' => strtoupper($vendorPrefix) . '_',
        // Phase 23.A6: WPSK is no longer excluded from prefixing.
        // The framework is a dependency (vendor/wpsk/framework/),
        // so its WPSK namespace SHOULD be scoped to
        // {vendorPrefix}\WPSK\... The dist's `vendor/` is the
        // only thing strauss touches, and the framework lives
        // there.
        'delete_vendor_files' => true,
        'include_modified_files' => false,
        // Whitelist: only process wpsk/framework. Strauss 0.8.1
        // chokes on multi-dir PSR-4 entries (e.g. some symfony
        // polyfills ship `"X\\": ["src/", "Resources/"]`). The
        // dist's vendor/ also contains the bundled dev tools
        // (brianhenryie/strauss + symfony/* + composer/*), which
        // we don't want scoped — only the framework.
        'packages' => ['wpsk/framework'],
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
function wpsk_run(string $cmd, string $cwd): array
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

/* -------------------------------------------------------------------- */
/* Step 1: prepare dist tree (clean + copy)                              */
/* -------------------------------------------------------------------- */

wpsk_rmtree($distRoot);
mkdir($distRoot, 0755, true);

$exclude = wpsk_dist_exclude_patterns();
wpsk_copy_tree($root, $distRoot, $exclude);

/**
 * Phase 23.A2 → 23.A6: the framework's `src/Core/` and
 * `src/Support/` moved into the `wpsk/framework` Composer
 * package (`packages/framework/src/`). The dist installs the
 * framework as a dependency via `composer install --no-dev`
 * (below), so we do NOT copy the framework into the dist's
 * `src/` — that would create a namespace conflict (the
 * project's own `WPSK\\` autoload and the framework's
 * `WPSK\\` autoload would both resolve to `src/`).
 */
$marker = $distRoot . '/.dist-built';
file_put_contents($marker, gmdate('c') . "\n");

fwrite(STDOUT, "Built dist tree at {$distRoot}\n");

/* -------------------------------------------------------------------- */
/* Step 2: emit consumer composer.json + strauss.json (Phase 23.A6)     */
/* -------------------------------------------------------------------- */

file_put_contents(
    $distRoot . '/composer.json',
    wpsk_build_dist_composer_json($config, $frameworkPath)
);
file_put_contents(
    $distRoot . '/strauss.json',
    wpsk_build_dist_strauss_json($config)
);

fwrite(STDOUT, "Emitted consumer composer.json + strauss.json in dist\n");

/* -------------------------------------------------------------------- */
/* Step 3: composer install --no-dev (install the framework dep)       */
/* -------------------------------------------------------------------- */

[$installExit, $installOut] = wpsk_run(
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

[$straussExit, $straussOut] = wpsk_run(
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

/* -------------------------------------------------------------------- */
/* Step 5: write the .dist-built marker (post-release)                  */
/* -------------------------------------------------------------------- */

$marker = $distRoot . '/.dist-built';
file_put_contents(
    $marker,
    gmdate('c') . "\nframework_scoped=1\n"
);

fwrite(STDOUT, "Built dist tree at {$distRoot}\n");
