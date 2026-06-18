<?php
/**
 * Interactive WaaS fixture list table (per-module sandbox storage).
 *
 * @package WPDevFramework\List_Tables\Playground
 * @since   2.7.0
 */

namespace WPDevFramework\List_Tables\Playground;

defined( 'ABSPATH' ) || exit;

/**
 * Module-scoped interactive list table for WaaS playground previews.
 */
class Playground_Domain_Interactive_List_Table extends Playground_Interactive_List_Table {

	/**
	 * WaaS module slug (e.g. wpdev-products).
	 *
	 * @var string
	 */
	protected $module_id = '';

	/**
	 * Modal form id for Add/Edit.
	 *
	 * @var string
	 */
	protected $form_id = '';

	/**
	 * @since 2.7.0
	 *
	 * @param array{columns?: array<string, string>, rows?: object[], module_id?: string} $config Config.
	 */
	public function __construct( array $config = array() ) {

		$this->module_id = sanitize_key( (string) ( $config['module_id'] ?? '' ) );
		$this->form_id   = function_exists( 'wpdev_playground_form_id' )
			? wpdev_playground_form_id( $this->module_id )
			: 'pg_domain_item';

		parent::__construct( $config );

		if ( function_exists( 'wpdev_playground_table_ajax_id' ) ) {
			$this->set_ajax_table_id( wpdev_playground_table_ajax_id( $this->module_id ) );
		}

	} // end __construct;

	/**
	 * @since 2.7.0
	 *
	 * @param object $item Row.
	 * @return string
	 */
	public function column_name( $item ) {

		$name    = $item->name ?? '';
		$item_id = (int) ( $item->id ?? 0 );
		$actions = array();

		if ( function_exists( 'wpdev_modal_open' ) ) {
			$edit_url = wpdev_modal_open(
				$this->form_id,
				array(
					'item_id' => $item_id,
				)
			);

			$actions['edit'] = '<a class="wubox" href="' . esc_url( $edit_url ) . '">' . esc_html__( 'Edit', 'wpdev' ) . '</a>';
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

		if ( empty( $rows ) && '' !== $this->module_id && function_exists( 'wpdev_playground_get_rows' ) ) {
			$rows = wpdev_playground_get_rows( $this->module_id );
		}

		if ( ! empty( $_REQUEST['s'] ) ) {
			$search = strtolower( sanitize_text_field( wp_unslash( $_REQUEST['s'] ) ) );
			$rows   = array_values(
				array_filter(
					$rows,
					static function ( $row ) use ( $search ) {
						$haystack = strtolower(
							(string) ( $row->name ?? '' ) . ' ' . (string) ( $row->status ?? '' ) . ' ' . (string) ( $row->date ?? '' )
						);

						return false !== strpos( $haystack, $search );
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
	 * Bulk confirm modals use the WaaS module slug as model (not the pg_ table prefix).
	 *
	 * @since 2.7.0
	 * @return void
	 */
	public function register_scripts() {

		if ( '' === $this->module_id ) {
			parent::register_scripts();
			return;
		}

		$model = str_replace( '-', '_', $this->module_id );

		$base_url = class_exists( 'WPDev\\Modules\\TableBuilder\\Bulk_Action_Pipeline' )
			? \WPDevFramework\Modules\TableBuilder\Bulk_Action_Pipeline::get_confirm_url( $model )
			: ( function_exists( 'wpdev_get_form_url' ) ? wpdev_get_form_url( 'bulk_actions' ) : '' );

		if ( function_exists( 'wp_enqueue_script' ) && function_exists( 'wp_localize_script' ) ) {
			wp_localize_script(
				'wpdev-ajax-list-table',
				'wpdev_list_table',
				array(
					'base_url' => $base_url,
					'model'    => $model,
					'i18n'     => array(
						'confirm' => __( 'Confirm Action', 'wpdev' ),
					),
				)
			);

			wp_enqueue_script( 'wpdev-ajax-list-table' );
		}

	} // end register_scripts;

	/**
	 * @since 2.7.0
	 * @return void
	 */
	public function no_items() {

		$cta_url = function_exists( 'wpdev_modal_open' )
			? wpdev_modal_open( $this->form_id )
			: '';

		if ( '' !== $cta_url && function_exists( 'wpdev_playground_render_empty_state' ) ) {
			wpdev_playground_render_empty_state(
				__( 'No sandbox rows yet', 'wpdev' ),
				__( 'Add a sample row with the modal form. Data stays in pg_* options only.', 'wpdev' ),
				__( 'Add New', 'wpdev' ),
				$cta_url
			);
			return;
		}

		parent::no_items();

	} // end no_items;

} // end class Playground_Domain_Interactive_List_Table;
