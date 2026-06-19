<?php
declare(strict_types=1);

$root = dirname(__DIR__, 2);

require $root . '/vendor/autoload.php';

if (!defined('WP_TESTS_PHPUNIT_POLYFILLS_PATH')) {
    define('WP_TESTS_PHPUNIT_POLYFILLS_PATH', $root . '/vendor/yoast/phpunit-polyfills');
}

WPDevTest\Setup::setup();

// Load RestSetup before WP_UnitTestCase::_backup_hooks() so rest_api_init survives _restore_hooks().
class_exists(\WPDev\Support\Rest\RestSetup::class);