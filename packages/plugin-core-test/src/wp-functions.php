<?php

function wp_redirect( $location, $status = 302 ) {

	$GLOBALS['pb_wp_redirects'] = compact( 'location', 'status' );
}
