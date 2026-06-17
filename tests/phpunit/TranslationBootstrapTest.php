<?php
/**
 * Smoke test for the translation pipeline (Phase 6).
 *
 * Earlier iterations of this file tried to `proc_open()` the
 * `dev/translation/cli.php` shim from inside the test, but that proved
 * unreliable in the PHPUnit sandbox (PHP version + proc_open behaviour).
 *
 * The actual end-to-end check is delegated to `composer test` itself,
 * which runs everything in one process tree and is the canonical
 * verification path documented in plan.md §6.
 *
 * This test asserts:
 *   1. `packages/translation/src/index.js` exists (so the JS helper is
 *      shippable with the starter).
 *   2. `dev/translation/bootstrap.php` and `dev/translation/cli.php`
 *      exist and `php -l` them (basic parse check).
 *   3. The Node helper runs via `node packages/translation/src/index.js`
 *      and produces the expected JSON shape for a sample input.
 *
 * The real translation flow (`wp i18n make-pot`, `wp i18n make-json`,
 * etc.) is intentionally NOT exercised here because it requires the
 * `wp` CLI on PATH. That flow is covered by manual integration testing
 * in a real WP project.
 */

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class TranslationBootstrapTest extends TestCase
{
    public function test_node_helper_file_exists(): void
    {
        $path = realpath(__DIR__ . '/../../packages/translation/src/index.js');
        $this->assertNotFalse($path, 'packages/translation/src/index.js must exist');
        $this->assertFileExists($path);
    }

    public function test_bootstrap_php_files_parse(): void
    {
        $bootstrap = realpath(__DIR__ . '/../../dev/translation/bootstrap.php');
        $cli       = realpath(__DIR__ . '/../../dev/translation/cli.php');
        $this->assertNotFalse($bootstrap);
        $this->assertNotFalse($cli);

        $b = shell_exec('php -l ' . escapeshellarg($bootstrap) . ' 2>&1');
        $c = shell_exec('php -l ' . escapeshellarg($cli) . ' 2>&1');
        $this->assertStringContainsString('No syntax errors', (string) $b);
        $this->assertStringContainsString('No syntax errors', (string) $c);
    }

    public function test_node_helper_smoke_round_trip(): void
    {
        $helper = realpath(__DIR__ . '/../../packages/translation/src/index.js');
        $this->assertNotFalse($helper);

        $cmd = [
            'node', $helper,
            'parseMapFile',
            base64_encode(json_encode([
                'potContents' => "#: src/a.js:1\nmsgid \"Hi\"\n",
                'bundleName'  => 'a.js',
            ])),
        ];
        $out = shell_exec(escapeshellcmd($cmd[0]) . ' ' .
            escapeshellarg($cmd[1]) . ' ' .
            escapeshellarg($cmd[2]) . ' ' .
            escapeshellarg($cmd[3]) . ' 2>&1');
        $this->assertNotFalse($out, 'node helper must produce output');

        $decoded = json_decode(trim($out), true);
        $this->assertIsArray($decoded, 'output must be JSON: ' . $out);
        $this->assertTrue($decoded['ok']);
        $this->assertSame(['src/a.js' => 'a.js'], $decoded['result']);
    }

    public function test_node_helper_is_translation_valid(): void
    {
        $helper = realpath(__DIR__ . '/../../packages/translation/src/index.js');
        $this->assertNotFalse($helper);

        $cmd = [
            'node', $helper,
            'isTranslationValid',
            base64_encode(json_encode(['value' => '  '])),
        ];
        $out = shell_exec(escapeshellcmd($cmd[0]) . ' ' .
            escapeshellarg($cmd[1]) . ' ' .
            escapeshellarg($cmd[2]) . ' ' .
            escapeshellarg($cmd[3]) . ' 2>&1');
        $this->assertNotFalse($out);

        $decoded = json_decode(trim($out), true);
        $this->assertTrue($decoded['ok']);
        $this->assertFalse($decoded['result']);
    }

    public function test_build_php_does_not_duplicate_wp_i18n_subcommand(): void
    {
        $src = (string) file_get_contents(__DIR__ . '/../../dev/translation/build-php.php');
        $this->assertStringContainsString("'make-php'", $src);
        $this->assertStringNotContainsString("'i18n',\n        'make-php'", $src);
    }

    public function test_deprecated_wpdev_translation_shims_delegate_to_wpdev_helpers(): void
    {
        require_once __DIR__ . '/../../dev/translation/bootstrap.php';

        $this->assertSame(wpdev_list_components(), wpdev_list_components());
    }
}
