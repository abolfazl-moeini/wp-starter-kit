<?php
/**
 * Declarative list table configuration.
 *
 * @package WPDevFramework\Modules\TableBuilder
 * @since   2.5.0
 */

namespace WPDevFramework\Modules\TableBuilder;

defined( 'ABSPATH' ) || exit;

/**
 * Holds declarative table schema (columns, actions, views, empty state).
 */
class Table_Config {

	/**
	 * Table id slug.
	 *
	 * @var string
	 */
	protected $id = '';

	/**
	 * Column definitions.
	 *
	 * @var array<string, mixed>
	 */
	protected $columns = array();

	/**
	 * Row/bulk actions.
	 *
	 * @var array<string, mixed>
	 */
	protected $actions = array();

	/**
	 * View tabs/filters.
	 *
	 * @var array<string, mixed>
	 */
	protected $views = array();

	/**
	 * Empty state config.
	 *
	 * @var array<string, mixed>
	 */
	protected $empty_state = array();

	/**
	 * Bulk actions that require modal confirm (registered via Bulk_Action_Pipeline).
	 *
	 * @var string[]
	 */
	protected $bulk_confirm = array();

	/**
	 * Build config from array.
	 *
	 * @since 2.5.0
	 *
	 * @param string               $id     Table id.
	 * @param array<string, mixed> $config Config keys: columns, actions, views, empty_state, bulk_confirm.
	 * @return self
	 */
	public static function make( $id, array $config = array() ) {

		$instance = new self();

		$instance->id          = \sanitize_key( $id );
		$instance->columns     = $config['columns'] ?? array();
		$instance->actions     = $config['actions'] ?? array();
		$instance->views       = $config['views'] ?? array();
		$instance->empty_state = $config['empty_state'] ?? array();
		$instance->bulk_confirm = $config['bulk_confirm'] ?? array();

		return $instance;

	} // end make;

	/**
	 * Table id.
	 *
	 * @since 2.5.0
	 *
	 * @return string
	 */
	public function get_id() {

		return $this->id;

	} // end get_id;

	/**
	 * Column definitions.
	 *
	 * @since 2.5.0
	 *
	 * @return array<string, mixed>
	 */
	public function get_columns() {

		return $this->columns;

	} // end get_columns;

	/**
	 * Action definitions.
	 *
	 * @since 2.5.0
	 *
	 * @return array<string, mixed>
	 */
	public function get_actions() {

		return $this->actions;

	} // end get_actions;

	/**
	 * View definitions.
	 *
	 * @since 2.5.0
	 *
	 * @return array<string, mixed>
	 */
	public function get_views() {

		return $this->views;

	} // end get_views;

	/**
	 * Empty state config.
	 *
	 * @since 2.5.0
	 *
	 * @return array<string, mixed>
	 */
	public function get_empty_state() {

		return $this->empty_state;

	} // end get_empty_state;

	/**
	 * Bulk action slugs that use the confirm modal pipeline.
	 *
	 * @since 2.5.0
	 *
	 * @return string[]
	 */
	public function get_bulk_confirm() {

		return $this->bulk_confirm;

	} // end get_bulk_confirm;

} // end class Table_Config;
