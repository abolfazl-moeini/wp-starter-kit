<?php
/**
 * Adds a validation rules for cities
 *
 * @package WPDev
 * @subpackage Helpers/Validation_Rules
 * @since 2.0.11
 */

namespace WPDevFramework\Helpers\Validation_Rules;

// Exit if accessed directly
defined('ABSPATH') || exit;

use WPDevFramework\Dependencies\Rakit\Validation\Rule;

/**
 * Validates template sites.
 *
 * @since 2.0.4
 */
class City extends Rule {

	/**
	 * Parameters that this rule accepts.
	 *
	 * @since 2.0.4
	 * @var array
	 */
	protected $fillableParams = array('country', 'state'); // phpcs:ignore
	/**
	 * Performs the actual check.
	 *
	 * @since 2.0.11
	 *
	 * @param mixed $city The city value detected.
	 */
 public function check($city) : bool { // phpcs:ignore

		$check = true;

		$country = $this->parameter('country') ?? wpdev_request('billing_country');

		$state = $this->parameter('state') ?? wpdev_request('billing_state');

		if ($country && $state && $city) {

			$state = strtoupper((string) $state);

			$allowed_cities = wpdev_get_country_cities(strtoupper((string) $country), $state, false);

			if (!empty($allowed_cities)) {

				$check = in_array($city, $allowed_cities, true);

			} // end if;

		} // end if;

		return $check;

	} // end check;

} // end class City;
