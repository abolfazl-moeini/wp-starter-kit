<?php
/**
 * Registry and atomic JSON storage for post meta advanced fields.
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.14.0
 */

namespace WPDevFramework\Modules\FieldBuilder;

defined( 'ABSPATH' ) || exit;

/**
 * Repeater, relationship, and group definitions stored as one meta row each.
 */
class Advanced_Fields_Registry {

	const MAX_ROWS         = 100;
	const MAX_RELATIONSHIP = 100;
	const MAX_FIELDS       = 32;
	const MAX_BYTES        = 262144;
	const MAX_DEPTH        = 8;

	/**
	 * @var array<string, array<string, mixed>>
	 */
	private static $repeaters = array();

	/**
	 * @var array<string, array<string, mixed>>
	 */
	private static $relationships = array();

	/**
	 * @var array<string, array<string, mixed>>
	 */
	private static $groups = array();

	/**
	 * Clear definitions. Used by tests.
	 *
	 * @return void
	 */
	public static function reset() {
		self::$repeaters      = array();
		self::$relationships  = array();
		self::$groups         = array();
	}

	/**
	 * @param string               $key    Field key.
	 * @param array<string, mixed> $schema Schema.
	 * @return bool
	 */
	public static function register_repeater( $key, array $schema ) {
		$key    = self::clean_key( $key );
		$fields = self::normalize_fields( isset( $schema['fields'] ) ? $schema['fields'] : array() );
		if ( '' === $key || array() === $fields ) {
			return false;
		}

		self::$repeaters[ $key ] = array(
			'key'        => $key,
			'title'      => self::label( $schema, $key ),
			'post_types' => self::normalize_screens( isset( $schema['post_types'] ) ? $schema['post_types'] : array() ),
			'context'    => self::context( isset( $schema['context'] ) ? $schema['context'] : 'normal' ),
			'priority'   => self::priority( isset( $schema['priority'] ) ? $schema['priority'] : 'default' ),
			'fields'     => $fields,
		);

		return true;
	}

	/**
	 * @param string               $key  Field key.
	 * @param array<string, mixed> $args Arguments.
	 * @return bool
	 */
	public static function register_relationship( $key, array $args ) {
		$key    = self::clean_key( $key );
		$target = array();
		if ( isset( $args['target'] ) ) {
			$target = self::normalize_screens( $args['target'] );
		} elseif ( isset( $args['target_cpt'] ) ) {
			$target = self::normalize_screens( (array) $args['target_cpt'] );
		}
		if ( '' === $key || array() === $target ) {
			return false;
		}

		$limit = isset( $args['limit'] ) ? (int) $args['limit'] : ( isset( $args['max'] ) ? (int) $args['max'] : 20 );

		self::$relationships[ $key ] = array(
			'key'        => $key,
			'title'      => self::label( $args, $key ),
			'post_types' => self::normalize_screens( isset( $args['post_types'] ) ? $args['post_types'] : array() ),
			'target'     => $target,
			'limit'      => max( 1, min( self::MAX_RELATIONSHIP, $limit ) ),
			'context'    => self::context( isset( $args['context'] ) ? $args['context'] : 'side' ),
			'priority'   => self::priority( isset( $args['priority'] ) ? $args['priority'] : 'default' ),
		);

		return true;
	}

	/**
	 * @param string               $key    Field key.
	 * @param array<string, mixed> $schema Schema.
	 * @return bool
	 */
	public static function register_group( $key, array $schema ) {
		$key    = self::clean_key( $key );
		$fields = self::normalize_fields( isset( $schema['fields'] ) ? $schema['fields'] : array() );
		if ( '' === $key || array() === $fields ) {
			return false;
		}

		self::$groups[ $key ] = array(
			'key'        => $key,
			'title'      => self::label( $schema, $key ),
			'post_types' => self::normalize_screens( isset( $schema['post_types'] ) ? $schema['post_types'] : array() ),
			'context'    => self::context( isset( $schema['context'] ) ? $schema['context'] : 'normal' ),
			'priority'   => self::priority( isset( $schema['priority'] ) ? $schema['priority'] : 'default' ),
			'fields'     => $fields,
		);

		return true;
	}

	/**
	 * Definitions that should render on a post type.
	 *
	 * @param string $post_type Post type.
	 * @return array<int, array<string, mixed>>
	 */
	public static function definitions_for_screen( $post_type ) {
		$post_type = self::clean_key( $post_type );
		$found     = array();
		foreach ( array( self::$repeaters, self::$groups, self::$relationships ) as $bucket ) {
			foreach ( $bucket as $schema ) {
				if ( in_array( $post_type, $schema['post_types'], true ) ) {
					$found[] = $schema;
				}
			}
		}
		return $found;
	}

	/**
	 * @param string $key     Field key.
	 * @param int    $post_id Post ID.
	 * @return array<int, array<string, mixed>>
	 */
	public static function get_repeater( $key, $post_id ) {
		$key = self::clean_key( $key );
		if ( ! isset( self::$repeaters[ $key ] ) ) {
			return array();
		}
		$raw = self::read_raw( (int) $post_id, 'repeater', $key );
		if ( ! is_array( $raw ) || self::is_list( $raw ) === false ) {
			return array();
		}
		return self::sanitize_repeater( $key, $raw );
	}

	/**
	 * @param string $key      Field key.
	 * @param int    $post_id  Post ID.
	 * @param bool   $as_posts Return WP_Post objects.
	 * @return array<int, int|object>
	 */
	public static function get_relationship( $key, $post_id, $as_posts = false ) {
		$key = self::clean_key( $key );
		if ( ! isset( self::$relationships[ $key ] ) ) {
			return array();
		}
		$schema = self::$relationships[ $key ];
		$raw    = self::read_raw( (int) $post_id, 'relationship', $key );
		$ids    = is_array( $raw ) ? Field_Relationship::sanitize_ids( $raw, $schema['target'], (int) $post_id, $schema['limit'] ) : array();
		if ( ! $as_posts ) {
			return $ids;
		}
		return Field_Relationship::posts_for( $ids );
	}

	/**
	 * @param string $key     Field key.
	 * @param int    $post_id Post ID.
	 * @return array<string, mixed>
	 */
	public static function get_group( $key, $post_id ) {
		$key = self::clean_key( $key );
		if ( ! isset( self::$groups[ $key ] ) ) {
			return array();
		}
		$raw = self::read_raw( (int) $post_id, 'group', $key );
		if ( ! is_array( $raw ) || self::is_list( $raw ) ) {
			return self::empty_group( $key );
		}
		return self::sanitize_group( $key, $raw );
	}

	/**
	 * @param string $key     Field key.
	 * @param int    $post_id Post ID.
	 * @param mixed  $default Default when the key is not registered.
	 * @return mixed
	 */
	public static function get_field( $key, $post_id, $default = null ) {
		$key = self::clean_key( $key );
		if ( isset( self::$repeaters[ $key ] ) ) {
			return self::get_repeater( $key, $post_id );
		}
		if ( isset( self::$relationships[ $key ] ) ) {
			return self::get_relationship( $key, $post_id, false );
		}
		if ( isset( self::$groups[ $key ] ) ) {
			return self::get_group( $key, $post_id );
		}
		return $default;
	}

	/**
	 * @param string                           $key     Field key.
	 * @param array<int, array<string, mixed>> $rows    Rows.
	 * @param int                              $post_id Post ID.
	 * @return bool
	 */
	public static function update_repeater( $key, array $rows, $post_id ) {
		$key = self::clean_key( $key );
		if ( ! isset( self::$repeaters[ $key ] ) || (int) $post_id <= 0 ) {
			return false;
		}
		return self::write_raw( (int) $post_id, self::meta_key( 'repeater', $key ), self::sanitize_repeater( $key, $rows ) );
	}

	/**
	 * @param string        $key      Field key.
	 * @param array<int, mixed> $ids  Related IDs.
	 * @param int           $post_id  Post ID.
	 * @return bool
	 */
	public static function update_relationship( $key, array $ids, $post_id ) {
		$key = self::clean_key( $key );
		if ( ! isset( self::$relationships[ $key ] ) || (int) $post_id <= 0 ) {
			return false;
		}
		$schema = self::$relationships[ $key ];
		$clean  = Field_Relationship::sanitize_ids( $ids, $schema['target'], (int) $post_id, $schema['limit'] );
		return self::write_raw( (int) $post_id, self::meta_key( 'relationship', $key ), $clean );
	}

	/**
	 * @param string               $key     Field key.
	 * @param array<string, mixed> $data    Values.
	 * @param int                  $post_id Post ID.
	 * @return bool
	 */
	public static function update_group( $key, array $data, $post_id ) {
		$key = self::clean_key( $key );
		if ( ! isset( self::$groups[ $key ] ) || (int) $post_id <= 0 ) {
			return false;
		}
		return self::write_raw( (int) $post_id, self::meta_key( 'group', $key ), self::sanitize_group( $key, $data ) );
	}

	/**
	 * Persist a posted map of field key => JSON string for one screen.
	 *
	 * Keys absent from the payload are left untouched.
	 *
	 * @param int                  $post_id   Post ID.
	 * @param string               $post_type Post type.
	 * @param array<string, mixed> $payload   Posted JSON strings.
	 * @return void
	 */
	public static function persist_payload( $post_id, $post_type, array $payload ) {
		$post_id   = (int) $post_id;
		$post_type = self::clean_key( $post_type );
		if ( $post_id <= 0 || '' === $post_type ) {
			return;
		}

		foreach ( $payload as $key => $raw ) {
			$key = self::clean_key( $key );
			if ( '' === $key || ! is_string( $raw ) || strlen( $raw ) > self::MAX_BYTES ) {
				continue;
			}
			$decoded = json_decode( $raw, true, self::MAX_DEPTH );
			if ( JSON_ERROR_NONE !== json_last_error() ) {
				continue;
			}

			if ( isset( self::$repeaters[ $key ] ) && self::on_screen( self::$repeaters[ $key ], $post_type ) && is_array( $decoded ) ) {
				self::write_raw( $post_id, self::meta_key( 'repeater', $key ), self::sanitize_repeater( $key, $decoded ) );
				continue;
			}
			if ( isset( self::$relationships[ $key ] ) && self::on_screen( self::$relationships[ $key ], $post_type ) && is_array( $decoded ) ) {
				$schema = self::$relationships[ $key ];
				$clean  = Field_Relationship::sanitize_ids( $decoded, $schema['target'], $post_id, $schema['limit'] );
				self::write_raw( $post_id, self::meta_key( 'relationship', $key ), $clean );
				continue;
			}
			if ( isset( self::$groups[ $key ] ) && self::on_screen( self::$groups[ $key ], $post_type ) && is_array( $decoded ) && ! self::is_list( $decoded ) ) {
				self::write_raw( $post_id, self::meta_key( 'group', $key ), self::sanitize_group( $key, $decoded ) );
			}
		}
	}

	/**
	 * @param string $type repeater|relationship|group.
	 * @param string $key  Field key.
	 * @return string
	 */
	public static function meta_key( $type, $key ) {
		$kind   = 'relationship' === $type ? 'rel' : ( 'group' === $type ? 'group' : 'repeater' );
		$prefix = apply_filters( 'wpdev_meta_field_key_prefix', '_wpdev_', $key, $type );
		$prefix = self::valid_prefix( $prefix ) ? $prefix : '_wpdev_';
		return $prefix . $kind . '_' . self::clean_key( $key );
	}

	/**
	 * @param string $key Field key.
	 * @return array<string, array<string, mixed>>|null
	 */
	public static function repeater_schema( $key ) {
		$key = self::clean_key( $key );
		return isset( self::$repeaters[ $key ] ) ? self::$repeaters[ $key ] : null;
	}

	/**
	 * @param string $key Field key.
	 * @return array<string, mixed>|null
	 */
	public static function relationship_schema( $key ) {
		$key = self::clean_key( $key );
		return isset( self::$relationships[ $key ] ) ? self::$relationships[ $key ] : null;
	}

	/**
	 * @param string $key Field key.
	 * @return array<string, mixed>|null
	 */
	public static function group_schema( $key ) {
		$key = self::clean_key( $key );
		return isset( self::$groups[ $key ] ) ? self::$groups[ $key ] : null;
	}

	/**
	 * @param string $key Repeater key.
	 * @param array  $rows Rows.
	 * @return array<int, array<string, mixed>>
	 */
	private static function sanitize_repeater( $key, array $rows ) {
		$fields = self::$repeaters[ $key ]['fields'];
		$clean  = array();
		foreach ( $rows as $row ) {
			if ( ! is_array( $row ) || self::is_list( $row ) ) {
				continue;
			}
			$clean[] = self::sanitize_record( $fields, $row );
			if ( count( $clean ) >= self::MAX_ROWS ) {
				break;
			}
		}
		return $clean;
	}

	/**
	 * @param string               $key  Group key.
	 * @param array<string, mixed> $data Values.
	 * @return array<string, mixed>
	 */
	private static function sanitize_group( $key, array $data ) {
		return self::sanitize_record( self::$groups[ $key ]['fields'], $data );
	}

	/**
	 * @param string $key Group key.
	 * @return array<string, mixed>
	 */
	private static function empty_group( $key ) {
		return self::sanitize_record( self::$groups[ $key ]['fields'], array() );
	}

	/**
	 * @param array<string, array<string, string>> $fields Field map.
	 * @param array<string, mixed>                 $data   Raw values.
	 * @return array<string, mixed>
	 */
	private static function sanitize_record( array $fields, array $data ) {
		$clean = array();
		foreach ( $fields as $id => $field ) {
			$raw            = isset( $data[ $id ] ) ? $data[ $id ] : '';
			$clean[ $id ]   = self::sanitize_scalar( $field['type'], $raw );
		}
		return $clean;
	}

	/**
	 * @param string $type  Subfield type.
	 * @param mixed  $value Raw value.
	 * @return int|string
	 */
	private static function sanitize_scalar( $type, $value ) {
		if ( is_array( $value ) || is_object( $value ) ) {
			return ( 'image' === $type || 'file' === $type ) ? 0 : '';
		}
		$value = is_scalar( $value ) ? (string) $value : '';

		if ( 'textarea' === $type && function_exists( 'sanitize_textarea_field' ) ) {
			return sanitize_textarea_field( $value );
		}
		if ( 'email' === $type && function_exists( 'sanitize_email' ) ) {
			return sanitize_email( $value );
		}
		if ( 'url' === $type && function_exists( 'esc_url_raw' ) ) {
			return (string) esc_url_raw( $value );
		}
		if ( 'number' === $type ) {
			return is_numeric( $value ) ? 0 + $value : '';
		}
		if ( 'image' === $type || 'file' === $type ) {
			return function_exists( 'absint' ) ? absint( $value ) : (int) $value;
		}
		if ( 'wysiwyg' === $type ) {
			return function_exists( 'wp_kses_post' ) ? (string) wp_kses_post( $value ) : strip_tags( $value );
		}
		if ( function_exists( 'sanitize_text_field' ) ) {
			return sanitize_text_field( $value );
		}
		return trim( strip_tags( $value ) );
	}

	/**
	 * @param int    $post_id Post ID.
	 * @param string $type    Storage family.
	 * @param string $key     Field key.
	 * @return mixed|null
	 */
	private static function read_raw( $post_id, $type, $key ) {
		if ( $post_id <= 0 || ! function_exists( 'get_post_meta' ) ) {
			return null;
		}
		$primary = self::meta_key( $type, $key );
		if ( self::meta_exists( $post_id, $primary ) ) {
			return self::decode_meta( get_post_meta( $post_id, $primary, true ) );
		}

		$prefixes = apply_filters( 'wpdev_meta_field_legacy_prefixes', array(), $key, $type );
		if ( ! is_array( $prefixes ) ) {
			return null;
		}
		$kind = 'relationship' === $type ? 'rel' : ( 'group' === $type ? 'group' : 'repeater' );
		foreach ( $prefixes as $prefix ) {
			if ( ! self::valid_prefix( $prefix ) ) {
				continue;
			}
			$alt = $prefix . $kind . '_' . $key;
			if ( $alt === $primary || ! self::meta_exists( $post_id, $alt ) ) {
				continue;
			}
			return self::decode_meta( get_post_meta( $post_id, $alt, true ) );
		}
		return null;
	}

	/**
	 * @param int    $post_id  Post ID.
	 * @param string $meta_key Meta key.
	 * @param mixed  $value    JSON-serializable value.
	 * @return bool
	 */
	private static function write_raw( $post_id, $meta_key, $value ) {
		if ( ! function_exists( 'update_post_meta' ) ) {
			return false;
		}
		$encoded = function_exists( 'wp_json_encode' ) ? wp_json_encode( $value ) : json_encode( $value );
		if ( ! is_string( $encoded ) || strlen( $encoded ) > self::MAX_BYTES ) {
			return false;
		}
		$stored = function_exists( 'wp_slash' ) ? wp_slash( $encoded ) : $encoded;
		return false !== update_post_meta( $post_id, $meta_key, $stored );
	}

	/**
	 * @param mixed $raw Stored meta.
	 * @return mixed|null
	 */
	private static function decode_meta( $raw ) {
		if ( is_array( $raw ) ) {
			return $raw;
		}
		if ( ! is_string( $raw ) || '' === $raw ) {
			return null;
		}
		$decoded = json_decode( $raw, true, self::MAX_DEPTH );
		if ( JSON_ERROR_NONE !== json_last_error() ) {
			return null;
		}
		return $decoded;
	}

	/**
	 * @param int    $post_id  Post ID.
	 * @param string $meta_key Meta key.
	 * @return bool
	 */
	private static function meta_exists( $post_id, $meta_key ) {
		if ( function_exists( 'metadata_exists' ) ) {
			return metadata_exists( 'post', $post_id, $meta_key );
		}
		if ( ! function_exists( 'get_post_meta' ) ) {
			return false;
		}
		$value = get_post_meta( $post_id, $meta_key, true );
		return '' !== $value && false !== $value && null !== $value;
	}

	/**
	 * @param array<string, mixed> $schema    Definition.
	 * @param string               $post_type Post type.
	 * @return bool
	 */
	private static function on_screen( array $schema, $post_type ) {
		return in_array( $post_type, $schema['post_types'], true );
	}

	/**
	 * @param mixed $prefix Prefix candidate.
	 * @return bool
	 */
	private static function valid_prefix( $prefix ) {
		return is_string( $prefix ) && 1 === preg_match( '/^_[a-z0-9_]+_$/', $prefix );
	}

	/**
	 * @param string $key Raw key.
	 * @return string
	 */
	private static function clean_key( $key ) {
		$key   = (string) $key;
		$clean = function_exists( 'sanitize_key' ) ? sanitize_key( $key ) : strtolower( (string) preg_replace( '/[^a-z0-9_\-]/', '', $key ) );
		if ( '' === $clean || $clean !== $key ) {
			return '';
		}
		return $clean;
	}

	/**
	 * @param mixed $fields Field map.
	 * @return array<string, array<string, string>>
	 */
	private static function normalize_fields( $fields ) {
		if ( ! is_array( $fields ) ) {
			return array();
		}
		$out = array();
		foreach ( $fields as $id => $config ) {
			if ( ! is_array( $config ) ) {
				continue;
			}
			$sub = self::clean_key( is_string( $id ) ? $id : '' );
			if ( '' === $sub ) {
				continue;
			}
			$type = isset( $config['type'] ) ? (string) $config['type'] : 'text';
			if ( ! in_array( $type, array( 'text', 'textarea', 'email', 'url', 'number', 'image', 'file', 'wysiwyg' ), true ) ) {
				continue;
			}
			$out[ $sub ] = array(
				'type'  => $type,
				'label' => isset( $config['label'] ) ? (string) $config['label'] : $sub,
			);
			if ( count( $out ) >= self::MAX_FIELDS ) {
				break;
			}
		}
		return $out;
	}

	/**
	 * @param mixed $types Post types.
	 * @return array<int, string>
	 */
	private static function normalize_screens( $types ) {
		$out = array();
		foreach ( (array) $types as $type ) {
			$clean = self::clean_key( $type );
			if ( '' !== $clean ) {
				$out[] = $clean;
			}
		}
		return array_values( array_unique( $out ) );
	}

	/**
	 * @param array<string, mixed> $schema Schema.
	 * @param string               $key    Fallback label.
	 * @return string
	 */
	private static function label( array $schema, $key ) {
		return isset( $schema['title'] ) ? (string) $schema['title'] : $key;
	}

	/**
	 * @param string $context Metabox context.
	 * @return string
	 */
	private static function context( $context ) {
		return in_array( $context, array( 'normal', 'side', 'advanced' ), true ) ? $context : 'normal';
	}

	/**
	 * @param string $priority Metabox priority.
	 * @return string
	 */
	private static function priority( $priority ) {
		return in_array( $priority, array( 'high', 'core', 'default', 'low' ), true ) ? $priority : 'default';
	}

	/**
	 * @param array<mixed> $value Decoded value.
	 * @return bool
	 */
	private static function is_list( array $value ) {
		if ( array() === $value ) {
			return true;
		}
		return array_keys( $value ) === range( 0, count( $value ) - 1 );
	}
}
