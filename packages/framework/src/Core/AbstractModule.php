<?php
declare(strict_types=1);

namespace WPDev\Core;

// phpcs:disable WordPress.Files.FileName.NotHyphenatedLowercase
// phpcs:disable WordPress.Files.FileName.InvalidClassFileName

/**
 * Optional base class for feature modules with a default boot gate.
 *
 * Extend this when a module needs conditional booting (e.g. admin-only).
 * Modules that always boot can implement {@see ModuleInterface} directly.
 */
abstract class AbstractModule implements ModuleInterface {

	/**
	 * Return false to skip booting this module in the current request.
	 *
	 * @return bool
	 */
	public function should_boot(): bool {
		return true;
	}
}