<?php
/**
 * WPDev Dashboard Widgets
 *
 * Network/site dashboard metaboxes for WP core screens (CONTEXT_WP_CORE).
 * WPDev financial statistics widgets use Dashboard_Widget_Registry in admin-widget-builder.
 *
 * @package WPDev
 * @subpackage Logger
 * @since 2.0.0
 */

namespace WPDevFramework;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * WPDev Dashboard Widgets
 *
 * @since 2.0.0
 */
class Dashboard_Widgets {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Network Dashboard Screen Id
	 *
	 * @since 2.0.0
	 * @var string
	 */
	public $screen_id = 'dashboard-network';

	/**
	 * Undocumented variable
	 *
	 * @since 2.0.0
	 * @var array
	 */
	public $core_metaboxes = array();

	/**
	 * Runs on singleton instantiation.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {

		add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));

		add_action('wp_network_dashboard_setup', array($this, 'register_network_widgets'));

		add_action('wp_dashboard_setup', array($this, 'register_widgets'));

		wpdev_require_public_function( 'ajax' );

		wpdev_register_ajax_handler( 'wpdev_fetch_rss', array( $this, 'process_ajax_fetch_rss' ) );
		wpdev_register_ajax_handler( 'wpdev_fetch_activity', array( $this, 'process_ajax_fetch_events' ) );
		wpdev_register_ajax_handler( 'wpdev_generate_csv', array( $this, 'handle_table_csv' ) );

	} // end init;

	/**
	 * Enqueues the JavaScript code that sends the dismiss call to the ajax endpoint.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function enqueue_scripts() {

		global $pagenow;

		if (!$pagenow || $pagenow !== 'index.php') {

			return;

		} // end if;

		wp_enqueue_script('wpdev-vue');

		wp_enqueue_script('moment');

	} // end enqueue_scripts;

	/**
	 * Register the widgets
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_network_widgets() {

		add_meta_box('wpdev-setup', __('WPDev - First Steps', 'wpdev'), array($this, 'output_widget_first_steps'), $this->screen_id, 'normal', 'high');

		add_meta_box('wpdev-news', __('WPDev - News & Discussions', 'wpdev'), array($this, 'output_widget_news'), $this->screen_id, 'side', 'low');

		add_meta_box('wpdev-summary', __('WPDev - Summary', 'wpdev'), array($this, 'output_widget_summary'), $this->screen_id, 'normal', 'high');

		add_meta_box('wpdev-activity-stream', __('WPDev - Activity Stream', 'wpdev'), array($this, 'output_widget_activity_stream'), $this->screen_id, 'normal', 'high');

		wpdev_create_tour('dashboard', array(
			array(
				'id'    => 'welcome',
				'title' => __('Welcome!', 'wpdev'),
				'text'  => array(
					__('Welcome to your new network dashboard!', 'wpdev'),
					__('You will notice that <strong>WPDev</strong> adds a couple of useful widgets here so you can keep an eye on how your network is doing.', 'wpdev'),
				),
			),
			array(
				'id'       => 'finish-your-setup',
				'title'    => __('Finish your setup', 'wpdev'),
				'text'     => array(
					__('You still have a couple of things to do configuration-wise. Check the steps on this list and make sure you complete them all.', 'wpdev'),
				),
				'attachTo' => array(
					'element' => '#wpdev-setup',
					'on'      => 'left',
				),
			),
			array(
				'id'       => 'wpdev-menu',
				'title'    => __('Our home', 'wpdev'),
				'text'     => array(
					__('You can always find WPDev settings and other pages under our menu item, here on the Network-level dashboard. 😃', 'wpdev'),
				),
				'attachTo' => array(
					'element' => '.toplevel_page_wpdev',
					'on'      => 'left',
				),
			),
		));

	} // end register_network_widgets;

	/**
	 * Adds the customer's site's dashboard widgets.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_widgets() {

		$screen = get_current_screen();

		if ( ! $screen ) {
			return;
		}

		/*
		 * Customer-panel widgets (examples-owned UI elements).
		 */
		if ( class_exists( '\WPDevFramework\UI\Account_Summary_Element' ) ) {
			\WPDevFramework\UI\Account_Summary_Element::get_instance()->as_metabox( $screen->id, 'normal' );
		}

		if ( class_exists( '\WPDevFramework\UI\Limits_Element' ) ) {
			\WPDevFramework\UI\Limits_Element::get_instance()->as_metabox( $screen->id, 'side' );
		}

		if ( wpdev_get_setting( 'maintenance_mode' ) && class_exists( '\WPDevFramework\UI\Site_Maintenance_Element' ) ) {
			\WPDevFramework\UI\Site_Maintenance_Element::get_instance()->as_metabox( $screen->id, 'side' );
		}

		if ( wpdev_get_setting( 'enable_domain_mapping' ) && wpdev_get_setting( 'custom_domains' ) && class_exists( '\WPDevFramework\UI\Domain_Mapping_Element' ) ) {
			\WPDevFramework\UI\Domain_Mapping_Element::get_instance()->as_metabox( $screen->id, 'side' );
		}

	} // end register_widgets;

	/**
	 * Widget First Steps Output.
	 *
	 * @since 2.0.0
	 *
	 * @return void
	 */
	public function output_widget_first_steps() {

		$initial_setup_done = get_network_option(null, 'wpdev_setup_finished', false);

		$steps = array(
			'inital-setup'        => array(
				'title'        => __('Initial Setup', 'wpdev'),
				'desc'         => __('Go through the initial Setup Wizard to configure the basic settings of your network.', 'wpdev'),
				'action_label' => __('Finish the Setup Wizard', 'wpdev'),
				'action_link'  => wpdev_network_admin_url('wpdev-setup'),
				'done'         => wpdev_string_to_bool($initial_setup_done),
			),
			'payment-method'      => array(
				'title'        => __('Payment Method', 'wpdev'),
				'desc'         => __('You will need to configure at least one payment gateway to be able to receive money from your customers.', 'wpdev'),
				'action_label' => __('Add a Payment Method', 'wpdev'),
				'action_link'  => wpdev_network_admin_url('wpdev-settings', array(
					'tab' => 'payment-gateways',
				)),
				'done'         => ! empty( wpdev_call_if_function_exists( 'wpdev_get_active_gateways', static function () {
					return array();
				} ) ),
			),
			'your-first-customer' => array(
				'done'         => ! empty( wpdev_call_if_function_exists( 'wpdev_get_customers', static function () {
					return array();
				} ) ),
				'title'        => __('Your First Customer', 'wpdev'),
				'desc'         => __('Open the link below in an incognito tab and go through your newly created signup form.', 'wpdev'),
				'action_link'  => wp_registration_url(),
				'action_label' => __('Create a test Account', 'wpdev'),
			),
		);

		$done = \WPDevFramework\Dependencies\Arrch\Arrch::find($steps, array(
			'where' => array(
				array('done', true),
			),
		));

		wpdev_get_template('dashboard-widgets/first-steps', array(
			'steps'      => $steps,
			'percentage' => round(count($done) / count($steps) * 100),
			'all_done'   => count($done) === count($steps),
		));

	} // end output_widget_first_steps;

	/**
	 * Widget News Output.
	 *
	 * @since 2.0.0
	 *
	 * @return void
	 */
	public function output_widget_news() {

		wpdev_get_template('dashboard-widgets/news');

	} // end output_widget_news;

	/**
	 * Widget Activity Stream Output.
	 *
	 * @since 2.0.0
	 *
	 * @return void
	 */
	public function output_widget_activity_stream() {

		wpdev_get_template('dashboard-widgets/activity-stream');

	} // end output_widget_activity_stream;

	/**
	 * Widget Summary Output
	 *
	 * @since 2.0.0
	 *
	 * @return void
	 */
	public function output_widget_summary() {
		/*
		 * Get today's signups.
		 */
		$signups = wpdev_call_if_function_exists(
			'wpdev_get_customers',
			static function () {
				return 0;
			},
			array(
				'count'      => true,
				'date_query' => array(
					'column'    => 'date_registered',
					'after'     => 'today',
					'inclusive' => true,
				),
			)
		);

		wpdev_get_template('dashboard-widgets/summary', array(
			'signups'       => $signups,
			'mrr'           => wpdev_call_if_function_exists( 'wpdev_calculate_mrr', static function () {
				return 0;
			} ),
			'gross_revenue' => wpdev_call_if_function_exists( 'wpdev_calculate_revenue', static function () {
				return 0;
			}, 'today' ),
		));

	} // end output_widget_summary;

	/**
	 * Process Ajax Filters for rss.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function process_ajax_fetch_rss() {

		$atts = wp_parse_args(
			$_GET,
			array(
				'title'        => __( 'Forum Discussions', 'wpdev' ),
				'items'        => 3,
				'show_summary' => 1,
				'show_author'  => 0,
				'show_date'    => 1,
			)
		);

		$atts['url'] = 'https://community.wpdev.ir/topics/feed';

		wp_widget_rss_output( $atts );

		exit;

	} // end process_ajax_fetch_rss;

	/**
	 * Process Ajax Filters for rss.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function process_ajax_fetch_events() {

		check_ajax_referer('wpdev_activity_stream');

		if ( ! function_exists( 'wpdev_get_events' ) ) {
			wpdev_require_public_function( 'ajax' );
			wpdev_ajax_success(
				array(
					'events' => array(),
					'count'  => 0,
				),
				'activity_stream'
			);
			return;
		}

		$count = wpdev_get_events(array(
			'count'  => true,
			'number' => -1,
		));

		$data = wpdev_get_events(array(
			'offset' => (wpdev_request('page', 1) - 1) * 5,
			'number' => 5,
		));

		wpdev_require_public_function( 'ajax' );
		wpdev_ajax_success(
			array(
				'events' => $data,
				'count'  => $count,
			),
			'activity_stream'
		);

	} // end process_ajax_fetch_events;

	/**
	 * Handle ajax endpoint to generate table CSV.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_table_csv() {

		$date_range = wpdev_request('date_range');
		$headers    = json_decode(stripslashes((string) wpdev_request('headers')));
		$data       = json_decode(stripslashes((string) wpdev_request('data')));

		$file_name = sprintf('wpdev-%s_%s_(%s)', wpdev_request('slug'), $date_range, gmdate('Y-m-d', wpdev_get_current_time('timestamp')));

		$data = array_merge(array($headers), $data);

		wpdev_generate_csv($file_name, $data);

		die;

	} // end handle_table_csv;

	/**
	 * Get the registered widgets.
	 *
	 * @since 2.0.0
	 * @return array
	 */
	public static function get_registered_dashboard_widgets() {

		global $wp_meta_boxes, $wp_registered_widgets;

		ob_start();

		if (!function_exists('wp_add_dashboard_widget')) {

			require_once ABSPATH . '/wp-admin/includes/dashboard.php';

		} // end if;

		do_action('wp_network_dashboard_setup'); // phpcs:ignore

		ob_clean(); // Prevent eventual echos.

		$dashboard_widgets = wpdev_get_isset($wp_meta_boxes, 'dashboard-network', array());

		$options = array(
			'normal:core:dashboard_right_now'         => __('At a Glance'),
			'normal:core:network_dashboard_right_now' => __('Right Now'),
			'normal:core:dashboard_activity'          => __('Activity'),
			'normal:core:dashboard_primary'           => __('WordPress Events and News'),
		);

		foreach ($dashboard_widgets as $position => $priorities) {

			foreach ($priorities as $priority => $widgets) {

				foreach ($widgets as $widget_key => $widget) {

					if (empty($widget) || wpdev_get_isset($widget, 'title') === false) {

						continue;

					} // end if;

					$key = implode(':', array(
						$position,
						$priority,
						$widget_key,
					));

					/**
					 * For some odd reason, in some cases, $options
					 * becomes a bool and the assignment below throws a fatal error.
					 * This checks prevents that error from happening.
					 * I don't know why $options would ever be a boolean here, though.
					 */
					if (!is_array($options)) {

						$options = array();

					} // end if;

					$options[$key] = $widget['title'];

				} // end foreach;

			} // end foreach;

		} // end foreach;

		return $options;

	} // end get_registered_dashboard_widgets;

} // end class Dashboard_Widgets;
