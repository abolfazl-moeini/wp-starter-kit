<?php
/**
 * Legacy public API function loader (extracted from WPDev bootstrap).
 *
 * Framework-only functions load eagerly; domain/example functions load from example setup.php.
 *
 * @package WPDevFramework\Core\Legacy
 * @since   2.5.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Loads public APIs on the global scope (framework only).
 *
 * @return void
 */
function wpdev_load_public_apis() {

	$public_functions = array(
		'array-helpers',
		'string-helpers',
		'number-helpers',
		'sunrise',
		'legacy',
		'site-context',
		'sort',
		'debug',
		'reflection',
		'licensing',
		'scheduler',
		'session',
		'documentation',
		'event-bus',
		'http',
		'rest',
		'date',
		'currency',
		'countries',
		'geolocation',
		'translation',
		'mock',
		'model',
		'url',
		'assets',
		'pages',
		'env',
		'form',
		'tour',
		'tab-navigation',
		'markup-helpers',
		'element',
		'generator',
		'color',
		'danger',
		'template',
	);

	foreach ( $public_functions as $function_file ) {
		wpdev_require_public_function( $function_file );
	}

	if ( is_admin() ) {
		wpdev_require_public_function( 'admin' );
	}

} // end wpdev_load_public_apis;
