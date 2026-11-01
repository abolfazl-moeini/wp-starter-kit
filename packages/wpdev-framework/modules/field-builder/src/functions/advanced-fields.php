<?php
/**
 * Public facades for advanced post fields.
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.14.0
 */

use WPDevFramework\Modules\FieldBuilder\Advanced_Fields_Registry;

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'wpdev_register_repeater' ) ) {
	/**
	 * Register a repeater stored as one JSON meta row.
	 *
	 * @since 2.14.0
	 *
	 * @param string               $key    Field key.
	 * @param array<string, mixed> $schema Schema.
	 * @return bool
	 */
	function wpdev_register_repeater( $key, array $schema ) {
		return Advanced_Fields_Registry::register_repeater( $key, $schema );
	}
}

if ( ! function_exists( 'wpdev_register_relationship' ) ) {
	/**
	 * Register a relationship stored as a JSON list of post IDs.
	 *
	 * @since 2.14.0
	 *
	 * @param string               $key  Field key.
	 * @param array<string, mixed> $args Arguments. `target` is required.
	 * @return bool
	 */
	function wpdev_register_relationship( $key, array $args ) {
		return Advanced_Fields_Registry::register_relationship( $key, $args );
	}
}

if ( ! function_exists( 'wpdev_register_group' ) ) {
	/**
	 * Register a one-level group stored as one JSON object.
	 *
	 * @since 2.14.0
	 *
	 * @param string               $key    Field key.
	 * @param array<string, mixed> $schema Schema.
	 * @return bool
	 */
	function wpdev_register_group( $key, array $schema ) {
		return Advanced_Fields_Registry::register_group( $key, $schema );
	}
}

if ( ! function_exists( 'wpdev_get_field' ) ) {
	/**
	 * Read a registered repeater, relationship, or group.
	 *
	 * @since 2.14.0
	 *
	 * @param string $key     Field key.
	 * @param int    $post_id Post ID.
	 * @param mixed  $default Value when the key is not registered.
	 * @return mixed
	 */
	function wpdev_get_field( $key, $post_id = 0, $default = null ) {
		return Advanced_Fields_Registry::get_field( $key, (int) $post_id, $default );
	}
}

if ( ! function_exists( 'wpdev_get_repeater' ) ) {
	/**
	 * @since 2.14.0
	 *
	 * @param string $key     Field key.
	 * @param int    $post_id Post ID.
	 * @return array<int, array<string, mixed>>
	 */
	function wpdev_get_repeater( $key, $post_id = 0 ) {
		return Advanced_Fields_Registry::get_repeater( $key, (int) $post_id );
	}
}

if ( ! function_exists( 'wpdev_get_relationship' ) ) {
	/**
	 * @since 2.14.0
	 *
	 * @param string $key      Field key.
	 * @param int    $post_id  Post ID.
	 * @param bool   $as_posts Return post objects instead of IDs.
	 * @return array<int, int|object>
	 */
	function wpdev_get_relationship( $key, $post_id = 0, $as_posts = false ) {
		return Advanced_Fields_Registry::get_relationship( $key, (int) $post_id, (bool) $as_posts );
	}
}

if ( ! function_exists( 'wpdev_get_group' ) ) {
	/**
	 * @since 2.14.0
	 *
	 * @param string $key     Field key.
	 * @param int    $post_id Post ID.
	 * @return array<string, mixed>
	 */
	function wpdev_get_group( $key, $post_id = 0 ) {
		return Advanced_Fields_Registry::get_group( $key, (int) $post_id );
	}
}
