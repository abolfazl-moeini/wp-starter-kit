<?php
/**
 * Adds the Tours UI to the Admin Panel.
 *
 * @package WPDevFramework\Core\Tour
 * @since 2.0.0
 */

namespace WPDevFramework\Core\Tour;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Adds the Tours UI to the Admin Panel.
 *
 * @since 2.0.0
 */
class Tours {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Registered tours.
	 *
	 * @since 2.0.0
	 * @var array
	 */
	protected $tours = array();

	/**
	 * Element construct.
	 *
	 * @since 2.0.0
	 */
	public function __construct() {

		wpdev_require_public_function( 'ajax' );
		wpdev_register_ajax_handler(
			'wpdev_mark_tour_as_finished',
			array( $this, 'mark_as_finished' ),
			array(
				'transport'    => 'admin',
				'nonce_action' => 'wpdev_tour_finished',
				'capability'   => 'read',
			)
		);

		add_action('admin_enqueue_scripts', array($this, 'register_scripts'));

		add_action('in_admin_footer', array($this, 'enqueue_scripts'));

	} // end __construct;

	/**
	 * User meta key for a tour completion flag.
	 *
	 * @since 2.8.3
	 *
	 * @param string $id Tour id.
	 * @return string
	 */
	protected function tour_meta_key( $id ) {

		$id = preg_replace( '/[^A-Za-z0-9_-]+/', '', (string) $id );

		return 'wpdev_tour_' . $id;

	} // end tour_meta_key;

	/**
	 * Whether the current user has finished a tour.
	 *
	 * @since 2.8.3
	 *
	 * @param string $id      Tour id.
	 * @param int    $user_id Optional user id.
	 * @return bool
	 */
	protected function user_finished_tour( $id, $user_id = 0 ) {

		$user_id = $user_id ? (int) $user_id : get_current_user_id();

		if ( ! $user_id ) {
			return false;
		}

		$meta_key = $this->tour_meta_key( $id );

		if ( get_user_meta( $user_id, $meta_key, true ) ) {
			return true;
		}

		// Back-compat: older releases stored this in admin user-settings.
		return (bool) get_user_setting( $meta_key, false );

	} // end user_finished_tour;

	/**
	 * Persist tour completion for a user.
	 *
	 * @since 2.8.3
	 *
	 * @param string $id      Tour id.
	 * @param int    $user_id Optional user id.
	 * @return bool
	 */
	protected function mark_user_tour_finished( $id, $user_id = 0 ) {

		$user_id = $user_id ? (int) $user_id : get_current_user_id();

		if ( ! $user_id || ! $id ) {
			return false;
		}

		$meta_key = $this->tour_meta_key( $id );

		update_user_meta( $user_id, $meta_key, 1 );

		// Keep legacy user-settings in sync for older code paths.
		set_user_setting( $meta_key, 1 );

		return true;

	} // end mark_user_tour_finished;

	/**
	 * Mark the tour as finished for a particular user.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function mark_as_finished() {

		$id = wpdev_request( 'tour_id' );

		if ( $id && $this->mark_user_tour_finished( $id ) ) {
			wpdev_require_public_function( 'ajax' );
			wpdev_ajax_success( array( 'tour_id' => $id ), 'tour_finished' );
		}

		wpdev_require_public_function( 'ajax' );
		wpdev_ajax_error( __( 'Invalid tour id.', 'wpdev' ), 'invalid_tour', null, 400 );

	} // end mark_as_finished;

	/**
	 * Register the necessary scripts.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_scripts() {

		wpdev()->scripts->register_script('wpdev-shepherd', wpdev_get_module_asset_url('core', 'lib/shepherd.js', 'js'), array());

		wpdev()->scripts->register_script('wpdev-tours', wpdev_get_module_asset_url('core', 'tours.js', 'js'), array('wpdev-shepherd', 'underscore'));

	}  // end register_scripts;

	/**
	 * Enqueues the scripts, if we need to.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function enqueue_scripts() {

		if ($this->has_tours()) {

			wp_localize_script('wpdev-tours', 'wpdev_tours', $this->tours);

			wp_localize_script('wpdev-tours', 'wpdev_tours_vars', array(
				'ajaxurl' => admin_url( 'admin-ajax.php' ),
				'nonce'   => wp_create_nonce('wpdev_tour_finished'),
				'i18n'    => array(
					'next'   => __('Next', 'wpdev'),
					'finish' => __('Close', 'wpdev')
				),
			));

			wp_enqueue_script('wpdev-tours');

		} // end if;

	}  // end enqueue_scripts;

	/**
	 * Checks if we have registered tours.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function has_tours() {

		return !empty($this->tours);

	} // end has_tours;

	/**
	 * Register a new tour.
	 *
	 * @see https://shepherdjs.dev/docs/
	 *
	 * @since 2.0.0
	 *
	 * @param string  $id The id of the tour.
	 * @param array   $steps The tour definition. Check shepherd.js docs.
	 * @param boolean $once Whether or not we will show this more than once.
	 * @return void
	 */
	public function create_tour($id, $steps = array(), $once = true) {

		if (did_action('in_admin_header')) {

			return;

		} // end if;

		add_action('in_admin_header', function() use ($id, $steps, $once) {

			$force_hide = wpdev_get_setting('hide_tours', false);

			if ($force_hide) {

				return;

			} // end if;

			$finished = apply_filters(
				'wpdev_tour_finished',
				$this->user_finished_tour( $id ),
				$id,
				get_current_user_id()
			);

			if (!$finished || !$once) {

				foreach ($steps as &$step) {

					$step['text'] = is_array($step['text']) ? implode('</p><p>', $step['text']) : $step['text'];

					$step['text'] = sprintf('<p>%s</p>', $step['text']);

				} // end foreach;

				$this->tours[$id] = $steps;

			} // end if;

		});

	} // end create_tour;

} // end class Tours;

/**
 * @deprecated 2.5.0 Use WPDevFramework\Core\Tour\Tours.
 */
class_alias( Tours::class, 'WPDevFramework\UI\Tours' );
