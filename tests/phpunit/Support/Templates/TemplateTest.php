<?php
declare(strict_types=1);

namespace WPDev\Tests\Support\Templates;

use WPDev\Support\Templates\Template;
use function WPDev\Support\Templates\get_template_variable;
use function WPDev\Support\Templates\get_template_variables;
use function WPDev\Support\Templates\load_template;
use function WPDev\Support\Templates\render_messages;
use function WPDev\Support\Templates\set_template_variable;
use function WPDev\Support\Templates\set_template_variables;

/**
 * Coverage for Template APIs (core-essentials functions.php patterns).
 */
class TemplateTest extends \WPDevTest\TestCases\TestCase
{
    public function setUp(): void
    {
        parent::setUp();
        Template::reset_for_tests();
    }

    public function test_set_and_get_template_variable(): void
    {
        Template::set_variable('name', '1234');
        $this->assertSame('1234', Template::get_variable('name'));
        $this->assertSame('1234', $GLOBALS['wpdev_template_vars']['name'] ?? null);
    }

    public function test_function_aliases_match_class_api(): void
    {
        set_template_variable('name', '1234');
        $this->assertSame('1234', get_template_variable('name'));

        $vars = [
            'name'   => 'publisher',
            'type'   => 'theme',
            'author' => 'better',
        ];
        set_template_variables($vars);
        $this->assertSame($vars, get_template_variables());
    }

    public function test_set_template_variables_replaces_bag(): void
    {
        $vars = [
            'name'   => 'publisher',
            'type'   => 'theme',
            'author' => 'better',
        ];
        Template::set_variables($vars);
        $this->assertSame($vars, Template::get_variables());
        $this->assertSame($vars, $GLOBALS['wpdev_template_vars'] ?? null);
    }

    public function test_load_template_includes_partial_with_vars(): void
    {
        $fired = false;
        Template::set_variable('mock_callback', static function () use (&$fired): void {
            $fired = true;
        });

        $this->assertTrue(
            Template::load('sample-template.php', __DIR__ . '/fixtures')
        );
        $this->assertTrue($fired);
        $this->assertFalse(Template::load('missing.php', __DIR__ . '/fixtures'));
    }

    public function test_load_template_function_alias(): void
    {
        Template::set_variable('mock_callback', static function (): void {
        });
        $this->assertTrue(load_template('sample-template.php', __DIR__ . '/fixtures'));
        $this->assertFalse(load_template('wrong-file', __DIR__ . '/fixtures'));
    }

    public function test_render_messages_from_string(): void
    {
        $html = Template::render_messages('Something went wrong');
        $this->assertStringContainsString('wpdev-messages', $html);
        $this->assertStringContainsString('Something went wrong', $html);
        $this->assertStringContainsString('wpdev-warning-item', $html);
    }

    public function test_render_messages_from_wp_error(): void
    {
        $error = new \WP_Error('nope', 'Access denied', 'error');
        $html = render_messages($error);
        $this->assertStringContainsString('Access denied', $html);
        $this->assertStringContainsString('wpdev-error-nope', $html);
    }

    public function test_render_escapes_message_html(): void
    {
        $html = Template::render_messages('<script>alert(1)</script>');
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('&lt;script&gt;', $html);
    }

    public function test_unknown_variable_returns_null(): void
    {
        $this->assertNull(Template::get_variable('missing'));
    }
}
