<?php
/**
 * WPDev\TestTools\Patch\GitPatch — applies unified-diff patches using
 * `git apply` via symfony/process.
 *
 * Ported from sample-plugin/packages/php-test-tools/src/Patch/GitPatch.php.
 * The private `WPDev\Cli\Console\Process` dependency has been replaced with
 * `symfony/process` (publicly available via composer).
 *
 * Behaviour preserved from the source:
 *   - `git apply <patch> [--check]` with the flags used by sample-plugin.
 *   - Throws RuntimeException with a clear message on failure.
 *   - Honours the `GIT_PATH` env var (default: `git`).
 *
 * @see /Users/moeini/Documents/ideas/extend-kit/plan.md §6.0.3
 */

declare(strict_types=1);

namespace WPDev\TestTools\Patch;

use RuntimeException;
use Symfony\Component\Process\Process;

final class GitPatch
{
    /**
     * Apply a patch to `$root_dir`.
     *
     * @param string $patch_file Absolute path to a unified-diff patch file.
     * @param string $root_dir   Directory that the patch is relative to
     *                           (passed as `git -C <root_dir> apply ...`).
     *
     * @throws RuntimeException When `git apply` exits non-zero.
     */
    public function apply(string $patch_file, string $root_dir): bool
    {
        return $this->run($patch_file, $root_dir, false);
    }

    /**
     * Verify a patch would apply cleanly to `$root_dir` (no modifications).
     *
     * @throws RuntimeException When `git apply --check` exits non-zero.
     */
    public function verify(string $patch_file, string $root_dir): bool
    {
        return $this->run($patch_file, $root_dir, true);
    }

    /**
     * Resolve the git binary to use. Honours the `GIT_PATH` env var.
     */
    public function git_command(): string
    {
        $git_bin_path = (string) getenv('GIT_PATH');

        return $git_bin_path === '' ? 'git' : $git_bin_path;
    }

    /**
     * @param bool $only_check If true, pass `--check` (dry run).
     */
    private function run(string $patch_file, string $root_dir, bool $only_check): bool
    {
        if (!is_file($patch_file)) {
            throw new RuntimeException(sprintf('git apply: patch file not found: %s', $patch_file));
        }
        if (!is_dir($root_dir)) {
            throw new RuntimeException(sprintf('git apply: root dir not found: %s', $root_dir));
        }

        $command = [
            $this->git_command(),
            '-C',
            $root_dir,
            'apply',
            $patch_file,
        ];
        if ($only_check) {
            $command[] = '--check';
        }
        $command[] = '--verbose';
        $command[] = '--ignore-space-change';
        $command[] = '--ignore-whitespace';
        $command[] = '--whitespace=fix';

        // Disable timeout — patches on real WP plugins can be large.
        $process = new Process($command, $root_dir, null, null, 0.0);

        $process->run();

        if (!$process->isSuccessful()) {
            $stderr = trim($process->getErrorOutput() !== '' ? $process->getErrorOutput() : $process->getOutput());

            throw new RuntimeException(sprintf(
                'git apply failed in %s (exit %d): %s',
                $root_dir,
                $process->getExitCode() ?? -1,
                $stderr !== '' ? $stderr : 'no error output'
            ));
        }

        return true;
    }
}
