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
class Unique extends Rule {

	/**
	 * Error message to be returned when this value has been used.
	 *
	 * @since 2.0.0
	 * @var string
	 */
	protected $message = ':attribute :value has been used';

	/**
	 * Parameters that this rule accepts.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	protected $fillableParams = array('model', 'column', 'self_id'); // phpcs:ignore

	/**
	 * Performs the actual check.
	 *
	 * @since 2.0.0
	 *
	 * @param mixed $value Value being checked.
	 */
	public function check($value) : bool {

		$this->requireParameters(array(
			'model',
			'column',
		));

		$column  = $this->parameter('column');
		$model   = $this->parameter('model');
		$self_id = $this->parameter('self_id');

		switch ($model) {
			case '\WP_User':
				$callback = 'get_user_by';
				break;
			default:
				$callback = array($model, 'get_by');
				break;
		}

		// do query
		$existing = call_user_func($callback, $column, $value);

		$user_models = array(
			'\WP_User',
			'\WPDevFramework\Models\Customer',
		);

		/*
		* Customize the error message for the customer.
		*/
		if (in_array($model, $user_models, true)) {

			$this->message = __('A customer with the same email address or username already exists.', 'wpdev');

		} // end if;

		if (!$existing) {

			return true;

		} // end if;

		$id = method_exists($existing, 'get_id') ? $existing->get_id() : $existing->id;

		return absint($id) === absint($self_id);

	} // end check;

} // end class Unique;
