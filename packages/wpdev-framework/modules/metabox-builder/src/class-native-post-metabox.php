<?php
/**
 * Classic and Gutenberg metabox driver for advanced post fields.
 *
 * Saves only when the edit screen posts this metabox. Quick Edit, bulk edit,
 * autosave, revisions, and REST updates without the metabox form do not write.
 *
 * @package WPDevFramework\Modules\MetaboxBuilder
 * @since   2.14.0
 */

namespace WPDevFramework\Modules\MetaboxBuilder;

use WPDevFramework\Modules\FieldBuilder\Advanced_Fields_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Renders one metabox per registered field and stores its JSON payload.
 */
class Native_Post_Metabox {

	/**
	 * Whether the per-post nonce was printed.
	 *
	 * @var bool
	 */
	private static $nonce_sent = false;

	/**
	 * @var bool
	 */
	private static $booted = false;

	/**
	 * @return void
	 */
	public static function init() {
		if ( self::$booted ) {
			return;
		}
		self::$booted = true;
		add_action( 'add_meta_boxes', array( __CLASS__, 'register_boxes' ), 20 );
		add_action( 'save_post', array( __CLASS__, 'save' ), 10, 2 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
	}

	/**
	 * Reset request-local render state. Used by tests.
	 *
	 * @return void
	 */
	public static function reset() {
		self::$nonce_sent = false;
	}

	/**
	 * @return void
	 */
	public static function register_boxes() {
		if ( ! function_exists( 'add_meta_box' ) || ! function_exists( 'get_post_types' ) ) {
			return;
		}
		$types = get_post_types( array(), 'names' );
		if ( ! is_array( $types ) ) {
			return;
		}
		foreach ( $types as $post_type ) {
			foreach ( Advanced_Fields_Registry::definitions_for_screen( $post_type ) as $schema ) {
				add_meta_box(
					'wpdev_advanced_' . $schema['key'],
					$schema['title'],
					array( __CLASS__, 'render' ),
					$post_type,
					$schema['context'],
					$schema['priority'],
					array( 'key' => $schema['key'] )
				);
			}
		}
	}

	/**
	 * @param \WP_Post             $post Post.
	 * @param array<string, mixed> $box  Metabox args.
	 * @return void
	 */
	public static function render( $post, $box ) {
		if ( ! is_object( $post ) || empty( $post->ID ) ) {
			return;
		}
		$key = isset( $box['args']['key'] ) ? (string) $box['args']['key'] : '';
		self::nonce_field( (int) $post->ID );

		$repeater = Advanced_Fields_Registry::repeater_schema( $key );
		if ( is_array( $repeater ) ) {
			$rows = Advanced_Fields_Registry::get_repeater( $key, (int) $post->ID );
			self::include_view(
				'field-repeater-native.php',
				array(
					'field_key' => $key,
					'schema'    => $repeater,
					'rows'      => $rows,
					'json'      => self::encode( $rows ),
				)
			);
			return;
		}

		$group = Advanced_Fields_Registry::group_schema( $key );
		if ( is_array( $group ) ) {
			$data = Advanced_Fields_Registry::get_group( $key, (int) $post->ID );
			self::include_view(
				'field-group-native.php',
				array(
					'field_key' => $key,
					'schema'    => $group,
					'data'      => $data,
					'json'      => self::encode( $data ),
				)
			);
			return;
		}

		$relationship = Advanced_Fields_Registry::relationship_schema( $key );
		if ( is_array( $relationship ) ) {
			$ids = Advanced_Fields_Registry::get_relationship( $key, (int) $post->ID, false );
			self::include_view(
				'field-relationship.php',
				array(
					'field_key'  => $key,
					'schema'     => $relationship,
					'ids'        => $ids,
					'json'       => self::encode( $ids ),
					'candidates' => self::candidates( $relationship, (int) $post->ID, $ids ),
				)
			);
		}
	}

	/**
	 * @param int          $post_id Post ID.
	 * @param \WP_Post|null $post   Post.
	 * @return void
	 */
	public static function save( $post_id, $post = null ) {
		$post_id = (int) $post_id;
		if ( $post_id <= 0 || ! isset( $_POST['wpdev_advanced_fields_nonce'] ) ) {
			return;
		}
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( function_exists( 'wp_is_post_revision' ) && wp_is_post_revision( $post_id ) ) {
			return;
		}
		if ( function_exists( 'wp_is_post_autosave' ) && wp_is_post_autosave( $post_id ) ) {
			return;
		}

		$nonce = function_exists( 'wp_unslash' ) ? wp_unslash( $_POST['wpdev_advanced_fields_nonce'] ) : $_POST['wpdev_advanced_fields_nonce'];
		$nonce = function_exists( 'sanitize_text_field' ) ? sanitize_text_field( $nonce ) : (string) $nonce;
		if ( ! function_exists( 'wp_verify_nonce' ) || ! wp_verify_nonce( $nonce, 'wpdev_save_advanced_fields_' . $post_id ) ) {
			return;
		}
		if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		if ( ! isset( $_POST['wpdev_advanced_fields'] ) || ! is_array( $_POST['wpdev_advanced_fields'] ) ) {
			return;
		}

		$post_type = '';
		if ( is_object( $post ) && isset( $post->post_type ) ) {
			$post_type = (string) $post->post_type;
		} elseif ( function_exists( 'get_post_type' ) ) {
			$post_type = (string) get_post_type( $post_id );
		}

		$payload = function_exists( 'wp_unslash' ) ? wp_unslash( $_POST['wpdev_advanced_fields'] ) : $_POST['wpdev_advanced_fields'];
		Advanced_Fields_Registry::persist_payload( $post_id, $post_type, is_array( $payload ) ? $payload : array() );
	}

	/**
	 * @param string $hook Admin page hook.
	 * @return void
	 */
	public static function enqueue( $hook ) {
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}
		if ( ! defined( 'WPDEV_PLUGIN_URL' ) || ! function_exists( 'wp_enqueue_script' ) ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		$type   = is_object( $screen ) && isset( $screen->post_type ) ? $screen->post_type : '';
		if ( '' === $type || array() === Advanced_Fields_Registry::definitions_for_screen( $type ) ) {
			return;
		}

		$js  = WPDEV_PLUGIN_DIR . 'modules/field-builder/assets/js/advanced-fields-runtime.js';
		$css = WPDEV_PLUGIN_DIR . 'modules/field-builder/assets/css/advanced-fields.css';
		$ver = defined( 'WPDEV_VERSION' ) ? WPDEV_VERSION : false;
		wp_enqueue_style( 'wpdev-advanced-fields', WPDEV_PLUGIN_URL . 'modules/field-builder/assets/css/advanced-fields.css', array(), is_readable( $css ) ? (string) filemtime( $css ) : $ver );
		wp_enqueue_script( 'wpdev-advanced-fields', WPDEV_PLUGIN_URL . 'modules/field-builder/assets/js/advanced-fields-runtime.js', array(), is_readable( $js ) ? (string) filemtime( $js ) : $ver, true );
	}

	/**
	 * @param int $post_id Post ID.
	 * @return void
	 */
	private static function nonce_field( $post_id ) {
		if ( self::$nonce_sent || ! function_exists( 'wp_nonce_field' ) ) {
			return;
		}
		self::$nonce_sent = true;
		wp_nonce_field( 'wpdev_save_advanced_fields_' . (int) $post_id, 'wpdev_advanced_fields_nonce' );
	}

	/**
	 * @param string               $file View filename.
	 * @param array<string, mixed> $vars Template variables.
	 * @return void
	 */
	private static function include_view( $file, array $vars ) {
		$path = dirname( __DIR__, 2 ) . '/field-builder/views/admin-pages/fields/' . $file;
		if ( ! is_readable( $path ) ) {
			return;
		}
		extract( $vars, EXTR_SKIP ); // phpcs:ignore WordPress.PHP.DontExtract.extract_extract -- view scope.
		include $path;
	}

	/**
	 * @param mixed $value Value.
	 * @return string
	 */
	private static function encode( $value ) {
		$json = function_exists( 'wp_json_encode' ) ? wp_json_encode( $value ) : json_encode( $value );
		return is_string( $json ) ? $json : '[]';
	}

	/**
	 * @param array<string, mixed> $schema   Relationship schema.
	 * @param int                  $post_id  Current post.
	 * @param array<int, int>      $selected Selected IDs.
	 * @return array<int, object>
	 */
	private static function candidates( array $schema, $post_id, array $selected ) {
		if ( ! function_exists( 'get_posts' ) ) {
			return array();
		}
		$query = array(
			'post_type'              => $schema['target'],
			'post_status'            => 'publish',
			'posts_per_page'         => 30,
			'post__not_in'           => array( $post_id ),
			'orderby'                => 'date',
			'order'                  => 'DESC',
			'no_found_rows'          => true,
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
		);
		$posts = get_posts( $query );
		if ( ! is_array( $posts ) ) {
			$posts = array();
		}
		if ( array() !== $selected && function_exists( 'get_post' ) ) {
			$have = array();
			foreach ( $posts as $post ) {
				if ( is_object( $post ) && isset( $post->ID ) ) {
					$have[ (int) $post->ID ] = true;
				}
			}
			foreach ( $selected as $id ) {
				if ( isset( $have[ (int) $id ] ) ) {
					continue;
				}
				$post = get_post( (int) $id );
				if ( is_object( $post ) ) {
					$posts[] = $post;
				}
			}
		}
		return $posts;
	}
}
