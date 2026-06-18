<?php
/**
 * Modal / wubox service wrapper.
 *
 * @package WPDevFramework\Core\Services
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Services;

use WPDevFramework\Core\Contracts\Modal_Service_Contract;
use WPDevFramework\Managers\Form_Manager;

defined( 'ABSPATH' ) || exit;

/**
 * Wraps wubox modal glue and bulk confirm forms.
 */
class Modal_Service implements Modal_Service_Contract {

	/**
	 * {@inheritdoc}
	 */
	public function id() {

		return 'modal';

	} // end id;

	/**
	 * {@inheritdoc}
	 */
	public function boot() {

		add_action( 'wpdev_page_load', 'add_wubox' );

	} // end boot;

	/**
	 * {@inheritdoc}
	 */
	public function open( $form_id, $args = array() ) {

		$manager = null;

		if ( function_exists( 'wpdev_services' ) && wpdev_services( 'form' ) ) {
			$manager = wpdev_services( 'form' )->manager();
		} else {
			$manager = Form_Manager::get_instance();
		}

		if ( ! method_exists( $manager, 'get_form_url' ) ) {
			return '';
		}

		return $manager->get_form_url( $form_id, $args );

	} // end open;

	/**
	 * {@inheritdoc}
	 */
	public function register_bulk_confirm( $model, $action ) {

		/**
		 * Bulk confirm modals are registered centrally by Form_Manager.
		 * Modules may extend via wpdev_handle_bulk_action_form.
		 *
		 * @since 2.4.0
		 *
		 * @param string $model  Model slug.
		 * @param string $action Bulk action slug.
		 */
		do_action( 'wpdev_modal_register_bulk_confirm', $model, $action );

	} // end register_bulk_confirm;

	/**
	 * {@inheritdoc}
	 */
	public function register_ajax_modal_action( $id, $callback, $args = array() ) {

		$action = 'wpdev_modal_' . $id;

		$render = static function () use ( $callback ) {
			echo call_user_func( $callback ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			die;
		};

		$register_args = array_merge(
			array(
				'transport' => 'light',
				'nopriv'    => ! empty( $args['nopriv'] ),
			),
			$args
		);

		if ( function_exists( 'wpdev_register_ajax_handler' ) ) {
			wpdev_register_ajax_handler( $action, $render, $register_args );
			return;
		}

		add_action( 'wpdev_ajax_' . $action, $render );

		if ( ! empty( $args['nopriv'] ) ) {
			add_action( 'wpdev_ajax_nopriv_' . $action, $render );
		}

	} // end register_ajax_modal_action;

	/**
	 * {@inheritdoc}
	 */
	public function ajax_content_url( $id, $args = array() ) {

		$query = array_merge(
			array( 'action' => 'wpdev_modal_' . $id ),
			(array) $args
		);

		return wpdev_ajax_url( 'init', $query );

	} // end ajax_content_url;

	/**
	 * {@inheritdoc}
	 */
	public function render_button( $args = array() ) {

		$args = wp_parse_args(
			$args,
			array(
				'url'     => '#',
				'label'   => '',
				'classes' => 'button',
				'icon'    => '',
				'title'   => '',
				'attrs'   => array(),
			)
		);

		$attrs = '';

		foreach ( (array) $args['attrs'] as $key => $value ) {
			$attrs .= sprintf( ' %s="%s"', esc_attr( $key ), esc_attr( $value ) );
		}

		$icon = $args['icon'] ? sprintf( '<span class="%s"></span> ', esc_attr( $args['icon'] ) ) : '';

		return sprintf(
			'<a href="%1$s" title="%2$s" class="wubox %3$s"%4$s>%5$s%6$s</a>',
			esc_url( $args['url'] ),
			esc_attr( $args['title'] ? $args['title'] : $args['label'] ),
			esc_attr( $args['classes'] ),
			$attrs,
			$icon,
			esc_html( $args['label'] )
		);

	} // end render_button;

} // end class Modal_Service;
