<?php
/**
 * Example 01 — list admin page table (context: page).
 *
 * Pattern used by wpdev-* list pages (products, domains, payments, …).
 * Columns register automatically via declarative_table_config() + List_Table_Registry.
 *
 * @package WPDevFramework\Modules\TableBuilder
 * @since   2.5.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Minimal list-page table: ajax refresh, declarative columns, page context.
 *
 * Wire into a List_Admin_Page subclass:
 *   protected $table_class = Example_List_Page_Table::class;
 */
class Example_List_Page_Table extends \WPDevFramework\List_Tables\Base_List_Table {

	/**
	 * @since 2.5.0
	 */
	public function __construct() {

		parent::__construct(
			array(
				'singular' => __( 'Item', 'wpdev' ),
				'plural'   => __( 'Items', 'wpdev' ),
				'ajax'     => true,
			)
		);

		$this->set_context( 'page' );

	} // end __construct;

	/**
	 * Declarative schema — only column keys required for K5-004 registry.
	 *
	 * @since 2.5.0
	 * @return array<string, mixed>
	 */
	public static function declarative_table_config() {

		return self::declarative_schema(
			array( 'name', 'status', 'date' ),
			array(
				'empty_state' => array(
					'sub_message' => __( 'Create your first item to populate this list.', 'wpdev' ),
				),
			)
		);

	} // end declarative_table_config;

	/**
	 * @since 2.5.0
	 * @return array<string, string>
	 */
	public function get_columns() {

		return self::declarative_columns();

	} // end get_columns;

} // end class Example_List_Page_Table;
