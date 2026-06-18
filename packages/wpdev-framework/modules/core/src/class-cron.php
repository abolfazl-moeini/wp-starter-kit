<?php
/**
 * Cron Checks
 *
 * Adds the recurring events we use to
 * check if memberships should be manually
 * renewed, marked as expired, etc.
 *
 * @package WPDev
 * @subpackage Managers/Membership_Manager
 * @since 2.0.0
 */

namespace WPDevFramework;

use \WPDevFramework\Database\Memberships\Membership_Status;
use \WPDevFramework\Database\Payments\Payment_Status;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Adds the recurring events we use to
 * check if memberships should be manually
 * renewed, marked as expired, etc.
 *
 * @since 2.0.0
 */
class Cron {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Instantiate the necessary hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {
		/*
		 * Creates general schedules for general uses.
		 */
		add_action('init', array($this, 'create_schedules'));

		/*
		 * Deals with renewals for non-auto-renewing
		 * memberships.
		 *
		 * First hook registers the check schedule.
		 * The second hook adds the handler to be called on that schedule.
		 * The third one deals with each membership that needs to be manually renewed.
		 */
		add_action('init', array($this, 'schedule_membership_check'));

		add_action('wpdev_membership_check', array($this, 'membership_renewal_check'), 10);

		add_action('wpdev_membership_check', array($this, 'membership_trial_check'), 10);

		add_action('wpdev_async_create_renewal_payment', array($this, 'async_create_renewal_payment'), 10, 2);

		/*
		 * On that same check, we'll
		 * search for expired memberships
		 * and mark them as such.
		 */
		add_action('wpdev_membership_check', array($this, 'membership_expired_check'), 20);

		add_action('wpdev_async_mark_membership_as_expired', array($this, 'async_mark_membership_as_expired'), 10);

	} // end init;

	/**
	 * Creates the recurring schedules for WPDev.
	 *
	 * By default, we create a hourly, daily, and monthly schedules.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function create_schedules() {
		/*
		 * Hourly check
		 */
		if (wpdev_next_scheduled_action('wpdev_hourly') === false) {

			$next_hour = strtotime(gmdate('Y-m-d H:00:00', strtotime('+1 hour')));

			wpdev_schedule_recurring_action($next_hour, HOUR_IN_SECONDS, 'wpdev_hourly', array(), 'wpdev_cron');

		} // end if;

		/*
		 * Daily check
		 */
		if (wpdev_next_scheduled_action('wpdev_daily') === false) {

			wpdev_schedule_recurring_action(strtotime('tomorrow'), DAY_IN_SECONDS, 'wpdev_daily', array(), 'wpdev_cron');

		} // end if;

		/*
		 * Monthly check
		 */
		if (wpdev_next_scheduled_action('wpdev_monthly') === false) {

			$next_month = strtotime(gmdate('Y-m-01 00:00:00', strtotime('+1 month')));

			wpdev_schedule_recurring_action($next_month, MONTH_IN_SECONDS, 'wpdev_monthly', array(), 'wpdev_cron');

		} // end if;

	} // end create_schedules;

	/**
	 * Creates the default membership checking schedule.
	 *
	 * By default, checks every hour.
	 *
	 * @see wpdev_schedule_membership_check_interval
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function schedule_membership_check() {

		if ( ! $this->membership_examples_available() ) {
			return;
		}

		$interval = apply_filters('wpdev_schedule_membership_check_interval', 1 * HOUR_IN_SECONDS);

		if (wpdev_next_scheduled_action('wpdev_membership_check') === false) {

			wpdev_schedule_recurring_action(time(), $interval, 'wpdev_membership_check', array(), 'wpdev_cron');

		} // end if;

	} // end schedule_membership_check;

	/**
	 * Checks if non-auto-renewable memberships need work.
	 *
	 * This creates pending payments, emails the link to pay
	 * and marks the membership as on-hold.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function membership_renewal_check() {

		if ( ! $this->membership_examples_available() ) {
			return;
		}

		/*
     	 * Define how many days before we need to
		 * create pending payments.
		 */
		$days_before_expiring = apply_filters('wpdev_membership_renewal_days_before_expiring', 3);

		$query_params = apply_filters('wpdev_membership_renewal_check_query_params', array(
			'auto_renew' => false,
			'status__in' => array(
				Membership_Status::ACTIVE,
			),
			'date_query' => array(
				'column'    => 'date_expiration',
				'before'    => "+{$days_before_expiring} days",
				'after'     => 'yesterday',
				'inclusive' => true,
			),
		), $days_before_expiring);

		$memberships = wpdev_get_memberships($query_params);

		/*
		 * Loop our memberships, triggering
		 * a new async call for each one.
		 */
		foreach ($memberships as $membership) {

			wpdev_enqueue_async_action('wpdev_async_create_renewal_payment', array(
				'membership_id' => $membership->get_id(),
			), 'wpdev_cron_check');

		} // end foreach;

	} // end membership_renewal_check;

	/**
	 * Checks if trialing memberships need work.
	 *
	 * This creates pending payments, emails the link to pay
	 * and marks the membership as on-hold.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function membership_trial_check() {

		if ( ! $this->membership_examples_available() ) {
			return;
		}

		$query_params = apply_filters('wpdev_membership_trial_check_query_params', array(
			'auto_renew' => false,
			'status__in' => array(
				Membership_Status::TRIALING,
			),
			'date_query' => array(
				'column'    => 'date_trial_end',
				'before'    => '-3 hours',
				'inclusive' => true,
			),
		));

		$memberships = wpdev_get_memberships($query_params);

		/*
		 * Loop our memberships, triggering
		 * a new async call for each one.
		 */
		foreach ($memberships as $membership) {

			wpdev_enqueue_async_action('wpdev_async_create_renewal_payment', array(
				'membership_id' => $membership->get_id(),
				'trial'         => true,
			), 'wpdev_cron_check');

		} // end foreach;

	} // end membership_trial_check;

	/**
	 * Creates the pending payment for a renewing membership.
	 *
	 * @since 2.0.0
	 *
	 * @param int  $membership_id The membership id.
	 * @param bool $trial If the membership was in a trial state before.
	 * @return \WP_Error|bool
	 */
	public function async_create_renewal_payment($membership_id, $trial = false) {

		if ( ! $this->membership_examples_available()
			|| ! function_exists( 'wpdev_membership_create_new_payment' )
			|| ! function_exists( 'wpdev_get_registration_url' ) ) {
			return false;
		}

		$membership = wpdev_get_membership($membership_id);

		if (empty($membership)) {

			return false;

		} // end if;

		/*
		 * List of things to do:
		 *
		 * 1. Check for an existing pending payment.
		 * - If it exists, bail.
		 * 2. Create a new pending payment.
		 * 3. Change the status to on-hold.
		 * 4. Add note to membership about this.
		 */
		$pending_payment = $membership->get_last_pending_payment();

		if (empty($pending_payment)) {

			$new_payment = wpdev_membership_create_new_payment($membership, false, !$trial);

			/*
			 * Update the membership status.
			 */
			$membership->set_status(Membership_Status::ON_HOLD);

			$saved = $membership->save();

			$payment_url = add_query_arg(array(
				'payment' => $new_payment->get_hash(),
			), wpdev_get_registration_url());

			$payload = array_merge(
				array(
					'default_payment_url' => $payment_url,
				),
				wpdev_generate_event_payload('payment', $new_payment),
				wpdev_generate_event_payload('membership', $membership),
				wpdev_generate_event_payload('customer', $membership->get_customer())
			);

			wpdev_do_event('renewal_payment_created', $payload);

			return $saved;

		} // end if;

		return true;

	} // end async_create_renewal_payment;

	/**
	 * Checks if any memberships need to be marked as expired.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function membership_expired_check() {

		if ( ! $this->membership_examples_available() ) {
			return;
		}

		/*
		 * Define how many grace period
		 * days we allow for our customers.
		 */
		$grace_period_days = apply_filters('wpdev_membership_grace_period_days', 3);

		$query_params = apply_filters('wpdev_membership_expired_check_query_params', array(
			'auto_renew'              => false,
			'status__in'              => array(
				Membership_Status::ACTIVE,
				Membership_Status::ON_HOLD,
			),
			'date_expiration__not_in' => array(null, '0000-00-00 00:00:00'),
			'date_query'              => array(
				'column'    => 'date_expiration',
				'before'    => "-{$grace_period_days} days",
				'inclusive' => true,
			),
		), $grace_period_days);

		$memberships = wpdev_get_memberships($query_params);

		/*
		 * Loop our memberships, triggering
		 * a new async call for each one.
		 */
		foreach ($memberships as $membership) {

			wpdev_enqueue_async_action('wpdev_async_mark_membership_as_expired', array(
				'membership_id' => $membership->get_id(),
			), 'wpdev_cron_check');

		} // end foreach;

	} // end membership_expired_check;

	/**
	 * Marks expired memberships as such.
	 *
	 * @since 2.0.0
	 *
	 * @param int $membership_id The membership ID.
	 * @return \WP_Error|true
	 */
	public function async_mark_membership_as_expired($membership_id) {

		if ( ! $this->membership_examples_available() ) {
			return false;
		}

		$membership = wpdev_get_membership($membership_id);

		if (empty($membership)) {

			return false;

		} // end if;

		/*
		 * Update the membership status.
		 */
		$membership->set_status(Membership_Status::EXPIRED);

		/*
		 * Old memberships can be linked to plans
		 * that no longer exist and other such things,
		 * so we need to bypass validation.
		 */
		$membership->set_skip_validation(true);

		return $membership->save();

	} // end async_mark_membership_as_expired;

	/**
	 * Whether membership example APIs are loaded (wpdev-examples memberships module).
	 *
	 * @since 2.8.4
	 * @return bool
	 */
	protected function membership_examples_available() {

		return function_exists( 'wpdev_get_memberships' ) && function_exists( 'wpdev_get_membership' );

	} // end membership_examples_available;

} // end class Cron;
