<?php
/**
 * A trait to be included in entities to wpdev_Subscription Class deprecated methods.
 *
 * @package WPDev
 * @subpackage Deprecated
 * @since 2.0.0
 */

namespace WPDevFramework\Traits;

/**
 * WPDev_Subscription_Deprecated trait.
 */
trait WPDev_Subscription_Deprecated {

	/**
	 * Magic getter to provide backwards compatibility for subs.
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

			case 'plan_id':
				$value = $this->get_plan_id();
				break;

		} // end switch;

		/**
		 * Let developers know that this is not going to be supported in the future.
		 *
		 * @since 2.0.0
		 */
		_doing_it_wrong($key, __('Membership keys should not be accessed directly', 'wpdev'), '2.0.0');

		return $value;

	} // end __get;

} // end trait WPDev_Subscription_Deprecated;
