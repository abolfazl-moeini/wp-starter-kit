<?php
declare(strict_types=1);

namespace WPDev\Core;

// phpcs:disable WordPress.Files.FileName.NotHyphenatedLowercase
// phpcs:disable WordPress.Files.FileName.InvalidClassFileName
// PSR-4 autoload (`WPDev\\` => `src/`) maps `WPDev\Core\ModuleLoader`
// to `ModuleLoader.php` exactly. The WPCS FileName rules would
// require `class-module-loader.php` (PSR-4 cannot resolve that),
// so they are disabled locally for this one file. The other WPCS
// rules still apply — see the rest of this file for snake_case /
// yoda / escaping / docblock compliance.

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
 * `{$hook_prefix}_*` naming convention. The `hook_prefix` is supplied
 * at construction time and is typically read from
 * `project.config.json` (e.g. `wpsk_module_loader` for `wpsk`).
 */
final class ModuleLoader {

	/**
	 * Registered modules keyed by slug, in registration order.
	 *
	 * @var array<string, ModuleInterface>
	 */
	private array $modules = array();

	/**
	 * The hook prefix used to namespace the filter and action
	 * callbacks (e.g. `wpsk` → `wpsk_module_loader`,
	 * `wpsk_modules_loaded`).
	 *
	 * @var string
	 */
	private string $hook_prefix;

	/**
	 * @param string $hook_prefix Project hook prefix used to
	 *                            namespace filter / action names.
	 */
	public function __construct( string $hook_prefix ) {
		$this->hook_prefix = $hook_prefix;
	}

	/**
	 * Register a module under its slug.
	 *
	 * @param ModuleInterface $module The module to register.
	 *
	 * @throws \InvalidArgumentException When a module with the same
	 *                                   slug has already been
	 *                                   registered on this loader,
	 *                                   or when the slug is empty.
	 */
	public function register( ModuleInterface $module ): void {
		$slug = $module->get_slug();
		if ( '' === $slug ) {
			throw new \InvalidArgumentException(
				'Module slug must be a non-empty string'
			);
		}
		if ( isset( $this->modules[ $slug ] ) ) {
			throw new \InvalidArgumentException(
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
				sprintf( "Module with slug '%s' is already registered", $slug )
			);
		}

		$this->modules[ $slug ] = $module;
	}

	/**
	 * Iterate every registered module and call boot() on it.
	 *
	 * Lazy by design: nothing boots at register() time. Calling this
	 * method more than once is allowed and will boot every module
	 * each time — modules are responsible for their own idempotency.
	 */
	public function boot_all(): void {
		// Allow third-party code to swap / decorate the loader
		// before modules are booted.
		$this->modules = $this->filter_modules( $this->modules );

		foreach ( $this->modules as $module ) {
			if ( method_exists( $module, 'should_boot' ) && ! $module->should_boot() ) {
				continue;
			}
			$module->boot();
		}

		$this->fire_loaded_action();
	}

	/**
	 * Look up a registered module by slug, or null if unknown.
	 *
	 * @param string $slug The module slug.
	 *
	 * @return ModuleInterface|null
	 */
	public function get( string $slug ): ?ModuleInterface {
		return $this->modules[ $slug ] ?? null;
	}

	/**
	 * Whether a module with the given slug has been registered.
	 *
	 * @param string $slug The module slug.
	 *
	 * @return bool
	 */
	public function has( string $slug ): bool {
		return isset( $this->modules[ $slug ] );
	}

	/**
	 * The full module map keyed by slug, in registration order.
	 *
	 * @return array<string, ModuleInterface>
	 */
	public function all(): array {
		return $this->modules;
	}

	/**
	 * Apply the `{$hook_prefix}_module_loader` filter if the WordPress
	 * `apply_filters()` shim is available. Allows other code to swap
	 * the loader implementation before boot. Falls through silently
	 * in non-WordPress environments (CLI, unit tests).
	 *
	 * @param array<string, ModuleInterface> $modules The currently
	 *                                                 registered modules.
	 *
	 * @return array<string, ModuleInterface>
	 */
	private function filter_modules( array $modules ): array {
		if ( ! function_exists( 'apply_filters' ) ) {
			return $modules;
		}

		$filtered = \apply_filters(
			$this->hook_prefix . '_module_loader',
			$this
		);

		if ( $filtered instanceof self ) {
			return $filtered->modules;
		}

		return $modules;
	}

	/**
	 * Fire the `{$hook_prefix}_modules_loaded` action so third-party
	 * code can run after every module has booted. Falls through
	 * silently in non-WordPress environments.
	 */
	private function fire_loaded_action(): void {
		if ( ! function_exists( 'do_action' ) ) {
			return;
		}

		\do_action( $this->hook_prefix . '_modules_loaded' );
	}
}
