<?php

declare( strict_types=1 );

require dirname( __DIR__, 2 ) . '/vendor/autoload.php';

define( 'TEST_FIXTURE_DIR', __DIR__ . '/Fixtures' );
define( 'TEST_DIR', dirname( __DIR__ ) );
define( 'TEST_DIR_URL', dirname( __DIR__ ) );
//
define( 'ALL_PLUGINS_DIR_ABS', dirname( TEST_DIR, 2 ) );
define( 'PLUGIN_DIR_ABS', dirname( TEST_DIR ) );
define( 'PLUGIN_DIR', basename( PLUGIN_DIR_ABS ) );
define( 'PLUGIN_ROOT', dirname( TEST_DIR ) );

$_tests_dir = _tests_dir();
require_once $_tests_dir . '/includes/functions.php';

tests_add_filter( 'plugins_url', '_fix_plugin_url', 20, 3 );

tests_add_filter( 'WPDev/Exit', function () {

	$GLOBALS['bs_exit_status'] = true;

	return false;
} );

// Start up the WP testing environment.
require $_tests_dir . '/includes/bootstrap.php';
