<?php
/**
 * Lightweight architecture check: every feature Module.php under
 * src/Modules/ must have at least one matching PHPUnit test under
 * tests/phpunit/Modules/. Run via: composer test:architecture
 */
declare(strict_types=1);

$root = dirname(__DIR__);
$modulesRoot = $root . '/src/Modules';
$testsRoot = $root . '/tests/phpunit/Modules';

if (! is_dir($modulesRoot)) {
	fwrite(STDERR, "test-architecture: no src/Modules directory — nothing to check.\n");
	exit(0);
}

$moduleDirs = glob($modulesRoot . '/*/Module.php') ?: [];
$failures = [];

foreach ($moduleDirs as $moduleFile) {
	$slug = basename(dirname($moduleFile));
	if (! module_has_test($slug, $testsRoot)) {
		$failures[] = sprintf(
			'Module "%s" (%s) has no test under tests/phpunit/Modules/',
			$slug,
			'relative:src/Modules/' . $slug . '/Module.php'
		);
	}
}

if ($failures !== []) {
	fwrite(STDERR, "test-architecture: " . count($failures) . " module(s) missing tests:\n");
	foreach ($failures as $line) {
		fwrite(STDERR, "  - {$line}\n");
	}
	exit(1);
}

fwrite(STDOUT, 'test-architecture: OK — ' . count($moduleDirs) . " module(s) have test coverage.\n");
exit(0);

/**
 * @param string $slug      Module directory name (e.g. ExampleFeature).
 * @param string $testsRoot Absolute path to tests/phpunit/Modules.
 */
function module_has_test(string $slug, string $testsRoot): bool
{
	$candidates = [
		$testsRoot . '/' . $slug . '/ModuleTest.php',
		$testsRoot . '/' . $slug . 'Test.php',
		$testsRoot . '/' . $slug . 'ModuleTest.php',
	];

	foreach ($candidates as $path) {
		if (is_file($path)) {
			return true;
		}
	}

	$nested = glob($testsRoot . '/' . $slug . '/*Test.php') ?: [];
	if ($nested !== []) {
		return true;
	}

	$flat = glob($testsRoot . '/*' . $slug . '*Test.php') ?: [];
	return $flat !== [];
}