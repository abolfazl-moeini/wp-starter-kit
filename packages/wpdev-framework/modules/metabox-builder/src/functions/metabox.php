<?php
/**
 * Metabox builder public API (uniform wpdev_register_* facade).
 *
 * @package WPDevFramework\Modules\MetaboxBuilder
 * @since   2.7.0
 */

use WPDevFramework\Modules\MetaboxBuilder\Metabox_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Register a metabox on an admin page.
 *
 * @since 2.7.0
 *
 * @param string               $page_id    Admin page slug.
 * @param string               $metabox_id Metabox id.
 * @param array<string, mixed> $config     Metabox configuration.
 * @param bool                 $replace    Replace existing id. Default true.
 * @return bool
 */
function wpdev_register_metabox( $page_id, $metabox_id, array $config = array(), $replace = true ) {

	return Metabox_Registry::register( $page_id, $metabox_id, $config, $replace );

} // end wpdev_register_metabox;

/**
 * Get a registered metabox config.
 *
 * @since 2.7.0
 *
 * @param string $page_id    Admin page slug.
 * @param string $metabox_id Metabox id.
 * @return array<string, mixed>|null
 */
function wpdev_get_metabox( $page_id, $metabox_id ) {

	return Metabox_Registry::get( $page_id, $metabox_id );

} // end wpdev_get_metabox;

/**
 * Whether a metabox is registered.
 *
 * @since 2.7.0
 *
 * @param string $page_id    Admin page slug.
 * @param string $metabox_id Metabox id.
 * @return bool
 */
function wpdev_has_metabox( $page_id, $metabox_id ) {

	return Metabox_Registry::has( $page_id, $metabox_id );

} // end wpdev_has_metabox;

/**
 * List metaboxes for a page.
 *
 * @since 2.7.0
 *
 * @param string $page_id Admin page slug. Empty returns all pages.
 * @return array<string, array<string, mixed>>
 */
function wpdev_list_metaboxes( $page_id = '' ) {

	if ( '' === (string) $page_id ) {
		return Metabox_Registry::all();
	}

	return Metabox_Registry::get_for_page( $page_id );

} // end wpdev_list_metaboxes;

/**
 * Unregister a metabox.
 *
 * @since 2.7.0
 *
 * @param string $page_id    Admin page slug.
 * @param string $metabox_id Metabox id.
 * @return void
 */
function wpdev_unregister_metabox( $page_id, $metabox_id ) {

	Metabox_Registry::unregister( $page_id, $metabox_id );

} // end wpdev_unregister_metabox;
