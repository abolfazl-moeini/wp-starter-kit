<?php
/**
 * Example — ajax model field (selectizer) for admin forms.
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.5.0
 */
defined( 'ABSPATH' ) || exit;

add_filter(
	'wpdev_search_models_functions',
	static function ( $sources ) {
		$sources[] = 'wpdev_get_products';
		return $sources;
	}
);

// Field definition (on a Form or admin page):
// array(
//   'type'  => 'model',
//   'model' => 'product',
//   'name'  => 'product_id',
// )
