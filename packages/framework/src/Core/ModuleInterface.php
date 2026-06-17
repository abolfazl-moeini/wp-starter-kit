<?php
declare(strict_types=1);

namespace WPDev\Core;

// phpcs:disable WordPress.Files.FileName.NotHyphenatedLowercase
// phpcs:disable WordPress.Files.FileName.InvalidClassFileName
// PSR-4 autoload (`WPSK\\` => `src/`) maps
// `WPDev\Core\ModuleInterface` to `ModuleInterface.php` exactly.
// The WPCS FileName rules would require `module-interface.php`
// (PSR-4 cannot resolve that), so they are disabled locally for
// this one file. The other WPCS rules still apply — see the
// rest of this file for docblock compliance.

/**
 * Contract every pluggable feature module must implement.
 *
 * The wp-starter-kit is structured around small, isolated feature
 * modules (e.g. an "example-feature", a "rest-api" module, a
 * "frontend-bundle" module). Each module decides its own slug
 * (used as the lookup key inside {@see ModuleLoader}) and a single
 * {@see ModuleInterface::boot()} entry point that the loader calls
 * exactly once after registration.
 *
 * The interface intentionally has no dependencies on WordPress so a
 * module can be unit-tested in isolation. WordPress integration
 * (action / filter registration) happens *inside* boot(), not on
 * the contract.
 */
interface ModuleInterface {

	/**
	 * Run the module's startup logic.
	 *
	 * Called by {@see ModuleLoader::boot_all()} after the module has
	 * been registered. Implementations should be idempotent at the
	 * call-site level — the loader does not promise to invoke
	 * boot() only once if the caller calls boot_all() more than
	 * once.
	 */
	public function boot(): void;

	/**
	 * Return the unique slug used to register and look up the module
	 * inside the {@see ModuleLoader}. Slugs must be stable across
	 * versions because they are part of the public contract.
	 *
	 * @return string
	 */
	public function get_slug(): string;
}
