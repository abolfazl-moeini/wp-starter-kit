<?php
/**
 * Build a production distribution tree under dist/{slug}/.
 *
 * Copies only shippable files, excludes dev artifacts, and writes a
 * .dist-built marker so CI/tests can verify the pipeline ran.
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

wpsk_rmtree($distRoot);
mkdir($distRoot, 0755, true);

$exclude = wpsk_dist_exclude_patterns();
wpsk_copy_tree($root, $distRoot, $exclude);

$marker = $distRoot . '/.dist-built';
file_put_contents($marker, gmdate('c') . "\n");

fwrite(STDOUT, "Built dist tree at {$distRoot}\n");