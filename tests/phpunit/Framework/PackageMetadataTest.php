<?php
/**
 * Phase 23.A1 RED — wpsk/framework package metadata contract.
 *
 * The kit's stable PHP code (under `src/Core/` and `src/Support/`)
 * is being moved to a real Composer package so consumers can
 * install it as a dependency instead of having it copied. This
 * test locks the metadata contract for that package:
 *
 *   - name:    "wpsk/framework"
 *   - type:    "library"
 *   - license: present
 *   - require: includes "php" >= "7.4" and does NOT hard-require
 *              any WordPress-only runtime (wp-coding-standards,
 *              php-stubs/wordpress-stubs, etc. belong in require-dev
 *              of the kit itself, never in a published library's
 *              runtime require).
 *   - autoload.psr-4:  "WPSK\\" => "src/"
 *
 * These tests fail RED while `packages/framework/composer.json`
 * is missing or has the wrong shape; they go GREEN once the
 * 23.A2 implementation drops the file in place.
 */
declare(strict_types=1);

namespace WPSK\Tests\Framework;

use PHPUnit\Framework\TestCase;

class PackageMetadataTest extends TestCase
{
    /** @var string */
    private $pkgComposerPath;

    /** @var array<string,mixed> */
    private $pkg;

    protected function setUp(): void
    {
        parent::setUp();

        $root = dirname(__DIR__, 3);
        $this->pkgComposerPath = $root . '/packages/framework/composer.json';

        $this->assertFileExists(
            $this->pkgComposerPath,
            "Framework package composer.json must exist at packages/framework/composer.json"
        );

        $raw = file_get_contents($this->pkgComposerPath);
        $this->assertNotFalse($raw, "Failed to read {$this->pkgComposerPath}");

        $decoded = json_decode((string) $raw, true);
        $this->assertIsArray(
            $decoded,
            "packages/framework/composer.json must decode as an associative array"
        );

        $this->pkg = $decoded;
    }

    public function test_package_name_is_wpsk_framework(): void
    {
        $this->assertSame(
            'wpsk/framework',
            $this->pkg['name'] ?? null,
            'Framework package must be named wpsk/framework'
        );
    }

    public function test_package_type_is_library(): void
    {
        $this->assertSame(
            'library',
            $this->pkg['type'] ?? null,
            'Framework package must be of type "library" (consumed via require, not scaffolded)'
        );
    }

    public function test_package_declares_psr4_WPSK_to_src(): void
    {
        $psr4 = $this->pkg['autoload']['psr-4'] ?? null;
        $this->assertIsArray(
            $psr4,
            'autoload.psr-4 must be an array on the framework package'
        );
        $this->assertArrayHasKey(
            'WPSK\\',
            $psr4,
            'Framework package must expose WPSK\\ via PSR-4'
        );
        $this->assertSame(
            'src/',
            $psr4['WPSK\\'],
            'WPSK\\ must map to src/ inside packages/framework'
        );
    }

    public function test_package_requires_php_7_4_or_newer(): void
    {
        $php = $this->pkg['require']['php'] ?? null;
        $this->assertIsString(
            $php,
            'Framework package must declare a php version constraint'
        );
        // Accept ">=7.4", ">= 7.4", "^7.4", ">=7.4.0", etc.
        $this->assertMatchesRegularExpression(
            '/(>=|\^)\s*7\.(\d+)/',
            (string) $php,
            "php constraint must accept 7.4 (got \"{$php}\")"
        );
    }

    public function test_package_has_no_wordpress_hard_runtime_dep(): void
    {
        // The framework is consumed by WordPress plugins/themes, so
        // it must NOT hard-require any WP runtime (wp-coding-standards,
        // php-stubs/wordpress-stubs, etc.). Those belong in require-dev
        // of the kit itself, never in a published library's require.
        $blockedRuntime = [
            'php-stubs/wordpress-stubs',
            'wp-coding-standards/wpcs',
            'wp-cli/wp-cli-bundle',
            'szepeviktor/phpstan-wordpress',
        ];
        $require = $this->pkg['require'] ?? [];
        foreach ($blockedRuntime as $pkg) {
            $this->assertArrayNotHasKey(
                $pkg,
                $require,
                "Framework package must NOT hard-require {$pkg} (it's a dev tool, not a runtime dep)"
            );
        }
    }

    public function test_package_has_a_license_field(): void
    {
        $license = $this->pkg['license'] ?? null;
        $this->assertIsString(
            $license,
            'Framework package must declare a license (SPDX id or "proprietary")'
        );
        $this->assertNotSame('', trim((string) $license), 'license must not be empty');
    }
}
