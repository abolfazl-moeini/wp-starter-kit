<?php
declare(strict_types=1);

namespace WPDev\Modules\ExampleFeature\Cli;

use WPDev\Support\WpCli\Command;

/**
 * Example WP-CLI command for ExampleFeature.
 *
 * Register with CliSetup::register(StatusCommand::class) in Module::boot().
 *
 * Usage:
 *   wp wpdev example-status
 *   wp wpdev example-status --format=json
 */
final class StatusCommand extends Command
{
    public function name(): string
    {
        return 'wpdev example-status';
    }

    public function description(): string
    {
        return 'Print ExampleFeature status (WP-CLI demo).';
    }

    /**
     * Optional flags: --format=text|json
     *
     * @return list<array<string, mixed>>
     */
    public function synopsis(): array
    {
        return [
            [
                'type'        => 'assoc',
                'name'        => 'format',
                'description' => 'Output format: text or json.',
                'optional'    => true,
                'default'     => 'text',
                'options'     => ['text', 'json'],
            ],
        ];
    }

    public function handle(array $args, array $assoc_args): void
    {
        $payload = [
            'module'  => 'example-feature',
            'status'  => 'ok',
            'message' => 'ExampleFeature is loaded',
        ];

        $format = isset($assoc_args['format']) ? (string) $assoc_args['format'] : 'text';

        if ($format === 'json') {
            $this->log((string) wp_json_encode($payload));
            $this->success('Status printed as JSON');
            return;
        }

        $this->log('Module:  ' . $payload['module']);
        $this->log('Status:  ' . $payload['status']);
        $this->log('Message: ' . $payload['message']);
        $this->success('ExampleFeature status OK');
    }
}
