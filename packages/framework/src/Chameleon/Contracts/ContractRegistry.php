<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Contracts;

use WPDev\Chameleon\Data\CircularDependencyException;

/**
 * ContractRegistry: Registry of declared data contracts, field allowlists, and resolvers.
 * Enforces data hygiene, field projection allowlisting, and circular dependency checks (SPEC §3.5, §3.7).
 */
final class ContractRegistry {
    /**
     * Default core contract allowlists.
     *
     * @var array<string, array<string>>
     */
    private static array $contracts = [
        'user.identity@1' => [
            'id',
            'display_name',
            'email',
            'avatar_url',
            'roles',
        ],
        'stats.summary@1' => [
            'active_count',
            'completed_count',
            'total_value',
            'currency',
            'last_updated',
        ],
        'user.loyalty@1' => [
            'points',
            'tier',
            'next_tier_progress',
            'expiry_date',
        ],
    ];

    /**
     * @var array<string, callable|null>
     */
    private static array $batch_resolvers = [];

    /**
     * @var array<string, callable|null>
     */
    private static array $single_resolvers = [];

    /**
     * @var array<string, array<string>>
     */
    private static array $dependencies = [];

    /**
     * Register or extend a contract allowlist and resolvers.
     *
     * @param string $contract_id Semantic versioned contract ID (e.g. 'crm.deals@1')
     * @param array<string> $fields Fields permitted to be exposed in context
     * @param callable|null $batch_resolver fn(array $user_ids): array<int, array<string, mixed>>
     * @param callable|null $single_resolver fn(int $user_id): array<string, mixed>
     * @param array<string> $depends_on Other contract IDs this contract depends on
     * @throws CircularDependencyException
     */
    public static function register(
        string $contract_id,
        array $fields,
        ?callable $batch_resolver = null,
        ?callable $single_resolver = null,
        array $depends_on = []
    ): void {
        // Static circular dependency check
        self::assert_no_circular_dependencies($contract_id, $depends_on);

        self::$contracts[$contract_id] = $fields;
        self::$batch_resolvers[$contract_id] = $batch_resolver;
        self::$single_resolvers[$contract_id] = $single_resolver;
        self::$dependencies[$contract_id] = $depends_on;
    }

    /**
     * Check if a contract is recognized.
     */
    public static function has(string $contract_id): bool {
        return isset(self::$contracts[$contract_id]);
    }

    /**
     * Get the allowlisted fields for a given contract.
     *
     * @return array<string>
     */
    public static function get_fields(string $contract_id): array {
        return self::$contracts[$contract_id] ?? [];
    }

    /**
     * Get batch resolver for a contract.
     */
    public static function get_batch_resolver(string $contract_id): ?callable {
        return self::$batch_resolvers[$contract_id] ?? null;
    }

    /**
     * Get single resolver for a contract.
     */
    public static function get_single_resolver(string $contract_id): ?callable {
        return self::$single_resolvers[$contract_id] ?? null;
    }

    /**
     * Get dependencies for a contract.
     *
     * @return array<string>
     */
    public static function get_dependencies(string $contract_id): array {
        return self::$dependencies[$contract_id] ?? [];
    }

    /**
     * Filter raw data according to the contract's allowlist.
     *
     * @param string $contract_id
     * @param array<string, mixed> $raw_data
     * @return array<string, mixed>
     */
    public static function filter(string $contract_id, array $raw_data): array {
        $allowed = self::get_fields($contract_id);
        if (empty($allowed)) {
            return [];
        }

        $filtered = [];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $raw_data)) {
                $filtered[$field] = $raw_data[$field];
            }
        }

        return $filtered;
    }

    /**
     * Reset custom registry state (for testing isolation).
     */
    public static function reset(): void {
        self::$contracts = [
            'user.identity@1' => [
                'id',
                'display_name',
                'email',
                'avatar_url',
                'roles',
            ],
            'stats.summary@1' => [
                'active_count',
                'completed_count',
                'total_value',
                'currency',
                'last_updated',
            ],
            'user.loyalty@1' => [
                'points',
                'tier',
                'next_tier_progress',
                'expiry_date',
            ],
        ];
        self::$batch_resolvers = [];
        self::$single_resolvers = [];
        self::$dependencies = [];
    }

    /**
     * Static circular dependency detection.
     *
     * @param string $new_id
     * @param array<string> $depends_on
     * @throws CircularDependencyException
     */
    private static function assert_no_circular_dependencies(string $new_id, array $depends_on): void {
        $visited = [$new_id => true];
        $stack = $depends_on;

        while (!empty($stack)) {
            $current = array_pop($stack);
            if ($current === $new_id) {
                throw new CircularDependencyException(
                    sprintf("Circular contract dependency detected involving '%s'.", $new_id)
                );
            }

            if (!empty(self::$dependencies[$current])) {
                foreach (self::$dependencies[$current] as $dep) {
                    if ($dep === $new_id) {
                        throw new CircularDependencyException(
                            sprintf("Circular contract dependency detected: '%s' -> '%s' -> '%s'.", $new_id, $current, $new_id)
                        );
                    }
                    if (!isset($visited[$dep])) {
                        $visited[$dep] = true;
                        $stack[] = $dep;
                    }
                }
            }
        }
    }
}
