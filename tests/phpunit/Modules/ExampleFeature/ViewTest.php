<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules\ExampleFeature;

use WPDev\Modules\ExampleFeature\Templates\View;
use WPDev\Support\Templates\Template;

class ViewTest extends \WPDevTest\TestCases\TestCase
{
    public function setUp(): void
    {
        parent::setUp();
        Template::reset_for_tests();
    }

    public function test_notice_renders_status_partial(): void
    {
        $html = View::notice('Hello ExampleFeature', 'success');
        $this->assertStringContainsString('wpdev-example-notice', $html);
        $this->assertStringContainsString('wpdev-example-notice--success', $html);
        $this->assertStringContainsString('Hello ExampleFeature', $html);
    }

    public function test_messages_delegates_to_template_api(): void
    {
        $html = View::messages('warn me');
        $this->assertStringContainsString('wpdev-messages', $html);
        $this->assertStringContainsString('warn me', $html);
    }
}
