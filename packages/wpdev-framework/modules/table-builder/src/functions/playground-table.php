<?php
/**
 * Playground list-table render helpers.
 *
 * @package WPDevFramework\Modules\TableBuilder
 * @since   2.7.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Render a list table preview with static fixture rows (canonical table-builder API).
 *
 * @since 2.7.0
 *
 * @param string $module_id Module slug used to resolve fixtures (e.g. table-builder, wpdev-products).
 * @return void
 */
function wpdev_render_table_builder_fixture_list_table( $module_id ) {

	wpdev_render_playground_list_table( $module_id );

} // end wpdev_render_table_builder_fixture_list_table;

/**
 * Render a list table preview with static fixture rows.
 *
 * @since 2.7.0
 *
 * @param string $module_id Module slug used to resolve fixtures (e.g. table-builder, wpdev-products).
 * @return void
 */
function wpdev_render_playground_list_table( $module_id ) {

	$config = null;

	if ( class_exists( 'WPDev\\Core\\Playground\\Playground_Fixtures' ) ) {
		$config = \WPDevFramework\Core\Playground\Playground_Fixtures::list_table_config( $module_id );
	}

	if ( null === $config ) {
		echo '<p>' . esc_html__( 'No list table fixture is configured for this module.', 'wpdev' ) . '</p>';
		return;
	}

	if ( ! class_exists( 'WPDev\\List_Tables\\Playground\\Playground_List_Table' ) ) {
		$table_file = dirname( __DIR__ ) . '/playground/class-playground-list-table.php';
		if ( is_readable( $table_file ) ) {
			require_once $table_file;
		}
	}

	if ( ! class_exists( 'WPDev\\List_Tables\\Playground\\Playground_List_Table' ) ) {
		echo '<p>' . esc_html__( 'Table builder playground table class is unavailable.', 'wpdev' ) . '</p>';
		return;
	}

	if ( ! empty( $config['title'] ) ) {
		echo '<h2>' . esc_html( (string) $config['title'] ) . '</h2>';
	}

	if ( ! empty( $config['description'] ) ) {
		echo '<p class="description">' . esc_html( (string) $config['description'] ) . '</p>';
	}

	$table = new \WPDevFramework\List_Tables\Playground\Playground_List_Table(
		array(
			'columns' => $config['columns'] ?? array(),
			'rows'    => $config['rows'] ?? array(),
		)
	);

	if ( function_exists( 'wp_enqueue_script' ) ) {
		wp_enqueue_script( 'wpdev-ajax-list-table' );
	}

	echo '<div id="poststuff" class="wpdev-playground-list-table-wrap"><div id="post-body-content">';
	$table->prepare_items();
	if ( method_exists( $table, 'filters' ) ) {
		$table->filters();
	}
	echo '<form method="get">';
	$table->display();
	echo '</form>';
	echo '</div></div>';

} // end wpdev_render_playground_list_table;
