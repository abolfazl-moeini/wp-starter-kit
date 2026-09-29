<?php
function fixture_dynamic_call( string $suffix ): void {
    $call = 'wpdev_' . $suffix;
    $call();
}
