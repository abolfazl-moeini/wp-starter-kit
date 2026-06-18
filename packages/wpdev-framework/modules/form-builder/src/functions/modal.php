<?php
/**
 * Modal + AJAX helpers for examples (framework abstraction).
 *
 * @package WPDevFramework\Modules\FormBuilder\Functions
 * @since   2.8.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register an AJAX modal action via the core Modal service.
 *
 * Framework owns registration/nonce/transport; callback returns modal HTML.
 *
 * @since 2.8.0
 *
 * @param string   $id       Modal id suffix (action becomes wpdev_modal_{id}).
 * @param callable $callback Render callback.
 * @param array    $args     Optional args passed to Modal_Service::register_ajax_modal_action().
 * @return void
 */
function wpdev_register_ajax_modal( $id, $callback, $args = array() ) {

	if ( ! is_callable( $callback ) ) {
		return;
	}

	if ( function_exists( 'wpdev_services' ) && wpdev_services( 'modal' ) ) {
		wpdev_services( 'modal' )->register_ajax_modal_action( $id, $callback, $args );
		return;
	}

	if ( class_exists( 'WPDev\\Core\\Services\\Modal_Service' ) ) {
		( new \WPDevFramework\Core\Services\Modal_Service() )->register_ajax_modal_action( $id, $callback, $args );
	}

} // end wpdev_register_ajax_modal;

/**
 * Build a wubox AJAX content URL for a registered modal.
 *
 * @since 2.8.0
 *
 * @param string $id   Modal id.
 * @param array  $args Query args.
 * @return string
 */
function wpdev_ajax_modal_url( $id, $args = array() ) {

	if ( function_exists( 'wpdev_services' ) && wpdev_services( 'modal' ) ) {
		return wpdev_services( 'modal' )->ajax_content_url( $id, $args );
	}

	return wpdev_ajax_url(
		'init',
		array_merge(
			array( 'action' => 'wpdev_modal_' . sanitize_key( $id ) ),
			(array) $args
		)
	);

} // end wpdev_ajax_modal_url;

/**
 * Render a reusable entity card-list modal body.
 *
 * Each row: link, avatar (HTML), display_name, id, description.
 *
 * @since 2.8.0
 *
 * @param array<int, array<string, mixed>> $entities       Row data.
 * @param array<string, mixed>             $args {
 *     @type string $wrapper_class CSS classes for wrapper.
 *     @type string $modal_class   CSS classes for card links.
 *     @type string $empty_label   Label when no rows.
 * }
 * @return void
 */
function wpdev_render_entity_list_modal( array $entities, array $args = array() ) {

	$args = wp_parse_args(
		$args,
		array(
			'wrapper_class' => 'wpdev-bg-gray-100 wpdev--mt-3 wpdev--mb-6 wpdev-max-h-2',
			'modal_class'   => '',
			'empty_label'   => __( 'No Targets', 'wpdev' ),
		)
	);

	$view = __DIR__ . '/../views/modal/entity-list.php';

	if ( is_readable( $view ) ) {
		$targets = $entities;
		include $view;
		return;
	}

	echo '<div class="' . esc_attr( $args['wrapper_class'] ) . '">';

	if ( empty( $entities ) ) {
		echo '<p>' . esc_html( $args['empty_label'] ) . '</p>';
		echo '</div>';
		return;
	}

	echo '<ul class="wpdev-widget-list">';

	foreach ( $entities as $entity ) {
		printf(
			'<li><a href="%1$s" class="%2$s">%3$s %4$s</a></li>',
			esc_url( $entity['link'] ?? '#' ),
			esc_attr( $args['modal_class'] ),
			wp_kses_post( $entity['avatar'] ?? '' ),
			esc_html( $entity['display_name'] ?? '' )
		);
	}

	echo '</ul></div>';

} // end wpdev_render_entity_list_modal;
