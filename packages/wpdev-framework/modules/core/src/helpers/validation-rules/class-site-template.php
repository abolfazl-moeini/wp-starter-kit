<?php
/**
 * Adds a validation rules that allows us to check if a given parameter is unique.
 *
 * @package WPDev
 * @subpackage Helpers/Validation_Rules
 * @since 2.0.4
 */

namespace WPDevFramework\Helpers\Validation_Rules;

use \WPDevFramework\Dependencies\Rakit\Validation\Rule;
use \WPDevFramework\Database\Sites\Site_Type;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Validates template sites.
 *
 * @since 2.0.4
 */
class Site_Template extends Rule {

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
	 * @param mixed $template_id Value being checked.
	 */
	 public function check($template_id) : bool { // phpcs:ignore

		$template_id = absint($template_id);

		if (!$template_id) {

			return true;

		} // end if;

		if ( ! function_exists( 'wpdev_get_site' ) ) {
			// Fail-closed: if the sites module is not loaded we cannot look up the template.
			// Silently passing would accept arbitrary template ids.
			if ( function_exists( '_doing_it_wrong' ) ) {
				_doing_it_wrong(
					__CLASS__ . '::' . __METHOD__,
					esc_html__( 'The site-template validation rule requires the WPDev Sites module to be loaded.', 'wpdev' ),
					'2.5.0'
				);
			}

			$this->message = __( 'Sites module is not available; site template validation cannot run.', 'wpdev' );

			return false;
		}

		$site = wpdev_get_site($template_id);

		if (!$site || ($site->get_type() !== Site_Type::SITE_TEMPLATE && $site->get_type() !== Site_Type::CUSTOMER_OWNED)) {

			$this->message = __('The Template ID does not correspond to a valid Template', 'wpdev');

			return false;

		} // end if;

		if ($site->get_type() === Site_Type::CUSTOMER_OWNED) {

			if (!wpdev_get_setting('allow_own_site_as_template')) {

				$this->message = __('You can not use your sites as template', 'wpdev');

				return false;

			} // end if;

			$customer = wpdev_get_current_customer();

			if (!$customer || $site->get_customer_id() !== $customer->get_id()) {

				$this->message = __('The selected template is not available.', 'wpdev');

				return false;

			} // end if;

			return true;

		} // end if;

		$allowed_templates = false;

		$product_ids_or_slugs = array();

		if ( class_exists( 'WPDev\\Checkout\\Checkout' ) ) {
			$product_ids_or_slugs = \WPDevFramework\Checkout\Checkout::get_instance()->request_or_session( 'products', array() );
		}

		$product_ids_or_slugs = array_unique( $product_ids_or_slugs );

		if ( $product_ids_or_slugs && function_exists( 'wpdev_get_product' ) && function_exists( 'wpdev_segregate_products' ) ) {

			$products = array_map( 'wpdev_get_product', $product_ids_or_slugs );

			$limits = new \WPDevFramework\Objects\Limitations();

			list($plan, $additional_products) = wpdev_segregate_products($products);

			$products = array_merge(array($plan), $additional_products);

			foreach ($products as $product) {

				$limits = $limits->merge($product->get_limitations());

			} // end foreach;

			$allowed_templates = $limits->site_templates->get_available_site_templates();

		} // end if;

		if (is_array($allowed_templates) && !in_array($template_id, $allowed_templates)) { // phpcs:ignore

			$this->message = __('The selected template is not available for this product.', 'wpdev');

			return false;

		} // end if;

		return true;

	} // end check;

} // end class Site_Template;
