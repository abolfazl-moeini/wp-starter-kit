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
     * @return array<string, array<int, list<array{condition: string, type: string, values: mixed}>>>
     */
    public function structure(): array
    {
        return $this->structure;
    }
}
