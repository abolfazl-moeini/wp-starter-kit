<?php
/**
 * Installs WordPress for the purpose of the unit-tests
 *
 * @todo Reuse the init/load code in init.php
 */
error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);

$config_file_path = $argv[1] ?? '';
$tests_dir = $argv[2] ?? '';
$plugins_list_file = $argv[3] ?? '';
require_once $config_file_path;
require_once $tests_dir . '/includes/functions.php';

tests_reset__SERVER();

$PHP_SELF = '/index.php';
$GLOBALS['PHP_SELF'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

tests_add_filter('wp_die_handler', '_wp_die_handler_filter_exit');

require_once ABSPATH . '/wp-settings.php';

require_once ABSPATH . '/wp-admin/includes/upgrade.php';
require_once ABSPATH . '/wp-includes/wp-db.php';

if (empty($plugins_list_file)) {

    exit;
}

$plugins_list = include $plugins_list_file;

echo 'Activating Plugins...' . PHP_EOL;

foreach ($plugins_list as $plugin_file) {

    $status = activate_plugin($plugin_file);

    if (is_wp_error($status)) {

        printf("\033[31m %s\033[0m | %s\n", $status->get_error_message(), $plugin_file);

        if ('unexpected_output' === $status->get_error_code()) {

            echo $status->get_error_data();
        }
    }
}
