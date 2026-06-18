<?php
/**
 * Default Ajax hooks.
 *
 * @package WPDev
 * @subpackage Ajax
 * @since 2.0.0
 */

namespace WPDevFramework;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Adds a lighter ajax option to WPDev.
 *
 * @since 1.9.14
 */
class Ajax {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Maps ajax table_id to list table class names (supports widget-scoped ids).
	 *
	 * @since 2.4.0
	 * @var array<string, string>
	 */
	protected static $list_table_registry = array();

	/**
	 * Register a list table for ajax refresh resolution.
	 *
	 * @since 2.4.0
	 *
	 * @param string $table_id    DOM/ajax table id.
	 * @param string $class_name  Fully-qualified list table class.
	 * @return void
	 */
	public static function register_list_table( $table_id, $class_name ) {

		self::$list_table_registry[ $table_id ] = $class_name;

	} // end register_list_table;

	/**
	 * Resolve list table class from table_id.
	 *
	 * @since 2.4.0
	 *
	 * @param string $table_id Ajax table id.
	 * @return string|null
	 */
	protected function resolve_list_table_class( $table_id ) {

		if ( isset( self::$list_table_registry[ $table_id ] ) ) {
			return self::$list_table_registry[ $table_id ];
		}

		$class_name = $this->get_table_class_name( $table_id );

		$legacy = "\\WPDev\\List_Tables\\{$class_name}";

		return class_exists( $legacy ) ? $legacy : null;

	} // end resolve_list_table_class;

	/**
	 * Sets up the listeners.
	 *
	 * @since 2.0.0
	 */
	public function __construct() {

		if ( function_exists( 'wpdev_require_public_function' ) ) {
			wpdev_require_public_function( 'ajax' );
		}

		if ( function_exists( 'wpdev_register_ajax_handler' ) ) {
			wpdev_register_ajax_handler(
				'wpdev_search',
				array( $this, 'search_models' ),
				array(
					'transport'           => 'light',
					// skip_nonce: search is a read-only admin action; capability
					// check below is the authoritative gate. Removing the nonce
					// avoids 403s when the search box is open in multiple tabs.
					'skip_nonce'          => true,
					'capability_callback' => static function () {
						return wpdev_current_user_can_admin( 'manage_network' )
							|| current_user_can( 'wpdev_read_settings' )
							|| current_user_can( 'manage_options' );
					},
				)
			);
			wpdev_register_ajax_handler(
				'wpdev_list_table_fetch_ajax_results',
				array( $this, 'refresh_list_table' ),
				array(
					// skip_nonce: list-table fetch is read-only and gated by
					// user_can_ajax_refresh() inside the per-table class. The
					// nonce would need to be threaded through every list
					// table's pagination/sort UI which is out of scope here.
					'skip_nonce' => true,
				)
			);
		} else {
			add_action( 'wpdev_ajax_wpdev_search', array( $this, 'search_models' ) );
			add_action( 'wp_ajax_wpdev_list_table_fetch_ajax_results', array( $this, 'refresh_list_table' ) );
		}

		/*
		 * Adds the Selectize templates to the admin_footer.
		 */
		add_action('in_admin_footer', array($this, 'render_selectize_templates'));

	} // end __construct;
	/**
	 * Reverts the name of the table being processed.
	 *
	 * @since 2.0.0
	 *
	 * @param string $table_id The ID of the table in the format "line_item_list_table".
	 */
	private function get_table_class_name($table_id): string {

		return str_replace(' ', '_', (ucwords(str_replace('_', ' ', $table_id))));

	} // end get_table_class_name;

	/**
	 * Serves the pagination and search results of a list table ajax query.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function refresh_list_table() {

		$table_id = wpdev_request( 'table_id' );

		$full_class_name = $this->resolve_list_table_class( $table_id );

		if ( $full_class_name && class_exists( $full_class_name ) ) {

			$table = new $full_class_name();

			if ( method_exists( $table, 'user_can_ajax_refresh' ) && ! $table->user_can_ajax_refresh() ) {
				\WPDevFramework\Core\Ajax\Ajax_Response::forbidden();
			}

			$table->ajax_response();

		} // end if;

		do_action( 'wpdev_list_table_fetch_ajax_results', $table_id );

	} // end refresh_list_table;

	/**
	 * Search models using our ajax endpoint.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function search_models() {

		/**
		 * Fires before the processing of the search request.
		 *
		 * @since 2.0.0
		 */
		do_action('wpdev_before_search_models');

		if (wpdev_request('model') === 'all') {

			$this->search_all_models();

			return;

		} // end if;

		$args = wp_parse_args($_REQUEST, array(
			'model'   => 'membership',
			'query'   => array(),
			'exclude' => array()
		));

		$query = array_merge($args['query'], array(
			'number' => -1,
		));

		if ($args['exclude']) {

			if (is_string($args['exclude'])) {

				$args['exclude'] = explode(',', $args['exclude']);

				$args['exclude'] = array_map('trim', $args['exclude']);

			} // end if;

			$query['id__not_in'] = $args['exclude'];

		} // end if;

		if (wpdev_get_isset($args, 'include')) {

			if (is_string($args['include'])) {

				$args['include'] = explode(',', $args['include']);

				$args['include'] = array_map('trim', $args['include']);

			} // end if;

			$query['id__in'] = $args['include'];

		} // end if;

		/*
		 * Deal with site
		 */
		if ($args['model'] === 'site') {

			if (wpdev_get_isset($query, 'id__in')) {

				$query['blog_id__in'] = $query['id__in'];

				unset($query['id__in']);

			} // end if;

			if (wpdev_get_isset($query, 'id__not_in')) {

				$query['blog_id__not_in'] = $query['id__not_in'];

				unset($query['id__not_in']);

			} // end if;

		} // end if;

		$results = array();

		if ($args['model'] === 'user') {

			$results = $this->search_wordpress_users($query);

		} elseif ($args['model'] === 'page') {

			$results = get_posts(array(
				'post_type'   => 'page',
				'post_status' => 'publish',
				'numberposts' => -1,
				'exclude'     => isset($query['id__not_in']) ? $query['id__not_in'] : ''
			));

		} elseif ($args['model'] === 'setting') {

			$results = $this->search_WPDev_setting($query);

		} else {

			$model_func = 'wpdev_get_' . strtolower((string) $args['model']) . 's';

			if (function_exists($model_func)) {

				$results = $model_func($query);

			} // end if;

		} // end if;

		// Try search by hash if do not have any result
		if (empty($results)) {

			$model_func = 'wpdev_get_' . strtolower((string) $args['model']) . '_by_hash';

			if (function_exists($model_func)) {

				$result = $model_func(trim((string) $query['search'], '*'));

				$results = $result ? array($result) : array();

			} // end if;

		} // end if;

		wp_send_json($results);

		exit;

	} // end search_models;

	/**
	 * Search all models for Jumper.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function search_all_models() {

		$query = array_merge(wpdev_request('query', array()), array(
			'number' => 10000,
		));

		$results_user = array_map(function($item) {

			$item->model = 'user';

			$item->group = 'Users';

			$item->value = network_admin_url("user-edit.php?user_id={$item->ID}");

			return $item;

		}, $this->search_wordpress_users($query));

		$results_settings = array_map(function($item) {

			$item['model'] = 'setting';

			$item['group'] = 'Settings';

			$item['value'] = $item['url'];

			return $item;

		}, $this->search_WPDev_setting($query));

		$data = array_merge($results_user, $results_settings);

		/**
		 * Allow plugin developers to add more search models functions.
		 *
		 * @since 2.0.0
		 */
		$data_sources = apply_filters('wpdev_search_models_functions', array(
			'wpdev_get_customers',
			'wpdev_get_products',
			'wpdev_get_plans',
			'wpdev_get_domains',
			'wpdev_get_sites',
			'wpdev_get_memberships',
			'wpdev_get_payments',
			'wpdev_get_broadcasts',
			'wpdev_get_checkout_forms',
		));

		foreach ($data_sources as $function) {

			$results = call_user_func($function, $query);

			array_map(function($item) {

				$url = str_replace('_', '-', (string) $item->model);

				$item->value = wpdev_network_admin_url("wpdev-edit-{$url}", array(
					'id' => $item->get_id(),
				));

				$item->group = ucwords((string) $item->model) . 's';

				return $item;

			}, $results);

			$discount_codes = array_map(function($item) {

				$discount = $item->to_array();

				$discount['value'] = wpdev_network_admin_url('wpdev-edit-discount-code', array(
					'id' => $discount['id'],
				));

				$discount['group'] = 'Discount Codes';

				return $discount;

			}, wpdev_get_discount_codes($query));

			$data = array_merge($data, $results, $discount_codes);

		} // end foreach;

		wp_send_json($data);

	}  // end search_all_models;
	/**
	 * Search for WPDev settings to help customers find them.
	 *
	 * @since 2.0.0
	 *
	 * @param array $query Query arguments.
	 */
	public function search_WPDev_setting($query): array {

		$sections = \WPDevFramework\Settings::get_instance()->get_sections();

		$all_fields = array();

		foreach ($sections as $section_slug => $section) {

			$section['fields'] = array_map(function($item) use ($section, $section_slug) {

				$item['section'] = $section_slug;

				$item['section_title'] = wpdev_get_isset($section, 'title', '');

				$item['url'] = $this->settings_search_result_url( $section_slug, $item['setting_id'] );

				return $item;

			}, $section['fields']);

			$all_fields = array_merge($all_fields, $section['fields']);

		} // end foreach;

		$_settings = \WPDevFramework\Dependencies\Arrch\Arrch::find($all_fields, array(
			'sort_key' => 'title',
			'where'    => array(
				array('setting_id', '~', trim((string) $query['search'], '*')),
				array('type', '!=', 'header'),
			),
		));

		return array_values($_settings);

	} // end search_WPDev_setting;

	/**
	 * Handles the special case of searching native WP users.
	 *
	 * @since 2.0.0
	 *
	 * @param array $query Query arguments.
	 * @return array
	 */
	public function search_wordpress_users($query) {

		$results = get_users(array(
			'blog_id'        => 0,
			'search'         => '*' . $query['search'] . '*',
			'search_columns' => array(
				'ID', 'user_login', 'user_email', 'user_url', 'user_nicename', 'display_name',
			),
		));

		$results = array_map(function($item) {

			$item->data->user_pass = '';

			$item->data->avatar = get_avatar($item->data->user_email, 40, 'identicon', '', array(
				'force_display' => true,
				'class'         => 'wpdev-rounded-full wpdev-mr-3',
			));

			return $item->data;

		}, $results);

		return $results;

	} // end search_wordpress_users;

	/**
	 * Adds the selectize templates to the admin footer.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_selectize_templates() {

		$can_render = wpdev_current_user_can_admin( 'manage_network' )
			|| current_user_can( 'wpdev_read_settings' );

		if ( $can_render ) {
			wpdev_get_template( 'ui/selectize-templates' );
		}

	} // end render_selectize_templates;

	/**
	 * Build the admin URL for a settings search result.
	 *
	 * @since 2.7.0
	 *
	 * @param string $section_slug Settings section slug.
	 * @param string $setting_id   Setting field id.
	 * @return string
	 */
	protected function settings_search_result_url( $section_slug, $setting_id ) {

		if ( defined( 'WPDEV_PLAYGROUND_DIR' ) && 0 === strpos( (string) $section_slug, 'pg_' ) ) {
			$page_slug = 'wpdev-pg-settings-panel-builder';

			if ( ! empty( $_SERVER['HTTP_REFERER'] ) && preg_match( '/[?&]page=([^&]+)/', (string) $_SERVER['HTTP_REFERER'], $matches ) ) {
				$candidate = sanitize_key( $matches[1] );

				if ( 0 === strpos( $candidate, 'wpdev-pg-' ) ) {
					$page_slug = $candidate;
				}
			}

			if ( function_exists( 'wpdev_playground_panel_url' ) ) {
				$base = wpdev_playground_panel_url( $page_slug );
				$join = ( false !== strpos( $base, '?' ) ) ? '&' : '?';

				return $base . $join . 'tab=' . rawurlencode( (string) $section_slug ) . '#' . rawurlencode( (string) $setting_id );
			}
		}

		return wpdev_network_admin_url(
			'wpdev-settings',
			array(
				'tab' => $section_slug,
			)
		) . '#' . $setting_id;

	} // end settings_search_result_url;

} // end class Ajax;
