<?php
/**
 * Maps wu_* table keys to wpdev_* meta types (column names use wpdev_ prefix).
 *
 * @package WPDevFramework\Database\Engine
 * @since   2.5.0
 */

namespace WPDevFramework\Database\Engine;

defined( 'ABSPATH' ) || exit;

/**
 * Registers wpdb meta-table aliases and metadata cache redirects.
 */
class Meta_Type_Compat {

	/**
	 * Item slugs that store meta in wpdev_{item}_id columns.
	 *
	 * @since 2.5.0
	 * @var string[]
	 */
	private static $items = array(
		'product',
		'form',
		'payment',
		'customer',
		'membership',
		'discount_code',
		'post',
	);

	/**
	 * Register wpdb aliases and cache filters after custom tables boot.
	 *
	 * @since 2.5.0
	 * @return void
	 */
	public static function register() {

		global $wpdb;

		foreach ( self::$items as $item ) {
			$legacy_type = "wu_{$item}";
			$wpdev_type  = "wpdev_{$item}";
			$legacy_key  = "{$legacy_type}meta";
			$wpdev_key   = "{$wpdev_type}meta";

			if ( isset( $wpdb->{$legacy_key} ) ) {
				$wpdb->{$wpdev_key} = $wpdb->{$legacy_key};
			}

			add_filter(
				"update_{$legacy_type}_metadata_cache",
				static function ( $check, $object_ids ) use ( $wpdev_type ) {
					if ( null !== $check ) {
						return $check;
					}

					return update_meta_cache( $wpdev_type, $object_ids );
				},
				10,
				2
			);
		}

	} // end register;

	/**
	 * Resolve wpdev meta type for a BerlinDB item slug.
	 *
	 * @since 2.5.0
	 *
	 * @param string $item_name   Query item slug.
	 * @param string $table_prefix Query table prefix (e.g. wu).
	 * @return string
	 */
	public static function meta_type_for_item( $item_name, $table_prefix = 'wu' ) {

		if ( 'wu' === $table_prefix ) {
			return 'wpdev_' . $item_name;
		}

		if ( ! empty( $table_prefix ) ) {
			return "{$table_prefix}_{$item_name}";
		}

		return $item_name;

	} // end meta_type_for_item;

} // end class Meta_Type_Compat;
