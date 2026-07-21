<?php
declare(strict_types=1);

namespace WPDev\Support\AccessManager;

use WPDev\Support\AccessManager\BluePrint\BluePrint;

/**
 * Base for named access qualifiers.
 *
 * Subclasses implement describe() to register access ids via BluePrint,
 * and check() to evaluate a single AND-group of rules.
 *
 * have_access($id) returns true when any rule group for that id passes.
 *
 * @since 1.0.0
 */
abstract class QualifierBase
{
    /**
     * Lazy-built structure from describe().
     *
     * @var array<string, array<int, list<array{condition: string, type: string, values: mixed}>>>|null
     */
    protected $rules;

    /**
     * Register named access rules on the blueprint.
     */
    abstract protected function describe(BluePrint $blue_print): void;

    /**
     * Evaluate one AND-group of rules.
     *
     * @param list<array{condition: string, type: string, values: mixed}> $rules
     */
    abstract protected function check(array $rules): bool;

    /**
     * Whether the current (or upper) user passes any rule group for $id.
     *
     * Unknown ids always return false (deny by default).
     */
    public function have_access($id): bool
    {
        if (!isset($this->rules)) {
            $this->rules = $this->structure();
        }

        if (!isset($this->rules[$id])) {
            return false;
        }

        foreach ($this->rules[$id] as $rules) {
            if ($this->check($rules)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string, array<int, list<array{condition: string, type: string, values: mixed}>>>
     */
    protected function structure(): array
    {
        $blue_print = new BluePrint();
        $this->describe($blue_print);

        return $blue_print->structure();
    }
}
