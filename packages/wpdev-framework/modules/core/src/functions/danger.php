<?php
/**
 * Danger Database Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.11
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Drop our custom tables.
 *
 * @since 2.0.0
 * @return void
 * @throws \Exception In case of failures, an exception is thrown.
 */
function wpdev_drop_tables() {

	$tables = apply_filters('wpdev_drop_tables', \WPDevFramework\Loaders\Table_Loader::get_instance()->get_tables());

	$except = array(
		'blogs',
		'blogmeta',
	);

	$except = apply_filters('wpdev_drop_tables_except', $except);

	foreach ($tables as $table) {

		if (!in_array($table->name, $except, true)) {

			$table->uninstall();

		} // end if;

	} // end foreach;

} // end wpdev_drop_tables;
