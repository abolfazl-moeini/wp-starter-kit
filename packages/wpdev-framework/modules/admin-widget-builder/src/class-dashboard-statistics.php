<?php
/**
 * WPDev Dashboard Statistics.
 *
 * Log string messages to a file with a timestamp. Useful for debugging.
 *
 * @package WPDev
 * @subpackage Logger
 * @since 2.0.0
 */

namespace WPDevFramework;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * WPDev Dashboard Statistics
 *
 * @since 2.0.0
 */
class Dashboard_Statistics {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * The initial date of the statistics.
	 *
	 * @var string
	 */
	protected $start_date;

	/**
	 * The final date of the statistics.
	 *
	 * @var string
	 */
	protected $end_date;

	/**
	 * What kind of information you need.
	 *
	 * @var array
	 */
	protected $types = array();

	/**
	 * Loads the hooks we need for dismissing notices
	 *
	 * @since 2.0.0
	 *
	 * @param array $args With the start_date, end_date and the data type functions.
	 * @return void.
	 */
	public function __construct($args = array()) {

		if ($args) {

			$this->start_date = $args['start_date'];

			$this->end_date = $args['end_date'];

			$this->types = $args['types'];

		} // end if;

	} // end __construct;

	/**
	 * Runs on singleton instantiation.
	 *
	 * @since 2.0.0
	 * @return void.
	 */
	public function init() {} // end init;

	/**
	 * Main function to call the get data functions based on the array of types.
	 *
	 * @since 2.0.0
	 * @return array With all the data requested.
	 */
	public function statistics_data() {

		$data = array();

		foreach ($this->types as $key => $type) {

			$data_function = 'get_data_' . $type;

			$data[$key] = $this->$data_function();

		} // end foreach;

		return $data;

	} // end statistics_data;

	/**
	 * Get data of all completed and refunded payments to show in the main graph.
	 *
	 * Returns a zeroed-out 12-month bucket by default. Domain data is layered
	 * on top via the `wpdev_dashboard_statistics_datasource` filter so that
	 * the framework stays free of memberships / payment coupling.
	 *
	 * Examples owning the actual data (e.g. wpdev-memberships) should hook in
	 * and populate the relevant month buckets. If no example provides data
	 * the chart renders empty rather than fataling.
	 *
	 * @since 2.0.0
	 * @since 2.8.1 Generic service: memberships-specific block moved to
	 *              wpdev-examples/memberships via the datasource filter.
	 *
	 * @return array With total gross data per month.
	 */
	public function get_data_mrr_growth() {

		$payments_per_month = array(
			'january'   => array(
				'total'     => 0,
				'cancelled' => 0,
			),
			'february'  => array(
				'total'     => 0,
				'cancelled' => 0,
			),
			'march'     => array(
				'total'     => 0,
				'cancelled' => 0,
			),
			'april'     => array(
				'total'     => 0,
				'cancelled' => 0,
			),
			'may'       => array(
				'total'     => 0,
				'cancelled' => 0,
			),
			'june'      => array(
				'total'     => 0,
				'cancelled' => 0,
			),
			'july'      => array(
				'total'     => 0,
				'cancelled' => 0,
			),
			'august'    => array(
				'total'     => 0,
				'cancelled' => 0,
			),
			'september' => array(
				'total'     => 0,
				'cancelled' => 0,
			),
			'october'   => array(
				'total'     => 0,
				'cancelled' => 0,
			),
			'november'  => array(
				'total'     => 0,
				'cancelled' => 0,
			),
			'december'  => array(
				'total'     => 0,
				'cancelled' => 0,
			),
		);

		/**
		 * Allow examples to populate MRR / churn buckets for a given period.
		 *
		 * Returning a non-null value short-circuits the default empty dataset.
		 * Examples should return an array with the same month bucket shape so
		 * the dashboard chart and CSV export stay stable.
		 *
		 * @since 2.8.1
		 *
		 * @param array|null $buckets            Default empty 12-month dataset.
		 * @param string     $this->start_date Start date (Y-m-d).
		 * @param string     $this->end_date   End date (Y-m-d).
		 */
		$override = apply_filters( 'wpdev_dashboard_statistics_datasource', null, $this->start_date, $this->end_date );

		if ( is_array( $override ) ) {
			return $override;
		}

		return $payments_per_month;

	} // end get_data_mrr_growth;

} // end class Dashboard_Statistics;
