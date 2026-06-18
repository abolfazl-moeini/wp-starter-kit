<?php
/**
 * Adds a validation rule for products.
 *
 * @package WPDev
 * @subpackage Helpers/Validation_Rules
 * @since 2.0.4
 */

namespace WPDevFramework\Helpers\Validation_Rules;

use WPDevFramework\Dependencies\Rakit\Validation\Rule;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Validates products.
 *
 * @since 2.0.4
 */
class Products extends Rule {

	/**
	 * Error message to be returned when this value has been used.
	 *
	 * @since 2.0.4
	 * @var string
	 */
	protected $message = '';

	/**
	 * Parameters that this rule accepts.
	 *
	 * @since 2.0.4
	 * @var array
	 */
	protected $fillableParams = array(); // phpcs:ignore
	/**
	 * Performs the actual check.
	 *
	 * @since 2.0.4
	 *
	 * @param mixed $products Value being checked.
	 */
	 public function check($products) : bool { // phpcs:ignore

		if ( ! function_exists( 'wpdev_get_product' ) || ! function_exists( 'wpdev_segregate_products' ) ) {
			// Fail-closed: if the products module is not loaded, we cannot validate the
			// submitted product ids. Returning `true` would silently accept any value,
			// which is unsafe for a validation rule. Reject and signal the misuse.
			if ( function_exists( '_doing_it_wrong' ) ) {
				_doing_it_wrong(
					__CLASS__ . '::' . __METHOD__,
					esc_html__( 'The products validation rule requires the WPDev Products module to be loaded.', 'wpdev' ),
					'2.5.0'
				);
			}

			$this->message = __( 'Products module is not available; product validation cannot run.', 'wpdev' );

			return false;
		}

		$products = (array) $products;

		$product_objects = array_map('wpdev_get_product', $products);

		list($plan, $additional_products) = wpdev_segregate_products($product_objects);

		if ($plan) {

			return true;

		} // end if;

		$this->message = __('A plan is required.', 'wpdev');

		return false;

	} // end check;

} // end class Products;
