<?php
declare(strict_types=1);

namespace WPSK\Core;

/**
 * In-memory registry and boot orchestrator for {@see ModuleInterface}
 * implementations.
 *
 * Modules are registered by slug with {@see ModuleLoader::register()};
 * nothing happens until {@see ModuleLoader::boot_all()} is invoked,
 * keeping module side effects out of the autoloader / files-load
 * phase. Boot order is the order of registration — no priority system
 * is needed at the module level because the loader only knows about
 * a single phase.
 *
 * Extensibility hooks (filter / action) follow the project's
 * `{$hookPrefix}_*` naming convention. The `hookPrefix` is supplied
 * at construction time and is typically read from
 * `project.config.json` (e.g. `wpsk_module_loader` for `wpsk`).
 */
final class ModuleLoader
{
    /**
     * Registered modules keyed by slug, in registration order.
     *
     * @var array<string, ModuleInterface>
     */
    private array $modules = [];

    private string $hookPrefix;

    public function __construct(string $hookPrefix)
    {
        $this->hookPrefix = $hookPrefix;
    }

    /**
     * Register a module under its slug.
     *
     * @throws \InvalidArgumentException when a module with the same
     *                                   slug has already been
     *                                   registered on this loader.
     */
    public function register(ModuleInterface $module): void
    {
        $slug = $module->get_slug();
        if ($slug === '') {
            throw new \InvalidArgumentException(
                'Module slug must be a non-empty string'
            );
        }
        if (isset($this->modules[$slug])) {
            throw new \InvalidArgumentException(
                sprintf(
                    "Module with slug '%s' is already registered",
                    $slug
                )
            );
        }

        $this->modules[$slug] = $module;
    }

    /**
     * Iterate every registered module and call boot() on it.
     *
     * Lazy by design: nothing boots at register() time. Calling this
     * method more than once is allowed and will boot every module
     * each time — modules are responsible for their own idempotency.
     */
    public function boot_all(): void
    {
        // Allow third-party code to swap / decorate the loader
        // before modules are booted.
        $this->modules = $this->filter_modules($this->modules);

        foreach ($this->modules as $module) {
            $module->boot();
        }

        $this->fire_loaded_action();
    }

    /**
     * Look up a registered module by slug, or null if unknown.
     */
    public function get(string $slug): ?ModuleInterface
    {
        return $this->modules[$slug] ?? null;
    }

    /**
     * Whether a module with the given slug has been registered.
     */
    public function has(string $slug): bool
    {
        return isset($this->modules[$slug]);
    }

    /**
     * The full module map keyed by slug, in registration order.
     *
     * @return array<string, ModuleInterface>
     */
    public function all(): array
    {
        return $this->modules;
    }

    /**
     * Apply the `{$hookPrefix}_module_loader` filter if the WordPress
     * `apply_filters()` shim is available. Allows other code to swap
     * the loader implementation before boot. Falls through silently
     * in non-WordPress environments (CLI, unit tests).
     *
     * @param array<string, ModuleInterface> $modules
     * @return array<string, ModuleInterface>
     */
    private function filter_modules(array $modules): array
    {
        if (!function_exists('apply_filters')) {
            return $modules;
        }

        $filtered = \apply_filters(
            $this->hookPrefix . '_module_loader',
            $this
        );

        if ($filtered instanceof self) {
            return $filtered->modules;
        }

        return $modules;
    }

    /**
     * Fire the `{$hookPrefix}_modules_loaded` action so third-party
     * code can run after every module has booted. Falls through
     * silently in non-WordPress environments.
     */
    private function fire_loaded_action(): void
    {
        if (!function_exists('do_action')) {
            return;
        }

        \do_action($this->hookPrefix . '_modules_loaded');
    }
}
