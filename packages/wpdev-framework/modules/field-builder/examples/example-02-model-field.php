<?php
/**
 * Example — ajax model field (selectizer) for admin forms.
 *
 * Built-in search targets:
 * - Registered post types via `data-model` => post type slug (e.g. `page`,
 *   `professors`) — Ajax::search_models() uses get_posts().
 * - Domain models via `wpdev_get_{model}s` / `wpdev_search_models_functions`.
 *
 * Light-ajax timing: selectizer is localized with `wpdev_ajax_url( 'init' )`
 * so theme CPTs registered on `init` exist during `post_type_exists()`.
 * Do not point model search back at the default `plugins_loaded` light-ajax URL.
 *
 * @package WPDevFramework\Modules\FieldBuilder
 * @since   2.5.0
 */
defined( 'ABSPATH' ) || exit;

// CPT (same contract as Default Registration Page in wpdev-examples):
// array(
//   'type'        => 'model',
//   'title'       => __( 'Professor', 'textdomain' ),
//   'placeholder' => __( 'Search professors...', 'textdomain' ),
//   'html_attr'   => array(
//     'data-model'        => 'professors',
//     'data-value-field'  => 'ID',
//     'data-label-field'  => 'post_title',
//     'data-search-field' => 'post_title',
//     'data-max-items'    => 1,
//   ),
// )

// Domain model (products, customers, …):
// array(
//   'type'  => 'model',
//   'model' => 'product',
//   'name'  => 'product_id',
// )
//
// When client-seeding product options (dependent filters / data-include lists),
// each option must match #wpdev-template-product:
//   { id, name, type, formatted_price }
// id+name alone can throw during render ({{ type }} / {{ formatted_price }}).
// data-include only scopes Ajax search; empty query never loads — call
// selectize.addOption(...) + refreshOptions(false) to show options on open.
