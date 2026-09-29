<?php
function private_runtime_fixture_boot(): void {
    $table = wpdev_register_table( 'wp_private_runtime_fixture' );
    wpdev_register_form( array( 'table' => $table ) );
    add_menu_page(
        'Private Runtime Fixture',
        'Private Runtime Fixture',
        'manage_private_runtime_fixture',
        'private-runtime-fixture',
        static function (): void { echo '<form id="private-runtime-fixture-form"></form>'; },
    );
    register_setting( 'private-runtime-fixture', 'fixture_setting' );
    add_action( 'wp_ajax_private_runtime_fixture_save', static function (): void {
        check_ajax_referer( 'private-runtime-fixture' );
        if ( ! current_user_can( 'manage_private_runtime_fixture' ) ) {
            wp_send_json_error( array( 'code' => 'forbidden' ), 403 );
        }
        wp_send_json_success();
    } );
    add_action( 'private_runtime_fixture_saved', static function ( array $value ): void {
        set_transient( 'private_runtime_fixture_rt_state', $value, 60 );
        wp_cache_set( 'state', $value, 'private-runtime-fixture-rt' );
    } );
    register_rest_route( 'private-runtime-fixture/v1', '/items', array(
        'methods' => 'GET',
        'permission_callback' => static function (): bool { return current_user_can( 'manage_private_runtime_fixture' ); },
        'callback' => static function (): array { return array( 'items' => array() ); },
        'args' => array( 'page' => array( 'validate_callback' => 'is_numeric' ) ),
    ) );
    wp_schedule_single_event( time() + 60, 'private_runtime_fixture_cron' );
    add_action( 'private_runtime_fixture_cron', 'private_runtime_fixture_cron_callback' );
}

function private_runtime_fixture_cron_callback(): void {
    set_site_transient( 'private_runtime_fixture_cron', 'ok', 60 );
}
