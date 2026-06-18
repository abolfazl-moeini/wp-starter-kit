<?php
/**
 * Adds a validation rules that allows us to check if a given parameter is unique.
 *
 * @package WPDev
 * @subpackage Helpers/Validation_Rules
 * @since 2.0.0
 */

namespace WPDevFramework\Helpers\Validation_Rules;

use WPDevFramework\Dependencies\Rakit\Validation\Rule;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Adds a validation rules that allows us to check if a given parameter is unique.
 *
 * @since 2.0.0
 */
class Unique_Site extends Rule {

	/**
	 * Error message to be returned when this value has been used.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	protected $message = '';

	/**
	 * Parameters that this rule accepts.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	protected $fillableParams = array('self_id'); // phpcs:ignore
	/**
	 * Performs the actual check.
	 *
	 * @since 2.0.0
	 *
	 * @param mixed $value Value being checked.
	 */
 public function check($value) : bool { // phpcs:ignore

		$this->requireParameters(array());

		$self_id = $this->parameter('self_id');

		$results = wpmu_validate_blog_signup($value, 'Test Title');

		if ($results['errors']->has_errors()) {

			$this->message = $results['errors']->get_error_message();

			return false;

		} // end if;

		return true;

	} // end check;

} // end class Unique_Site;
