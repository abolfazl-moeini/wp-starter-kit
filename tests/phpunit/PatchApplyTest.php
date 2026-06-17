<?php
/**
 * End-to-end Patch system tests (Phase 7.4).
 *
 * VERIFIER FEEDBACK INCORPORATED (2026-06-14, cycle 2):
 *
 *   (a) "tests write the target file to $root_dir/target/hello.txt but
 *        GitPatch::apply runs 'git -C $root_dir apply' which patches at
 *        $root_dir, so the wrong file gets checked"
 *
 *       FIX: The target file is placed at $root_dir/hello.txt (TOP LEVEL,
 *       no subdir). The patch path is `a/hello.txt` / `b/hello.txt` so it
 *       resolves to $root_dir/hello.txt under `git -C $root_dir apply`.
 *
 *   (b) "mismatch tests don't 'git init' the temp dir so 'git apply' silently
 *        creates the file instead of failing on context search, leaving
 *        Cli::errors empty"
 *
 *       FIX: setUp() runs `git init -q && git config user.email test@test
 *       && git config user.name test && git add -A && git commit -q -m baseline`
 *       so `git apply` enforces context matching against the committed
 *       baseline. The mismatch test patches a line that does NOT exist in
 *       the committed file, so context matching actually fails.
 */

use PHPUnit\Framework\TestCase;
use WPDev\TestTools\Patch\Cli;
use WPDev\TestTools\Patch\GitPatch;

class PatchApplyTest extends TestCase
{
    /** @var string */
    private $tmpRoot;

    protected function setUp(): void
    {
        parent::setUp();

        // Cli::$errors is a static; reset it before every test so the
        // assertion on empty/non-empty depends only on the current run.
        Cli::$errors = [];

        $this->tmpRoot = sys_get_temp_dir() . '/wpdev-patch-apply-' . uniqid('', true);
        mkdir($this->tmpRoot, 0777, true);

        // Initialise a git repo so `git apply` enforces context matching
        // against a committed baseline. Without this, the "mismatch" path
        // would silently create the file (no context to check) and the
        // test would falsely pass.
        $this->runInShell('git init -q');
        $this->runInShell('git config user.email test@test');
        $this->runInShell('git config user.name test');
    }

    protected function tearDown(): void
    {
        $this->wpdevRrmdir($this->tmpRoot);
        Cli::$errors = [];
        parent::tearDown();
    }

    private function runInShell(string $cmd): void
    {
        $exit = 0;
        $out = [];
        exec(sprintf('cd %s && %s 2>&1', escapeshellarg($this->tmpRoot), $cmd), $out, $exit);
        if ($exit !== 0) {
            $this->fail(sprintf(
                "shell command failed (exit %d): %s\nOutput: %s",
                $exit,
                $cmd,
                implode("\n", $out)
            ));
        }
    }

    private function wpdevRrmdir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $git = $dir . '/.git';
        if (is_dir($git) || is_file($git)) {
            exec('rm -rf ' . escapeshellarg($git) . ' 2>/dev/null');
        }
        foreach (scandir($dir) as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $path = $dir . DIRECTORY_SEPARATOR . $entry;
            if (is_dir($path)) {
                $this->wpdevRrmdir($path);
            } else {
                @unlink($path);
            }
        }
        @rmdir($dir);
    }

    public function test_git_patch_applies_tiny_patch_against_committed_file_at_root(): void
    {
        // Place the file at the TOP LEVEL of the temp root.
        file_put_contents($this->tmpRoot . '/hello.txt', "OLD LINE\n");
        $patch_file = $this->tmpRoot . '/hello.patch';
        file_put_contents(
            $patch_file,
            "diff --git a/hello.txt b/hello.txt\n"
            . "index 3b18e51..ce01362 100644\n"
            . "--- a/hello.txt\n"
            . "+++ b/hello.txt\n"
            . "@@ -1 +1 @@\n"
            . "-OLD LINE\n"
            . "+NEW LINE\n"
        );

        // Commit the baseline so context matching has something to check.
        $this->runInShell('git add -A');
        $this->runInShell('git commit -q -m baseline');

        $patch  = new GitPatch();
        $result = $patch->apply($patch_file, $this->tmpRoot);

        $this->assertTrue($result, 'GitPatch::apply should report success');
        $this->assertSame(
            "NEW LINE\n",
            file_get_contents($this->tmpRoot . '/hello.txt'),
            'Patched file content should match the expected new line'
        );
    }

    public function test_cli_init_applies_patches_listed_in_config(): void
    {
        // File at TOP LEVEL, patch path `a/hello.txt`.
        file_put_contents($this->tmpRoot . '/hello.txt', "OLD LINE\n");
        $patch_file = $this->tmpRoot . '/hello.patch';
        file_put_contents(
            $patch_file,
            "diff --git a/hello.txt b/hello.txt\n"
            . "index 3b18e51..ce01362 100644\n"
            . "--- a/hello.txt\n"
            . "+++ b/hello.txt\n"
            . "@@ -1 +1 @@\n"
            . "-OLD LINE\n"
            . "+NEW LINE\n"
        );

        $this->runInShell('git add -A');
        $this->runInShell('git commit -q -m baseline');

        $config = ['hello' => $patch_file];
        Cli::init($this->tmpRoot, $config);

        $this->assertSame([], Cli::$errors, 'Cli::init must record no errors on a clean run');
        $this->assertSame(
            "NEW LINE\n",
            file_get_contents($this->tmpRoot . '/hello.txt'),
            'Cli::init must apply every patch listed in $config'
        );
    }

    public function test_cli_init_records_error_when_patch_context_does_not_match_committed_file(): void
    {
        // Commit a baseline where the file contains "OLD LINE". The patch
        // is then written to look for "DIFFERENT OLD LINE" which is NOT
        // in the committed file. With the committed baseline in place,
        // `git apply` fails on context matching (NOT just on file
        // absence), so the test exercises a real failure path.
        file_put_contents($this->tmpRoot . '/hello.txt', "OLD LINE\n");
        $this->runInShell('git add -A');
        $this->runInShell('git commit -q -m baseline');

        $patch_file = $this->tmpRoot . '/mismatch.patch';
        file_put_contents(
            $patch_file,
            "diff --git a/hello.txt b/hello.txt\n"
            . "index 3b18e51..ce01362 100644\n"
            . "--- a/hello.txt\n"
            . "+++ b/hello.txt\n"
            . "@@ -1 +1 @@\n"
            . "-DIFFERENT OLD LINE\n"  // <-- NOT in the committed file
            . "+NEW LINE\n"
        );

        $config = ['mismatch' => $patch_file];

        // Cli::init must not throw — it must catch + record.
        Cli::init($this->tmpRoot, $config);

        $this->assertNotEmpty(
            Cli::$errors,
            'Cli::init must record a real error when patch context mismatches the committed baseline'
        );
        $this->assertStringContainsString(
            'git apply',
            strtolower(implode(' | ', Cli::$errors)),
            'Error message must explain the git apply failure'
        );
    }
}
