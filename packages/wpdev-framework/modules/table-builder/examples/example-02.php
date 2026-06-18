<?php
/**
 * Example 02 — widget list table on an edit page (context: widget).
 *
 * Pattern used by customer-panel and edit-page metabox widgets.
 * Requires a unique ajax_table_id when the parent table class is reused.
 *
 * @package WPDevFramework\Modules\TableBuilder
 * @since   2.5.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Widget-scoped table: unique ajax id + capability override for refresh.
 *
 * On Edit_Admin_Page / Post_Edit_Admin_Page:
 *   $this->add_list_table_widget( Example_Widget_Table::class );
 *
 * JS scopes handlers to `[data-table-id="…"]` — see list-tables.js (K5-005).
 */
class Example_Widget_Table extends Example_List_Page_Table {

	/**
	 * @since 2.5.0
	 */
	public function __construct() {

		parent::__construct();

		$this->set_context( 'widget' );

		// Must differ from the parent page table id when both appear on one screen.
		$this->set_ajax_table_id( 'example_list_page__edit_widget' );

	} // end __construct;

	/**
	 * Restrict ajax refresh to users who may edit the parent object.
	 *
	 * @since 2.5.0
	 * @return bool
	 */
	public function user_can_ajax_refresh() {

		return current_user_can( 'manage_network' );

	} // end user_can_ajax_refresh;

} // end class Example_Widget_Table;
