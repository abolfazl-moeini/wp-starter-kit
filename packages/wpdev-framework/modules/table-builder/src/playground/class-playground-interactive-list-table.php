<?php
/**
 * Interactive playground list table (search, bulk, row actions).
 *
 * @package WPDevFramework\List_Tables\Playground
 * @since   2.7.0
 */

namespace WPDevFramework\List_Tables\Playground;

defined( 'ABSPATH' ) || exit;

/**
 * Extends fixture table with interactive demo features.
 */
class Playground_Interactive_List_Table extends Playground_List_Table {

	/**
	 * @since 2.7.0
	 *
	 * @param array{columns?: array<string, string>, rows?: object[], singular?: string, plural?: string} $config Fixture config.
	 */
	public function __construct( array $config = array() ) {

		parent::__construct( $config );

		$this->set_ajax_table_id( 'pg_demo_table' );

	} // end __construct;

	/**
	 * @since 2.7.0
	 * @return bool
	 */
	public function user_can_ajax_refresh() {

		if ( function_exists( 'wpdev_playground_user_can' ) ) {
			return wpdev_playground_user_can( 'manage_options' );
		}

		return current_user_can( 'manage_options' );

	} // end user_can_ajax_refresh;

	/**
	 * @since 2.7.0
	 * @return bool
	 */
	protected function has_search() {

		return true;

	} // end has_search;

	/**
	 * @since 2.7.0
	 * @return array<string, string>
	 */
	public function get_bulk_actions() {

		return array(
			'archive' => __( 'Archive', 'wpdev' ),
			'delete'  => __( 'Delete', 'wpdev' ),
		);

	} // end get_bulk_actions;

	/**
	 * Process archive/delete bulk actions for sandbox rows.
	 *
	 * @since 2.7.0
	 *
	 * @param string   $action   Bulk action slug.
	 * @param string[] $item_ids Selected row ids.
	 * @return string Admin notice message.
	 */
	public static function process_bulk_rows( $action, array $item_ids ) {

		$action   = sanitize_key( (string) $action );
		$item_ids = array_filter( array_map( 'intval', $item_ids ) );

		if ( empty( $item_ids ) || ! function_exists( 'wpdev_playground_table_get_rows' ) ) {
			return '';
		}

		$rows = wpdev_playground_table_get_rows();

		if ( 'delete' === $action ) {
			$rows = array_values(
				array_filter(
					$rows,
					static function ( $row ) use ( $item_ids ) {
						return ! in_array( (int) ( $row->id ?? 0 ), $item_ids, true );
					}
				)
			);

			if ( function_exists( 'wpdev_playground_table_save_rows' ) ) {
				wpdev_playground_table_save_rows( $rows );
			}

			return sprintf(
				_n(
					'One item deleted.',
					'%d items deleted.',
					count( $item_ids ),
					'wpdev'
				),
				count( $item_ids )
			);
		}

		if ( 'archive' === $action ) {
			$count = 0;

			foreach ( $rows as $row ) {
				if ( in_array( (int) ( $row->id ?? 0 ), $item_ids, true ) ) {
					$row->status = 'archived';
					$row->date   = gmdate( 'Y-m-d' );
					++$count;
				}
			}

			if ( $count > 0 && function_exists( 'wpdev_playground_table_save_rows' ) ) {
				wpdev_playground_table_save_rows( $rows );
			}

			return sprintf(
				_n(
					'One item archived.',
					'%d items archived.',
					$count,
					'wpdev'
				),
				$count
			);
		}

		return '';

	} // end process_bulk_rows;

	/**
	 * @since 2.7.0
	 *
	 * @param object $item Row.
	 * @return string
	 */
	public function column_cb( $item ) {

		return sprintf(
			'<input type="checkbox" name="bulk-delete[]" value="%s" />',
			esc_attr( (string) ( $item->id ?? 0 ) )
		);

	} // end column_cb;

	/**
	 * @since 2.7.0
	 *
	 * @param object $item Row.
	 * @return string
	 */
	public function column_name( $item ) {

		$name     = $item->name ?? '';
		$item_id  = (int) ( $item->id ?? 0 );
		$actions  = array();

		if ( function_exists( 'wpdev_modal_open' ) ) {
			$edit_url = wpdev_modal_open(
				'pg_demo_table_item',
				array(
					'item_id' => $item_id,
					'width'   => '520',
					'height'  => '420',
				)
			);

			$actions['edit'] = '<a class="wubox" href="' . esc_url( $edit_url ) . '">' . esc_html__( 'Edit', 'wpdev' ) . '</a>';
		} else {
			$edit_url = add_query_arg(
				array(
					'pg_action' => 'edit',
					'pg_item'   => $item_id,
				)
			);

			$actions['edit'] = '<a href="' . esc_url( $edit_url ) . '">' . esc_html__( 'Edit', 'wpdev' ) . '</a>';
		}

		return '<strong>' . esc_html( (string) $name ) . '</strong> ' . $this->row_actions( $actions );

	} // end column_name;

	/**
	 * @since 2.7.0
	 *
	 * @param int     $per_page    Per page.
	 * @param int     $page_number Page.
	 * @param boolean $count       Count only.
	 * @return array<int, object>|int
	 */
	public function get_items( $per_page = 10, $page_number = 1, $count = false ) {

		$rows = $this->fixture_rows;

		if ( empty( $rows ) && function_exists( 'wpdev_playground_table_get_rows' ) ) {
			$rows = wpdev_playground_table_get_rows();
		}

		if ( ! empty( $_REQUEST['s'] ) ) {
			$search = strtolower( sanitize_text_field( wp_unslash( $_REQUEST['s'] ) ) );
			$rows   = array_values(
				array_filter(
					$rows,
					static function ( $row ) use ( $search ) {
						return false !== strpos( strtolower( (string) ( $row->name ?? '' ) ), $search );
					}
				)
			);
		}

		if ( $count ) {
			return count( $rows );
		}

		$offset = max( 0, ( (int) $page_number - 1 ) * (int) $per_page );

		return array_slice( $rows, $offset, (int) $per_page );

	} // end get_items;

	/**
	 * Empty state with modal CTA.
	 *
	 * @since 2.7.0
	 * @return void
	 */
	public function no_items() {

		$cta_url = function_exists( 'wpdev_modal_open' )
			? wpdev_modal_open(
				'pg_demo_table_item',
				array(
					'width'  => '520',
					'height' => '420',
				)
			)
			: '';

		if ( '' !== $cta_url ) {
			if ( function_exists( 'wpdev_playground_render_empty_state' ) ) {
				echo '<div class="wpdev-playground-empty-state">';
				echo '<h3 class="wpdev-playground-empty-state__title">' . esc_html__( 'No items yet', 'wpdev' ) . '</h3>';
				echo '<p class="wpdev-playground-empty-state__message">' . esc_html__( 'Add your first sandbox row with the modal form.', 'wpdev' ) . '</p>';
				echo '<p class="wpdev-playground-empty-state__cta">';
				echo '<a class="button button-primary wubox page-title-action" href="' . esc_url( $cta_url ) . '">';
				echo esc_html__( 'Add New', 'wpdev' );
				echo '</a></p></div>';
				return;
			}
		}

		parent::no_items();

	} // end no_items;

} // end class Playground_Interactive_List_Table;
