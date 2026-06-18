<?php
/**
 * Example 03 — "Add Payment" modal form with an AJAX products field (K2-04).
 *
 * Demonstrates the full modal form lifecycle (K2-03):
 *   display  -> wpdev_register_form() render callback
 *   submit   -> handler returns JSON (refresh instruction)
 *   refresh  -> response asks the client to reload the target list table
 *
 * The "products" field is a `model` field (K1-07): its options load over AJAX
 * through the selectizer, so large catalogs are not rendered inline.
 *
 * @package WPDevFramework\Modules
 * @since   2.6.0
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'wpdev_register_forms',
	static function () {

		wpdev_register_form(
			'add_new_payment',
			array(
				'capability' => 'manage_options',
				'fields'     => array(
					'customer_id' => array(
						'type'        => 'model',
						'title'       => __( 'Customer', 'wpdev' ),
						'placeholder' => __( 'Search customers…', 'wpdev' ),
						// model fields resolve options via AJAX (selectizer).
						'html_attr'   => array(
							'data-model'  => 'customer',
							'data-search' => 'wpdev_search',
						),
					),
					'products'    => array(
						'type'        => 'model',
						'title'       => __( 'Products', 'wpdev' ),
						'placeholder' => __( 'Select products…', 'wpdev' ),
						'html_attr'   => array(
							'data-model'    => 'product',
							'data-search'   => 'wpdev_search',
							'data-selectize' => 1,
							'multiple'      => 1,
						),
					),
					'submit'      => array(
						'type'  => 'submit',
						'title' => __( 'Add Payment', 'wpdev' ),
					),
				),
				'handler'    => static function () {

					// 1) Validate + persist via the payment model/manager here.
					//    $payment = Payment::create( ... );

					// 2) Signal the client to close the modal and refresh the table.
					wp_send_json(
						array(
							'success'      => true,
							'code'         => 'payment_created',
							'message'      => __( 'Payment added.', 'wpdev' ),
							// list-tables.js refreshes the table with this id.
							'data'         => array(
								'refresh_table' => 'payments',
							),
							'send'         => true,
							'redirect_url' => false,
						)
					);
				},
			)
		);
	}
);

/*
 * Open the modal from a button (e.g. the Payments list page header):
 *
 *   echo wpdev_services( 'modal' )->render_button( array(
 *       'url'   => wpdev_modal_open( 'add_new_payment' ),
 *       'label' => __( 'Add Payment', 'wpdev' ),
 *       'classes' => 'button button-primary',
 *   ) );
 */
