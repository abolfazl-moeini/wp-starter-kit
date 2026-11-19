<?php
declare(strict_types=1);

$root = dirname(__DIR__, 2);

require $root . '/vendor/autoload.php';

if (!defined('WP_TESTS_PHPUNIT_POLYFILLS_PATH')) {
    define('WP_TESTS_PHPUNIT_POLYFILLS_PATH', $root . '/vendor/yoast/phpunit-polyfills');
}

// Resolve WP_TESTS_DIR with fallbacks
$tests_dir = getenv('WP_TESTS_DIR') ?: '';
if (!$tests_dir || !file_exists($tests_dir . '/includes/functions.php')) {
    if (file_exists('/tmp/wordpress-tests-lib/includes/functions.php')) {
        $tests_dir = '/tmp/wordpress-tests-lib';
    } elseif (file_exists('/var/www/wordpress-tests-lib/includes/functions.php')) {
        $tests_dir = '/var/www/wordpress-tests-lib';
    }
}

if (!$tests_dir || !file_exists($tests_dir . '/includes/functions.php')) {
    fwrite(
        STDERR,
        PHP_EOL .
        '========================================================================' . PHP_EOL .
        ' [WPDev] WordPress PHPUnit tests library not found!' . PHP_EOL .
        ' Checked path: ' . ($tests_dir ?: '(none)') . PHP_EOL .
        PHP_EOL .
        ' To run WordPress integration tests, please either:' . PHP_EOL .
        ' 1. Use the Docker test runner:' . PHP_EOL .
        '    ./tests/docker-phpunit/run-phpunit.sh' . PHP_EOL .
        ' 2. Or set the WP_TESTS_DIR environment variable to a valid test library:' . PHP_EOL .
        '    export WP_TESTS_DIR=/path/to/wordpress-tests-lib' . PHP_EOL .
        '========================================================================' . PHP_EOL . PHP_EOL
    );
    exit(1);
}

putenv("WP_TESTS_DIR={$tests_dir}");
$_ENV['WP_TESTS_DIR'] = $tests_dir;
$_SERVER['WP_TESTS_DIR'] = $tests_dir;

WPDevTest\Setup::setup();

// Load RestSetup before WP_UnitTestCase::_backup_hooks() so rest_api_init survives _restore_hooks().
class_exists(\WPDev\Support\Rest\RestSetup::class);
