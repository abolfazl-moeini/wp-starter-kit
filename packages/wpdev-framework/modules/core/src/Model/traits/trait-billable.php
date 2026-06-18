<?php
/**
 * A trait to handle billable models.
 *
 * @package WPDev
 * @subpackage Models\Traits
 * @since 2.0.0
 */

namespace WPDevFramework\Models\Traits;

use \WPDevFramework\Objects\Billing_Address;

/**
 * Singleton trait.
 */
trait Billable {

	/**
	 * The billing address.
	 *
	 * @since 2.0.0
	 * @var \WPDevFramework\Objects\Billing_Address
	 */
	protected $billing_address;

	/**
	 * Returns the default billing address.
	 *
	 * Classes that implement this trait need to implement
	 * this method.
	 *
	 * @since 2.0.0
	 * @return \WPDevFramework\Objects\Billing_Address
	 */
	abstract public function get_default_billing_address();

	/**
	 * Gets the billing address for this object.
	 *
	 * @since 2.0.0
	 * @return \WPDevFramework\Objects\Billing_Address
	 */
	public function get_billing_address() {

		if ($this->billing_address === null) {

			$billing_address = $this->get_meta('wpdev_billing_address');

			$this->billing_address = is_a($billing_address, '\WPDevFramework\Objects\Billing_Address') ? $billing_address : $this->get_default_billing_address();

		} // end if;

		return $this->billing_address;

	} // end get_billing_address;

	/**
	 * Sets the billing address.
	 *
	 * @since 2.0.0
	 *
	 * @param array|\WPDevFramework\Objects\Billing_Address $billing_address The billing address.
	 * @return void
	 */
	public function set_billing_address($billing_address) {

		if (is_array($billing_address)) {

			$billing_address = new Billing_Address($billing_address);

		} // end if;

		$this->meta['wpdev_billing_address'] = $billing_address;

		$this->billing_address = $billing_address;

	} // end set_billing_address;

} // end trait Billable;
