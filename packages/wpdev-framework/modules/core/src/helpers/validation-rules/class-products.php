<?php
/**
 * Adds a validation rule for products.
 *
 * @package WPDev
 * @subpackage Helpers/Validation_Rules
 * @since 2.0.4
 */

namespace WPDevFramework\Helpers\Validation_Rules;

use WPDev\Dependencies\Rakit\Validation\Rule;

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

		/**
		 * Allow examples to validate a submitted entity selection (e.g. checkout products).
		 *
		 * Returning a non-null value short-circuits the default fail-closed behavior.
		 * Examples should return true when the selection is valid, false when it is not.
		 *
		 * @since 2.8.1
		 *
		 * @param bool|null $result   Default null (validation unavailable).
		 * @param mixed     $products Value being checked.
		 */
		$result = apply_filters( 'wpdev_validation_rule_entity_selection', null, $products );

		if ( null === $result ) {
			// Fail-closed: no example hooked in — cannot validate the submitted selection.
			if ( function_exists( '_doing_it_wrong' ) ) {
				_doing_it_wrong(
					__CLASS__ . '::' . __METHOD__,
					esc_html__( 'The products validation rule requires an example to hook wpdev_validation_rule_entity_selection.', 'wpdev' ),
					'2.8.1'
				);
			}

			$this->message = __( 'Entity selection validation is not available.', 'wpdev' );

			return false;
		}

		if ( $result ) {

			return true;

		} // end if;

		$this->message = __( 'A plan is required.', 'wpdev' );

		return false;

	} // end check;

} // end class Products;
