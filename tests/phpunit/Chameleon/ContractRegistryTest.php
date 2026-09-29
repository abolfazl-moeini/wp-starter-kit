<?php

declare(strict_types=1);

namespace WPDev\Tests\Chameleon;

use BadMethodCallException;
use PHPUnit\Framework\TestCase;
use WPDev\Chameleon\Contracts\ContractRegistry;
use WPDev\Chameleon\Contracts\DashboardContextV1;
use WPDev\Chameleon\Data\CircularDependencyException;

/**
 * ContractRegistryTest: Unit tests for ContractRegistry, field allowlists, and DashboardContextV1.
 */
final class ContractRegistryTest extends TestCase {
    protected function setUp(): void {
        parent::setUp();
        ContractRegistry::reset();
    }

    protected function tearDown(): void {
        ContractRegistry::reset();
        parent::tearDown();
    }

    public function test_default_core_contracts_are_registered(): void {
        $this->assertTrue(ContractRegistry::has('user.identity@1'));
        $this->assertTrue(ContractRegistry::has('stats.summary@1'));
        $this->assertTrue(ContractRegistry::has('user.loyalty@1'));

        $user_fields = ContractRegistry::get_fields('user.identity@1');
        $this->assertContains('id', $user_fields);
        $this->assertContains('display_name', $user_fields);
        $this->assertContains('email', $user_fields);
    }

    public function test_filter_strips_undeclared_sensitive_fields(): void {
        $raw_user = [
            'id'           => 42,
            'display_name' => 'John Doe',
            'email'        => 'john@example.com',
            'user_pass'    => '$2y$10$secretpasswordhash', // Sensitive!
            'secret_token' => 'xyz-auth-token-12345',      // Sensitive!
        ];

        $filtered = ContractRegistry::filter('user.identity@1', $raw_user);

        $this->assertArrayHasKey('id', $filtered);
        $this->assertArrayHasKey('display_name', $filtered);
        $this->assertArrayHasKey('email', $filtered);
        $this->assertArrayNotHasKey('user_pass', $filtered, 'Sensitive password field must be stripped.');
        $this->assertArrayNotHasKey('secret_token', $filtered, 'Sensitive token field must be stripped.');
    }

    public function test_custom_contract_registration(): void {
        ContractRegistry::register(
            'telemetry.metrics@1',
            ['cpu_load', 'memory_usage', 'uptime'],
            batch_resolver: fn(array $ids) => array_fill_keys($ids, ['cpu_load' => '12%']),
            single_resolver: fn(int $id) => ['cpu_load' => '12%', 'memory_usage' => '45%']
        );

        $this->assertTrue(ContractRegistry::has('telemetry.metrics@1'));
        $this->assertCount(3, ContractRegistry::get_fields('telemetry.metrics@1'));

        $single = ContractRegistry::get_single_resolver('telemetry.metrics@1');
        $this->assertIsCallable($single);
        $res = $single(1);
        $this->assertSame('12%', $res['cpu_load']);
    }

    public function test_circular_dependency_throws_exception(): void {
        ContractRegistry::register('contract.a@1', ['field_a'], depends_on: ['contract.b@1']);

        $this->expectException(CircularDependencyException::class);
        ContractRegistry::register('contract.b@1', ['field_b'], depends_on: ['contract.a@1']);
    }

    public function test_dashboard_context_dot_notation_and_immutability(): void {
        $context = new DashboardContextV1([
            'user' => [
                'id'           => 10,
                'display_name' => 'Alice',
                'meta'         => ['points' => 250],
            ],
            'loyalty' => [
                'points' => 250,
            ],
        ]);

        $this->assertSame('Alice', $context->get('user.display_name'));
        $this->assertSame(250, $context->get('user.meta.points'));
        $this->assertSame(250, $context->get('loyalty.points'));
        $this->assertSame('DefaultValue', $context->get('nonexistent.key', 'DefaultValue'));
        $this->assertTrue($context->has('user.id'));
        $this->assertFalse($context->has('nonexistent.path'));

        // Verify immutability
        $this->expectException(BadMethodCallException::class);
        $context->mutation_test = 'disallowed';
    }
}
