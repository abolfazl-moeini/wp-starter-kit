<?php
/**
 * Form Functions
 *
 * @package WPDevFramework\Functions
 * @since   2.0.0
 */

// Exit if accessed directly
defined('ABSPATH') || exit;

use WPDevFramework\Core\Services\Form_Service;
use \WPDevFramework\Managers\Form_Manager;

/**
 * Returns the form service or legacy manager instance.
 *
 * @since 2.5.0
 *
 * @return Form_Service|Form_Manager
 */
function wpdev_form_api() {

	if ( function_exists( 'wpdev_services' ) && function_exists( 'add_query_arg' ) ) {
		$service = wpdev_services( 'form' );

		if ( $service instanceof Form_Service ) {
			return $service;
		}
	}

	return Form_Manager::get_instance();

} // end wpdev_form_api;

/**
 * Registers a new Ajax Form.
 *
 * Ajax forms are forms that get loaded via an ajax call using thickbox.
 * This is useful for displaying inline edit forms that support Vue and our
 * Form/Fields API.
 *
 * @since 2.0.0
 * @see \WPDevFramework\Managers\Form_Manager::register_form
 *
 * @param string $form_id Form id.
 * @param array  $atts Form attributes, check wp_parse_atts call below.
 * @return mixed
 */
function wpdev_register_form($form_id, $atts = array()) {

	$api = wpdev_form_api();

	if ( $api instanceof Form_Service ) {
		return $api->register( $form_id, $atts );
	}

	return $api->register_form( $form_id, $atts );

} // end wpdev_register_form;

/**
 * Returns the ajax URL for a given form.
 *
 * @since 2.0.0
 * @see \WPDevFramework\Managers\Form_Manager::get_form_url
 *
 * @param string  $form_id The id of the form to return.
 * @param array   $atts List of parameters, check wp_parse_args below.
 * @param boolean $inline If this form is has content.
 * @return string
 */
function wpdev_get_form_url($form_id, $atts = array(), $inline = false) {

	if ($inline) {

		$atts = wp_parse_args($atts, array(
			'inlineId' => $form_id,
			'width'    => '400',
			'height'   => '360',
		));

		// TB_inline?height=300&width=300&inlineId=wpdev-add-field
		return add_query_arg($atts, '#TB_inline');

	} // end if;

	$api = wpdev_form_api();

	if ( $api instanceof Form_Service ) {
		return $api->manager()->get_form_url( $form_id, $atts, $inline );
	}

	return $api->get_form_url($form_id, $atts, $inline);

} // end wpdev_get_form_url;

/**
 * Open a modal form URL via Modal_Service (wubox).
 *
 * @since 2.5.0
 *
 * @param string               $form_id Form id.
 * @param array<string, mixed> $args    Query args for the form URL.
 * @return string
 */
function wpdev_modal_open( $form_id, $args = array() ) {

	if ( function_exists( 'wpdev_services' ) ) {
		$modal = wpdev_services( 'modal' );

		if ( $modal && method_exists( $modal, 'open' ) ) {
			return $modal->open( $form_id, $args );
		}
	}

	return wpdev_get_form_url( $form_id, $args );

} // end wpdev_modal_open;

/**
 * Enqueues the wubox modal script (thickbox fork).
 *
 * @since 2.0.0
 * @return void
 */
function add_wubox() { // phpcs:ignore

	wp_enqueue_script( 'wubox' );

} // end add_wubox;
