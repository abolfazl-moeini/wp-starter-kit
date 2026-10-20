<?php
/**
 * Compatibility module bootstrap for WPDev Framework.
 *
 * @package WPDevFramework\Modules\Compat
 * @since   2.14.0
 */

use WPDevFramework\Core\Module_Loader;
use WPDevFramework\Modules\Compat\Compat;

defined( 'ABSPATH' ) || exit;

if ( class_exists( Module_Loader::class ) ) {
	Module_Loader::register(
		'compat',
		array(
			'path'         => __DIR__,
			'dependencies' => array( 'core' ),
		)
	);
}

require_once __DIR__ . '/src/class-compat.php';

if ( function_exists( 'did_action' ) && did_action( 'plugins_loaded' ) ) {
	Compat::init();
} elseif ( function_exists( 'add_action' ) ) {
	add_action( 'plugins_loaded', array( Compat::class, 'init' ), 5 );
} else {
	Compat::init();
}
