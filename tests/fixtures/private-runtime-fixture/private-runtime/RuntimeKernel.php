<?php
function wpdev_register_form( array $fields ): void {
    do_action( 'private_runtime_fixture_saved', $fields );
}
