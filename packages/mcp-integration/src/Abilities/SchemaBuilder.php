<?php
declare(strict_types=1);

namespace WPDev\MCP\Abilities;

use InvalidArgumentException;

/**
 * Builds JSON-schema-style object schemas for ability input/output.
 * Only the property types allowed by idea.md §4 are accepted.
 */
final class SchemaBuilder
{
    private const ALLOWED_TYPES = ['string', 'number', 'boolean', 'array', 'object'];

    /** @var array<string, array<string,mixed>> */
    private array $properties = [];

    /** @var array<int, string> */
    private array $required = [];

    public static function object(): self
    {
        return new self();
    }

    /**
     * Add a property. $type must be one of the allowed types.
     * @param array<string,mixed> $extra Extra schema keys (e.g. ['description' => '...']).
     */
    public function prop(string $name, string $type, bool $required = false, array $extra = []): self
    {
        if (!in_array($type, self::ALLOWED_TYPES, true)) {
            throw new InvalidArgumentException(
                sprintf("Property type '%s' is not allowed (allowed: %s)", $type, implode(', ', self::ALLOWED_TYPES))
            );
        }
        $this->properties[$name] = array_merge(['type' => $type], $extra);
        if ($required) {
            $this->required[] = $name;
        }
        return $this;
    }

    /** @return array<string,mixed> */
    public function to_array(): array
    {
        $schema = [
            'type'       => 'object',
            'properties' => $this->properties,
        ];
        if ($this->required !== []) {
            $schema['required'] = array_values(array_unique($this->required));
        }
        return $schema;
    }
}