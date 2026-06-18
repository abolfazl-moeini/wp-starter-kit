<?php
/**
 * Manages Composer autoload.
 *
 * @package WPDev
 * @since 2.3.0
 */

// phpcs:disable

if (isset($GLOBALS['__composer_autoload_files'])) {
    $existingComposerAutoloadFiles = $GLOBALS['__composer_autoload_files'];
}

$loader = require_once __DIR__ . '/dependencies/autoload.php';

if ( ! isset( $GLOBALS['wpdev_composer_autoloader'] ) ) {
	$GLOBALS['wpdev_composer_autoloader'] = $loader;
}
// Ensure InstalledVersions is available
$installedVersionsPath = __DIR__ . '/dependencies/composer/InstalledVersions.php';
if (file_exists($installedVersionsPath)) require_once $installedVersionsPath;

// Restore the backup
if (isset($existingComposerAutoloadFiles)) {
    $GLOBALS['__composer_autoload_files'] = $existingComposerAutoloadFiles;
} else {
    unset($GLOBALS['__composer_autoload_files']);
}

// phpcs:enable
