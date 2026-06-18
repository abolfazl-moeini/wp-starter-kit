<?php
/**
 * A trait to be included in entities to wpdev_Site Class deprecated methods.
 *
 * @package WPDev
 * @subpackage Deprecated
 * @since 2.0.0
 */

namespace WPDevFramework\Traits;

/**
 * WPDev_Site_Deprecated trait.
 */
trait WPDev_Site_Deprecated {

	/**
	 * Magic getter to provide backwards compatibility for plans.
	 *
	 * @since 2.0.0
	 *
	 * @throws \Exception Throws an exception when trying to get a key that is not available or back-compat.
	 * @param string $key Property to get.
	 * @return mixed
	 */
	public function __get($key) {

		$value = null;

		switch ($key) {

			case 'site_owner_id':
				$customer = $this->get_customer();
				$value    = $customer ? $customer->get_user_id() : false;
				break;

		} // end switch;

		/**
		 * Let developers know that this is not going to be supported in the future.
		 *
		 * @since 2.0.0
		 */
		_doing_it_wrong($key, __('Product keys should not be accessed directly', 'wpdev'), '2.0.0');

		return $value;

	} // end __get;

	/**
	 * Deprecated: get_subscription.
	 *
	 * @deprecated 2.0.0
	 *
	 * @return \WPDevFramework\Models\Membership
	 */
	public function get_subscription() {

		_deprecated_function(__CLASS__, '2.0.0', '\WPDevFramework\Models\Site::get_membership()');

		return $this->get_membership();

	} // end get_subscription;

} // end trait WPDev_Site_Deprecated;
