<?php
/**
 * List table backed by static playground fixture rows (no database query).
 *
 * @package WPDevFramework\List_Tables\Playground
 * @since   2.7.0
 */

namespace WPDevFramework\List_Tables\Playground;

use WPDevFramework\List_Tables\Base_List_Table;

defined( 'ABSPATH' ) || exit;

/**
 * Renders seeded rows for playground demos.
 */
class Playground_List_Table extends Base_List_Table {

	/**
	 * Column labels keyed by slug.
	 *
	 * @var array<string, string>
	 */
	protected $fixture_columns = array();

	/**
	 * Fixture row objects.
	 *
	 * @var object[]
	 */
	protected $fixture_rows = array();

	/**
	 * @since 2.7.0
	 *
	 * @param array{columns?: array<string, string>, rows?: object[], singular?: string, plural?: string} $config Fixture config.
	 */
	public function __construct( array $config = array() ) {

		parent::__construct(
			array(
				'singular' => $config['singular'] ?? __( 'Item', 'wpdev' ),
				'plural'   => $config['plural'] ?? __( 'Items', 'wpdev' ),
				'ajax'     => true,
			)
		);

		$this->fixture_columns = $config['columns'] ?? array();
		$this->fixture_rows    = $config['rows'] ?? array();
		$this->set_context( 'page' );

	} // end __construct;

	/**
	 * Replace fixture rows at runtime (interactive playground).
	 *
	 * @since 2.7.0
	 *
	 * @param object[] $rows Rows.
	 * @return void
	 */
	public function set_fixture_rows( array $rows ) {

		$this->fixture_rows = $rows;

	} // end set_fixture_rows;

	/**
	 * @since 2.7.0
	 * @return array<string, string>
	 */
	public function get_columns() {

		if ( ! empty( $this->fixture_columns ) ) {
			return $this->fixture_columns;
		}

		return array(
			'name'   => __( 'Name', 'wpdev' ),
			'status' => __( 'Status', 'wpdev' ),
			'date'   => __( 'Date', 'wpdev' ),
		);

	} // end get_columns;

	/**
	 * Fixture tables have no BerlinDB schema; skip parent reflection on query_class.
	 *
	 * @since 2.7.0
	 * @return array<string, array<int, mixed>>
	 */
	public function get_sortable_columns() {

		return array();

	} // end get_sortable_columns;

	/**
	 * @since 2.7.0
	 * @return array<string, string>
	 */
	public function get_bulk_actions() {

		return array();

	} // end get_bulk_actions;

	/**
	 * @since 2.7.0
	 * @return bool
	 */
	protected function has_search() {

		return false;

	} // end has_search;

	/**
	 * @since 2.7.0
	 *
	 * @param array<string, mixed> $args     Filter args (unused).
	 * @param string               $operator Logic operator (unused).
	 * @param bool|string          $field    Field selector (unused).
	 * @return array<int, mixed>
	 */
	protected function get_schema_columns( $args = array(), $operator = 'and', $field = false ) {

		return array();

	} // end get_schema_columns;

	/**
	 * @since 2.7.0
	 * @return array{filters: array<string, mixed>, date_filters: array<string, mixed>}
	 */
	public function get_filters(): array {

		return array(
			'filters'      => array(),
			'date_filters' => array(),
		);

	} // end get_filters;

	/**
	 * @since 2.7.0
	 *
	 * @param int     $per_page    Per page.
	 * @param int     $page_number Page.
	 * @param boolean $count       Count only.
	 * @return array<int, object>|int
	 */
	public function get_items( $per_page = 10, $page_number = 1, $count = false ) {

		if ( $count ) {
			return count( $this->fixture_rows );
		}

		$offset = max( 0, ( (int) $page_number - 1 ) * (int) $per_page );

		return array_slice( $this->fixture_rows, $offset, (int) $per_page );

	} // end get_items;

	/**
	 * @since 2.7.0
	 *
	 * @param object $item        Row.
	 * @param string $column_name Column.
	 * @return string
	 */
	public function column_default( $item, $column_name ) {

		$value = $item->{$column_name} ?? '';

		return esc_html( (string) $value );

	} // end column_default;

	/**
	 * @since 2.7.0
	 *
	 * @param object $item Row.
	 * @return string
	 */
	public function column_name( $item ) {

		$name = $item->name ?? '';

		return '<strong>' . esc_html( (string) $name ) . '</strong>';

	} // end column_name;

} // end class Playground_List_Table;
