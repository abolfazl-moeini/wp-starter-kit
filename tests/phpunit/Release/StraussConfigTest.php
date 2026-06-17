<?php
declare(strict_types=1);

namespace WPDev\Tests\Release;

use PHPUnit\Framework\TestCase;

class StraussConfigTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = dirname(__DIR__, 3);
    }

    public function test_strauss_json_exists_and_uses_vendor_prefix_from_project_config(): void
    {
        $config = json_decode(
            (string) file_get_contents($this->root . '/project.config.json'),
            true
        );
        $strauss = json_decode(
            (string) file_get_contents($this->root . '/strauss.json'),
            true
        );

        $this->assertIsArray($config);
        $this->assertIsArray($strauss);
        $this->assertSame($config['vendorPrefix'], $strauss['namespace_prefix']);
        $this->assertSame('vendor-prefixed', $strauss['target_directory']);
    }

    public function test_strauss_excludes_first_party_namespace(): void
    {
        $strauss = json_decode(
            (string) file_get_contents($this->root . '/strauss.json'),
            true
        );

        $this->assertContains('WPDev', $strauss['exclude_from_prefix']['namespaces']);
    }

    public function test_composer_has_scope_vendor_script(): void
    {
        $composer = json_decode(
            (string) file_get_contents($this->root . '/composer.json'),
            true
        );

        $this->assertArrayHasKey('scope:vendor', $composer['scripts']);
        $this->assertStringContainsString('strauss', $composer['scripts']['scope:vendor']);
    }
}