<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules\ExampleFeature;

use WPDev\Modules\ExampleFeature\Cli\StatusCommand;

class StatusCommandTest extends \WPDevTest\TestCases\TestCase
{
    public function test_name_and_description(): void
    {
        $cmd = new StatusCommand();
        $this->assertSame('wpdev example-status', $cmd->name());
        $this->assertNotSame('', $cmd->description());
    }

    public function test_handle_text_format(): void
    {
        $cmd = new StatusCommand();
        ob_start();
        $cmd->handle([], ['format' => 'text']);
        $out = (string) ob_get_clean();

        $this->assertStringContainsString('example-feature', $out);
        $this->assertStringContainsString('Success:', $out);
    }

    public function test_handle_json_format(): void
    {
        $cmd = new StatusCommand();
        ob_start();
        $cmd->handle([], ['format' => 'json']);
        $out = (string) ob_get_clean();

        $this->assertStringContainsString('"module":"example-feature"', $out);
        $this->assertStringContainsString('"status":"ok"', $out);
    }
}
