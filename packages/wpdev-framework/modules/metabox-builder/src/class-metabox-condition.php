<?php
/**
 * Metabox Condition Engine.
 *
 * Evaluates declarative multi-state visibility conditions on both server (PHP)
 * and client (DOM / JavaScript) for WordPress metaboxes.
 *
 * @package WPDevFramework\Modules\MetaboxBuilder
 * @since   2.14.0
 */

declare( strict_types=1 );

namespace WPDevFramework\Modules\MetaboxBuilder;

defined( 'ABSPATH' ) || exit;

/**
 * Class Metabox_Condition
 */
class Metabox_Condition {

	/**
	 * Check if a post currently matches all conditions in the configuration.
	 *
	 * @param array<string, mixed> $condition Condition rules.
	 * @param object|int|null      $post      WP_Post object or ID.
	 * @return bool
	 */
	public static function matches_post( array $condition, $post = null ): bool {
		$post_obj = self::resolve_post( $post );

		// 1. Template condition
		if ( isset( $condition['template'] ) || isset( $condition['page_template'] ) ) {
			$expected = isset( $condition['template'] ) ? $condition['template'] : $condition['page_template'];
			if ( ! self::match_template( $expected, $post_obj ) ) {
				return false;
			}
		}

		// 2. Post ID condition
		if ( isset( $condition['post_id'] ) || isset( $condition['id'] ) ) {
			$expected_ids = isset( $condition['post_id'] ) ? $condition['post_id'] : $condition['id'];
			if ( ! self::match_post_id( $expected_ids, $post_obj ) ) {
				return false;
			}
		}

		// 3. Post Format condition
		if ( isset( $condition['post_format'] ) || isset( $condition['format'] ) ) {
			$expected_format = isset( $condition['post_format'] ) ? $condition['post_format'] : $condition['format'];
			if ( ! self::match_post_format( $expected_format, $post_obj ) ) {
				return false;
			}
		}

		// 4. Post Type condition
		if ( isset( $condition['post_type'] ) && $post_obj ) {
			$allowed_types = (array) $condition['post_type'];
			$post_type     = isset( $post_obj->post_type ) ? (string) $post_obj->post_type : '';
			if ( ! in_array( $post_type, $allowed_types, true ) ) {
				return false;
			}
		}

		// 5. Post Status condition
		if ( isset( $condition['post_status'] ) && $post_obj ) {
			$allowed_statuses = (array) $condition['post_status'];
			$status           = isset( $post_obj->post_status ) ? (string) $post_obj->post_status : '';
			if ( ! in_array( $status, $allowed_statuses, true ) ) {
				return false;
			}
		}

		// 6. Capability check
		if ( isset( $condition['capability'] ) ) {
			$cap = (string) $condition['capability'];
			if ( function_exists( 'current_user_can' ) && ! current_user_can( $cap ) ) {
				return false;
			}
		}

		// 7. Custom callable check
		if ( isset( $condition['callback'] ) && is_callable( $condition['callback'] ) ) {
			if ( ! call_user_func( $condition['callback'], $post_obj ) ) {
				return false;
			}
		}

		// 8. Field / Meta condition
		if ( isset( $condition['field'] ) && array_key_exists( 'value', $condition ) ) {
			$field_key  = (string) $condition['field'];
			$actual_val = null;
			if ( $post_obj && isset( $post_obj->ID ) && function_exists( 'get_post_meta' ) ) {
				$actual_val = get_post_meta( (int) $post_obj->ID, $field_key, true );
			}
			if ( ! self::values_match( $condition['value'], $actual_val ) ) {
				return false;
			}
		}

		// 9. Require rules (array of key => val)
		if ( isset( $condition['require'] ) && is_array( $condition['require'] ) ) {
			foreach ( $condition['require'] as $field_key => $expected_val ) {
				$actual_val = null;
				if ( $post_obj && isset( $post_obj->ID ) && function_exists( 'get_post_meta' ) ) {
					$actual_val = get_post_meta( (int) $post_obj->ID, (string) $field_key, true );
				}
				if ( ! self::values_match( $expected_val, $actual_val ) ) {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * Whether this condition has dynamic aspects that can change interactively in the editor
	 * (e.g. Page Template dropdown or Post Format radio selector).
	 *
	 * @param array<string, mixed> $condition
	 * @return bool
	 */
	public static function is_client_dynamic( array $condition ): bool {
		return isset( $condition['template'] )
			|| isset( $condition['page_template'] )
			|| isset( $condition['post_format'] )
			|| isset( $condition['format'] );
	}

	/**
	 * Evaluates whether the metabox should be registered on the server at all.
	 *
	 * Static conditions (post_id, capability, callback) fail closed immediately on the server.
	 * Dynamic conditions (template, format) allow registration so client JS can toggle display.
	 *
	 * @param array<string, mixed> $condition
	 * @param object|int|null      $post
	 * @return bool
	 */
	public static function should_register_server( array $condition, $post = null ): bool {
		$post_obj = self::resolve_post( $post );

		// 1. Post ID gate
		if ( isset( $condition['post_id'] ) || isset( $condition['id'] ) ) {
			$expected_ids = isset( $condition['post_id'] ) ? $condition['post_id'] : $condition['id'];
			if ( ! self::match_post_id( $expected_ids, $post_obj ) ) {
				return false;
			}
		}

		// 2. Capability gate
		if ( isset( $condition['capability'] ) ) {
			$cap = (string) $condition['capability'];
			if ( function_exists( 'current_user_can' ) && ! current_user_can( $cap ) ) {
				return false;
			}
		}

		// 3. Custom callable gate
		if ( isset( $condition['callback'] ) && is_callable( $condition['callback'] ) ) {
			if ( ! call_user_func( $condition['callback'], $post_obj ) ) {
				return false;
			}
		}

		// 4. Post Type gate
		if ( isset( $condition['post_type'] ) && $post_obj ) {
			$allowed_types = (array) $condition['post_type'];
			$post_type     = isset( $post_obj->post_type ) ? (string) $post_obj->post_type : '';
			if ( ! in_array( $post_type, $allowed_types, true ) ) {
				return false;
			}
		}

		// 5. Post Status gate
		if ( isset( $condition['post_status'] ) && $post_obj ) {
			$allowed_statuses = (array) $condition['post_status'];
			$status           = isset( $post_obj->post_status ) ? (string) $post_obj->post_status : '';
			if ( ! in_array( $status, $allowed_statuses, true ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Whether the metabox should be initially visible in the DOM on first render.
	 *
	 * @param array<string, mixed> $condition
	 * @param object|int|null      $post
	 * @return bool
	 */
	public static function is_initially_visible( array $condition, $post = null ): bool {
		return self::matches_post( $condition, $post );
	}

	/**
	 * Generate data attributes for the client-side toggle driver.
	 *
	 * @param array<string, mixed> $condition
	 * @return array<string, string>
	 */
	public static function get_dom_attributes( array $condition ): array {
		$attributes = [];

		if ( isset( $condition['template'] ) || isset( $condition['page_template'] ) ) {
			$val                                        = isset( $condition['template'] ) ? $condition['template'] : $condition['page_template'];
			$attributes['data-wpdev-condition-template'] = implode( ',', (array) $val );
		}

		if ( isset( $condition['post_format'] ) || isset( $condition['format'] ) ) {
			$val                                      = isset( $condition['post_format'] ) ? $condition['post_format'] : $condition['format'];
			$attributes['data-wpdev-condition-format'] = implode( ',', (array) $val );
		}

		return $attributes;
	}

	/**
	 * Format attributes array into HTML attribute string.
	 *
	 * @param array<string, string> $attributes
	 * @return string
	 */
	public static function format_dom_attributes( array $attributes ): string {
		$parts = [];
		foreach ( $attributes as $key => $val ) {
			$clean_key = sanitize_key( $key );
			$parts[]   = sprintf( '%s="%s"', $clean_key, esc_attr( (string) $val ) );
		}
		return implode( ' ', $parts );
	}

	/**
	 * Match page template.
	 *
	 * @param string|string[] $expected
	 * @param object|null     $post
	 * @return bool
	 */
	private static function match_template( $expected, $post ): bool {
		$current = '';

		if ( is_object( $post ) ) {
			if ( isset( $post->page_template ) && is_string( $post->page_template ) ) {
				$current = $post->page_template;
			} elseif ( function_exists( 'get_page_template_slug' ) ) {
				$current = (string) get_page_template_slug( $post );
			} elseif ( isset( $post->ID ) && function_exists( 'get_post_meta' ) ) {
				$current = (string) get_post_meta( (int) $post->ID, '_wp_page_template', true );
			}
		}

		if ( '' === $current || false === $current ) {
			$current = 'default';
		}

		$allowed = (array) $expected;
		// Normalize 'default' or ''
		$normalized_allowed = array_map( static function( $tpl ) {
			return ( '' === $tpl || 'default' === $tpl ) ? 'default' : (string) $tpl;
		}, $allowed );

		return in_array( $current, $normalized_allowed, true );
	}

	/**
	 * Match post ID.
	 *
	 * @param int|int[]   $expected_ids
	 * @param object|null $post
	 * @return bool
	 */
	private static function match_post_id( $expected_ids, $post ): bool {
		if ( ! is_object( $post ) || ! isset( $post->ID ) ) {
			return false;
		}

		$post_id = (int) $post->ID;
		$allowed = array_map( 'intval', (array) $expected_ids );

		return in_array( $post_id, $allowed, true );
	}

	/**
	 * Match post format.
	 *
	 * @param string|string[] $expected_formats
	 * @param object|null     $post
	 * @return bool
	 */
	private static function match_post_format( $expected_formats, $post ): bool {
		$current = 'standard';

		if ( is_object( $post ) ) {
			if ( isset( $post->post_format ) && $post->post_format ) {
				$current = (string) $post->post_format;
			} elseif ( function_exists( 'get_post_format' ) ) {
				$format = get_post_format( $post );
				if ( is_string( $format ) && '' !== $format ) {
					$current = $format;
				}
			}
		}

		$allowed = array_map( static function( $fmt ) {
			return ( '' === $fmt || false === $fmt || 'standard' === $fmt ) ? 'standard' : (string) $fmt;
		}, (array) $expected_formats );

		return in_array( $current, $allowed, true );
	}

	/**
	 * Normalize a boolean or boolean-like value.
	 *
	 * Returns true for true, 1, '1', 'true', 'on', 'yes'.
	 * Returns false for false, 0, '0', 'false', 'off', 'no', '', null.
	 * Returns null if the value is not recognized as a boolean representation.
	 *
	 * @param mixed $value
	 * @return bool|null
	 */
	public static function normalize_boolean( $value ): ?bool {
		if ( is_bool( $value ) ) {
			return $value;
		}

		if ( null === $value || '' === $value ) {
			return false;
		}

		if ( 1 === $value || '1' === $value ) {
			return true;
		}

		if ( 0 === $value || '0' === $value ) {
			return false;
		}

		if ( is_string( $value ) ) {
			$lowered = strtolower( trim( $value ) );
			if ( 'true' === $lowered || 'on' === $lowered || 'yes' === $lowered ) {
				return true;
			}
			if ( 'false' === $lowered || 'off' === $lowered || 'no' === $lowered ) {
				return false;
			}
		}

		return null;
	}

	/**
	 * Unified value comparison treating boolean/string/int representations of toggles as equal.
	 *
	 * @param mixed $expected Expected condition value.
	 * @param mixed $actual   Actual value.
	 * @return bool
	 */
	public static function values_match( $expected, $actual ): bool {
		$norm_expected = self::normalize_boolean( $expected );
		$norm_actual   = self::normalize_boolean( $actual );

		if ( null !== $norm_expected && null !== $norm_actual ) {
			return $norm_expected === $norm_actual;
		}

		if ( is_array( $expected ) ) {
			return in_array( $actual, $expected, false );
		}

		return (string) $expected === (string) $actual;
	}

	/**
	 * Evaluate declarative field require rules against a dictionary of values.
	 *
	 * @param array<string, mixed> $require_rules Map of field => expected value.
	 * @param array<string, mixed> $context_values Values dictionary (POST, saved settings, etc.).
	 * @return bool
	 */
	public static function evaluate_field_condition( array $require_rules, array $context_values ): bool {
		foreach ( $require_rules as $field_key => $expected_val ) {
			$clean_key     = str_replace( '-', '_', (string) $field_key );
			$actual_value  = $context_values[ $clean_key ] ?? $context_values[ $field_key ] ?? null;

			if ( ! self::values_match( $expected_val, $actual_value ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Resolve post object from object or ID.
	 *
	 * @param mixed $post
	 * @return object|null
	 */
	private static function resolve_post( $post ) {
		if ( is_object( $post ) ) {
			return $post;
		}
		if ( is_numeric( $post ) && (int) $post > 0 ) {
			if ( function_exists( 'get_post' ) ) {
				$p = get_post( (int) $post );
				return is_object( $p ) ? $p : null;
			}
			return (object) [ 'ID' => (int) $post ];
		}
		if ( isset( $GLOBALS['post'] ) && is_object( $GLOBALS['post'] ) ) {
			return $GLOBALS['post'];
		}
		return null;
	}
}
