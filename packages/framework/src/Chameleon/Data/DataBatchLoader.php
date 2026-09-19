<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Data;

use WPDev\Chameleon\Contracts\ContractRegistry;
use WPDev\Chameleon\Contracts\DashboardContextV1;

/**
 * DataBatchLoader: Aggregates declared contract dependencies across all active sections
 * and slots, executing batched queries to prevent 1 + N cascades (SPEC §3.5).
 */
final class DataBatchLoader {
    const MAX_RESOLUTION_DEPTH = 3;

    /**
     * @var array<string, callable> Registered batch contract loaders (legacy/convenience)
     */
    private static array $loaders = [];

    /**
     * Register a loader for a specific contract.
     *
     * @param string $contract_id
     * @param callable $loader callable(int $user_id): array<string, mixed>
     */
    public static function register_loader(string $contract_id, callable $loader): void {
        self::$loaders[$contract_id] = $loader;
    }

    /**
     * Collect all declared requirements from a resolved composition tree.
     *
     * @param array<string, array{sections: array<string, array<string, mixed>>}> $resolved_tree
     * @return array<string, bool>
     */
    public static function collect_requirements(array $resolved_tree): array {
        $required = [];

        foreach ($resolved_tree as $region) {
            foreach ($region['sections'] as $section) {
                if (!empty($section['requires'])) {
                    foreach ((array) $section['requires'] as $req) {
                        $required[$req] = true;
                    }
                }
                if (!empty($section['injected_items'])) {
                    foreach ($section['injected_items'] as $item) {
                        if (!empty($item['requires'])) {
                            foreach ((array) $item['requires'] as $req) {
                                $required[$req] = true;
                            }
                        }
                    }
                }
            }
        }

        return $required;
    }

    /**
     * Load all declared contracts for a user in a bounded number of operations (<= 2 + C queries).
     *
     * @param array<string, bool> $required_contracts
     * @param int $user_id
     * @param int $depth Recursion depth tracker for circuit breaker
     * @return DashboardContextV1
     */
    public static function load_context(array $required_contracts, int $user_id, int $depth = 0): DashboardContextV1 {
        if ($depth > self::MAX_RESOLUTION_DEPTH) {
            if (function_exists('_doing_it_wrong')) {
                _doing_it_wrong(__METHOD__, 'Max contract resolution depth (3) exceeded in DataBatchLoader.', '2.0.0');
            }
            return new DashboardContextV1([]);
        }

        $aggregated_data = [];

        // Validate all contracts exist in ContractRegistry
        $valid_contracts = [];
        foreach (array_keys($required_contracts) as $contract_id) {
            if (!ContractRegistry::has($contract_id)) {
                if (function_exists('_doing_it_wrong')) {
                    _doing_it_wrong(
                        __METHOD__,
                        sprintf("Unregistered contract requirement: '%s'. Slot requirement skipped fail-soft.", esc_html($contract_id)),
                        '2.0.0'
                    );
                }
                continue;
            }
            $valid_contracts[$contract_id] = true;
        }

        // 1. Core user.identity@1 loader (Standard WP Core queries)
        if (isset($valid_contracts['user.identity@1'])) {
            $raw_user = [];
            if ($user_id > 0 && function_exists('get_userdata')) {
                $user = get_userdata($user_id);
                if ($user) {
                    $raw_user = [
                        'id'           => $user->ID,
                        'display_name' => $user->display_name,
                        'email'        => $user->user_email,
                        'roles'        => $user->roles,
                        'avatar_url'   => function_exists('get_avatar_url') ? get_avatar_url($user->ID) : '',
                    ];
                }
            }
            $aggregated_data['user'] = ContractRegistry::filter('user.identity@1', $raw_user);
        }

        // 2. Custom contract loaders (Batch or single resolvers from ContractRegistry or self::$loaders)
        foreach (array_keys($valid_contracts) as $contract_id) {
            if ($contract_id === 'user.identity@1') {
                continue;
            }

            $raw_contract_data = null;

            // Check single resolver in ContractRegistry
            $single_resolver = ContractRegistry::get_single_resolver($contract_id);
            if ($single_resolver !== null) {
                $raw_contract_data = call_user_func($single_resolver, $user_id);
            }

            // Check batch resolver in ContractRegistry
            if ($raw_contract_data === null) {
                $batch_resolver = ContractRegistry::get_batch_resolver($contract_id);
                if ($batch_resolver !== null) {
                    $batch_result = call_user_func($batch_resolver, [$user_id]);
                    $raw_contract_data = $batch_result[$user_id] ?? [];
                }
            }

            // Fall back to registered loader in DataBatchLoader
            if ($raw_contract_data === null && isset(self::$loaders[$contract_id])) {
                $raw_contract_data = call_user_func(self::$loaders[$contract_id], $user_id);
            }

            if (is_array($raw_contract_data)) {
                $prefix = explode('.', $contract_id)[0];
                $filtered = ContractRegistry::filter($contract_id, $raw_contract_data);
                $aggregated_data[$prefix] = $filtered;
            }
        }

        return new DashboardContextV1($aggregated_data);
    }
}
