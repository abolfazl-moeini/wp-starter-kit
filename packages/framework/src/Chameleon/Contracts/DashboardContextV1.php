<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Contracts;

/**
 * DashboardContextV1: Strongly-typed, immutable, read-only DTO context envelope.
 * Passed to all section and slot renderers. Direct mutation or database querying is prohibited (SPEC §3.7).
 */
final class DashboardContextV1 {
    /**
     * @var array<string, mixed>
     */
    private array $data;

    /**
     * @param array<string, mixed> $data Scoped, allowlisted contract data
     */
    public function __construct(array $data) {
        $this->data = $data;
    }

    /**
     * Retrieve a value from the context using dot notation.
     * E.g. $ctx->get('user.display_name', 'Guest') or $ctx->get('loyalty.points', 0)
     *
     * @param string $path Dot-separated path
     * @param mixed $default Fallback value if not found
     * @return mixed
     */
    public function get(string $path, $default = null) {
        if (array_key_exists($path, $this->data)) {
            return $this->data[$path];
        }

        $current = $this->data;
        $segments = explode('.', $path);

        foreach ($segments as $segment) {
            if (is_array($current) && array_key_exists($segment, $current)) {
                $current = $current[$segment];
            } else {
                return $default;
            }
        }

        return $current;
    }

    /**
     * Check if a path exists in the context.
     */
    public function has(string $path): bool {
        return $this->get($path) !== null;
    }

    /**
     * Return all raw scoped data (read-only snapshot).
     *
     * @return array<string, mixed>
     */
    public function to_array(): array {
        return $this->data;
    }

    /**
     * Disallow runtime mutation.
     *
     * @throws \BadMethodCallException
     */
    public function __set(string $name, $value): void {
        throw new \BadMethodCallException('DashboardContextV1 is strictly immutable.');
    }
}
