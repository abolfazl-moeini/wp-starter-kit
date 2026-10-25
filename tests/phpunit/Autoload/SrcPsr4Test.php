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
    /* Framework Direct Loading & Anti-Pattern Prevention                */
    /* ----------------------------------------------------------------- */

    /**
     * Enumerate every class/interface/trait that ships with the
     * wpdev/framework package (under packages/framework/src/).
     *
     * @return list<array{class:string,rel:string}>
     */
    private function frameworkClasses(): array
    {
        $root = dirname(__DIR__, 3);
        $framework = $root . '/packages/framework/src';
        $this->assertDirectoryExists(
            $framework,
            'packages/framework/src/ must exist'
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
            $content = (string) file_get_contents($file->getPathname());
            $tokens = token_get_all($content);
            $declaresType = false;
            foreach ($tokens as $token) {
                if (is_array($token) && in_array($token[0], [T_CLASS, T_INTERFACE, T_TRAIT], true)) {
                    $declaresType = true;
                    break;
                }
            }
            if (!$declaresType) {
                // Skip procedural helpers (e.g. functions.php) or template files.
                continue;
            }
            $abs = $file->getPathname();
            $rel = substr($abs, strlen($framework) + 1); // e.g. "Core/Plugin.php"
            $relNoExt = substr($rel, 0, -4);              // "Core/Plugin"
            $class = 'WPDev\\' . str_replace('/', '\\', $relNoExt);

            $out[] = [
                'class' => $class,
                'rel' => $rel,
            ];
        }
        return $out;
    }

    public function test_every_framework_class_loadable_from_framework_path(): void
    {
        $classes = $this->frameworkClasses();
        $this->assertNotEmpty($classes, 'At least one framework class must be discovered');

        foreach ($classes as $row) {
            $this->assertTrue(
                class_exists($row['class'], true)
                    || interface_exists($row['class'], true)
                    || trait_exists($row['class'], true),
                "Framework class {$row['class']} must be directly loadable from packages/framework/src/"
            );
        }
    }

    public function test_no_bridge_shims_exist_in_src(): void
    {
        $root = dirname(__DIR__, 3);
        $src = $root . '/src';

        // Legacy bridge directories must not exist in src/
        $this->assertDirectoryDoesNotExist(
            $src . '/Core',
            'src/Core must not exist; framework Core classes live in packages/framework/src/Core/'
        );
        $this->assertDirectoryDoesNotExist(
            $src . '/Adapters',
            'src/Adapters must not exist; WpdevModuleAdapter lives in packages/framework/src/Adapters/'
        );
        $this->assertDirectoryDoesNotExist(
            $src . '/Support',
            'src/Support must not exist; Support classes live in packages/framework/src/Support/'
        );

        // Verify no PHP file in src/ contains a require traversal to packages/framework
        $iter = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($src, FilesystemIterator::SKIP_DOTS)
        );
        $suspicious = [];
        foreach ($iter as $file) {
            /** @var SplFileInfo $file */
            if ($file->getExtension() !== 'php') {
                continue;
            }
            $body = (string) file_get_contents($file->getPathname());
            if (preg_match('/require(?:_once)?\s+__DIR__\s*\.\s*[\'"][^\'"]*packages\/framework/', $body)) {
                $suspicious[] = $file->getPathname();
            }
        }
        $this->assertSame(
            [],
            $suspicious,
            'src/ must not contain any bridge shims requiring packages/framework'
        );
    }
}
