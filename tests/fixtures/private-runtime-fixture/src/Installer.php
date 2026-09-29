<?php

function private_runtime_fixture_install(): void {
    $role = get_role( 'administrator' );
    if ( $role ) {
        $role->add_cap( 'manage_private_runtime_fixture' );
    }
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( "CREATE TABLE {$wpdb->prefix}private_runtime_fixture (id bigint(20) unsigned NOT NULL)" );
}
