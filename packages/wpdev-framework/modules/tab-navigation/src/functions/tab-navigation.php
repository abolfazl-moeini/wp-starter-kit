<?php
/**
 * Tab navigation helpers.
 *
 * @package WPDevFramework\Functions
 * @since   2.5.0
 */

defined( 'ABSPATH' ) || exit;

use WPDevFramework\Modules\TabNavigation\Tab_Navigation;

/**
 * Render shared tab navigation (K4-004).
 *
 * @since 2.5.0
 *
 * @param array<int, array<string, mixed>> $tabs    Tab definitions.
 * @param array<string, mixed>             $options Wrapper options.
 * @return void
 */
function wpdev_render_tab_navigation( array $tabs, array $options = array() ) {

	if ( ! class_exists( Tab_Navigation::class ) ) {
		$path = dirname( __DIR__ ) . '/class-tab-navigation.php';

		if ( is_readable( $path ) ) {
			require_once $path;
		}
	}

	if ( class_exists( Tab_Navigation::class ) ) {
		Tab_Navigation::render( $tabs, $options );
	}

} // end wpdev_render_tab_navigation;

if ( ! function_exists( 'wpdev_list_table_views_as_tabs' ) ) {
	/**
	 * Convert list-table view definitions to Tab_Navigation tab rows (K4-10).
	 *
	 * @since 2.6.0
	 *
	 * @param array<string, array<string, mixed>> $views List table views from get_views().
	 * @return array<int, array<string, mixed>>
	 */
	function wpdev_list_table_views_as_tabs( array $views ) {

		return Tab_Navigation::from_list_table_views( $views );

	} // end wpdev_list_table_views_as_tabs;
}
