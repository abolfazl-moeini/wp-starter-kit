<?php
/**
 * Example 01 — render section tabs with Tab_Navigation.
 *
 * @package WPDevFramework\Modules\TabNavigation
 * @since   2.5.0
 */
defined( 'ABSPATH' ) || exit;

add_action(
	'wpdev_page_load',
	static function ( $page ) {
		if ( empty( $page ) || 'wpdev-settings' !== $page->get_page_unique_id() ) {
			return;
		}

		wpdev_render_tab_navigation(
			array(
				array(
					'slug'    => 'general',
					'label'   => __( 'General', 'wpdev' ),
					'url'     => add_query_arg( 'tab', 'general' ),
					'current' => 'general' === wpdev_request( 'tab', 'general' ),
				),
			)
		);
	}
);
