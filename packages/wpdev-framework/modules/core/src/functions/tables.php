<?php
/**
 * Register a domain table with Table_Loader (examples call this from setup.php).
 *
 * @package WPDevFramework\Core\Functions
 * @since   2.8.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register a table factory for the shared Table_Loader.
 *
 * @param string          $property Table_Loader property (e.g. product_table).
 * @param callable|string $factory  Callable or FQCN. Skipped when class missing.
 * @return void
 */
function wpdev_register_table( $property, $factory ) {

	if ( ! class_exists( 'WPDev\\Core\\Table_Registry' ) ) {
		return;
	}

	\WPDevFramework\Core\Table_Registry::register( $property, $factory );

} // end wpdev_register_table;
