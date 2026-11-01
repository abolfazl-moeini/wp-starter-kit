<?php
/**
 * Adds a validation rules that allows us to check if a given parameter is unique.
 *
 * @package WPDev
 * @subpackage Helpers/Validation_Rules
 * @since 2.0.4
 */

namespace WPDevFramework\Helpers\Validation_Rules;

use \WPDev\Dependencies\Rakit\Validation\Rule;
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

		/**
		 * Allow examples to resolve an entity record by ID (e.g. a template site).
		 *
		 * Returning a non-null value short-circuits the default fail-closed behavior.
		 *
		 * @since 2.8.1
		 *
		 * @param mixed|null $entity      Default null (lookup unavailable).
		 * @param int        $template_id Value being checked.
		 */
		$site = apply_filters( 'wpdev_entity_lookup', null, $template_id, 'site' );

		if ( null === $site ) {
			// Fail-closed: no example hooked in — cannot look up the template entity.
			if ( function_exists( '_doing_it_wrong' ) ) {
				_doing_it_wrong(
					__CLASS__ . '::' . __METHOD__,
					esc_html__( 'The site-template validation rule requires an example to hook wpdev_entity_lookup.', 'wpdev' ),
					'2.8.1'
				);
			}

			$this->message = __( 'Entity lookup is not available; template validation cannot run.', 'wpdev' );

			return false;
		}

		if (!$site || ($site->get_type() !== Site_Type::SITE_TEMPLATE && $site->get_type() !== Site_Type::CUSTOMER_OWNED)) {

			$this->message = __('The Template ID does not correspond to a valid Template', 'wpdev');

			return false;

		} // end if;

		if ($site->get_type() === Site_Type::CUSTOMER_OWNED) {

			if (!wpdev_get_setting('allow_own_site_as_template')) {

				$this->message = __('You can not use your sites as template', 'wpdev');

				return false;

			} // end if;

			$customer = apply_filters( 'wpdev_current_record_resolver', false );

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

		/**
		 * Allow examples to resolve allowed template entity IDs for the current selection.
		 *
		 * Returning a non-false value short-circuits the default unrestricted behavior.
		 * Examples should return an array of allowed template IDs, or false when unrestricted.
		 *
		 * @since 2.8.1
		 *
		 * @param array|false $allowed_templates Default false (no restriction).
		 * @param array       $product_ids_or_slugs Selection identifiers from checkout.
		 */
		$allowed_templates = apply_filters( 'wpdev_validation_rule_selection_template_ids', false, $product_ids_or_slugs );

		if (is_array($allowed_templates) && !in_array($template_id, $allowed_templates)) { // phpcs:ignore

			$this->message = __('The selected template is not available for this product.', 'wpdev');

			return false;

		} // end if;

		return true;

	} // end check;

} // end class Site_Template;
