<?php

use PHPUnit\Framework\TestCase;

/**
 * Verifies the PSR-4 autoload entry for the WPSK production source tree
 * declared in `composer.json` (`"WPSK\\": "src/")` and proves that the
 * classes placed under `src/Core/` become loadable through Composer's
 * PSR-4 autoloader.
 *
 * These tests fail RED while the entry is missing and `src/` does not
 * exist; they go GREEN once the autoload mapping is added, the
 * autoloader is regenerated, and a class is dropped under
 * `src/Core/`.
 */
class SrcPsr4Test extends TestCase
{
    /** @var string */
    private $composerJsonPath;

    /** @var array<string,mixed> */
    private $composer;

    protected function setUp(): void
    {
        parent::setUp();

        $root = dirname(__DIR__, 3);
        $this->composerJsonPath = $root . '/composer.json';

        $raw = file_get_contents($this->composerJsonPath);
        $this->assertNotFalse($raw, "Failed to read composer.json at {$this->composerJsonPath}");

        $decoded = json_decode($raw, true);
        $this->assertIsArray($decoded, 'composer.json must decode as an associative array');

        $this->composer = $decoded;
    }

    public function test_composer_json_declares_WPSK_psr4_root_to_src(): void
    {
        $psr4 = $this->composer['autoload']['psr-4'] ?? null;
        $this->assertIsArray($psr4, 'composer.json autoload.psr-4 must be an array');

        $this->assertArrayHasKey(
            'WPSK\\',
            $psr4,
            "composer.json autoload.psr-4 must include \"WPSK\\\" => \"src/\""
        );

        $this->assertSame(
            'src/',
            $psr4['WPSK\\'],
            "WPSK\\ must map to src/ (got " . var_export($psr4['WPSK\\'], true) . ")"
        );
    }

    public function test_composer_json_preserves_existing_WPSK_TestTools_psr4_entry(): void
    {
        $psr4 = $this->composer['autoload']['psr-4'] ?? [];
        $this->assertArrayHasKey(
            'WPSK\\TestTools\\',
            $psr4,
            'composer.json autoload.psr-4 must still include the WPSK\\TestTools\\ entry'
        );
    }

    public function test_composer_json_preserves_existing_files_autoload(): void
    {
        $files = $this->composer['autoload']['files'] ?? null;
        $this->assertIsArray($files, 'composer.json autoload.files must remain an array');
        $this->assertContains(
            'includes/asset-functions.php',
            $files,
            'includes/asset-functions.php must remain in autoload.files'
        );
    }

    public function test_src_directory_exists(): void
    {
        $root = dirname(__DIR__, 3);
        $this->assertDirectoryExists(
            $root . '/src',
            'src/ directory must exist so WPSK\\ classes can be placed there'
        );
    }

    public function test_src_core_directory_exists(): void
    {
        $root = dirname(__DIR__, 3);
        // Phase 23.A2: the framework's `src/Core/` was moved into
        // `packages/framework/src/Core/` so it can be installed as
        // the `wpsk/framework` Composer package. The kit still
        // depends on those classes (and tests rely on them), so
        // the new location is the load-bearing one.
        $this->assertDirectoryExists(
            $root . '/packages/framework/src/Core',
            'packages/framework/src/Core/ directory must exist for the WPSK\\Core\\* namespace (moved in Phase 23.A2)'
        );
    }

    public function test_WPSK_Core_Plugin_class_is_loadable(): void
    {
        $this->assertTrue(
            class_exists('WPSK\\Core\\Plugin', true),
            'WPSK\\Core\\Plugin must be autoloadable through the PSR-4 entry'
        );
    }
}
