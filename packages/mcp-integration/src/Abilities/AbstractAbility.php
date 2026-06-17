<?php
declare(strict_types=1);

namespace WPDev\MCP\Abilities;

/**
 * Base class implementing the common AbilityInterface plumbing.
 *
 * Subclasses MUST implement get_name(), get_label(), get_description(),
 * get_input_schema(), execute() and check_permission(). They MAY
 * override get_output_schema() (defaults to [] = no output schema).
 */
abstract class AbstractAbility implements AbilityInterface
{
    /** Default: no output schema. Override to add one. */
    public function get_output_schema(): array
    {
        return [];
    }

    /**
     * Build the exact arguments array for wp_register_ability().
     * Only the six allowed keys are ever produced (idea.md §3, §8).
     *
     * @return array<string,mixed>
     */
    public function to_args(): array
    {
        $args = [
            'label'               => $this->get_label(),
            'description'         => $this->get_description(),
            'input_schema'        => $this->get_input_schema(),
            'execute_callback'    => [$this, 'execute'],
            'permission_callback' => [$this, 'check_permission'],
        ];

        $output = $this->get_output_schema();
        if ($output !== []) {
            $args['output_schema'] = $output;
        }

        return $args;
    }
}