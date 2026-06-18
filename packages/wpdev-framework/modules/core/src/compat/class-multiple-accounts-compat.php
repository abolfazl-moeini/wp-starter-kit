<?php
/**
 * Adds support to multiple accounts for plugins such as WooCommerce.
 *
 * WordPress, even in multisite mode, has only one User database table.
 * This can cause problems in a WaaS environment.
 *
 * Image the following scenario:
 *
 * - You two e-commerce stores on your network: Store A and Store B;
 * - A potential customer comes to Store A and purchases an item, to do that
 *   they need to create an account.
 * - A month later, that same customer stumbles upon Store B, and decides to make
 *   another purchase. This time, however, they get an 'email already in use error'
 *   during checkout.
 * - This happens because the user database is shared across sites, but it can
 *   cause a lot of confusion.
 *
 * This class attempts to handle situations like this gracefully.
 * It will allow the customer to create a second user account with the same email address,
 * and will scope that user to the sub-site where it was created only.
 *
 * Right now, it supports:
 * - Default WordPress registration;
 * - WooCommerce.
 *
 * @package WPDev
 * @subpackage Compat/Multiple_Accounts_Compat
 * @since 2.0.0
 */

namespace WPDevFramework\Compat;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Adds support to multiple accounts for plugins such as WooCommerce.
 *
 * @since 2.0.0
 */
class Multiple_Accounts_Compat {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * Instantiate the necessary hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {

		// Add the settings to enable or disable this feature.
		add_action('wpdev_settings_login', array($this, 'add_settings'), 10);

		if ($this->should_load()) {

			// Fix the object cache
			$this->fix_object_cache_on_multiple_accounts();

			// Unset user, if the current one is not part of the site.
			add_action('plugins_loaded', array($this, 'maybe_unset_current_user'), -10);

			// prevents woocommerce from adding customers to sites without our knowledge
			add_action('woocommerce_process_login_errors', array($this, 'prevent_woo_from_adding_to_blog'), -10);

			// Add the filter to prevent email blocking
			add_filter('email_exists', array($this, 'allow_duplicate_emails'), 10, 2);

			// Add the filter to prevent email blocking
			add_filter('query', array($this, 'fix_user_query'), -999);

			// Action in the login to debug the login info
			add_filter('authenticate', array($this, 'fix_login'), 50000, 3);

			// Now we handle the password thing
			add_action('init', array($this, 'handle_reset_password'), 2000);

			// Now we add a custom column in that table to allow the admin to control them
			add_filter('wpmu_users_columns', array($this, 'add_multiple_account_column'));

			// Adds the number of additional accounts.
			add_filter('manage_users_custom_column', array($this, 'add_column_content'), 10, 3);

		} // end if;

	} // end init;

	/**
	 * Fixes the object cache to allow multiple accounts.
	 * Unsets user email from Object Cache so that we can retrieve the user from our
	 * fixed query for consulting the database.
	 *
	 * @since 2.1.4
	 * @return void
	 */
	public function fix_object_cache_on_multiple_accounts(): void {

		$to_remove = array(
			'useremail'
		);

		if (function_exists('wp_cache_add_non_persistent_groups')) {

			wp_cache_add_non_persistent_groups($to_remove);

		} // end if;

	} // end fix_object_cache_on_multiple_accounts;

	/**
	 * Filters the database query so that we can get the right user.
	 *
	 * @since 2.1.4
	 *
	 * @param string $query Database query.
	 * @return string Filtered database query.
	 */
	public function fix_user_query(string $query): string {

		global $wpdb;

		$search = "\$db->get_row(\"SELECT * FROM $wpdb->users WHERE user_email";

		if ( strpos($wpdb->func_call, $search) === 0) {

			$prefix = "SELECT * FROM $wpdb->users WHERE user_email";

			$last = substr($query, strlen($prefix));

			$site_id = get_current_blog_id();

			/**
			 * We can't use the $wpdb->prepare() method here because it will
			 * escape the %s placeholder, which will break the query.
			 */
			return sprintf("SELECT u.* 
				FROM $wpdb->users u 
				JOIN $wpdb->usermeta m on u.id = m.user_id 
				WHERE m.meta_key = \"wp_%d_capabilities\"
				AND u.user_email%s", $site_id, $last);

		} // end if;

		return $query;

	} // end fix_user_query;

	/**
	 * Hooks into email_exists verification to allow duplicate emails in different sites.
	 *
	 * @since 2.1.4
	 *
	 * @param int|bool $user_id The user ID.
	 * @param string   $email The email address.
	 * @return int|bool The user ID.
	 */
	public function allow_duplicate_emails($user_id, string $email) {

		if ($user_id) {

			$site_user = $this->get_right_user($email);

			return $site_user ? $site_user->ID : false;

		} // end if;

		return $user_id;

	} // end allow_duplicate_emails;

	/**
	 * Prevent WooCommerce from adding users to site without us knowing.
	 *
	 * We only use the filter 'woocommerce_process_login_errors', because
	 * that's it guaranteed to only run inside the login handler.
	 *
	 * @since 2.0.0
	 *
	 * @param mixed $results Arbitrary item being return by the filter chosen.
	 * @return mixed
	 */
	public function prevent_woo_from_adding_to_blog($results) {

		add_filter('can_add_user_to_blog', '__return_false');

		return $results;

	} // end prevent_woo_from_adding_to_blog;

	/**
	 * Checks if the user belongs to a site they are currently viewing and unset them if they don't.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function maybe_unset_current_user() {

		global $current_user;

		if (is_admin() || is_main_site() || current_user_can('manage_network')) {

			return;

		} // end if;

		/**
		 * Allow developers to bypass the unset current user code.
		 *
		 * Returning anything other than null will bypass the unset
		 * of the current user logged in.
		 *
		 * This can be useful in some scenarios, for example,
		 * when dealing with sub-sites that are being used as
		 * admin panels.
		 *
		 * @since 2.0.11
		 *
		 * @param mixed $null_or_bypass Null to move on, anything else to bypass it.
		 * @param false|\WP_User $current_user The current user object.
		 * @return mixed
		 */
		if (apply_filters('wpdev_bypass_unset_current_user', null, $current_user) !== null) {

			return;

		} // end if;

		$user = wp_get_current_user();

		$has_user = $this->check_for_user_in_site($user->user_email, $user->ID);

		/*
		 * Despite being currently logged in, this account does not
		 * belong to the sub-site in question, so we unset the user
		 * currently logged in.
		 */
		if ($has_user === false) {

			wpdev_x_header('X-wpdev-Multiple-Accounts: user-unset');

			$current_user = null;

			wp_set_current_user(0);

		} // end if;

	} // end maybe_unset_current_user;

	/**
	 * Allow plugin developers to disable this functionality to prevent compatibility issues.
	 *
	 * @since 2.0.0
	 *
	 * @return boolean
	 */
	public function should_load() {

		return apply_filters('wpdev_should_load_multiple_accounts_support', wpdev_get_setting('enable_multiple_accounts', true));

	} // end should_load;

	// Methods

	/**
	 * Add multiple accounts setting to enable or disable this feature.
	 *
	 * @since 2.0.0
	 *
	 * @return void.
	 */
	public function add_settings() {

		wpdev_register_settings_field('login-and-registration', 'multiple_accounts_header', array(
			'title' => __('Multiple Accounts', 'wpdev'),
			'desc'  => __('Options related to the Multiple Accounts feature.', 'wpdev'),
			'type'  => 'header',
		));

		wpdev_register_settings_field('login-and-registration', 'enable_multiple_accounts', array(
			'title'   => __('Enable Multiple Accounts', 'wpdev'),
			'desc'    => __('Allow users to have accounts in different sites with the same email address. This is useful when running stores with WooCommerce and other plugins, for example.', 'wpdev') . ' ' . sprintf('<a href="%s" target="_blank">%s</a>', wpdev_get_documentation_url('multiple-accounts'), __('Read More', 'wpdev')),
			'type'    => 'toggle',
			'default' => 0,
		));

	} // end add_settings;

	/**
	 * Adds the Multiple accounts column to the users table.
	 *
	 * @since 2.0.0
	 *
	 * @param array $columns Original columns.
	 * @return array
	 */
	public function add_multiple_account_column($columns) {

		$columns['multiple_accounts'] = __('Multiple Accounts', 'wpdev');

		return $columns;

	} // end add_multiple_account_column;

	/**
	 * Renders the content of our custom column.
	 *
	 * @since 2.0.0
	 *
	 * @param null   $null No idea.
	 * @param string $column The name of the column.
	 * @param int    $user_id The ID of the user.
	 * @return void
	 */
	public function add_column_content($null, $column, $user_id) {

		if ($column === 'multiple_accounts') {

			// Get user email
			$user = get_user_by('ID', $user_id);

			// Get all the accounts with the same email
			$users = new \WP_User_Query(array(
				'blog_id' => 0,
				'search'  => $user->user_email,
				'fields'  => array('ID', 'user_login'),
			));

			// translators: the %d is the account count for that email address.
			$html = sprintf(__('<strong>%d</strong> accounts using this email.', 'wpdev'), $users->total_users);

			$html .= sprintf("<br><a href='%s' class=''>" . __('See all', 'wpdev') . ' &raquo;</a>', network_admin_url('users.php?s=' . $user->user_email));

			echo $html;

		} // end if;

	} // end add_column_content;

	/**
	 * Handles password resetting.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_reset_password() {

		// Only run in the right case
		if (wpdev_request('action') === 'retrievepassword' || wpdev_request('wc_reset_password')) {

			// Only do thing if is login by email
			if (is_email($_REQUEST['user_login'])) {

				$user = $this->get_right_user($_REQUEST['user_login']);

				$_REQUEST['user_login'] = $user->user_login;

				$_POST['user_login'] = $user->user_login;

			} // end if;

		} // end if;

	} // end handle_reset_password;

	/**
	 * Checks if a given user is a member in the site.
	 *
	 * @since 2.0.0
	 *
	 * @param string $email    The user email address.
	 * @param int    $user_id  The user ID to check.
	 * @return bool
	 */
	public function check_for_user_in_site($email, $user_id = 0) {

		// Sets the right user to be returned;
		$has_user = false;

		$query = array(
			'search' => $email,
		);

		/**
		 * When the user id is present, we use it
		 * to disambiguate the users, as the same user
		 * with the same email address can have users
		 * registered on different sub-sites.
		 *
		 * @since 2.0.11
		 */
		if ($user_id) {

			$query['include'] = array(
				absint($user_id),
			);

		} // end if;

		// Now we search for the correct user based on the password and the blog information
		$users = new \WP_User_Query($query);

		// Loop the results and check which one is in this group
		foreach ($users->results as $user_with_email) {

			// Check for the pertinence of that user in this site
			if ($this->user_can_for_blog($user_with_email, get_current_blog_id(), 'read')) {

				$has_user = true;

				break;

			} // end if;

		} // end foreach;

		// If nothing was found return false;
		return $has_user;

	} // end check_for_user_in_site;
 /**
  * Gets the right user when logging-in.
  *
  * @since 2.0.0
  *
  * @param null|\WP_User|\WP_Error $user The current user object. Usually false.
  * @param string                  $username The username to search for.
  * @param string                  $password The user password.
  * @return null|\WP_User|\WP_Error
  */
 public function fix_login($user, $username, $password) {

		if (!is_email($username)) {

			return $user;

		} // end if;

		// Sets the right user to be returned;
		$user = $this->get_right_user($username, $password);

		return $user ? $user : null;

	} // end fix_login;

	/**
	 * Check if user can do something in a specific blog.
	 *
	 * @since 2.0.0
	 *
	 * @param \WP_User $user The user object.
	 * @param int      $blog_id The blog id.
	 * @param string   $capability Capability to check against.
	 * @return boolean
	 */
	public function user_can_for_blog($user, $blog_id, $capability) {

		$switched = is_multisite() ? switch_to_blog($blog_id) : false;

		$current_user = $user;

		if (empty($current_user)) {

			if ($switched) {

				restore_current_blog();

			} // end if;

			return false;

		} // end if;

		$args = array_slice(func_get_args(), 2);

		$args = array_merge(array($capability), $args);

		$can = call_user_func_array(\Closure::fromCallable([$current_user, 'has_cap']), $args);

		if ($switched) {

			restore_current_blog();

		} // end if;

		return $can;

	} // end user_can_for_blog;
 /**
  * Gets the right user for a given domain.
  *
  * @since 2.0.0
  *
  * @param string  $email User email address.
  * @param boolean $password User password.
  * @return \WP_User|false
  */
 protected function get_right_user($email, $password = false) {

		// Sets the right user to be returned;
		$right_user = false;

		// $hash = wp_hash_password($password);
		// Now we search for the correct user based on the password and the blog information
		$users = new \WP_User_Query(array('search' => $email));

		// Loop the results and check which one is in this group
		foreach ($users->results as $user_with_email) {

			$conditions = $password == false ? true : wp_check_password($password, $user_with_email->user_pass, $user_with_email->ID);

			// Check for the pertinence of that user in this site
			if ($conditions && $this->user_can_for_blog($user_with_email, get_current_blog_id(), 'read')) {

				// Set right user
				$right_user = $user_with_email;

				continue;

			} // end if;

		} // end foreach;

		// Return right user
		return $right_user;

	} // end get_right_user;

} // end class Multiple_Accounts_Compat;
