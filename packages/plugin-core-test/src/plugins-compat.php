<?php

// Performance issue fix
remove_action( 'wp_logout', 'user_switching_clear_olduser_cookie' );
remove_action( 'wp_login', 'user_switching_clear_olduser_cookie' );
