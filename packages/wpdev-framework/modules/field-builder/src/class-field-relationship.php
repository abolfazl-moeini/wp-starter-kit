<?php
/**
 * Relationship ID validation.
 *
 * Bidirectional links are not written. Missing and off-type posts are dropped
 * when read, without rewriting every stored row.
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.14.0
 */

namespace WPDevFramework\Modules\FieldBuilder;

defined( 'ABSPATH' ) || exit;

/**
 * Selects and loads related posts for one relationship field.
 */
class Field_Relationship {

	/**
	 * Keep unique, in-target IDs up to the field limit.
	 *
	 * @param array<int, mixed> $ids      Raw IDs.
	 * @param array<int, string> $targets Allowed post types.
	 * @param int               $owner_id Post that owns the field.
	 * @param int               $limit    Maximum IDs.
	 * @return array<int, int>
	 */
	public static function sanitize_ids( array $ids, array $targets, $owner_id, $limit ) {
		$limit   = max( 1, (int) $limit );
		$owner   = (int) $owner_id;
		$public  = function_exists( 'is_admin' ) && ! is_admin();
		$clean   = array();

		foreach ( $ids as $id ) {
			$id = (int) $id;
			if ( $id <= 0 || $id === $owner || isset( $clean[ $id ] ) ) {
				continue;
			}
			if ( ! self::allowed_target( $id, $targets, $public ) ) {
				continue;
			}
			$clean[ $id ] = $id;
			if ( count( $clean ) >= $limit ) {
				break;
			}
		}

		return array_values( $clean );
	}

	/**
	 * Load related posts with one cache prime.
	 *
	 * @param array<int, int> $ids Post IDs.
	 * @return array<int, object>
	 */
	public static function posts_for( array $ids ) {
		$ids = array_values( array_map( 'intval', $ids ) );
		if ( array() === $ids ) {
			return array();
		}
		if ( function_exists( '_prime_post_caches' ) ) {
			_prime_post_caches( $ids );
		}

		$posts = array();
		foreach ( $ids as $id ) {
			if ( ! function_exists( 'get_post' ) ) {
				continue;
			}
			$post = get_post( $id );
			if ( is_object( $post ) ) {
				$posts[] = $post;
			}
		}
		return $posts;
	}

	/**
	 * @param int                $id      Candidate ID.
	 * @param array<int, string> $targets Allowed post types.
	 * @param bool               $public  Front-end reads keep published posts only.
	 * @return bool
	 */
	private static function allowed_target( $id, array $targets, $public ) {
		if ( ! function_exists( 'get_post' ) ) {
			return true;
		}
		$post = get_post( $id );
		if ( ! is_object( $post ) || empty( $post->post_type ) ) {
			return false;
		}
		if ( ! in_array( (string) $post->post_type, $targets, true ) ) {
			return false;
		}
		if ( $public && ( empty( $post->post_status ) || 'publish' !== $post->post_status ) ) {
			return false;
		}
		return true;
	}
}
