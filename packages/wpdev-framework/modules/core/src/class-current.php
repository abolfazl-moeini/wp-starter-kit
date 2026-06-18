<?php
/**
 * WPDev class to hold current objects
 *
 * @package WPDev
 * @subpackage Current
 * @since 2.0.0
 */

namespace WPDevFramework;

// Exit if accessed directly
defined( 'ABSPATH' ) || exit;

/**
 * WPDev class to hold current objects
 *
 * @since 2.0.0
 */
class Current {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * The current site instance.
	 *
	 * @since 2.0.0
	 * @var \WPDevFramework\Models\Site
	 */
	protected $site;

	/**
	 * The current customer instance.
	 *
	 * @since 2.0.0
	 * @var \WPDevFramework\Models\Customer
	 */
	protected $customer;

	/**
	 * The current membership instance.
	 *
	 * @since 2.0.18
	 * @var \WPDevFramework\Models\Membership
	 */
	protected $membership;

	/**
	 * Wether or not the site was set via request.
	 *
	 * @since 2.0.0
	 * @var boolean
	 */
	protected $site_set_via_request = false;

	/**
	 * Wether or not the customer was set via request.
	 *
	 * @since 2.0.0
	 * @var boolean
	 */
	protected $customer_set_via_request = false;

	/**
	 * Wether or not the membership was set via request.
	 *
	 * @since 2.0.18
	 * @var boolean
	 */
	protected $membership_set_via_request = false;

	/**
	 * Called when the singleton is first initialized.
	 *
	 * @return void
	 * @since 2.0.0
	 */
	public function init() {
		/*
		 * Add rewrite rules
		 */
		add_action( 'init', array( $this, 'add_rewrite_rules' ) );
		add_filter( 'query_vars', array( $this, 'add_query_vars' ) );

		add_action( 'wpdev_after_save_settings', array( $this, 'flush_rewrite_rules_on_update' ) );
		add_action( 'wpdev_core_update', array( $this, 'flush_rewrite_rules_on_update' ) );

		/*
		 * Instantiate the currents.
		 */
		add_action( 'init', array( $this, 'load_currents' ) );
		add_action( 'wp', array( $this, 'load_currents' ) );

	} // end init;

	/**
	 * Flush rewrite rules to make sure any newly added ones get installed on update.
	 *
	 * @return void
	 * @since 2.0.0
	 */
	public function flush_rewrite_rules_on_update() {

		flush_rewrite_rules();

	} // end flush_rewrite_rules_on_update;

	/**
	 * Adds a new rewrite rule to allow for pretty links.
	 *
	 * Managing a site would be done via /account/site/{$id}, for example.
	 *
	 * @return void
	 * @since 2.0.0
	 */
	public function add_rewrite_rules() {

		$site_url_param = self::param_key( 'site' );

		add_rewrite_rule(
			"(.?.+?)/{$site_url_param}/([0-9a-zA-Z]+)/?$",
			'index.php?pagename=$matches[1]&site_hash=$matches[2]',
			'top'
		);

		add_rewrite_rule(
			"blog/(.?.+?)/{$site_url_param}/([0-9a-zA-Z]+)/?$",
			'index.php?name=$matches[1]&site_hash=$matches[2]',
			'top'
		);

	} // end add_rewrite_rules;

	/**
	 * Adds the necessary query vars to support pretty links.
	 *
	 * @param  array  $query_vars  The WP_Query object.
	 *
	 * @return \WP_Query
	 * @since 2.0.0
	 *
	 */
	public function add_query_vars( $query_vars ) {

		$query_vars[] = 'site_hash';
		$query_vars[] = 'products';
		$query_vars[] = 'duration';
		$query_vars[] = 'duration_unit';
		$query_vars[] = 'template_name';
		$query_vars[] = 'wpdev_preselected';

		return $query_vars;

	} // end add_query_vars;

	/**
	 * List of URL keys to set the current objects.
	 *
	 * @param  string  $type  The type of object to get.
	 *
	 * @return string
	 * @since 2.0.0
	 */
	public static function param_key( $type = 'site' ) {

		$params = array(
			'site'       => apply_filters( 'wpdev_current_get_site_param', 'site' ),
			'customer'   => apply_filters( 'wpdev_current_get_customer_param', 'customer' ),
			'membership' => apply_filters( 'wpdev_current_get_membership_param', 'membership' ),
		);

		return wpdev_get_isset( $params, $type, $type );

	} // end param_key;

	/**
	 * Returns the URL to manage a site/customer on the front-end or back end.
	 *
	 * @param  int  $id  The site ID.
	 * @param  string  $type  The type. Can be either site or customer.
	 *
	 * @return string
	 * @since 2.0.0
	 *
	 */
	public static function get_manage_url( $id, $type = 'site' ) {

		// Uses hash instead of the ID.
		$site_hash = \WPDevFramework\Helpers\Hash::encode( $id, $type );

		if ( ! is_admin() ) {

			$current_url = rtrim( (string) wpdev_get_current_url(), '/' );

			$url_param = self::param_key( $type );

			/*
			 * Check if the current URL already has a site parameter and remove it.
			 */
			if ( strpos( $current_url, '/' . $url_param . '/' ) !== false ) {

				$current_url = preg_replace( '/\/' . $url_param . '\/(.+)/', '/', $current_url );

			} // end if;

			$pretty_url = $current_url . '/' . $url_param . '/' . $site_hash;

			$manage_site_url = get_option( 'permalink_structure' ) ? $pretty_url : add_query_arg( $url_param,
				$site_hash );

		} else {

			$manage_site_url = get_admin_url( $id );

		} // end if;

		/**
		 * Allow developers to modify the manage site URL parameters.
		 *
		 * @param  string  $manage_site_url  The manage site URL.
		 * @param  int  $id  The site ID.
		 * @param  string  $site_hash  The site hash.
		 *
		 * @return string The modified manage URL.
		 * @since 2.0.9
		 *
		 */
		return apply_filters( "wpdev_current_{$type}_get_manage_url", $manage_site_url, $id, $site_hash );

	} // end get_manage_url;

	/**
	 * Loads the current site and makes it available.
	 *
	 * @return void
	 * @since 2.0.0
	 */
	public function load_currents() {

		if ( ! function_exists( 'wpdev_get_current_customer' ) ) {
			return;
		}

		$site = false;

		/**
		 * On the front-end, we need to check for url overrides.
		 */
		if ( ! is_admin() ) {
			/*
			 * By default, we'll use the `site` parameter.
			 */
			$site_url_param = self::param_key( 'site' );

			$site_hash = wpdev_request( $site_url_param, get_query_var( 'site_hash' ) );

			if ( function_exists( 'wpdev_get_site_by_hash' ) && class_exists( '\WPDevFramework\Models\Site' ) ) {
				$site_from_url = wpdev_get_site_by_hash( $site_hash );

				if ( $site_from_url ) {

					$this->site_set_via_request = true;

					$site = $site_from_url;

				} // end if;
			}

		} // end if;

		$customer = wpdev_get_current_customer();

		/**
		 * On the front-end, we need to check for url overrides.
		 */
		if ( ! is_admin() ) {
			/*
			 * By default, we'll use the `site` parameter.
			 */
			$customer_url_param = self::param_key( 'customer' );

			if ( function_exists( 'wpdev_get_customer' ) ) {
				$customer_from_url = wpdev_get_customer( wpdev_request( $customer_url_param, 0 ) );

				if ( $customer_from_url ) {

					$this->customer_set_via_request = true;

					$customer = $customer_from_url;

				} // end if;
			}

		} // end if;

		$this->set_customer( $customer );

		$membership = false;

		/*
		 * By default, we'll use the `membership` parameter.
		 */
		$membership_url_param = self::param_key( 'membership' );

		$membership_hash = wpdev_request( $membership_url_param, get_query_var( 'membership_hash' ) );

		if ( $membership_hash && function_exists( 'wpdev_get_membership_by_hash' ) ) {

			$this->membership_set_via_request = true;

			$membership = wpdev_get_membership_by_hash( $membership_hash );

		} elseif ( $site ) {

			$membership = $site->get_membership();

		} // end if;

		if ( $customer && ! $membership ) {

			$memberships = (array) $customer->get_memberships();

			$membership = wpdev_get_isset( $memberships, 0, false );

		} // end if;

		$this->set_membership( $membership );

	} // end load_currents;

	/**
	 * Get the current site instance.
	 *
	 * @return \WPDevFramework\Models\Site
	 * @since 2.0.0
	 */
	public function get_site() {

		return $this->site;

	} // end get_site;

	/**
	 * Set the current site instance.
	 *
	 * @param  \WPDevFramework\Models\Site  $site  The current site instance.
	 *
	 * @return void
	 * @since 2.0.0
	 */
	public function set_site( $site ) {

		/**
		 * Allow developers to modify the default behavior and set
		 * the current site differently.
		 *
		 * @param  \WPDevFramework\Models\Site  $site  The current site to set.
		 * @param  self The Current class instance.
		 *
		 * @return \WPDevFramework\Models\Site
		 * @since 2.0.9
		 *
		 */
		$site = apply_filters( 'wpdev_current_set_site', $site, $this );

		$this->site = $site;

	} // end set_site;

	/**
	 * Get wether or not the site was set via request.
	 *
	 * @return boolean
	 * @since 2.0.0
	 */
	public function is_site_set_via_request() {

		return $this->site_set_via_request;

	} // end is_site_set_via_request;

	/**
	 * Get the current customer instance.
	 *
	 * @return \WPDevFramework\Models\Customer
	 * @since 2.0.0
	 */
	public function get_customer() {

		return $this->customer;

	} // end get_customer;

	/**
	 * Set the current customer instance.
	 *
	 * @param  \WPDevFramework\Models\Customer  $customer  The current customer instance.
	 *
	 * @return void
	 * @since 2.0.0
	 */
	public function set_customer( $customer ) {

		/**
		 * Allow developers to modify the default behavior and set
		 * the current customer differently.
		 *
		 * @param  \WPDevFramework\Models\Customer  $customer  The current customer to set.
		 * @param  self The Current class instance.
		 *
		 * @return \WPDevFramework\Models\Customer
		 * @since 2.0.9
		 *
		 */
		$customer = apply_filters( 'wpdev_current_set_customer', $customer, $this );

		$this->customer = $customer;

	} // end set_customer;

	/**
	 * Get the current membership instance.
	 *
	 * @return \WPDevFramework\Models\Membership
	 * @since 2.0.18
	 */
	public function get_membership() {

		return $this->membership;

	} // end get_membership;

	/**
	 * Set the current membership instance.
	 *
	 * @param  \WPDevFramework\Models\Membership  $membership  The current membership instance.
	 *
	 * @return void
	 * @since 2.0.18
	 */
	public function set_membership( $membership ) {

		/**
		 * Allow developers to modify the default behavior and set
		 * the current membership differently.
		 *
		 * @param  \WPDevFramework\Models\Membership  $membership  The current membership to set.
		 * @param  self The Current class instance.
		 *
		 * @return \WPDevFramework\Models\Membership
		 * @since 2.0.18
		 *
		 */
		$membership = apply_filters( 'wpdev_current_set_membership', $membership, $this );

		$this->membership = $membership;

	} // end set_membership;

	/**
	 * Get wether or not the membership was set via request.
	 *
	 * @return boolean
	 * @since 2.0.18
	 */
	public function is_membership_set_via_request() {

		return $this->membership_set_via_request;

	} // end is_membership_set_via_request;

} // end class Current;
