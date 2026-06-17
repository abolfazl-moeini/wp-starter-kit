<?php
declare(strict_types=1);

namespace WPDev\MCP\Abilities;

/**
 * Contract for a single WordPress ability.
 *
 * The "name" is the registration name in the format
 * "namespace/ability-name" (idea.md §3). Everything else maps to the
 * argument array passed to wp_register_ability().
 */
interface AbilityInterface
{
    /** Registration name, e.g. "my-plugin/get-posts". */
    public function get_name(): string;

    /** Human-readable label (REQUIRED by the Abilities API). */
    public function get_label(): string;

    /** Description of what the ability does (REQUIRED). */
    public function get_description(): string;

    /**
     * Input schema (REQUIRED). Object schema preferred (idea.md §4).
     * @return array<string,mixed>
     */
    public function get_input_schema(): array;

    /**
     * Output schema (OPTIONAL). Return [] to omit it.
     * @return array<string,mixed>
     */
    public function get_output_schema(): array;

    /**
     * Run the ability logic with validated input.
     * @param array<string,mixed> $input
     * @return mixed Data matching get_output_schema() (when defined).
     */
    public function execute(array $input);

    /**
     * Capability/permission check. MUST return bool and use a
     * WordPress capability check (idea.md §5). Never hardcode true
     * for abilities that modify data.
     */
    public function check_permission(): bool;
}