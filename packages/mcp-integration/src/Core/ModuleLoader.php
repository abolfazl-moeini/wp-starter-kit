<?php
declare(strict_types=1);

namespace WPDev\MCP\Core;

use InvalidArgumentException;

/**
 * In-memory registry and boot orchestrator for ModuleInterface
 * implementations. Modules are registered by slug; nothing happens
 * until boot_all() is called.
 */
final class ModuleLoader
{
    /** @var array<string, ModuleInterface> */
    private array $modules = [];

    private string $hook_prefix;

    public function __construct(string $hook_prefix)
    {
        $this->hook_prefix = $hook_prefix;
    }

    public function setHookPrefix(string $hook_prefix): void
    {
        $this->hook_prefix = $hook_prefix;
    }

    public function register(ModuleInterface $module): void
    {
        $slug = $module->get_slug();
        if ($slug === '') {
            throw new InvalidArgumentException('Module slug must be a non-empty string');
        }
        if (isset($this->modules[$slug])) {
            throw new InvalidArgumentException(
                sprintf("Module with slug '%s' is already registered", $slug)
            );
        }
        $this->modules[$slug] = $module;
    }

    public function boot_all(): void
    {
        foreach ($this->modules as $module) {
            $module->boot();
        }
        if (function_exists('do_action')) {
            \do_action($this->hook_prefix . '_modules_loaded');
        }
    }

    public function get(string $slug): ?ModuleInterface
    {
        return $this->modules[$slug] ?? null;
    }

    public function has(string $slug): bool
    {
        return isset($this->modules[$slug]);
    }

    /** @return array<string, ModuleInterface> */
    public function all(): array
    {
        return $this->modules;
    }
}