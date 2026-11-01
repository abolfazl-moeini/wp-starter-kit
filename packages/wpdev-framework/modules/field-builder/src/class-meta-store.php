<?php
/**
 * Core atomic JSON and dual-read meta storage engine.
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.14.0
 */

namespace WPDevFramework\Modules\FieldBuilder;

defined( 'ABSPATH' ) || exit;

/**
 * Enterprise Single-Row JSON meta storage with dual-read legacy EAV fallback
 * and non-destructive sibling key protection.
 */
class Meta_Store {

	/**
	 * Maximum allowed bytes for single meta row payload (256 KB).
	 */
	const MAX_BYTES = 262144;

	/**
	 * Read meta with dual-read fallback: modern JSON first, legacy discrete rows second.
	 *
	 * @param int                  $post_id    Post ID.
	 * @param string               $field_name Field name.
	 * @param array<string, mixed> $options    Read options.
	 * @return mixed
	 */
	public static function get_meta( int $post_id, string $field_name, array $options = array() ) {
		if ( $post_id <= 0 || '' === $field_name ) {
			return isset( $options['default'] ) ? $options['default'] : null;
		}

		$meta_exists = self::meta_row_exists( $post_id, $field_name );

		if ( $meta_exists ) {
			$raw = get_post_meta( $post_id, $field_name, true );

			// Check for modern Single-Row JSON payload
			if ( is_string( $raw ) && '' !== $raw ) {
				$trimmed = trim( $raw );
				if ( 0 === strpos( $trimmed, '[' ) || 0 === strpos( $trimmed, '{' ) ) {
					$decoded = json_decode( $trimmed, true );
					if ( JSON_ERROR_NONE === json_last_error() ) {
						return $decoded;
					}

					if ( function_exists( 'error_log' ) ) {
						error_log(
							sprintf(
								'[WPDev/Meta_Store] Corrupted JSON payload for field "%s" on post %d. Falling back to discrete rows.',
								$field_name,
								$post_id
							)
						);
					}
				}
			}

			// Check for legacy discrete rows before assuming scalar is the final data
			$legacy_rows = self::read_discrete_rows( $post_id, $field_name );
			if ( ! empty( $legacy_rows ) ) {
				return $legacy_rows;
			}

			// If scalar or boolean stored, return verbatim without applying default
			return $raw;
		}

		// Fallback: look for legacy discrete EAV rows (e.g. syllabus_0_title when primary key was missing)
		$legacy_rows = self::read_discrete_rows( $post_id, $field_name );
		if ( ! empty( $legacy_rows ) ) {
			return $legacy_rows;
		}

		// If meta row existed (even if empty or false), respect it
		if ( $meta_exists ) {
			return get_post_meta( $post_id, $field_name, true );
		}

		// Check for default filter
		$filter_name = "wpdev_field_default_value_{$field_name}";
		if ( function_exists( 'apply_filters' ) ) {
			$default_val = isset( $options['default'] ) ? $options['default'] : null;
			return apply_filters( $filter_name, $default_val, $post_id );
		}

		return isset( $options['default'] ) ? $options['default'] : null;
	}

	/**
	 * Update meta atomically. Writes JSON payload with wp_slash, verifies checksum,
	 * and safely prunes legacy discrete rows without touching sibling fields.
	 *
	 * @param int                  $post_id    Post ID.
	 * @param string               $field_name Field name.
	 * @param mixed                $value      Data value.
	 * @param array<string, mixed> $options    Update options.
	 * @return bool
	 */
	public static function update_meta( int $post_id, string $field_name, $value, array $options = array() ): bool {
		if ( $post_id <= 0 || '' === $field_name ) {
			return false;
		}

		$format = isset( $options['format'] ) ? (string) $options['format'] : ( is_array( $value ) ? 'json' : 'scalar' );

		if ( 'json' === $format ) {
			$clean_value = is_array( $value ) ? array_values( $value ) : $value;
			$encoded     = function_exists( 'wp_json_encode' )
				? wp_json_encode( $clean_value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES )
				: json_encode( $clean_value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );

			if ( false === $encoded || strlen( (string) $encoded ) > self::MAX_BYTES ) {
				return false;
			}

			$expected_checksum = hash( 'sha256', (string) $encoded );
			$slashed           = function_exists( 'wp_slash' ) ? wp_slash( $encoded ) : addslashes( (string) $encoded );

			$saved = update_post_meta( $post_id, $field_name, $slashed );
			if ( false === $saved ) {
				return false;
			}

			// Verify checksum after save to guarantee zero corruption
			$read_back       = get_post_meta( $post_id, $field_name, true );
			$actual_checksum = hash( 'sha256', (string) $read_back );

			if ( ! hash_equals( $expected_checksum, $actual_checksum ) ) {
				if ( function_exists( 'error_log' ) ) {
					error_log( sprintf( '[WPDev/Meta_Store] Checksum mismatch on post %d for field "%s".', $post_id, $field_name ) );
				}
				return false;
			}

			// Persist field key schema reference if provided
			if ( ! empty( $options['field_key'] ) ) {
				update_post_meta( $post_id, '_' . $field_name, (string) $options['field_key'] );
			}

			// Clean legacy discrete rows only after verified save
			if ( ! empty( $options['clean_legacy'] ) ) {
				self::delete_discrete_rows( $post_id, $field_name );
			}

			return true;
		}

		// Scalar persistence
		if ( ! empty( $options['field_key'] ) ) {
			update_post_meta( $post_id, '_' . $field_name, (string) $options['field_key'] );
		}

		return false !== update_post_meta( $post_id, $field_name, $value );
	}

	/**
	 * Delete meta and optionally its legacy discrete rows.
	 *
	 * @param int                  $post_id    Post ID.
	 * @param string               $field_name Field name.
	 * @param array<string, mixed> $options    Delete options.
	 * @return bool
	 */
	public static function delete_meta( int $post_id, string $field_name, array $options = array() ): bool {
		if ( $post_id <= 0 || '' === $field_name ) {
			return false;
		}

		delete_post_meta( $post_id, $field_name );
		delete_post_meta( $post_id, '_' . $field_name );

		if ( ! empty( $options['clean_legacy'] ) ) {
			self::delete_discrete_rows( $post_id, $field_name );
		}

		return true;
	}

	/**
	 * Delete discrete legacy rows matching {$field_name}_{\d+}_* and _{$field_name}_{\d+}_*
	 * with strict non-destructive sibling protection (does NOT touch fields like faq_category).
	 *
	 * @param int    $post_id    Post ID.
	 * @param string $field_name Field name.
	 * @return void
	 */
	public static function delete_discrete_rows( int $post_id, string $field_name ): void {
		if ( $post_id <= 0 || '' === $field_name ) {
			return;
		}

		$all_meta = self::get_all_post_meta_keys( $post_id );
		// Sibling protection pattern: must match field_name followed by underscore and numeric index
		$pattern = '/^(_)?' . preg_quote( $field_name, '/' ) . '_(\d+)(_|$)/';

		foreach ( $all_meta as $key ) {
			if ( preg_match( $pattern, (string) $key ) ) {
				delete_post_meta( $post_id, $key );
			}
		}
	}

	/**
	 * Read legacy discrete rows for a field (e.g. syllabus_0_title).
	 *
	 * @param int    $post_id    Post ID.
	 * @param string $field_name Field name.
	 * @return array<int, array<string, mixed>>
	 */
	private static function read_discrete_rows( int $post_id, string $field_name ): array {
		$all_entries = self::get_all_post_meta_entries( $post_id );
		$pattern     = '/^' . preg_quote( $field_name, '/' ) . '_(\d+)_(.+)$/';
		$rows        = array();

		foreach ( $all_entries as $key => $val ) {
			if ( preg_match( $pattern, (string) $key, $matches ) ) {
				$idx      = (int) $matches[1];
				$sub_name = $matches[2];
				$rows[ $idx ][ $sub_name ] = $val;
			}
		}

		if ( empty( $rows ) ) {
			return array();
		}

		ksort( $rows );
		return array_values( $rows );
	}

	/**
	 * Check whether a meta key exists for a post.
	 *
	 * @param int    $post_id  Post ID.
	 * @param string $meta_key Meta key.
	 * @return bool
	 */
	private static function meta_row_exists( int $post_id, string $meta_key ): bool {
		if ( function_exists( 'metadata_exists' ) ) {
			return metadata_exists( 'post', $post_id, $meta_key );
		}

		global $GLOBALS;
		if ( isset( $GLOBALS['wpdev_test_meta'][ $post_id ] ) ) {
			return array_key_exists( $meta_key, $GLOBALS['wpdev_test_meta'][ $post_id ] );
		}

		$val = get_post_meta( $post_id, $meta_key, true );
		return '' !== $val && null !== $val;
	}

	/**
	 * Get all meta keys for a post.
	 *
	 * @param int $post_id Post ID.
	 * @return string[]
	 */
	private static function get_all_post_meta_keys( int $post_id ): array {
		global $GLOBALS, $wpdb;

		if ( isset( $GLOBALS['wpdev_test_meta'][ $post_id ] ) && is_array( $GLOBALS['wpdev_test_meta'][ $post_id ] ) ) {
			return array_keys( $GLOBALS['wpdev_test_meta'][ $post_id ] );
		}

		if ( is_object( $wpdb ) && method_exists( $wpdb, 'get_col' ) && isset( $wpdb->postmeta ) ) {
			$keys = $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT meta_key FROM {$wpdb->postmeta} WHERE post_id = %d", $post_id ) );
			return is_array( $keys ) ? $keys : array();
		}

		$meta = get_post_meta( $post_id );
		return is_array( $meta ) ? array_keys( $meta ) : array();
	}

	/**
	 * Get all meta key => value entries for a post.
	 *
	 * @param int $post_id Post ID.
	 * @return array<string, mixed>
	 */
	private static function get_all_post_meta_entries( int $post_id ): array {
		global $GLOBALS, $wpdb;
		$entries = array();

		if ( isset( $GLOBALS['wpdev_test_meta'][ $post_id ] ) && is_array( $GLOBALS['wpdev_test_meta'][ $post_id ] ) ) {
			return $GLOBALS['wpdev_test_meta'][ $post_id ];
		}

		if ( is_object( $wpdb ) && method_exists( $wpdb, 'get_results' ) && isset( $wpdb->postmeta ) ) {
			$rows = $wpdb->get_results( $wpdb->prepare( "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d", $post_id ), 'ARRAY_A' );
			if ( is_array( $rows ) ) {
				foreach ( $rows as $r ) {
					$entries[ $r['meta_key'] ] = $r['meta_value'];
				}
				return $entries;
			}
		}

		$meta = get_post_meta( $post_id );
		if ( is_array( $meta ) ) {
			foreach ( $meta as $k => $v ) {
				$entries[ $k ] = is_array( $v ) ? ( $v[0] ?? '' ) : $v;
			}
		}

		return $entries;
	}
}
