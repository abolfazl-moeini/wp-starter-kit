<?php
/**
 * List tables, bulk ajax, screen options
 *
 * @package WPDevFramework\Modules\TableBuilder
 * @since   2.4.0
 */

use WPDevFramework\Core\Module_Loader;
use WPDevFramework\Modules\TableBuilder\Component_Registry;

defined( 'ABSPATH' ) || exit;

Module_Loader::register(
	'table-builder',
	array(
		'path'         => __DIR__,
		'dependencies' => array( 'core', 'tab-navigation' ),
	)
);

Component_Registry::init();

require_once __DIR__ . '/src/class-table-config.php';
require_once __DIR__ . '/src/class-list-table-registry.php';
require_once __DIR__ . '/src/functions/list-table.php';
require_once __DIR__ . '/src/class-bulk-action-pipeline.php';

/**
 * Heal corrupted admin URLs missing the 'page' parameter on admin.php.
 *
 * If a request arrives at admin.php with list_table_screen (e.g. toplevel_page_my-plugin)
 * but missing 'page', redirect to the recovered canonical page slug so the user never
 * sees a blank white screen.
 *
 * @since 2.15.1
 * @return void
 */
function wpdev_table_builder_heal_screen_redirect() {

	if ( ! is_admin() || ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) ) {
		return;
	}

	global $pagenow;
	if ( 'admin.php' !== $pagenow ) {
		return;
	}

	if ( ! isset( $_GET['page'] ) && ! empty( $_GET['list_table_screen'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$screen_id = sanitize_key( wp_unslash( (string) $_GET['list_table_screen'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$page_slug = '';

		if ( 0 === strpos( $screen_id, 'toplevel_page_' ) ) {
			$page_slug = substr( $screen_id, 14 );
		} else {
			$pos = strpos( $screen_id, '_page_' );
			if ( false !== $pos ) {
				$page_slug = substr( $screen_id, $pos + 6 );
			}
		}

		if ( '' !== $page_slug ) {
			$redirect_url = remove_query_arg( 'list_table_screen' );
			$redirect_url = add_query_arg( 'page', $page_slug, $redirect_url );
			wp_safe_redirect( $redirect_url );
			exit;
		}
	}

} // end wpdev_table_builder_heal_screen_redirect;
add_action( 'admin_init', 'wpdev_table_builder_heal_screen_redirect', 1 );
