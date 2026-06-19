<?php


/**
 * Verifies the PSR-4 autoload entry for the WPDev production source tree
 * declared in `composer.json` (`"WPDev\\": "src/")` and proves that the
 * classes placed under `src/Core/` become loadable through Composer's
 * PSR-4 autoloader.
 *
 * These tests fail RED while the entry is missing and `src/` does not
 * exist; they go GREEN once the autoload mapping is added, the
 * autoloader is regenerated, and a class is dropped under
 * `src/Core/`.
 */
class SrcPsr4Test extends \WPDevTest\TestCases\TestCase
{
    /** @var string */
    private $composerJsonPath;

    /** @var array<string,mixed> */
    private $composer;

    public function setUp(): void
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

    public function test_composer_json_declares_WPDev_psr4_root_to_src(): void
    {
        $psr4 = $this->composer['autoload']['psr-4'] ?? null;
        $this->assertIsArray($psr4, 'composer.json autoload.psr-4 must be an array');

        $this->assertArrayHasKey(
            'WPDev\\',
            $psr4,
            "composer.json autoload.psr-4 must include \"WPDev\\\" => \"src/\""
        );

        $this->assertSame(
            'src/',
            $psr4['WPDev\\'],
            "WPDev\\ must map to src/ (got " . var_export($psr4['WPDev\\'], true) . ")"
        );
    }

    public function test_composer_json_preserves_existing_WPDev_TestTools_psr4_entry(): void
    {
        $psr4 = $this->composer['autoload']['psr-4'] ?? [];
        $this->assertArrayHasKey(
            'WPDev\\TestTools\\',
            $psr4,
            'composer.json autoload.psr-4 must still include the WPDev\\TestTools\\ entry'
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
            'src/ directory must exist so WPDev\\ classes can be placed there'
        );
    }

    public function test_src_core_directory_exists(): void
    {
        $root = dirname(__DIR__, 3);
        // Phase 23.A2: the framework's `src/Core/` was moved into
        // `packages/framework/src/Core/` so it can be installed as
        // the `wpdev/framework` Composer package. The kit still
        // depends on those classes (and tests rely on them), so
        // the new location is the load-bearing one.
        $this->assertDirectoryExists(
            $root . '/packages/framework/src/Core',
            'packages/framework/src/Core/ directory must exist for the WPDev\\Core\\* namespace (moved in Phase 23.A2)'
        );
    }

    public function test_WPDEV_Core_Plugin_class_is_loadable(): void
    {
        $this->assertTrue(
            class_exists('WPDev\\Core\\Plugin', true),
            'WPDev\\Core\\Plugin must be autoloadable through the PSR-4 entry'
        );
    }

    /* ----------------------------------------------------------------- */
    /* Phase 23.A2b — compatibility bridge shims                          */
    /* ----------------------------------------------------------------- */

    /**
     * Enumerate every class file that ships with the wpdev/framework
     * package (under packages/framework/src/). Used by the
     * bridge-shim tests below to assert that EACH of them is
     * loadable from BOTH the framework package path AND the
     * legacy src/Core / src/Support shim path.
     *
     * @return list<array{class:string,frameworkRel:string,shimRel:string}>
     */
    private function bridgeClasses(): array
    {
        $root = dirname(__DIR__, 3);
        $framework = $root . '/packages/framework/src';
        $this->assertDirectoryExists(
            $framework,
            'packages/framework/src/ must exist (Phase 23.A2)'
        );

        $out = [];
        $iter = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($framework, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($iter as $file) {
            /** @var SplFileInfo $file */
            if ($file->getExtension() !== 'php') {
                continue;
            }
            $abs = $file->getPathname();
            $rel = substr($abs, strlen($framework) + 1); // e.g. "Core/Plugin.php"
            $relNoExt = substr($rel, 0, -4);              // "Core/Plugin"
            $class = 'WPDev\\' . str_replace('/', '\\', $relNoExt);

            // Shim lives at src/<rel>, e.g. src/Core/Plugin.php.
            $shimRel = 'src/' . $rel;

            $out[] = [
                'class' => $class,
                'frameworkRel' => 'packages/framework/src/' . $rel,
                'shimRel' => $shimRel,
            ];
        }
        return $out;
    }

    public function test_bridge_shim_exists_for_every_framework_class(): void
    {
        $root = dirname(__DIR__, 3);
        $missing = [];
        foreach ($this->bridgeClasses() as $row) {
            $shim = $root . '/' . $row['shimRel'];
            if (!is_file($shim)) {
                $missing[] = $row['shimRel'] . ' (for ' . $row['class'] . ')';
            }
        }
        $this->assertSame(
            [],
            $missing,
            "Bridge shim missing for these framework classes:\n  - " . implode("\n  - ", $missing)
        );
    }

    public function test_every_framework_class_loadable_from_framework_path(): void
    {
        foreach ($this->bridgeClasses() as $row) {
            $this->assertTrue(
                class_exists($row['class'], true)
                    || interface_exists($row['class'], true)
                    || trait_exists($row['class'], true),
                "Framework class {$row['class']} must be loadable from packages/framework/src/"
            );
        }
    }

    public function test_bridge_shim_requires_framework_file(): void
    {
        $root = dirname(__DIR__, 3);
        foreach ($this->bridgeClasses() as $row) {
            $shim = $root . '/' . $row['shimRel'];
            $body = (string) file_get_contents($shim);
            // The shim is a one-line `require_once __DIR__ . '/../../packages/framework/src/<rel>';`
            // bridge (the up-traversal count varies with file depth)
            // that keeps the legacy `src/Core/X.php` path loadable
            // until every reference to the old path is migrated.
            // frameworkRel is "packages/framework/src/<rel>"; the require line
            // ends in "/<rel>" only (the up-traversal lands at the project root).
            $rel = substr($row['frameworkRel'], strlen('packages/framework/src/'));
            $this->assertMatchesRegularExpression(
                '/require(?:_once)?\s+__DIR__\s*\.\s*[\'"]\/(?:\.\.\/)+packages\/framework\/src\/'
                . preg_quote($rel, '/') . '/',
                $body,
                "Bridge shim {$row['shimRel']} must require packages/framework/src/{$rel} (got: " . trim($body) . ")"
            );
        }
    }

    public function test_bridge_shim_does_not_duplicate_class_declaration(): void
    {
        // The shim is a forwarder only; it must NOT redeclare the
        // class/interface/trait itself. Otherwise PSR-4 includes the
        // shim AND the framework file → redeclaration fatal.
        $root = dirname(__DIR__, 3);
        foreach ($this->bridgeClasses() as $row) {
            $shim = $root . '/' . $row['shimRel'];
            $body = (string) file_get_contents($shim);
            $this->assertDoesNotMatchRegularExpression(
                '/\b(class|interface|trait)\s+/i',
                $body,
                "Bridge shim {$row['shimRel']} must not declare class/interface/trait (forwarder only)"
            );
        }
    }
}
