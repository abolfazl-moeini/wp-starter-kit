<?php

declare(strict_types=1);

namespace WPDev\Tests\Chameleon;

use PHPUnit\Framework\TestCase;
use WPDev\Chameleon\Contracts\ContractRegistry;
use WPDev\Chameleon\Data\DataBatchLoader;

/**
 * DataBatchLoaderTest: Unit tests for DataBatchLoader contract dependency aggregation and batch loading.
 */
final class DataBatchLoaderTest extends TestCase {
    protected function setUp(): void {
        parent::setUp();
        ContractRegistry::reset();
    }

    protected function tearDown(): void {
        ContractRegistry::reset();
        parent::tearDown();
    }

    public function test_collect_requirements_gathers_all_section_and_slot_contracts(): void {
        $tree = [
            'header' => [
                'sections' => [
                    'banner' => [
                        'requires' => ['user.identity@1'],
                        'injected_items' => [
                            [
                                'id'       => 'loyalty_badge',
                                'requires' => ['user.loyalty@1'],
                            ],
                        ],
                    ],
                ],
            ],
            'main' => [
                'sections' => [
                    'stats' => [
                        'requires' => ['stats.summary@1'],
                    ],
                ],
            ],
        ];

        $reqs = DataBatchLoader::collect_requirements($tree);

        $this->assertArrayHasKey('user.identity@1', $reqs);
        $this->assertArrayHasKey('user.loyalty@1', $reqs);
        $this->assertArrayHasKey('stats.summary@1', $reqs);
        $this->assertCount(3, $reqs);
    }

    public function test_load_context_resolves_registered_contracts(): void {
        ContractRegistry::register(
            'stats.summary@1',
            ['active_count', 'completed_count'],
            single_resolver: fn(int $uid) => [
                'active_count'    => 14,
                'completed_count' => 88,
                'secret_revenue'  => 100000, // Should be stripped by ContractRegistry
            ]
        );

        $context = DataBatchLoader::load_context(['stats.summary@1' => true], 1);

        $this->assertSame(14, $context->get('stats.active_count'));
        $this->assertSame(88, $context->get('stats.completed_count'));
        $this->assertNull($context->get('stats.secret_revenue'));
    }

    public function test_unregistered_contract_is_skipped_fail_soft(): void {
        // 'nonexistent.contract@1' is NOT registered
        $context = DataBatchLoader::load_context(['nonexistent.contract@1' => true], 1);

        $this->assertInstanceOf(\WPDev\Chameleon\Contracts\DashboardContextV1::class, $context);
        $this->assertEmpty($context->to_array());
    }

    public function test_query_count_is_bounded_by_registered_contracts(): void {
        global $wpdb;

        // Register 2 distinct custom contracts
        ContractRegistry::register(
            'crm.contacts@1',
            ['contact_count'],
            single_resolver: fn(int $uid) => ['contact_count' => 5]
        );
        ContractRegistry::register(
            'analytics.traffic@1',
            ['pageviews'],
            single_resolver: fn(int $uid) => ['pageviews' => 1200]
        );

        $initial_queries = isset($wpdb->num_queries) ? $wpdb->num_queries : 0;

        $contracts = [
            'user.identity@1'     => true,
            'crm.contacts@1'      => true,
            'analytics.traffic@1' => true,
        ];

        $context = DataBatchLoader::load_context($contracts, 1);

        $final_queries = isset($wpdb->num_queries) ? $wpdb->num_queries : 0;
        $diff = $final_queries - $initial_queries;

        // Invariant: number of queries <= 2 + C (where C = 3 contracts)
        $max_allowed_queries = 2 + count($contracts);
        $this->assertLessThanOrEqual($max_allowed_queries, $diff);
        $this->assertSame(5, $context->get('crm.contact_count'));
        $this->assertSame(1200, $context->get('analytics.pageviews'));
    }
}
