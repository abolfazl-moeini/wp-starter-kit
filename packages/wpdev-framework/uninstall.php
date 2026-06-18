<?php
/**
 * WPDev uninstall script.
 *
 * @package WPDev
 * @since 2.0.0
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {

	exit;

} // end if;

global $wpdb;

$wpdev_settings_key = 'v2_settings';

/*
 * Manually grab the plugin settings. No helpers here =(
 */
$wpdev_settings = get_network_option(null, "wpdev_{$wpdev_settings_key}");

/*
 * Check if we want to wipe things clean on uninstall...
 */
$wpdev_settings_uninstall_wipe_tables = isset($wpdev_settings['uninstall_wipe_tables']) ? $wpdev_settings['uninstall_wipe_tables'] : false;

/*
 * Let's do it.
 */
if ($wpdev_settings_uninstall_wipe_tables) {

	$wpdev_tables = array(
		'customers',
		'customermeta',
		'discount_codes',
		'domain_mappings',
		'events',
		'forms',
		'membershipmeta',
		'memberships',
		'paymentmeta',
		'payments',
		'postmeta',
		'posts',
		'productmeta',
		'products',
		'webhooks'
	);

	$wpdev_prefix_table = "{$wpdb->prefix}wpdev_";

	foreach ($wpdev_tables as $wpdev_table) {

		$wpdev_table_name = $wpdev_prefix_table . $wpdev_table;

		$wpdev_table_version = "wpdb_wpdev_{$wpdev_table}_version";

		$wpdb->query("DROP TABLE IF EXISTS $wpdev_table_name"); // phpcs:ignore

		delete_network_option(null, $wpdev_table_version);

	} // end foreach;

	/*
	 * Remove states saved
	 */
	delete_network_option(null, "wpdev_{$wpdev_settings_key}");
	delete_network_option(null, 'WPDEV_DEBUG_faker');
	delete_network_option(null, 'wpdev_setup_finished');
	delete_network_option(null, 'wpdev_default_email_template');
	delete_network_option(null, 'wpdev_default_system_emails_created');
	delete_network_option(null, 'wpdev_default_invoice_template');

} // end if;
