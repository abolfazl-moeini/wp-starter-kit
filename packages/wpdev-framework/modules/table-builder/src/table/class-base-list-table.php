<?php
/**
 * Base List Table class. Extends WP_List_Table.
 *
 * @package WPDev
 * @subpackage List_Table
 * @since 2.0.0
 */

namespace WPDevFramework\List_Tables;

use \WPDevFramework\Ajax;
use \WPDevFramework\Helpers\Hash;
use \WPDevFramework\Modules\TableBuilder\Bulk_Action_Pipeline;
use \WPDevFramework\Modules\TableBuilder\List_Table_Registry;
use \WPDevFramework\Modules\TableBuilder\Table_Config;

// Exit if accessed directly
defined('ABSPATH') || exit;

if (!class_exists('WP_List_Table')) {

	require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';

} // end if;

/**
 * Base List Table class. Extends WP_List_Table.
 *
 * All of WPDev's list tables should extend this class.
 * It provides ajax-filtering and pagination out-of-the-box among other cool features.
 *
 * @since 2.0.0
 */
class Base_List_Table extends \WP_List_Table {

	/**
	 * Holds the id for this list table. Used on filters.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	protected $id;

	/**
	 * Optional override for ajax/DOM table id (widget-scoped tables).
	 *
	 * @since 2.4.0
	 * @var string
	 */
	protected $ajax_table_id = '';

	/**
	 * Holds the query class for the object being listed.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	protected $query_class;

	/**
	 * Holds the labels, singular and plural, to be used when generating labels.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	protected $labels = array(
		'singular' => '',
		'plural'   => '',
	);

	/**
	 * Keeps track of the current view mode for this particular list table.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	public $current_mode = 'list';

	/**
	 * Sets the allowed modes.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	public $modes = array('list' => 'List');

	/**
	 * The list table context.
	 *
	 * Can be page, if the table is on a list page;
	 * or widget, if the table is inside a widget.
	 *
	 * We use this to determine how to encapsulate the fields for filtering
	 * and to support multiple list tables with ajax pagination per page.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	public $context = 'page';

	/**
     * Returns the table id.
     *
     * @since 2.0.0
     */
	public function get_table_id(): string {

		if ( ! empty( $this->ajax_table_id ) ) {
			return $this->ajax_table_id;
		}

		return strtolower( substr( strrchr( static::class, '\\' ), 1 ) );

	} // end get_table_id;

	/**
	 * Optional declarative schema for List_Table_Registry.
	 *
	 * @since 2.5.0
	 *
	 * @return array<string, mixed>|null
	 */
	public static function declarative_table_config() {

		return null;

	} // end declarative_table_config;

	/**
	 * Build a minimal declarative config from column keys.
	 *
	 * @since 2.5.0
	 *
	 * @param string[] $keys Column slugs.
	 * @return array<string, mixed>
	 */
	protected static function declarative_columns( array $keys ) {

		return self::declarative_schema( $keys );

	} // end declarative_columns;

	/**
	 * Build declarative config from column keys plus optional sections.
	 *
	 * @since 2.5.0
	 *
	 * @param string[]               $keys  Column slugs.
	 * @param array<string, mixed>   $extra Optional keys: actions, views, empty_state.
	 * @return array<string, mixed>
	 */
	protected static function declarative_schema( array $keys, array $extra = array() ) {

		return array_merge(
			array(
				'columns' => array_fill_keys( $keys, '' ),
			),
			$extra
		);

	} // end declarative_schema;

	/**
	 * Build view-tab definitions for a single query field.
	 *
	 * @since 2.5.0
	 *
	 * @param string                $field Query arg name (status, filter, type, …).
	 * @param array<string, string> $tabs  Tab slug => label (include `all` when applicable).
	 * @return array<string, array<string, mixed>>
	 */
	protected static function declarative_filter_views( $field, array $tabs ) {

		$views = array();

		foreach ( $tabs as $slug => $label ) {
			if ( 'filter' === $field && 'all' === $slug ) {
				$url = add_query_arg( array( 'filter' => 'all' ) );
			} else {
				$url = add_query_arg( $field, $slug );
			}

			$views[ $slug ] = array(
				'field' => $field,
				'url'   => $url,
				'label' => $label,
				'count' => 0,
			);
		}

		return $views;

	} // end declarative_filter_views;

	/**
	 * Optional declarative config registered for this table id.
	 *
	 * @since 2.5.0
	 *
	 * @return Table_Config|null
	 */
	public function get_declarative_config() {

		if ( ! class_exists( List_Table_Registry::class, false ) ) {
			return null;
		}

		$entry = List_Table_Registry::get( $this->get_table_id() );

		if ( empty( $entry['config'] ) || ! $entry['config'] instanceof Table_Config ) {
			return null;
		}

		return $entry['config'];

	} // end get_declarative_config;

	/**
	 * Register this list table class when no module entry exists yet.
	 *
	 * @since 2.5.0
	 * @return void
	 */
	protected function register_in_table_registry() {

		if ( ! class_exists( List_Table_Registry::class, false ) ) {
			$registry_file = dirname( __DIR__ ) . '/class-list-table-registry.php';

			if ( ! is_readable( $registry_file ) ) {
				return;
			}

			require_once $registry_file;
		}

		$table_id = $this->get_table_id();

		if ( null !== List_Table_Registry::get( $table_id ) ) {
			return;
		}

		$config      = null;
		$declarative = static::declarative_table_config();

		if ( is_array( $declarative ) && ! empty( $declarative ) ) {
			$config_file = dirname( __DIR__ ) . '/class-table-config.php';

			if ( is_readable( $config_file ) ) {
				require_once $config_file;
			}

			$config = Table_Config::make( $table_id, $declarative );

			$pipeline_file = dirname( __DIR__ ) . '/class-bulk-action-pipeline.php';

			if ( is_readable( $pipeline_file ) ) {
				require_once $pipeline_file;
				Bulk_Action_Pipeline::register_from_config( $table_id, $config );
			}
		}

		List_Table_Registry::register( $table_id, static::class, $config );

	} // end register_in_table_registry;

	/**
	 * Set a unique ajax table id (e.g. when multiple widgets share a list table class).
	 *
	 * @since 2.4.0
	 *
	 * @param string $table_id Unique table id for JS/ajax.
	 * @return void
	 */
	public function set_ajax_table_id( $table_id ) {

		$this->ajax_table_id = sanitize_key( $table_id );
		$this->id            = $this->ajax_table_id;

		Ajax::register_list_table( $this->ajax_table_id, static::class );

	} // end set_ajax_table_id;

	/**
	 * Whether the current user may refresh this table via ajax.
	 *
	 * @since 2.4.0
	 * @return bool
	 */
	public function user_can_ajax_refresh() {

		return current_user_can( 'manage_network' );

	} // end user_can_ajax_refresh;

	/**
	 * Changes the context of the list table.
	 *
	 * Available contexts are 'page' and 'widget'.
	 *
	 * @since 2.0.0
	 *
	 * @param string $context The new context to set.
	 * @return void
	 */
	public function set_context($context = 'page') {

		$this->context = $context;

	} // end set_context;

	/**
	 * Initializes the table.
	 *
	 * @since 2.0.0
	 *
	 * @param array $args Arguments of the list table.
	 */
	public function __construct($args = array()) {

		if ( ! empty( $args['ajax_table_id'] ) ) {
			$this->ajax_table_id = sanitize_key( $args['ajax_table_id'] );
		}

		$this->id = $this->get_table_id();

		$args = wp_parse_args($args, array(
			'screen' => $this->id,
		));

		parent::__construct($args);

		Ajax::register_list_table( $this->get_table_id(), static::class );

		$this->register_in_table_registry();

		$this->labels = shortcode_atts($this->labels, $args);

		add_action('admin_enqueue_scripts', array($this, 'register_scripts'));

		/*
		 * List pages register per_page via List_Admin_Page::screen_options on load-{hook}.
		 * Widget/ajax contexts register here to avoid duplicate screen options.
		 *
		 * @since 2.4.0
		 */
		if ( 'page' !== $this->context ) {
			add_action( 'in_admin_header', array( $this, 'add_default_screen_options' ) );
		}

		$this->set_list_mode();

		$this->_args['add_new'] = wpdev_get_isset($args, 'add_new', array());

	} // end __construct;

	/**
	 * Adds the screen option fields.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function add_default_screen_options() {

		$args = array(
			'default' => 20,
			'label'   => $this->get_per_page_option_label(),
			'option'  => $this->get_per_page_option_name(),
		);

		add_screen_option('per_page', $args);

	} // end add_default_screen_options;

	/**
	 * Adds the select all button for the Grid Mode.
	 *
	 * @since 2.0.0
	 *
	 * @param string $which Bottom or top navbar.
	 * @return void
	 */
	protected function extra_tablenav($which) {

		if ($this->current_mode === 'grid') {

			echo sprintf(
				'<button id="cb-select-all-grid" v-on:click.prevent="select_all" class="button">%s</button>',
				__('Select All', 'wpdev')
			);

		} // end if;

	} // end extra_tablenav;

	/**
	 * Set the list display mode for the list table.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function set_list_mode() {

		if ($this->context !== 'page') {

			$this->current_mode = 'list';

			return;

		} // end if;

		$list_table_name = $this->id;

		if (!empty($_REQUEST['mode'])) {

			$mode = $_REQUEST['mode'];

			if (in_array($mode, array_keys($this->modes), true)) {

				$mode = $_REQUEST['mode'];

			} // end if;

			set_user_setting("{$list_table_name}_list_mode", $mode);

		} else {

			$mode = get_user_setting("{$list_table_name}_list_mode", current(array_keys($this->modes)));

		} // end if;

		$this->current_mode = $mode;

	} // end set_list_mode;

	/**
	 * Returns a label.
	 *
	 * @since 2.0.0
	 *
	 * @param string $label singular or plural.
	 * @return string
	 */
	public function get_label($label = 'singular') {

		return isset($this->labels[$label]) ? $this->labels[$label] : 'Object';

	} // end get_label;

	/**
	 * Uses the query class to return the items to be displayed.
	 *
	 * @since 2.0.0
	 *
	 * @param integer $per_page Number of items to display per page.
	 * @param integer $page_number Current page.
	 * @param boolean $count If we should count records or return the actual records.
	 * @return array
	 */
	public function get_items($per_page = 5, $page_number = 1, $count = false) {

		$query_args = array(
			'number'  => $per_page,
			'offset'  => ($page_number - 1) * $per_page,
			'orderby' => wpdev_request('orderby', 'id'),
			'order'   => wpdev_request('order', 'DESC'),
			'search'  => wpdev_request('s', false),
			'count'   => $count,
		);

		$extra_query_args = array(
			'status',
			'type',
		);

		foreach ($extra_query_args as $extra_query_arg) {

			$query = wpdev_request($extra_query_arg, 'all');

			if ($query !== 'all') {

				$query_args[$extra_query_arg] = $query;

			} // end if;

		} // end foreach;

		/**
		 * Accounts for hashes
		 */
		if (isset($query_args['search']) && strlen((string) $query_args['search']) === Hash::LENGTH) {

			$item_id = Hash::decode($query_args['search']);

			if ($item_id) {

				unset($query_args['search']);

				$query_args['id'] = $item_id;

			} // end if;

		} // end if;

		return $this->_get_items($query_args);

	} // end get_items;

	/**
	 * General purpose get_items.
	 *
	 * @since 2.0.0
	 *
	 * @param array $query_args The query args.
	 * @return mixed
	 */
	protected function _get_items($query_args) {

		$query_class = new $this->query_class();

		$query_args = array_merge($query_args, array_filter($this->get_extra_query_fields()));

		$query_args = apply_filters("wpdev_{$this->id}_get_items", $query_args, $this);

		$function_name = 'wpdev_get_' . $query_class->get_plural_name();

		if (function_exists($function_name)) {

			$query = $function_name($query_args);

		} else {

			$query = $query_class->query($query_args);

		} // end if;

		return $query;

	} // end _get_items;

	/**
	 * Checks if we have any items at all.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function has_items() {

		$key = $this->get_table_id();

		$results = $this->get_items(1, 1, false);

		return (int) $results > 0;

	} // end has_items;

	/**
	 * Returns the total record count. Used on pagination.
	 *
	 * @since 2.0.0
	 * @return int
	 */
	public function record_count() {

		return $this->get_items(9_999_999, 1, true);

	} // end record_count;
	/**
	 * Returns the slug of the per_page option for this data type.
	 *
	 * @since 2.0.0
	 */
	public function get_per_page_option_name(): string {

		return sprintf('%s_per_page', $this->id);

	} // end get_per_page_option_name;
	/**
	 * Returns the label for the per_page option for this data_type.
	 *
	 * @since 2.0.0
	 */
	public function get_per_page_option_label(): string {

		// translators: %s will be replaced by the data type plural name. e.g. Books.
		return sprintf(__('%s per page'), $this->get_label('plural'));

	} // end get_per_page_option_label;

	/**
	 * Uses the query class to determine if there's any searchable fields.
	 * If that's the case, we automatically add the search field.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	protected function has_search() {

		return !empty($this->get_schema_columns(array('searchable' => true)));

	} // end has_search;
	/**
	 * Generates the search field label, based on the table labels.
	 *
	 * @since 2.0.0
	 */
	public function get_search_input_label(): string {

		// translators: %s will be replaced with the data type plural name. e.g. Books.
		return sprintf(__('Search %s'), $this->get_label('plural'));

	} // end get_search_input_label;

	/**
	 * Prepare the list table before actually displaying records.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function prepare_items() {

		$this->_column_headers = $this->get_column_info();

		$per_page = $this->get_items_per_page($this->get_per_page_option_name(), 10);

		$current_page = $this->get_pagenum();

		$total_items = $this->record_count();

        // Some subclass record_count() implementations return an array (when the
        // source data lives in a join); coerce to a count so pagination works.
        if ( is_array( $total_items ) ) {
            $total_items = count( $total_items );
        }

		$this->set_pagination_args(array(
			'total_items' => $total_items, // We have to calculate the total number of items.
			'per_page'    => $per_page     // We have to determine how many items to show on a page.
		));

		$this->items = $this->get_items($per_page, $current_page);

	} // end prepare_items;

	/**
	 * Register Scripts that might be needed for ajax pagination and so on.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_scripts() {

		$model = strchr( $this->get_table_id(), '_', true );

		if ( ! $model ) {
			$model = $this->get_table_id();
		}

		$base_url = class_exists( 'WPDev\\Modules\\TableBuilder\\Bulk_Action_Pipeline' )
			? \WPDevFramework\Modules\TableBuilder\Bulk_Action_Pipeline::get_confirm_url( $model )
			: wpdev_get_form_url( 'bulk_actions' );

		wp_localize_script('wpdev-ajax-list-table', 'wpdev_list_table', array(
			'base_url' => $base_url,
			'model'    => $model,
			'i18n'     => array(
				'confirm' => __('Confirm Action', 'wpdev'),
			),
		));

		wp_enqueue_script('wpdev-ajax-list-table');

	} // end register_scripts;

	/**
	 * Adds the hidden fields necessary to handle pagination.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function display_ajax_filters() {

		/**
		 * Add the nonce field before we generate the results
		 */
		wp_nonce_field(sprintf('ajax-%s-nonce', $this->_get_js_var_name()), sprintf('_ajax_%s_nonce', $this->_get_js_var_name()));

		/**
		 * Page attribute to be used with the push state
		 */
		printf('<input type="hidden" id="page" name="page" value="%s" />', esc_attr(wpdev_request('page', '')));

		/**
		 * ID attribute to be used with the push state
		 */
		if (wpdev_request('id')) {

			printf('<input type="hidden" id="id" name="id" value="%s" />', esc_attr(wpdev_request('id')));

		} // end if;

		foreach ($this->get_hidden_fields() as $field_name => $field_value) {

			/**
			 * Add a hidden field to later be sent via the ajax call.
			 */
			printf('<input type="hidden" id="%s" name="%s" value="%s" />', esc_attr($field_name), esc_attr($field_name), esc_attr($field_value));

		} // end foreach;

	} // end display_ajax_filters;

	/**
	 * Handles the default display for list mode.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function display_view_list() {

		printf('<div id="wpdev-%s" class="wpdev-list-table wpdev-mode-list" data-table-id="%s">', esc_attr($this->id), esc_attr($this->id));

		$this->display_ajax_filters();

		/**
		 * Call parents implementation.
		 */
		parent::display();

		echo '</div>';

	} // end display_view_list;

	/**
	 * Handles the default display for grid mode.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function display_view_grid() {

		printf('<div id="wpdev-%s" class="wpdev-list-table wpdev-mode-grid" data-table-id="%s">', esc_attr($this->id), esc_attr($this->id));

		$this->display_ajax_filters();

		wpdev_get_template('base/grid', array(
			'table' => $this,
		));

		echo '</div>';

	} // end display_view_grid;

	/**
	 * Displays the table.
	 *
	 * Adds a Nonce field and calls parent's display method.
	 *
	 * @since 3.1.0
	 * @access public
	 */
	public function display() {
		/*
		 * Any items at all?
		 */
		if (!$this->has_items() && $this->context === 'page') {

			echo wpdev_render_empty_state( $this->get_empty_state_args() );

		} else {

			call_user_func(array($this, "display_view_{$this->current_mode}"));

		} // end if;

	} // end display;

	/**
	 * Empty-state args for list pages (defaults + declarative overrides).
	 *
	 * @since 2.5.0
	 *
	 * @return array<string, mixed>
	 */
	protected function get_empty_state_args() {

		$args = array(
			'message'      => sprintf(__("You don't have any %s yet.", 'wpdev'), $this->labels['plural']),
			'sub_message'  => $this->_args['add_new'] ? __('How about we create a new one?', 'wpdev') : __('...but you will see them here once they get created.', 'wpdev'),
			// translators: %s is the singular value of the model, such as Product, or Payment.
			'link_label'   => sprintf(__('Create a new %s', 'wpdev'), $this->labels['singular']),
			'link_url'     => wpdev_get_isset($this->_args['add_new'], 'url', ''),
			'link_classes' => wpdev_get_isset($this->_args['add_new'], 'classes', ''),
			'link_icon'    => 'dashicons-wpdev-circle-with-plus',
		);

		$config = $this->get_declarative_config();

		if ( $config ) {
			$declarative = $config->get_empty_state();

			if ( ! empty( $declarative ) ) {
				$args = array_merge( $args, $declarative );
			}
		}

		if ( empty( $this->_args['add_new'] ) ) {
			$args['link_label']   = '';
			$args['link_url']     = '';
			$args['link_classes'] = '';
			$args['link_icon']    = '';
		}

		return $args;

	} // end get_empty_state_args;

	/**
	 * Display the filters if they exist.
	 *
	 * @todo: refator
	 * @since 2.0.0
	 * @return void
	 */
	public function filters() {

		$filters = $this->get_filters();

		$views = apply_filters("wpdev_{$this->id}_get_views", $this->get_views());

		if (true) {

			$args = array_merge($filters, array(
				'filters_el_id'   => sprintf('%s-filters', $this->id),
				'has_search'      => $this->has_search(),
				'search_label'    => $this->get_search_input_label(),
				'views'           => $views,
				'has_view_switch' => !empty($this->modes),
				'table'           => $this,
			));

			wpdev_get_template('base/filter', $args);

		} // end if;

	} // end filters;

	/**
	 * Overrides the single row method to create different methods depending on the mode.
	 *
	 * @since 2.0.0
	 *
	 * @param mixed $item The line item being displayed.
	 * @return void
	 */
	public function single_row($item) {

		call_user_func(array($this, "single_row_{$this->current_mode}"), $item);

	} // end single_row;

	/**
	 * Handles the item display for list mode.
	 *
	 * @since 2.0.0
	 *
	 * @param mixed $item The line item being displayed.
	 * @return void
	 */
	public function single_row_list($item) {

		parent::single_row($item);

	} // end single_row_list;

	/**
	 * Handles the item display for grid mode.
	 *
	 * @since 2.0.0
	 *
	 * @param mixed $item The line item being displayed.
	 * @return void
	 */
	public function single_row_grid($item) {} // end single_row_grid;

	/**
	 * Displays a base div when there is not item.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function no_items() {

		echo sprintf('<div class="wpdev-py-6 wpdev-text-gray-600 wpdev-text-sm wpdev-text-center">
			<span class="">%s</span>
		</div>', __('No items found', 'wpdev'));

	} // end no_items;

	/**
	 * Returns an associative array containing the bulk action
	 *
	 * @return array
	 */
	public function get_bulk_actions() {

		$default_bulk_actions = array(
			'delete' => __('Delete', 'wpdev'),
		);

		$has_active = $this->get_schema_columns(array(
			'name' => 'active',
		));

		if ($has_active) {

			$default_bulk_actions['activate']   = __('Activate', 'wpdev');
			$default_bulk_actions['deactivate'] = __('Deactivate', 'wpdev');

		} // end if;

		return apply_filters('wpdev_bulk_actions', $default_bulk_actions, $this->id);

	} // end get_bulk_actions;

	/**
	 * Process single action.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function process_single_action() {} // end process_single_action;

	/**
	 * Handles the bulk processing.
	 *
	 * @since 2.0.0
	 * @return bool
	 */
	static public function process_bulk_action() {

		global $wpdb;

		$bulk_action = wpdev_request('bulk_action');

		$model = wpdev_request('model');

		if ($model === 'checkout') {

			$model = 'WPDevFramework\WCExport\FeatureName\Database\Checkout_Form';

		} elseif ($model === 'discount') {

			$model = 'discount_code';

		} // end if;

		$item_ids = explode(',', (string) wpdev_request('ids', ''));

		$prefix = apply_filters('wpdev_bulk_action_function_prefix', 'wpdev_get_', $model);

		$func_name = $prefix . $model;

		if (!function_exists($func_name)) {

			return new \WP_Error('func-not-exists', __('Something went wrong.', 'wpdev'));

		} // end if;

		switch ($bulk_action) {

			case 'activate':
				foreach ($item_ids as $item_id) {

					$item = $func_name($item_id);

					$item->set_active(true);

					$item->save();

				} // end foreach;

				break;

			case 'deactivate':
				foreach ($item_ids as $item_id) {

					$item = $func_name($item_id);

					$item->set_active(false);

					$item->save();

				} // end foreach;

				break;

			case 'delete':
				foreach ($item_ids as $item_id) {

					$item = $func_name($item_id);

					$item->delete();

				} // end foreach;

				break;

			default:
				do_action('wpdev_process_bulk_action', $bulk_action);
				break;

		} // end switch;

		return true;

	} // end process_bulk_action;

	/**
	 * Handles ajax requests for pagination and filtering.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function ajax_response() {

		check_ajax_referer(sprintf('ajax-%s-nonce', $this->_get_js_var_name()), sprintf('_ajax_%s_nonce', $this->_get_js_var_name()));

		$this->set_context('ajax');

		$this->prepare_items();

		extract($this->_args); // phpcs:ignore

		extract($this->_pagination_args, EXTR_SKIP); // phpcs:ignore

		/**
		 * Load the rows
		 */
		ob_start();

		if (!empty($_REQUEST['no_placeholder'])) {

			$this->display_rows();

		} else {

			$this->display_rows_or_placeholder();

		} // end if;

		$rows = ob_get_clean();

		/**
		 * Get headers into a variable
		 */
		ob_start();

		$this->print_column_headers();

		$headers = ob_get_clean();

		/**
		 * Get the top bar into a variable
		 */
		ob_start();

		$this->pagination('top');

		$pagination_top = ob_get_clean();

		/**
		 * Get the bottom nav into a variable
		 */
		ob_start();

		$this->pagination('bottom');

		$pagination_bottom = ob_get_clean();

		/**
		 * Build the response
		 */
		$response                         = array('rows' => $rows);
		$response['pagination']['top']    = $pagination_top;
		$response['pagination']['bottom'] = $pagination_bottom;
		$response['column_headers']       = $headers;
		$response['count']                = $this->record_count();
		$response['type']                 = wpdev_request('type', 'all');

		if (isset($total_items)) {

			$response['total_items_i18n'] = sprintf(_n('1 item', '%s items', $total_items), number_format_i18n($total_items)); // phpcs:ignore

		} // end if;

		if (isset($total_pages)) {

			$response['total_pages']      = $total_pages;
			$response['total_pages_i18n'] = number_format_i18n( $total_pages );

		} // end if;

		/**
		 * Send the response (standard ajax contract when enabled).
		 */
		if ( class_exists( '\WPDevFramework\Core\Ajax\Ajax_Response' ) && apply_filters( 'wpdev_list_table_ajax_standard_response', true ) ) {
			\WPDevFramework\Core\Ajax\Ajax_Response::success( $response, 'list_table_refresh' );
		}

		wp_send_json( $response );

		exit;

	} // end ajax_response;

	/**
	 * Render a column when no column specific method exist.
	 *
	 * @param array  $item Item object/array.
	 * @param string $column_name Column name being displayed.
	 *
	 * @return string
	 */
	public function column_default($item, $column_name) {

		$value = call_user_func(array($item, "get_{$column_name}"));

		$datetime_columns = array_column($this->get_schema_columns(array(
			'date_query' => true,
		)), 'name');

		if (in_array($column_name, $datetime_columns, true)) {

			return $this->_column_datetime($value);

		} // end if;

		return $value;

	} // end column_default;

	/**
	 * Handles the default displaying of datetime columns.
	 *
	 * @since 2.0.0
	 *
	 * @param string $date Valid date to be used inside a strtotime call.
	 * @return string
	 */
	public function _column_datetime($date) {

		if (!wpdev_validate_date($date)) {

			return __('--', 'wpdev');

		} // end if;

		$time = strtotime(get_date_from_gmt((string) $date));

		$formatted_value = date_i18n(get_option('date_format'), $time);

		$placeholder = wpdev_get_current_time('timestamp') > $time ? __('%s ago', 'wpdev') : __('In %s', 'wpdev'); // phpcs:ignore

		$text = $formatted_value . sprintf('<br><small>%s</small>', sprintf($placeholder, human_time_diff($time)));

		return sprintf('<span %s>%s</span>', wpdev_tooltip_text(date_i18n('Y-m-d H:i:s', $time)), $text);

	} // end _column_datetime;

	/**
	 * Returns the membership object associated with this object.
	 *
	 * @since 2.0.0
	 *
	 * @param object $item Object.
	 * @return string
	 */
	public function column_membership($item) {

		$membership = $item->get_membership();

		if (!$membership) {

			$not_found = __('No membership found', 'wpdev');

			return "<div class='wpdev-table-card  wpdev-text-gray-700 wpdev-py-1 wpdev-px-2 wpdev-flex wpdev-flex-grow wpdev-block wpdev-rounded wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-relative wpdev-overflow-hidden'>
				<span class='dashicons dashicons-wpdev-block wpdev-text-gray-600 wpdev-px-1 wpdev-pr-3'>&nbsp;</span>
				<div class=''>
					<span class='wpdev-block wpdev-py-3 wpdev-text-gray-600 wpdev-text-2xs wpdev-font-bold wpdev-uppercase'>{$not_found}</span>
				</div>
			</div>";

		} // end if;

		$url_atts = array(
			'id' => $membership->get_id(),
		);

		$status_classes = $membership->get_status_class();

		$id = $membership->get_id();

		$reference = $membership->get_hash();

		$description = $membership->get_price_description();

		$membership_link = wpdev_network_admin_url('wpdev-edit-membership', $url_atts);

		$html = "<a href='{$membership_link}' class='wpdev-no-underline wpdev-table-card wpdev-text-gray-700 wpdev-py-1 wpdev-px-2 wpdev-pl-4 wpdev-flex wpdev-flex-grow wpdev-block wpdev-rounded wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-relative wpdev-overflow-hidden'>
			<div class='wpdev-absolute wpdev-top-0 wpdev-bottom-0 wpdev-left-0 wpdev-w-2 {$status_classes}'>&nbsp;</div>
			<div class=''>
				<strong class='wpdev-block'>{$reference} <small class='wpdev-font-normal'>(#{$id})</small></strong>
				<small>{$description}</small>
			</div>
		</a>";

		return $html;

	} // end column_membership;

	/**
	 * Returns the payment object associated with this object.
	 *
	 * @since 2.0.0
	 *
	 * @param object $item Object.
	 * @return string
	 */
	public function column_payment($item) {

		$payment = $item->get_payment();

		if (!$payment) {

			$not_found = __('No payment found', 'wpdev');

			return "<div class='wpdev-table-card  wpdev-text-gray-700 wpdev-py-1 wpdev-px-2 wpdev-flex wpdev-flex-grow wpdev-block wpdev-rounded wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-relative wpdev-overflow-hidden'>
				<span class='dashicons dashicons-wpdev-block wpdev-text-gray-600 wpdev-px-1 wpdev-pr-3'>&nbsp;</span>
				<div class=''>
					<span class='wpdev-block wpdev-py-3 wpdev-text-gray-600 wpdev-text-2xs wpdev-font-bold wpdev-uppercase'>{$not_found}</span>
				</div>
			</div>";

		} // end if;

		$url_atts = array(
			'id' => $payment->get_id(),
		);

		$status_classes = $payment->get_status_class();

		$id = $payment->get_id();

		$reference = $payment->get_hash();

		$description = sprintf(__('Total %s', 'wpdev'), wpdev_format_currency($payment->get_total(), $payment->get_currency()));

		$payment_link = wpdev_network_admin_url('wpdev-edit-payment', $url_atts);

		$html = "<a href='{$payment_link}' class='wpdev-no-underline wpdev-table-card wpdev-text-gray-700 wpdev-py-1 wpdev-px-2 wpdev-pl-4 wpdev-flex wpdev-flex-grow wpdev-block wpdev-rounded wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-relative wpdev-overflow-hidden'>
			<div class='wpdev-absolute wpdev-top-0 wpdev-bottom-0 wpdev-left-0 wpdev-w-2 {$status_classes}'>&nbsp;</div>
			<div class=''>
				<strong class='wpdev-block'>{$reference} <small class='wpdev-font-normal'>(#{$id})</small></strong>
				<small>{$description}</small>
			</div>
		</a>";

		return $html;

	} // end column_payment;

	/**
	 * Returns the customer object associated with this object.
	 *
	 * @since 2.0.0
	 *
	 * @param object $item Object.
	 * @return string
	 */
	public function column_customer($item) {

		$customer = $item->get_customer();

		if (!$customer) {

			$not_found = __('No customer found', 'wpdev');

			return "<div class='wpdev-table-card  wpdev-text-gray-700 wpdev-py-1 wpdev-px-2 wpdev-flex wpdev-flex-grow wpdev-rounded wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-relative wpdev-overflow-hidden'>
				<span class='dashicons dashicons-wpdev-block wpdev-text-gray-600 wpdev-px-1 wpdev-pr-3'>&nbsp;</span>
				<div class=''>
					<span class='wpdev-block wpdev-py-3 wpdev-text-gray-600 wpdev-text-2xs wpdev-font-bold wpdev-uppercase'>{$not_found}</span>
				</div>
			</div>";

		} // end if;

		$url_atts = array(
			'id' => $customer->get_id(),
		);

		$avatar = get_avatar($customer->get_user_id(), 32, 'identicon', '', array(
			'force_display' => true,
			'class'         => 'wpdev-rounded-full wpdev-mr-2',
		));

		$display_name = $customer->get_display_name();

		$id = $customer->get_id();

		$email = $customer->get_email_address();

		$customer_link = wpdev_network_admin_url('wpdev-edit-customer', $url_atts);

		$html = "<a href='{$customer_link}' class='wpdev-no-underline wpdev-table-card wpdev-text-gray-700 wpdev-p-1 wpdev-flex wpdev-flex-grow wpdev-rounded wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300'>
			{$avatar}
			<div class='wpdev-flex-wrap wpdev-overflow-hidden'>
				<strong class='wpdev-block wpdev-flex-grow wpdev-truncate'>{$display_name} <small class='wpdev-font-normal'>(#{$id})</small></strong>
				<small class='wpdev-truncate wpdev-block'>{$email}</small>
			</div>
		</a>";

		return $html;

	} // end column_customer;

	/**
	 * Returns the product object associated with this object.
	 *
	 * @since 2.0.0
	 *
	 * @param object $item Object.
	 * @return string
	 */
	public function column_product($item) {

		$product = $item->get_plan();

		if (!$product) {

			$not_found = __('No product found', 'wpdev');

			return "<div class='wpdev-table-card wpdev-text-gray-700 wpdev-py-1 wpdev-px-2 wpdev-flex wpdev-flex-grow wpdev-rounded wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-relative wpdev-overflow-hidden'>
				<span class='dashicons dashicons-wpdev-block wpdev-text-gray-600 wpdev-px-1 wpdev-pr-3'>&nbsp;</span>
				<div class=''>
					<span class='wpdev-block wpdev-py-3 wpdev-text-gray-600 wpdev-text-2xs wpdev-font-bold wpdev-uppercase'>{$not_found}</span>
				</div>
			</div>";

		} // end if;

		$url_atts = array(
			'id' => $product->get_id(),
		);

		$image = $product->get_featured_image('thumbnail');

		$image = $image ? sprintf('<img class="wpdev-w-7 wpdev-h-7 wpdev-rounded wpdev-mr-3" src="%s">', esc_attr($image)) : '
			<div class="wpdev-w-7 wpdev-h-7 wpdev-bg-gray-200 wpdev-rounded wpdev-text-gray-600 wpdev-flex wpdev-items-center wpdev-justify-center wpdev-mr-2 wpdev-ml-1">
				<span class="dashicons-wpdev-image"></span>
			</div>';

		$name = $product->get_name();

		$id = $product->get_id();

		$description = wpdev_slug_to_name($product->get_type());

		$product_link = wpdev_network_admin_url('wpdev-edit-product', $url_atts);

		$html = "<a href='{$product_link}' class='wpdev-table-card wpdev-no-underline wpdev-text-gray-700 wpdev-p-1 wpdev-flex wpdev-flex-grow wpdev-rounded wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300'>
			{$image}
			<div class=''>
				<strong class='wpdev-block'>{$name} <small class='wpdev-font-normal'>(#{$id})</small></strong>
				<small>{$description}</small>
			</div>
		</a>";

		return $html;

	} // end column_product;

	/**
	 * Returns the site object associated with this object.
	 *
	 * @since 2.0.0
	 *
	 * @param object $item Object.
	 * @return string
	 */
	public function column_blog_id($item) {

		$site = $item->get_site();

		if (!$site) {

			$not_found = __('No site found', 'wpdev');

			return "<div class='wpdev-table-card  wpdev-text-gray-700 wpdev-py-0 wpdev-px-2 wpdev-flex wpdev-flex-grow wpdev-block wpdev-rounded wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300 wpdev-relative wpdev-overflow-hidden'>
				<span class='dashicons dashicons-wpdev-block wpdev-text-gray-600 wpdev-px-1 wpdev-pr-3'>&nbsp;</span>
				<div class=''>
					<span class='wpdev-block wpdev-py-3 wpdev-text-gray-600 wpdev-text-2xs wpdev-font-bold wpdev-uppercase'>{$not_found}</span>
				</div>
			</div>";

		} // end if;

		$url_atts = array(
			'id' => $site->get_id(),
		);

		$site_link = wpdev_network_admin_url('wpdev-edit-site', $url_atts);

		$avatar = $site->get_featured_image();

		$title = $site->get_title();

		$html = "<a href='{$site_link}' class='wpdev-table-card wpdev-no-underline wpdev-text-gray-700 wpdev-p-1 wpdev-flex wpdev-flex-grow wpdev-block wpdev-rounded wpdev-items-center wpdev-border wpdev-border-solid wpdev-border-gray-300'>
			<img class='wpdev-rounded wpdev-mr-3' height='40' width='40' src='{$avatar}'>
			<div class='wpdev-flex wpdev-flex-wrap wpdev-overflow-hidden'>
				<strong class='wpdev-w-full wpdev-truncate'>{$title}</strong>
				<small class='wpdev-w-full wpdev-truncate'>{$site->get_active_site_url()}</small>
			</div>
		</a>";

		return $html;

	} // end column_blog_id;
	/**
	 * Display the column for feature image.
	 *
	 * @since 2.0.0
	 *
	 * @param WPDevFramework\Models\Product $item Product object.
	 */
	public function column_featured_image_id($item): string {

		$image = $item->get_featured_image('thumbnail');

		$large_image = $item->get_featured_image('large');

		if (!$image) {

			return '
			<div class="wpdev-w-thumb wpdev-h-thumb wpdev-bg-gray-200 wpdev-rounded wpdev-text-gray-600 wpdev-flex wpdev-items-center wpdev-justify-center">
				<span class="dashicons-wpdev-image"></span>
			</div>';

		} // end if;

		return sprintf('<div class="wpdev-w-thumb wpdev-h-thumb wpdev-bg-gray-200 wpdev-rounded wpdev-overflow-hidden wpdev-text-center">
			<img src="%s" class="wpdev-object-cover wpdev-w-thumb wpdev-h-thumb wpdev-image-preview" data-image="%s">
		</div>', $image, $large_image);

	} // end column_featured_image_id;

	/**
	 * Render the bulk edit checkbox.
	 *
	 * @param WPDevFramework\Models\Product $item Product object.
	 *
	 * @return string
	 */
	public function column_cb($item) {

		return sprintf('<input type="checkbox" name="bulk-delete[]" value="%s" />', $item->get_id());

	} // end column_cb;
	/**
	 * Return the js var name. This will be used on other places.
	 *
	 * @since 2.0.0
	 */
	public function _get_js_var_name(): string {

		return str_replace('-', '_', $this->id);

	} // end _get_js_var_name;

	/**
	 * Overrides the parent method to include the custom ajax functionality for WPDev.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function _js_vars() {

		/**
		 * Call the parent method for backwards compat.
		 */
		parent::_js_vars();

		?>

		<script type='text/javascript'>
			document.addEventListener('DOMContentLoaded', function() {

				let table_id = '<?php echo $this->_get_js_var_name(); ?>';

				/**
				 * Create the ajax List Table
				 */
				if (typeof window[table_id] === 'undefined') {

					window[table_id + '_config'] = {
						filters: <?php echo json_encode($this->get_filters()); ?>,
						context: <?php echo json_encode($this->context); ?>,
					}

					window[table_id] = wpdev_create_list(table_id).init();

				} // end if;

			});
		</script>

		<?php

	} // end _js_vars;

	/**
	 * Fills the filter array with values returned from the current request.
	 *
	 * @since 2.0.0
	 *
	 * @param string $name Filter name.
	 * @return mixed
	 */
	public function fill_normal_type($name) {

		return isset($_REQUEST[$name]) ? ((array) $_REQUEST[$name]) : array();

	} // end fill_normal_type;

	/**
	 * Fills the data filter array with values returned from the current request.
	 *
	 * @since 2.0.0
	 *
	 * @param string $name Filter name.
	 * @return mixed
	 */
	public function fill_date_type($name) {

		return (object) array(
			'after'  => isset($_REQUEST[$name]['after']) ? $_REQUEST[$name]['after'] : 'all',
			'before' => isset($_REQUEST[$name]['before']) ? $_REQUEST[$name]['before'] : 'all',
			'type'   => isset($_REQUEST['filter_' . $name]) ? $_REQUEST['filter_' . $name] : 'all',
		);

	} // end fill_date_type;

	/**
	 * Get the default date filter options.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_default_date_filter_options() {

		return array(
			'all'           => array(
				'label'  => __('All', 'wpdev'),
				'after'  => null,
				'before' => null,
			),
			'today'         => array(
				'label'  => __('Today', 'wpdev'),
				'after'  => date_i18n('Y-m-d 00:00:00', strtotime('today')),
				'before' => date_i18n('Y-m-d 23:59:59', strtotime('today')),
			),
			'yesterday'     => array(
				'label'  => __('Yesterday', 'wpdev'),
				'after'  => date_i18n('Y-m-d 00:00:00', strtotime('yesterday')),
				'before' => date_i18n('Y-m-d 23:59:59', strtotime('yesterday')),
			),
			'last_week'     => array(
				'label'  => __('Last 7 Days', 'wpdev'),
				'after'  => date_i18n('Y-m-d 00:00:00', strtotime('last week')),
				'before' => date_i18n('Y-m-d 23:59:59', strtotime('today')),
			),
			'last_month'    => array(
				'label'  => __('Last 30 Days', 'wpdev'),
				'after'  => date_i18n('Y-m-d 00:00:00', strtotime('last month')),
				'before' => date_i18n('Y-m-d 23:59:59', strtotime('today')),
			),
			'current_month' => array(
				'label'  => __('Current Month', 'wpdev'),
				'after'  => date_i18n('Y-m-d 00:00:00', strtotime('first day of this month')),
				'before' => date_i18n('Y-m-d 23:59:59', strtotime('today')),
			),
			'last_year'     => array(
				'label'  => __('Last 12 Months', 'wpdev'),
				'after'  => date_i18n('Y-m-d 00:00:00', strtotime('last year')),
				'before' => date_i18n('Y-m-d 23:59:59', strtotime('today')),
			),
			'year_to_date'  => array(
				'label'  => __('Year to Date', 'wpdev'),
				'after'  => date_i18n('Y-m-d 00:00:00', strtotime('first day of january this year')),
				'before' => date_i18n('Y-m-d 23:59:59', strtotime('today')),
			),
			'custom'        => array(
				'label'  => __('Custom', 'wpdev'),
				'after'  => null,
				'before' => null,
			),
		);

	} // end get_default_date_filter_options;

	/**
	 * Returns the columns from the BerlinDB Schema.
	 *
	 * Schema columns are protected on BerlinDB, which makes it hard to reference them out context.
	 * This is the reason for the reflection funkiness going on in here.
	 * Maybe there's a better way to do it, but it works for now.
	 *
	 * @since 2.0.0
	 *
	 * @param array   $args Key => Value pair to search the return columns. e.g. array('searchable' => true).
	 * @param string  $operator How to use the $args arrays in the search. As logic and's or or's.
	 * @param boolean $field Field to return.
	 * @return array.
	 */
	protected function get_schema_columns($args = array(), $operator = 'and', $field = false) {

		$query_class = new $this->query_class();

		$reflector = new \ReflectionObject($query_class);

		$method = $reflector->getMethod('get_columns');

		$method->setAccessible(true);

		return $method->invoke($query_class, $args, $operator, $field);

	} // end get_schema_columns;

	/**
	 * Returns sortable columns on the schema.
	 *
	 * @return array
	 */
	public function get_sortable_columns() {

		$sortable_columns_from_schema = $this->get_schema_columns(array(
			'sortable' => true,
		));

		$sortable_columns = array();

		foreach ($sortable_columns_from_schema as $sortable_column_from_schema) {

			$sortable_columns[$sortable_column_from_schema->name] = array($sortable_column_from_schema->name, false);

		} // end foreach;

		return $sortable_columns;

	} // end get_sortable_columns;

	/**
	 * Get the extra fields based on the request.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_extra_fields() {

		return array();

		$_filter_fields = array();

		if (isset($filters['filters'])) {

			foreach ($filters['filters'] as $field_name => $field) {

				$_filter_fields[$field_name] = wpdev_request($field_name, '');

			} // end foreach;

		} // end if;

		return $_filter_fields;

	} // end get_extra_fields;

	/**
	 * Returns the date fields.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_extra_date_fields() {

		$filters = $this->get_filters();

		$_filter_fields = array();

		if (isset($filters['date_filters'])) {

			foreach ($filters['date_filters'] as $field_name => $field) {

				if (!isset($_REQUEST[$field_name])) {

					continue;

				} // end if;

				if (isset($_REQUEST[$field_name]['before']) && isset($_REQUEST[$field_name]['after']) && $_REQUEST[$field_name]['before'] === '' && $_REQUEST[$field_name]['after'] === '') {

					continue;

				}   // end if;

				$_filter_fields[$field_name] = wpdev_request($field_name, '');

			} // end foreach;

		} // end if;

		return $_filter_fields;

	} // end get_extra_date_fields;

	/**
	 * Returns a list of filters on the request to be used on the query.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_extra_query_fields() {

		return array();

	} // end get_extra_query_fields;

	/**
	 * Returns the hidden fields that are embedded into the page.
	 *
	 * These are used to make sure the URL on the browser is always up to date.
	 * This makes sure that when a use refreshes, they don't loose the current filtering state.
	 * This also makes filtered searches shareable via the URL =)
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_hidden_fields() {

		$final_fields = array(
			'order'   => isset($this->_pagination_args['order']) ? $this->_pagination_args['order'] : '',
			'orderby' => isset($this->_pagination_args['orderby']) ? $this->_pagination_args['orderby'] : '',
		);

		return $final_fields;

	} // end get_hidden_fields;

	/**
	 * Returns the pre-selected filters on the filter bar.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public function get_views() {

		$config = $this->get_declarative_config();

		if ( $config ) {
			$views = $config->get_views();

			if ( ! empty( $views ) ) {
				return $views;
			}
		}

		return array(
			'all' => array(
				'field' => 'type',
				'url'   => '#',
				'label' => sprintf(__('All %s', 'wpdev'), $this->get_label('plural')),
				'count' => 0,
			),
		);

	} // end get_views;

	/**
	 * Declarative row-action slugs from Table_Config (K5-002 actions metadata).
	 *
	 * @since 2.5.0
	 *
	 * @return string[]
	 */
	protected function get_declarative_row_action_items() {

		$config = $this->get_declarative_config();

		if ( ! $config ) {
			return array();
		}

		$actions = $config->get_actions();

		return $actions['items'] ?? array();

	} // end get_declarative_row_action_items;

	/**
	 * Edit row action link.
	 *
	 * @since 2.5.0
	 *
	 * @param int|string $item_id       Object id.
	 * @param string     $model         Model slug.
	 * @param string     $edit_page_slug Network admin page slug.
	 * @return string
	 */
	protected function row_action_edit( $item_id, $model, $edit_page_slug ) {

		return sprintf(
			'<a href="%s">%s</a>',
			wpdev_network_admin_url(
				$edit_page_slug,
				array(
					'id'    => $item_id,
					'model' => $model,
				)
			),
			__( 'Edit', 'wpdev' )
		);

	} // end row_action_edit;

	/**
	 * Delete row action opening the delete modal.
	 *
	 * @since 2.5.0
	 *
	 * @param int|string $item_id Object id.
	 * @param string     $model   Model slug.
	 * @return string
	 */
	protected function row_action_delete_modal( $item_id, $model ) {

		return sprintf(
			'<a title="%s" class="wubox" href="%s">%s</a>',
			__( 'Delete', 'wpdev' ),
			wpdev_get_form_url(
				'delete_modal',
				array(
					'id'    => $item_id,
					'model' => $model,
				)
			),
			__( 'Delete', 'wpdev' )
		);

	} // end row_action_delete_modal;

	/**
	 * Duplicate row action (list-page duplicate handler).
	 *
	 * @since 2.5.0
	 *
	 * @param int|string $item_id        Object id.
	 * @param string     $edit_page_slug Edit page used to resolve list handler.
	 * @return string
	 */
	protected function row_action_duplicate( $item_id, $edit_page_slug ) {

		$list_pages = apply_filters( 'wpdev_row_action_duplicate_list_pages', array() );

		if ( 'wpdev-edit-email' === $edit_page_slug ) {
			return sprintf(
				'<a href="%s">%s</a>',
				wpdev_network_admin_url(
					'wpdev-edit-email',
					array(
						'id' => $item_id,
					)
				),
				__( 'Duplicate', 'wpdev' )
			);
		}

		if ( empty( $list_pages[ $edit_page_slug ] ) ) {
			return '';
		}

		return sprintf(
			'<a href="%s">%s</a>',
			wpdev_network_admin_url(
				$list_pages[ $edit_page_slug ],
				array(
					'action' => 'duplicate',
					'id'     => $item_id,
				)
			),
			__( 'Duplicate', 'wpdev' )
		);

	} // end row_action_duplicate;

	/**
	 * Row action that opens a modal form (wubox).
	 *
	 * @since 2.5.0
	 *
	 * @param string               $title   Link title attribute.
	 * @param string               $label   Visible label.
	 * @param string               $form_id Registered ajax form id.
	 * @param array<string, mixed> $atts    Form URL query args.
	 * @return string
	 */
	protected function row_action_wubox_form( $title, $label, $form_id, array $atts = array() ) {

		return sprintf(
			'<a title="%s" class="wubox" href="%s">%s</a>',
			esc_attr( $title ),
			wpdev_get_form_url( $form_id, $atts ),
			esc_html( $label )
		);

	} // end row_action_wubox_form;

	/**
	 * Row actions from declarative config with fallback slugs.
	 *
	 * @since 2.5.0
	 *
	 * @param object     $item            Row model.
	 * @param string     $model           Model slug (or FQCN for legacy rows).
	 * @param string     $edit_page_slug  Edit admin page.
	 * @param string[]   $default_items   Fallback action slugs.
	 * @return array<string, string>
	 */
	protected function standard_row_actions_for( $item, $model, $edit_page_slug, array $default_items = array( 'edit', 'delete' ) ) {

		$items = $this->get_declarative_row_action_items();

		if ( empty( $items ) ) {
			$items = $default_items;
		}

		return $this->build_standard_row_actions( $item, $model, $edit_page_slug, $items );

	} // end standard_row_actions_for;

	/**
	 * Build standard row actions from declarative slugs.
	 *
	 * @since 2.5.0
	 *
	 * @param object     $item            Row model (must provide get_id()).
	 * @param string     $model           Model slug.
	 * @param string     $edit_page_slug  Edit admin page slug.
	 * @param string[]   $items           Action slugs: edit, duplicate, delete.
	 * @return array<string, string>
	 */
	protected function build_standard_row_actions( $item, $model, $edit_page_slug, array $items ) {

		$item_id = method_exists( $item, 'get_id' ) ? $item->get_id() : 0;
		$actions = array();

		foreach ( $items as $slug ) {
			switch ( $slug ) {
				case 'edit':
					$actions['edit'] = $this->row_action_edit( $item_id, $model, $edit_page_slug );
					break;
				case 'delete':
					$actions['delete'] = $this->row_action_delete_modal( $item_id, $model );
					break;
				case 'duplicate':
					$duplicate = $this->row_action_duplicate( $item_id, $edit_page_slug );

					if ( '' !== $duplicate ) {
						$actions['duplicate'] = $duplicate;
					}
					break;
			}
		}

		return $actions;

	} // end build_standard_row_actions;

	/**
	 * Generates the required HTML for a list of row action links.
	 *
	 * @since 2.1
	 *
	 * @param string[] $actions        An array of action links.
	 * @param bool     $always_visible Whether the actions should be always visible.
	 * @return string The HTML for the row actions.
	 */
	protected function row_actions($actions, $always_visible = false) {

		$actions = apply_filters('wpdev_list_row_actions', $actions, $this->id);

		return parent::row_actions($actions);

	} // end row_actions;


} // end class Base_List_Table;
