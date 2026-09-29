<?php

function private_runtime_fixture_bootstrap(): void {
    if ( defined( 'WP_SANDBOX_SCRAPING' ) && WP_SANDBOX_SCRAPING ) {
        return;
    }
    private_runtime_fixture_install();
    private_runtime_fixture_boot();
}
