<?php
/**
 * Tour service wrapper.
 *
 * @package WPDevFramework\Core\Services
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Services;

use WPDevFramework\Core\Contracts\Service_Contract;
use WPDevFramework\Core\Tour\Tours;

defined( 'ABSPATH' ) || exit;

/**
 * Boots Tours from modules/core and exposes tour registration API.
 */
class Tour_Service implements Service_Contract {

	/**
	 * Legacy tours instance.
	 *
	 * @var Tours|null
	 */
	protected $tours;

	/**
	 * {@inheritdoc}
	 */
	public function id() {

		return 'tour';

	} // end id;

	/**
	 * {@inheritdoc}
	 */
	public function boot() {

		require_once dirname( __DIR__ ) . '/tour/class-tours.php';

		$this->tours = Tours::get_instance();

	} // end boot;

	/**
	 * Register a tour definition (alias for create_tour).
	 *
	 * @param string               $id   Tour id.
	 * @param array<string, mixed> $args Tour configuration (steps array or full args).
	 * @return void
	 */
	public function register( $id, $args ) {

		$steps = isset( $args['steps'] ) ? $args['steps'] : $args;
		$once  = isset( $args['once'] ) ? (bool) $args['once'] : true;

		$this->create_tour( $id, $steps, $once );

	} // end register;

	/**
	 * Register a Shepherd.js tour.
	 *
	 * @param string  $id    Tour id.
	 * @param array   $steps Tour steps.
	 * @param boolean $once  Show once per user.
	 * @return void
	 */
	public function create_tour( $id, $steps = array(), $once = true ) {

		$this->instance()->create_tour( $id, $steps, $once );

	} // end create_tour;

	/**
	 * Check if a tour has been finished/seen by a user.
	 *
	 * @param string $id      Tour id.
	 * @param int    $user_id Optional user id.
	 * @return bool
	 */
	public function is_tour_finished( $id, $user_id = 0 ) {

		return $this->instance()->is_tour_finished( $id, $user_id );

	} // end is_tour_finished;

	/**
	 * Mark a tour as finished/seen for a user.
	 *
	 * @param string $id      Tour id.
	 * @param int    $user_id Optional user id.
	 * @return bool
	 */
	public function mark_tour_finished( $id, $user_id = 0 ) {

		return $this->instance()->mark_tour_finished( $id, $user_id );

	} // end mark_tour_finished;

	/**
	 * Reset a tour seen flag for a user.
	 *
	 * @param string $id      Tour id.
	 * @param int    $user_id Optional user id.
	 * @return bool
	 */
	public function reset_tour( $id, $user_id = 0 ) {

		return $this->instance()->reset_tour( $id, $user_id );

	} // end reset_tour;

	/**
	 * Return legacy tours instance.
	 *
	 * @return Tours
	 */
	public function instance() {

		if ( ! $this->tours ) {
			require_once dirname( __DIR__ ) . '/tour/class-tours.php';
			$this->tours = Tours::get_instance();
		}

		return $this->tours;

	} // end instance;

} // end class Tour_Service;
