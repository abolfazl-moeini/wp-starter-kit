<?php
declare(strict_types=1);

namespace WPDev\Support\AccessManager\BluePrint;

/**
 * Fluent builder for named access rules.
 *
 * Each describe() / describe_upper() call opens a rule group for an access id.
 * Multiple groups for the same id are OR'd; rules within a group are AND'd.
 *
 * Conditions:
 * - any(...$caps)    — user needs at least one capability
 * - all(...$caps)    — user needs every capability
 * - custom(callable) — arbitrary callback (return truthy to pass)
 *
 * @since 1.0.0
 */
final class BluePrint
{
    /**
     * Currently describing access id.
     *
     * @var string|null
     */
    protected $id;

    /**
     * User target: "current" or "upper" (User Switching plugin).
     *
     * @var string
     */
    protected $type = 'current';

    /**
     * Built structure: [ accessId => [ groupIndex => [ rule, ... ], ... ], ... ]
     *
     * @var array<string, array<int, list<array{condition: string, type: string, values: mixed}>>>
     */
    protected $structure = [];

    /**
     * Group index for the current describe() call.
     *
     * @var int
     */
    protected $indicator = -1;

    /**
     * Start (or open another OR-group for) an access id against the current user.
     */
    public function describe(string $id): self
    {
        $this->id = $id;
        $this->indicator++;
        $this->type = 'current';

        return $this;
    }

    /**
     * Same as describe(), but checks the "upper" user (User Switching plugin).
     */
    public function describe_upper(string $id): self
    {
        $this->id = $id;
        $this->indicator++;
        $this->type = 'upper';

        return $this;
    }

    /**
     * Pass if the user has any of the given capabilities (OR).
     *
     * @param string ...$caps Capability names.
     */
    public function any(string ...$caps): self
    {
        $this->structure[$this->id][$this->indicator][] = [
            'condition' => 'any',
            'type'      => $this->type,
            'values'    => $caps,
        ];

        return $this;
    }

    /**
     * Pass only if the user has every given capability (AND).
     *
     * @param string ...$caps Capability names.
     */
    public function all(string ...$caps): self
    {
        $this->structure[$this->id][$this->indicator][] = [
            'condition' => 'all',
            'type'      => $this->type,
            'values'    => $caps,
        ];

        return $this;
    }

    /**
     * Pass when the callback returns a truthy value.
     *
     * @param callable $callback Receives itself as the only argument.
     */
    public function custom(callable $callback): self
    {
        $this->structure[$this->id][$this->indicator][] = [
            'condition' => 'custom',
            'type'      => $this->type,
            'values'    => $callback,
        ];

        return $this;
    }

    /**
     * Contextual mock capability rules:
     * [ targetCap => list<array{role: string, caller: string, depth: int}> ]
     *
     * @var array<string, list<array{role: string, caller: string, depth: int}>>
     */
    protected array $mock_caps = [];

    /**
     * Define a contextual mock capability granted strictly when a specific vendor or caller queries it.
     *
     * @param string $target_cap       Capability being queried (e.g. 'editor', 'administrator').
     * @param string $for_role         Prerequisite role the user must possess (e.g. 'content_manager').
     * @param string $when_called_from File path or class substring in the call stack (e.g. 'wordfence').
     * @param int    $max_depth        Maximum call stack depth to inspect (default: 10, clamped 1..50).
     */
    public function mock_cap(string $target_cap, string $for_role, string $when_called_from, int $max_depth = 10): self
    {
        $target_cap = strtolower(trim($target_cap));
        $for_role   = strtolower(trim($for_role));

        // Prevent redundant or self-referential spoofing
        if ($target_cap === '' || $for_role === '' || $target_cap === $for_role) {
            return $this;
        }

        $depth = min(50, max(1, $max_depth));

        $this->mock_caps[$target_cap][] = [
            'role'   => $for_role,
            'caller' => $when_called_from,
            'depth'  => $depth,
        ];

        return $this;
    }

    /**
     * Retrieve all registered mock capability rules.
     *
     * @return array<string, list<array{role: string, caller: string, depth: int}>>
     */
    public function get_mock_caps(): array
    {
        return $this->mock_caps;
    }

    /**
     * In-memory mapped capabilities:
     * [ capability => list<string> (roles permitted) ]
     *
     * @var array<string, list<string>>
     */
    protected array $mapped_caps = [];

    /**
     * Map a capability to one or more roles in memory (zero database writes).
     *
     * When current_user_can($capability) is queried, users possessing any of $roles
     * are granted the capability dynamically via user_has_cap.
     *
     * @param string       $capability Capability being queried (e.g. 'manage_theme_settings').
     * @param list<string> $roles      Roles allowed to have this capability.
     */
    public function map_cap(string $capability, array $roles): self
    {
        $capability = strtolower(trim($capability));
        if ($capability === '' || empty($roles)) {
            return $this;
        }

        if (!isset($this->mapped_caps[$capability])) {
            $this->mapped_caps[$capability] = [];
        }

        foreach ($roles as $role) {
            $normalized_role = strtolower(trim((string) $role));
            if ($normalized_role !== '' && $normalized_role !== $capability && !in_array($normalized_role, $this->mapped_caps[$capability], true)) {
                $this->mapped_caps[$capability][] = $normalized_role;
            }
        }

        return $this;
    }

    /**
     * Retrieve all in-memory mapped capability rules.
     *
     * @return array<string, list<string>>
     */
    public function get_mapped_caps(): array
    {
        return $this->mapped_caps;
    }

    /**
     * @return array<string, array<int, list<array{condition: string, type: string, values: mixed}>>>
     */
    public function structure(): array
    {
        return $this->structure;
    }
}
