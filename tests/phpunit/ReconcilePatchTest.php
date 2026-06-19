<?php
/**
 * TDD tests for the reconciled PHP patch system (Phase 7.0).
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

use WPDev\TestTools\Patch\Cli;
use WPDev\TestTools\Patch\GitPatch;

/**
 * Helper: create `hello.txt` at the TOP LEVEL of $root (not a subdir) with
 * a single line. Used by the happy-path tests.
 */
function wpdev_patch_test_create_hello_file_at_root(string $root, string $body): void
{
    file_put_contents($root . '/hello.txt', $body);
}

/**
 * Helper: build a patch that replaces `OLD LINE` with `NEW LINE` in
 * `hello.txt` (top level of the temp root). Returns the patch file path.
 */
function wpdev_patch_test_make_hello_patch_at_root(string $root): string
{
    $patch_file = $root . '/hello.patch';
    $patch = "diff --git a/hello.txt b/hello.txt\n"
        . "index 3b18e51..ce01362 100644\n"
        . "--- a/hello.txt\n"
        . "+++ b/hello.txt\n"
        . "@@ -1 +1 @@\n"
        . "-OLD LINE\n"
        . "+NEW LINE\n";
    file_put_contents($patch_file, $patch);
    return $patch_file;
}

class ReconcilePatchTest extends \WPDevTest\TestCases\TestCase
{
    /** @var string */
    private $tmpRoot;

    public function setUp(): void
    {
        parent::setUp();

        // Cli::$errors is a static; reset it before every test so the
        // assertion on empty/non-empty depends only on the current run.
        Cli::$errors = [];

        $this->tmpRoot = sys_get_temp_dir() . '/wpdev-patch-reconcile-' . uniqid('', true);
        mkdir($this->tmpRoot, 0777, true);

        // `git apply` only enforces context matching inside a real git
        // repository. Without `git init` + a baseline commit, the patch
        // would silently create the target file even on a "mismatch" run,
        // leaving Cli::$errors empty (and our test would lie about the
        // failure path).
        $this->runInShell('git init -q');
        $this->runInShell('git config user.email test@test');
        $this->runInShell('git config user.name test');
    }

    public function tearDown(): void
    {
        // The temp root contains a .git directory; rrmdir handles that
        // by simply unlinking the .git symlink/dir first, then the rest.
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
        // If a .git directory exists, remove it via `rm -rf` because
        // scandir + unlink trips on read-only files inside .git.
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

    public function test_cli_class_lives_in_unified_namespace(): void
    {
        $this->assertTrue(
            class_exists(Cli::class),
            'Expected reconciled Cli class at WPDev\\TestTools\\Patch\\Cli'
        );
        $this->assertTrue(
            class_exists(GitPatch::class),
            'Expected GitPatch at WPDev\\TestTools\\Patch\\GitPatch'
        );
    }

    public function test_cli_init_uses_root_and_flat_config_signature(): void
    {
        $ref    = new ReflectionClass(Cli::class);
        $method = $ref->getMethod('init');

        $this->assertTrue(
            $method->isStatic(),
            'Cli::init must remain static (callable without instantiation)'
        );
        $this->assertSame(
            2,
            $method->getNumberOfRequiredParameters(),
            'Cli::init must require exactly (string $root, array $config)'
        );

        $params = $method->getParameters();
        $this->assertSame('root', $params[0]->getName());
        $this->assertSame('string', (string) $params[0]->getType());
        $this->assertSame('config', $params[1]->getName());
        $this->assertSame('array', (string) $params[1]->getType());
    }

    public function test_cli_init_applies_patch_against_committed_file_at_root_dir(): void
    {
        // Place the file at $root_dir/hello.txt (NOT in a subdir) so the
        // patch path `a/hello.txt` resolves correctly under
        // `git -C $root_dir apply`.
        wpdev_patch_test_create_hello_file_at_root($this->tmpRoot, "OLD LINE\n");
        $patch_file = wpdev_patch_test_make_hello_patch_at_root($this->tmpRoot);

        // Commit the baseline so `git apply` enforces context matching.
        $this->runInShell('git add -A');
        $this->runInShell('git commit -q -m baseline');

        $config = ['hello' => $patch_file];
        Cli::init($this->tmpRoot, $config);

        $this->assertSame([], Cli::$errors, 'Cli::init must record no errors on a clean run');
        $this->assertSame(
            "NEW LINE\n",
            file_get_contents($this->tmpRoot . '/hello.txt'),
            'Cli::init must apply the patch against $root_dir/hello.txt'
        );
    }

    public function test_cli_init_records_error_when_patch_context_does_not_match_committed_file(): void
    {
        // Commit a baseline where the file contains "OLD LINE" — the patch
        // is then written to look for "DIFFERENT OLD" which is NOT in the
        // committed file. With the committed baseline in place, `git apply`
        // fails on context matching (NOT just on file absence).
        wpdev_patch_test_create_hello_file_at_root($this->tmpRoot, "OLD LINE\n");
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
        Cli::init($this->tmpRoot, $config);

        $this->assertNotEmpty(
            Cli::$errors,
            'Cli::init must record a real error when patch context mismatches the committed baseline'
        );
        $this->assertStringContainsString(
            'git apply',
            strtolower(implode(' | ', Cli::$errors)),
            'Error message must explain that git apply failed'
        );
    }
}
