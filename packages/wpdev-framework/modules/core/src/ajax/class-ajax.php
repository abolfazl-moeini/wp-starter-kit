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

		// Also register normalized table_id (lowercase/sanitized).
		$sanitized_id = function_exists( 'sanitize_key' )
			? sanitize_key( strtolower( (string) $table_id ) )
			: strtolower( preg_replace( '/[^a-z0-9_-]/', '', (string) $table_id ) );
		if ( $sanitized_id && ! isset( self::$list_table_registry[ $sanitized_id ] ) ) {
			self::$list_table_registry[ $sanitized_id ] = $class_name;
		}

		$dashed = str_replace( '_', '-', $sanitized_id );
		if ( $dashed && ! isset( self::$list_table_registry[ $dashed ] ) ) {
			self::$list_table_registry[ $dashed ] = $class_name;
		}
		$underscored = str_replace( '-', '_', $sanitized_id );
		if ( $underscored && ! isset( self::$list_table_registry[ $underscored ] ) ) {
			self::$list_table_registry[ $underscored ] = $class_name;
		}

		// Also index by class short name so registration via page slug or custom ID
		// automatically resolves when the frontend sends the default get_table_id() (e.g. 'wheellisttable').
		if ( is_string( $class_name ) && '' !== $class_name ) {
			$pos        = strrchr( $class_name, '\\' );
			$short      = false !== $pos ? substr( $pos, 1 ) : $class_name;
			$default_id = function_exists( 'sanitize_key' )
				? sanitize_key( strtolower( (string) $short ) )
				: strtolower( preg_replace( '/[^a-z0-9_-]/', '', (string) $short ) );
			if ( $default_id && ! isset( self::$list_table_registry[ $default_id ] ) ) {
				self::$list_table_registry[ $default_id ] = $class_name;
			}
		}

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

		// Check aliases filter (e.g. mapping menu slugs or page slugs to table IDs)
		$aliases = function_exists( 'apply_filters' ) ? apply_filters( 'wpdev_list_table_aliases', array() ) : array();
		if ( is_array( $aliases ) && isset( $aliases[ $table_id ] ) ) {
			$target_id = $aliases[ $table_id ];
			if ( isset( self::$list_table_registry[ $target_id ] ) ) {
				return self::$list_table_registry[ $target_id ];
			}
		}

		$sanitized_id = function_exists( 'sanitize_key' )
			? sanitize_key( strtolower( (string) $table_id ) )
			: strtolower( preg_replace( '/[^a-z0-9_-]/', '', (string) $table_id ) );
		if ( isset( self::$list_table_registry[ $sanitized_id ] ) ) {
			return self::$list_table_registry[ $sanitized_id ];
		}

		$dashed = str_replace( '_', '-', $sanitized_id );
		if ( isset( self::$list_table_registry[ $dashed ] ) ) {
			return self::$list_table_registry[ $dashed ];
		}
		$underscored = str_replace( '-', '_', $sanitized_id );
		if ( isset( self::$list_table_registry[ $underscored ] ) ) {
			return self::$list_table_registry[ $underscored ];
		}

		// Check if any registered class has a matching short name or table id.
		foreach ( self::$list_table_registry as $reg_id => $reg_class ) {
			if ( is_string( $reg_class ) && '' !== $reg_class ) {
				$pos   = strrchr( $reg_class, '\\' );
				$short = false !== $pos ? substr( $pos, 1 ) : $reg_class;
				$candidate_id = function_exists( 'sanitize_key' )
					? sanitize_key( strtolower( (string) $short ) )
					: strtolower( preg_replace( '/[^a-z0-9_-]/', '', (string) $short ) );
				if ( $candidate_id === $sanitized_id ) {
					return $reg_class;
				}
			}
		}

		// Check List_Table_Registry if available.
		if ( class_exists( '\WPDevFramework\Modules\TableBuilder\List_Table_Registry', false ) ) {
			$entry = \WPDevFramework\Modules\TableBuilder\List_Table_Registry::get( $table_id );
			if ( ! empty( $entry['class'] ) && class_exists( $entry['class'] ) ) {
				return $entry['class'];
			}
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
					'capability_callback' => array( __CLASS__, 'user_can_search_models' ),
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
					'skip_nonce'          => true,
					'capability'          => '',
					'capability_callback' => static function () {
						return is_user_logged_in();
					},
				)
			);
			wpdev_register_ajax_handler(
				'wpdev_list_table_reorder_rows',
				array( $this, 'reorder_list_table_rows' ),
				array(
					'skip_nonce'          => true,
					'capability'          => '',
					'capability_callback' => static function () {
						return is_user_logged_in();
					},
				)
			);
		} else {
			add_action( 'wpdev_ajax_wpdev_search', array( $this, 'search_models' ) );
			add_action( 'wp_ajax_wpdev_list_table_fetch_ajax_results', array( $this, 'refresh_list_table' ) );
			add_action( 'wp_ajax_wpdev_list_table_reorder_rows', array( $this, 'reorder_list_table_rows' ) );
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

			// Gate 0: Two-Gate Nonce verification
			$canonical_id = method_exists( $table, 'get_table_id' ) ? $table->get_table_id() : $table_id;
			$nonce_key    = '_ajax_' . $table_id . '_nonce';
			$nonce        = function_exists( 'wpdev_request' )
				? (string) wpdev_request( $nonce_key, '' )
				: ( isset( $_REQUEST[ $nonce_key ] ) ? (string) $_REQUEST[ $nonce_key ] : '' );

			if ( '' === $nonce ) {
				$canonical_nonce_key = '_ajax_' . $canonical_id . '_nonce';
				$nonce = function_exists( 'wpdev_request' )
					? (string) wpdev_request( $canonical_nonce_key, '' )
					: ( isset( $_REQUEST[ $canonical_nonce_key ] ) ? (string) $_REQUEST[ $canonical_nonce_key ] : '' );
			}

			if ( '' === $nonce ) {
				$nonce = function_exists( 'wpdev_request' )
					? (string) wpdev_request( '_ajax_nonce', '' )
					: ( isset( $_REQUEST['_ajax_nonce'] ) ? (string) $_REQUEST['_ajax_nonce'] : '' );
			}

			if ( '' === $nonce ) {
				$nonce = function_exists( 'wpdev_request' )
					? (string) wpdev_request( '_wpnonce', '' )
					: ( isset( $_REQUEST['_wpnonce'] ) ? (string) $_REQUEST['_wpnonce'] : '' );
			}

			$nonce_actions = array(
				'_ajax_' . $table_id . '_nonce',
				'_ajax_' . $canonical_id . '_nonce',
				'wpdev_list_table_' . $table_id,
				'wpdev_list_table_' . $canonical_id,
				'wpdev-ajax-nonce',
			);

			$nonce_valid = false;
			if ( function_exists( 'wp_verify_nonce' ) && '' !== $nonce ) {
				foreach ( $nonce_actions as $action ) {
					if ( wp_verify_nonce( $nonce, $action ) ) {
						$nonce_valid = true;
						break;
					}
				}
			}

			if ( ! $nonce_valid ) {
				\WPDevFramework\Core\Ajax\Ajax_Response::forbidden( __( 'Invalid or missing nonce token.', 'wpdev' ) );
				return;
			}

			if ( ! method_exists( $table, 'user_can_ajax_refresh' ) || ! $table->user_can_ajax_refresh() ) {
				\WPDevFramework\Core\Ajax\Ajax_Response::forbidden();
				return;
			}

			$table->ajax_response();
			return;

		} // end if;

		do_action( 'wpdev_list_table_fetch_ajax_results', $table_id );

		// Unresolved table_id previously fell through to admin-ajax's bare "0",
		// which made list-tables-factory.js throw on response.column_headers.
		\WPDevFramework\Core\Ajax\Ajax_Response::error(
			__( 'List table not registered for ajax refresh.', 'wpdev' ),
			'list_table_unresolved',
			array( 'table_id' => $table_id ),
			404
		);

	} // end refresh_list_table;

	/**
	 * Handles AJAX row reordering for reorderable list tables.
	 *
	 * Two-Gate defense:
	 * 1. Origin verification via table-scoped nonce.
	 * 2. Privilege verification via $table->user_can_reorder().
	 *
	 * State Guard Invariant:
	 * Blocks reordering if table is filtered or sorted by another column.
	 *
	 * @since 2.15.0
	 * @return void
	 */
	public function reorder_list_table_rows() {

		$table_id = function_exists( 'wpdev_request' )
			? (string) wpdev_request( 'table_id', '' )
			: ( isset( $_REQUEST['table_id'] ) ? (string) $_REQUEST['table_id'] : '' );

		$full_class_name = $this->resolve_list_table_class( $table_id );

		if ( ! $full_class_name || ! class_exists( $full_class_name ) ) {
			\WPDevFramework\Core\Ajax\Ajax_Response::error(
				__( 'List table not registered for ajax refresh.', 'wpdev' ),
				'list_table_unresolved',
				array( 'table_id' => $table_id ),
				404
			);
			return;
		}

		$table = new $full_class_name();

		// Gate 0: Nonce verification
		$nonce = function_exists( 'wpdev_request' )
			? (string) wpdev_request( '_ajax_nonce', '' )
			: ( isset( $_REQUEST['_ajax_nonce'] ) ? (string) $_REQUEST['_ajax_nonce'] : '' );

		if ( '' === $nonce ) {
			$nonce = function_exists( 'wpdev_request' )
				? (string) wpdev_request( '_wpnonce', '' )
				: ( isset( $_REQUEST['_wpnonce'] ) ? (string) $_REQUEST['_wpnonce'] : '' );
		}

		$canonical_id = method_exists( $table, 'get_table_id' ) ? $table->get_table_id() : $table_id;
		$nonce_actions = array(
			'_ajax_' . $table_id . '_nonce',
			'wpdev_list_table_' . $table_id,
			'wpdev_list_table_' . $canonical_id,
			'wpdev_tickets_departments_reorder',
			'wpdev-ajax-nonce',
		);

		$nonce_valid = false;
		if ( function_exists( 'wp_verify_nonce' ) && '' !== $nonce ) {
			foreach ( $nonce_actions as $action ) {
				if ( false !== wp_verify_nonce( $nonce, $action ) ) {
					$nonce_valid = true;
					break;
				}
			}
		}

		if ( ! $nonce_valid ) {
			\WPDevFramework\Core\Ajax\Ajax_Response::forbidden( __( 'Invalid security token.', 'wpdev' ) );
			return;
		}

		// Gate 1: Privilege verification
		$can_reorder = method_exists( $table, 'user_can_reorder' )
			? $table->user_can_reorder()
			: ( method_exists( $table, 'user_can_ajax_refresh' ) ? $table->user_can_ajax_refresh() : current_user_can( 'manage_options' ) );

		if ( ! $can_reorder ) {
			\WPDevFramework\Core\Ajax\Ajax_Response::forbidden( __( 'You do not have permission to reorder items in this table.', 'wpdev' ) );
			return;
		}

		// State Guard Invariant: disallow manual reorder while filtered/sorted
		if ( method_exists( $table, 'is_reorder_allowed' ) && ! $table->is_reorder_allowed() ) {
			\WPDevFramework\Core\Ajax\Ajax_Response::error(
				__( 'Reordering is disabled while search filter or custom column sort is active.', 'wpdev' ),
				'reorder_disallowed',
				array(),
				400
			);
			return;
		}

		$raw_ids = function_exists( 'wpdev_request' )
			? wpdev_request( 'ordered_ids', array() )
			: ( isset( $_REQUEST['ordered_ids'] ) ? $_REQUEST['ordered_ids'] : array() );

		if ( ! is_array( $raw_ids ) || empty( $raw_ids ) ) {
			\WPDevFramework\Core\Ajax\Ajax_Response::error(
				__( 'Invalid or empty ordered IDs provided.', 'wpdev' ),
				'invalid_ordered_ids',
				array(),
				400
			);
			return;
		}

		$ordered_ids = array_filter( array_map( 'absint', $raw_ids ) );

		if ( empty( $ordered_ids ) ) {
			\WPDevFramework\Core\Ajax\Ajax_Response::error(
				__( 'Invalid or empty ordered IDs provided.', 'wpdev' ),
				'invalid_ordered_ids',
				array(),
				400
			);
			return;
		}

		$page     = function_exists( 'wpdev_request' ) ? max( 1, (int) wpdev_request( 'paged', 1 ) ) : 1;
		$per_page = 20;
		if ( method_exists( $table, 'get_items_per_page' ) && method_exists( $table, 'get_per_page_option_name' ) ) {
			$per_page = (int) $table->get_items_per_page( $table->get_per_page_option_name(), 20 );
		}
		$page_offset = ( $page - 1 ) * $per_page;

		if ( method_exists( $table, 'reorder_items' ) ) {
			$result = $table->reorder_items( $ordered_ids, $page_offset );

			if ( is_wp_error( $result ) ) {
				\WPDevFramework\Core\Ajax\Ajax_Response::error(
					$result->get_error_message(),
					$result->get_error_code(),
					$result->get_error_data(),
					400
				);
				return;
			}
		} else {
			\WPDevFramework\Core\Ajax\Ajax_Response::error(
				__( 'List table does not implement reorder_items.', 'wpdev' ),
				'reorder_not_implemented',
				array(),
				501
			);
			return;
		}

		do_action( 'wpdev_list_table_rows_reordered', $table_id, $ordered_ids, $page_offset );

		\WPDevFramework\Core\Ajax\Ajax_Response::success(
			array(
				'message'     => __( 'Order updated successfully.', 'wpdev' ),
				'ordered_ids' => $ordered_ids,
			)
		);

	} // end reorder_list_table_rows;

	/**
	 * Determine whether the current user has permission to search models.
	 *
	 * Least privilege rules:
	 * 1. Network admins, settings admins (wpdev_read_settings), and site admins (manage_options)
	 *    can search all models including settings and omnibox.
	 * 2. Setting search ('setting') and omnibox search ('all') require administrative privileges.
	 * 3. Post type searches (products, posts, pages, CPTs): allowed if user has capability to edit
	 *    that post type, or general content editing capabilities (edit_posts, edit_products, edit_pages).
	 * 4. User model searches ('user'): allowed if user has content editing capabilities or list_users.
	 * 5. Third parties can grant or revoke access via the 'wpdev_search_capability_check' filter.
	 *
	 * @since 2.13.5
	 *
	 * @return bool
	 */
	public static function user_can_search_models(): bool {

		if ( function_exists( 'wpdev_current_user_can_admin' ) && wpdev_current_user_can_admin( 'manage_network' ) ) {
			return true;
		}

		if ( function_exists( 'current_user_can' ) ) {
			if ( current_user_can( 'wpdev_read_settings' ) || current_user_can( 'manage_options' ) ) {
				return true;
			}
		}

		$model = function_exists( 'wpdev_request' )
			? (string) wpdev_request( 'model', '' )
			: ( isset( $_REQUEST['model'] ) ? (string) $_REQUEST['model'] : '' );

		// Setting search and omnibox jumper search require administrative settings privileges.
		if ( 'setting' === $model || 'all' === $model ) {
			return false;
		}

		if ( function_exists( 'current_user_can' ) ) {
			// Check specific post type edit capability if model exists.
			if ( '' !== $model && function_exists( 'post_type_exists' ) && post_type_exists( $model ) ) {
				$pt_obj = get_post_type_object( $model );
				if ( $pt_obj && ! empty( $pt_obj->cap->edit_posts ) && current_user_can( $pt_obj->cap->edit_posts ) ) {
					return true;
				}
			}

			// User model search requires administrative capabilities (DEF-026).
			if ( 'user' === $model ) {
				return current_user_can( 'list_users' )
					|| current_user_can( 'manage_options' )
					|| current_user_can( 'manage_network' );
			}

			// General content editors / managers (posts, pages, products).
			if ( current_user_can( 'edit_posts' )
				|| current_user_can( 'edit_products' )
				|| current_user_can( 'edit_pages' ) ) {
				return true;
			}
		}

		return (bool) apply_filters( 'wpdev_search_capability_check', false, $model );

	} // end user_can_search_models;

	/**
	 * Accessor for the capability callback used by registrations and tests.
	 *
	 * @since 2.13.5
	 * @return callable
	 */
	public static function get_search_capability_callback(): callable {
		return array( __CLASS__, 'user_can_search_models' );
	}

	/**
	 * Search models using our ajax endpoint.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function search_models() {

		if ( ! self::user_can_search_models() ) {
			if ( class_exists( 'WPDevFramework\\Core\\Ajax\\Ajax_Response' ) ) {
				\WPDevFramework\Core\Ajax\Ajax_Response::forbidden();
			}
			wp_die( -1, 403 );
		}

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

		if ( ! empty( $query['search'] ) && is_string( $query['search'] ) ) {
			$query['search'] = strtr(
				$query['search'],
				array(
					'ي' => 'ی',
					'ك' => 'ک',
					'ة' => 'ه',
					'ؤ' => 'و',
					'إ' => 'ا',
					'أ' => 'ا',
					'ٱ' => 'ا',
				)
			);
		}

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

		} elseif (post_type_exists((string) $args['model'])) {

			/*
			 * Any registered post type (page, professors, …) can be used as
			 * data-model on a WPDev `model` field — same selectizer contract.
			 */
			$post_query = array(
				'post_type'      => $args['model'],
				'post_status'    => 'publish',
				'posts_per_page' => 20,
				'orderby'        => 'title',
				'order'          => 'ASC',
			);

			if (!empty($query['search'])) {

				$post_query['s'] = trim((string) $query['search'], '*');

			} // end if;

			if (!empty($query['id__not_in'])) {

				$post_query['post__not_in'] = array_map('absint', (array) $query['id__not_in']);

			} // end if;

			if (!empty($query['id__in'])) {

				$post_query['post__in']       = array_map('absint', (array) $query['id__in']);
				$post_query['posts_per_page'] = -1;

			} // end if;

			$results = get_posts($post_query);

			$results = array_map(function($post) use ($args) {
				$item = (array) $post;
				$item['id']              = $post->ID;
				$item['ID']              = $post->ID;
				$item['name']            = $post->post_title;
				$item['title']           = $post->post_title;
				$item['post_title']      = $post->post_title;
				$item['type']            = '';
				$item['formatted_price'] = '';
				$item['image']           = '';

				if ($args['model'] === 'product' && function_exists('wc_get_product')) {
					$product = wc_get_product($post->ID);
					if ($product) {
						$item['type'] = $product->get_type();
						$price_html = $product->get_price_html();
						$item['formatted_price'] = $price_html ? wp_strip_all_tags($price_html) : '';
						$thumb_id = $product->get_image_id();
						if ($thumb_id) {
							$thumb_url = wp_get_attachment_image_url($thumb_id, 'thumbnail');
							if ($thumb_url) {
								$item['image'] = '<img src="' . esc_url($thumb_url) . '" class="wpdev-radius-full wpdev-mar-r-3" style="width:32px;height:32px;object-fit:cover;" />';
							}
						}
					}
				}

				return (object) $item;
			}, $results);

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
		$data_sources = apply_filters('wpdev_search_models_functions', array());

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

			$data = array_merge($data, $results);

		} // end foreach;

		$data = array_merge($data, apply_filters('wpdev_search_models_extra_results', array(), $query));

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

		$_settings = \WPDev\Dependencies\Arrch\Arrch::find($all_fields, array(
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

		if ( function_exists( 'current_user_can' ) ) {
			if ( ! current_user_can( 'list_users' ) && ! current_user_can( 'manage_options' ) && ! current_user_can( 'manage_network' ) && ! current_user_can( 'wpdev_read_settings' ) ) {
				return array();
			}
		}

		$blog_id = function_exists( 'get_current_blog_id' ) ? get_current_blog_id() : 0;

		$results = get_users(array(
			'blog_id'        => $blog_id,
			'number'         => 20,
			'search'         => '*' . $query['search'] . '*',
			'search_columns' => array(
				'ID', 'user_login', 'user_email', 'user_url', 'user_nicename', 'display_name',
			),
		));

		$results = array_map(function($item) {

			$item->data->user_pass = '';

			$escape_fn = function_exists( 'esc_html' ) ? 'esc_html' : static function( $v ) {
				return htmlspecialchars( (string) $v, ENT_QUOTES, 'UTF-8' );
			};

			$item->data->display_name  = $escape_fn( $item->data->display_name );
			$item->data->user_nicename = $escape_fn( $item->data->user_nicename );
			$item->data->user_login    = $escape_fn( $item->data->user_login );
			$item->data->user_email    = $escape_fn( $item->data->user_email );

			$avatar_html = get_avatar($item->data->user_email, 40, 'identicon', '', array(
				'force_display' => true,
				'class'         => 'wpdev-radius-full wpdev-mar-r-3',
			));
			$item->data->avatar = function_exists( 'wp_kses_post' ) ? wp_kses_post( $avatar_html ) : $avatar_html;

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

		/*
		 * When selectizer is on the page (list/edit model fields), always print
		 * templates. The old network/settings-only gate hid #wpdev-template-*
		 * on site-admin screens and made _.template(undefined) throw after
		 * wpdev_search returned CPT results.
		 */
		$selectizer_loaded = wp_script_is( 'wpdev-selectizer', 'enqueued' )
			|| wp_script_is( 'wpdev-selectizer', 'done' );

		$can_render = $selectizer_loaded
			|| wpdev_current_user_can_admin( 'manage_network' )
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

		$custom = apply_filters( 'wpdev_settings_search_result_url', null, $section_slug, $setting_id );

		if ( null !== $custom && is_string( $custom ) && '' !== $custom ) {
			return $custom;
		}

		return wpdev_network_admin_url(
			'wpdev-settings',
			array(
				'tab' => $section_slug,
			)
		) . '#' . $setting_id;

	} // end settings_search_result_url;

} // end class Ajax;
