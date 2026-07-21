<?php
declare(strict_types=1);

namespace WPDev\Tests\Support\WpCli;

use WPDev\Support\WpCli\CliSetup;
use WPDev\Support\WpCli\Command;

final class SampleCliCommand extends Command
{
    public function name(): string
    {
        return 'wpdev sample';
    }

    public function description(): string
    {
        return 'Sample command';
    }

    public function handle(array $args, array $assoc_args): void
    {
        $this->success('sample-ok');
        if ($args !== []) {
            $this->log('arg0=' . $args[0]);
        }
    }
}

class CliSetupTest extends \WPDevTest\TestCases\TestCase
{
    public function setUp(): void
    {
        parent::setUp();
        CliSetup::flush();
    }

    public function tearDown(): void
    {
        CliSetup::flush();
        parent::tearDown();
    }

    public function test_register_accepts_command_subclass(): void
    {
        $this->assertTrue(CliSetup::register(SampleCliCommand::class));
        $this->assertSame([SampleCliCommand::class], CliSetup::commands());
    }

    public function test_register_rejects_unknown_class(): void
    {
        $this->assertFalse(CliSetup::register('WPDev\\Does\\Not\\Exist'));
    }

    public function test_register_rejects_non_command_class(): void
    {
        $this->assertFalse(CliSetup::register(\stdClass::class));
    }

    public function test_register_is_idempotent(): void
    {
        CliSetup::register(SampleCliCommand::class);
        CliSetup::register(SampleCliCommand::class);
        $this->assertCount(1, CliSetup::commands());
    }

    public function test_command_handle_runs_without_wp_cli(): void
    {
        $command = new SampleCliCommand();
        ob_start();
        $command->run(['hello'], []);
        $out = (string) ob_get_clean();

        $this->assertStringContainsString('Success: sample-ok', $out);
        $this->assertStringContainsString('arg0=hello', $out);
    }

    public function test_cli_init_is_safe_without_wp_cli(): void
    {
        CliSetup::register(SampleCliCommand::class);
        // Must not throw when WP_CLI is absent.
        CliSetup::cli_init();
        $this->assertTrue(true);
    }
}
