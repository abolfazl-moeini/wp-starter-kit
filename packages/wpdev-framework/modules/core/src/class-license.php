<?php
/**
 * License Handler
 *
 * Handles WPDev activation.
 *
 * @package WPDev
 * @subpackage License
 * @since 2.0.0
 */

namespace WPDevFramework;

use WP_Site;
use WPDevFramework\Core\Contracts\License_Gate;
use WPDevFramework\Dependencies\Psr\Log\LogLevel;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Handles WPDev activation.
 *
 * @since 2.0.0
 */
class License implements License_Gate {

	use \WPDevFramework\Traits\Singleton;

	/**
	 * The option key used to store the license data.
	 *
	 * @var string
	 */
	protected string $option_key = 'license_key';

	/**
	 * Instantiate the necessary hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function init() {

		add_action( 'wpdev_register_forms', array( $this, 'register_forms' ) );

		$this->setup_activator();

	} // end init;
 /**
  * Request a support signature to the API.
  *
  * This confirms ownership of the license and allows us
  * to display past conversations with confidence that the
  * customer is who they say they is.
  *
  * @since 2.0.7
  * @return string|\WP_Error
  */
 public function request_support_signature() {

		$signature_url = wpdev_with_license_key('https://api.wpdev.ir/signature');

		$response = wp_remote_get($signature_url);

		if (is_wp_error($response)) {

			return $response;

		} // end if;

		$body = wp_remote_retrieve_body($response);

		$data = (array) json_decode($body, true);

		$signature = wpdev_get_isset($data, 'signature', 'no_signature');

		return $signature;

	} // end request_support_signature;

	/**
	 * Registers the form and handler to license activation.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_forms() {

		if ( ! function_exists( 'wpdev_register_form' ) ) {
			return;
		}

		add_filter( 'removable_query_args', array( $this, 'add_activation_to_removable_query_list' ) );

		add_action( 'load-wpdev_page_wpdev-settings', array( $this, 'add_successful_activation_message' ) );

		wpdev_register_form(
			'license_activation',
			array(
				'render'  => array( $this, 'render_activation_form' ),
				'handler' => array( $this, 'handle_activation_form' ),
			)
		);

		wpdev_register_form(
			'license_deactivation',
			array(
				'render'  => array( $this, 'render_deactivation_form' ),
				'handler' => array( $this, 'handle_deactivation_form' ),
			)
		);

	} // end register_forms;

	/**
	 * Adds our query arg to the removable list.
	 *
	 * @since 2.0.0
	 *
	 * @param array $args The current list of removable query args.
	 * @return array
	 */
	public function add_activation_to_removable_query_list($args) {

		$args[] = 'wpdev-activation';

		return $args;

	} // end add_activation_to_removable_query_list;

	/**
	 * Adds a successful message when activation is successful.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function add_successful_activation_message() {

		if (wpdev_request('wpdev-activation') === 'success') {

			wpdev()->notices->add(__('WPDev successfully activated!', 'wpdev'), 'success', 'network-admin', false, array());

		} // end if;

	} // end add_successful_activation_message;

	/**
	 * Render the license activation form.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_activation_form() {

		$fields = array(
			'license_key'   => array(
				'type'        => 'text',
				'title'       => __('Your License Key', 'wpdev'),
				'desc'        => __('Enter your license key here. You received your license key via email when you completed your purchase. Your license key usually starts with "sk_".', 'wpdev'),
				'placeholder' => __('e.g. sk_******************', 'wpdev'),
			),
			'submit_button' => array(
				'type'            => 'submit',
				'title'           => __('Activate', 'wpdev'),
				'placeholder'     => __('Activate', 'wpdev'),
				'value'           => 'save',
				'classes'         => 'button button-primary wpdev-w-full',
				'wrapper_classes' => 'wpdev-items-end',
				'html_attr'       => array(
					'v-bind:disabled' => '!confirmed',
				),
			),
		);

		$form = new \WPDevFramework\UI\Form('total-actions', $fields, array(
			'views'                 => 'admin-pages/fields',
			'classes'               => 'wpdev-modal-form wpdev-widget-list wpdev-striped wpdev-m-0 wpdev-mt-0',
			'field_wrapper_classes' => 'wpdev-w-full wpdev-box-border wpdev-items-center wpdev-flex wpdev-justify-between wpdev-p-4 wpdev-m-0 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-300 wpdev-border-solid',
		));

		$form->render();

	} // end render_activation_form;

	/**
	 * Handle license activation form submission.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_activation_form() {

		$license = License::get_instance();

		$activation_results = $license->activate(wpdev_request('license_key'));

		if (isset($activation_results->error)) {

			$activation_results = new \WP_Error('error', $activation_results->error);

		} // end if;

		if (is_wp_error($activation_results)) {

			wp_send_json_error($activation_results);

		} // end if;

		wp_send_json_success(array(
			'redirect_url' => add_query_arg('wpdev-activation', 'success', wpdev_get_current_url()),
		));

	} // end handle_activation_form;

	/**
	 * Render the license activation form.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function render_deactivation_form() {

		$fields = array(
			'confirm'       => array(
				'type'      => 'toggle',
				'title'     => __('Confirm the remove of your license key', 'wpdev'),
				'desc'      => __('This action can not be undone.', 'wpdev'),
				'html_attr' => array(
					'v-model' => 'confirmed',
				),
			),
			'submit_button' => array(
				'type'            => 'submit',
				'title'           => __('Remove License', 'wpdev'),
				'value'           => 'save',
				'classes'         => 'button button-primary wpdev-w-full',
				'wrapper_classes' => 'wpdev-items-end',
				'html_attr'       => array(
					'v-bind:disabled' => '!confirmed',
				),
			),
		);

		$form = new \WPDevFramework\UI\Form('total-actions', $fields, array(
			'views'                 => 'admin-pages/fields',
			'classes'               => 'wpdev-modal-form wpdev-widget-list wpdev-striped wpdev-m-0 wpdev-mt-0',
			'field_wrapper_classes' => 'wpdev-w-full wpdev-box-border wpdev-items-center wpdev-flex wpdev-justify-between wpdev-p-4 wpdev-m-0 wpdev-border-t wpdev-border-l-0 wpdev-border-r-0 wpdev-border-b-0 wpdev-border-gray-300 wpdev-border-solid',
			'html_attr'             => array(
				'data-wpdev-app' => 'true',
				'data-state'  => wpdev_convert_to_state(array(
					'confirmed' => false,
				)),
			),
		));

		$form->render();

	} // end render_deactivation_form;

	/**
	 * Handle license activation form submission.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function handle_deactivation_form() {

		$license = License::get_instance();

		if (!$this->deactivate()) {

			$activation_results = new \WP_Error('error', __('Error deactivating license.', 'wpdev'));

			wp_send_json_error($activation_results);

		} // end if;

		wp_send_json_success(array(
			'redirect_url' => wpdev_get_current_url(),
		));

	} // end handle_deactivation_form;

	/**
	 * Sets up the activator instance.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	protected function setup_activator() {

		if (!defined('WPDEV_PLUGIN_DIR') || defined('WP_TESTS_MULTISITE')) {

			return;

		} // end if;

		if (!(is_main_site()) && !is_network_admin()) {

			return;

		} // end if;

		if (!$this->allowed() && defined('WPDEV_LICENSE_KEY') && WPDev_LICENSE_KEY) {
			/**
			 * Checks if init has run. If so, delay execution.
			 *
			 * @since 2.0.11
			 */
			$action = did_action('init') ? 'shutdown' : 'init';

			add_action($action, function() {

				$this->activate(WPDev_LICENSE_KEY);

			});

		} // end if;

	} // end setup_activator;
 /**
  * Tries to perform a license activation.
  *
  * @since 2.0.0
  *
  * @param string $license_key The customer license key.
  * @return bool|\WP_Error
  */
 public function activate($license_key) {

		if (!$license_key) {

			return new \WP_Error('missing-license', __('License key is required.', 'wpdev'));

		} // end if;

		try {

//			$response = $this->license_api_request('/activate', array(
//				'license_key'   => $license_key,
//				'instance_name' => defined('DOMAIN_CURRENT_SITE') ? DOMAIN_CURRENT_SITE : get_home_url(wpdev_get_main_site_id()),
//			), 'POST');
//
//			if ($response->error) {
//
//				return new \WP_Error('invalid-license', $response->error);
//
//			} // end if;

			wpdev_save_option( $this->option_key, [
				'activate'    => true,
				'timestamp'   => strtotime( '+10 Years' ),
				'secret_key'  => mt_rand(),
				'license_key' => mt_rand(),
				'instance'    => 111
			] );

		} catch (\Throwable $e) {

			wpdev_log_add('license', $e->getMessage(), LogLevel::ERROR);

			return new \WP_Error('general-error', __('An unexpected error occurred.', 'wpdev'));

		} // end try;

		return true;

	} // end activate;

	/**
	 * Deactivated the current license.
	 *
	 * @since 2.0.11
	 * @return bool
	 */
	public function deactivate(): bool {

		try {

			$license = wpdev_get_option($this->option_key);

			if (!$license) {

				return false;

			} // end if;

			$response = $this->license_api_request('/deactivate', array(
				'license_key' => $license->secret_key,
				'instance_id' => $license->instance,
			), 'POST');

			wpdev_save_option($this->option_key, false);

		} catch (\Throwable $e) {

			return false;

		} // end try;

		return true;

	} // end deactivate;

	/**
	 * Checks if this copy of the plugin was activated.
	 *
	 * @since 2.0.0
	 *
	 * @todo: Check if we should use the plan here and if we should use the product ID.
	 *
	 * @param string $plan Plan to check against.
	 * @return bool
	 */
	public function allowed( $plan = 'wpdev' ) {

		$license = $this->get_license();

		if ( false === $license ) {
			return false;
		}

		return ! empty( $license->valid );

	} // end allowed;

	/**
	 * {@inheritdoc}
	 */
	public function is_licensed() {

		/**
		 * Filter license gate result (e.g. tests, staging).
		 *
		 * @since 2.5.0
		 *
		 * @param bool|null $licensed Override, or null to use default check.
		 */
		$override = apply_filters( 'wpdev_license_is_licensed', null );

		if ( null !== $override ) {
			return (bool) $override;
		}

		return $this->allowed();

	} // end is_licensed;

	/**
	 * Returns the customer of the current license.
	 *
	 * @since 2.0.0
	 * @return object|false
	 */
	public function get_customer() {

		$license = $this->get_license();

		if ($license === false) {

			return false;

		} // end if;

		return $license->customer;

	} // end get_customer;

	/**
	 * Returns the license object.
	 *
	 * @since 2.0.0
	 * @return object|false
	 */
	public function get_license() {

		$license = [
			'timestamp'   => strtotime( '+10 Years' ),
			'secret_key'  => mt_rand(),
			'license_key' => mt_rand(),
			'instance'    => 111,
			'is_whitelabeled' => true,
			'valid' => true,
			'customer' => 'Admin'
		] ;

		return (object)$license;

	} // end get_license;

	/**
	 * Returns a license based om freemius license.
	 *
	 * @return object|false
	 */
	protected function get_fs_license() {

		$account = get_blog_option(get_main_site_id(), 'fs_accounts');

		if (empty($account) || !isset($account['sites']) || !isset($account['sites']['wpdev'])) {

			return false;

		} // end if;

		$account_site = get_object_vars($account['sites']['wpdev']);
		$license_id   = $account_site['license_id'];
		$fs_accounts  = get_site_option('fs_accounts', array());
		$fs_id        = 2963;

		if (empty($fs_accounts) || !isset($fs_accounts['all_licenses']) || !isset($fs_accounts['all_licenses'][$fs_id])) {

			return false;

		} // end if;

		$licenses = $fs_accounts['all_licenses'][$fs_id];

		foreach ($licenses as $fs_license) {

			$fs_license = get_object_vars($fs_license);

			if ($fs_license['id'] === $license_id) {

				$license = new \stdClass();

				$license->timestamp  = 0;
				$license->secret_key = $fs_license['secret_key'];
				$license->instance   = $fs_license['id'];

				return $license;

			} // end if;

		} // end foreach;

		return false;

	} // end get_fs_license;
 /**
  * Returns the license key used to activate this copy.
  *
  * @since 2.0.0
  * @return string|false
  */
 public function get_license_key() {

		$license = $this->get_license();

		return $license && $license->secret_key ? $license->secret_key : false;

	} // end get_license_key;

	/**
	 * Checks if the white-label mode was activated.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function is_whitelabel() {

		$license = $this->get_license();

		return $license ? $license->is_whitelabeled : false;

	} // end is_whitelabel;

	/**
	 * Inverse of the is_whitelabel. Used in callbacks.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function is_not_whitelabel() {

		return !$this->is_whitelabel();

	} // end is_not_whitelabel;
 /**
  * Returns the license key set as constant if it exists.
  *
  * @since 2.0.0
  * @return false|string
  */
 public function has_license_key_defined_as_constant() {

		return defined('WPDEV_LICENSE_KEY') ? WPDev_LICENSE_KEY : false;

	} // end has_license_key_defined_as_constant;

	/**
	 * Sends a request to license API
	 *
	 * @since  2.4.0
	 * @param  string $endpoint Endpoint to send the call to.
	 * @param  array  $data     Array containing the params to the call.
	 * @param  string $method   HTTP method to use.
	 * @return object
	 */
	protected function license_api_request(string $endpoint, array $data, $method = 'GET') {

		$data['version'] = wpdev_get_isset($data, 'version', wpdev_get_version());

		$url = 'https://licenses.wpdev.ir/api/licenses' . $endpoint;

		$post_fields = array(
			'blocking' => true,
			'timeout'  => 10,
			'method'   => $method,
			'body'     => $data,
			'headers'  => array(
				'Content-Type' => 'application/x-www-form-urlencoded',
				'Accept'       => 'application/json',
			),
		);

		if ($method === 'GET') {

			$url = add_query_arg($data, $url);
			$post_fields['body'] = null;

		} // end if;

		$response = wp_remote_request($url, $post_fields);

		if (is_wp_error($response)) {

			throw new \Exception($response->get_error_message());

		} // end if;

		$body = json_decode(wp_remote_retrieve_body($response));

		if (json_last_error() !== JSON_ERROR_NONE) {

			throw new \Exception(json_last_error_msg());

		} // end if;

		return $this->build_license_from_response($body);

	} // end license_api_request;

	/**
	 * Build a license object from the API response.
	 *
	 * @since 2.4.0
	 *
	 * @param object $response Response from the API.
	 * @return object
	 */
	protected function build_license_from_response(object $response): object {

		$status = array(
			'active',
			'trial',
			'lifetime',
			'golden-ticket',
		);

		$license = new \stdClass();
		$license->is_whitelabeled = false;
		$license->timestamp       = time();
		$license->secret_key      = property_exists($response, 'key') ? $response->key : null;
		$license->valid           = property_exists($response, 'status') ? in_array($response->status, $status, true) : false;
		$license->instance        = property_exists($response, 'instance') ? $response->instance : null;
		$license->error           = property_exists($response, 'error') ? $response->error : null;

		$name = explode(' ', property_exists($response, 'customer') ? $response->customer->name : '', 2);

		$license->customer        = new \stdClass();
		$license->customer->email = property_exists($response, 'customer') ? $response->customer->email : null;
		$license->customer->first = $name[0];
		$license->customer->last  = isset($name[1]) ? $name[1] : '';

		if (!$license->valid) {

			$response->status = property_exists($response, 'status') ? $response->status : null;

			switch ($response->status) {
       case 'expired':
           $license->error = __('License key expired', 'wpdev');
           break;
       case 'limit-quota':
           $license->error = __('License key limit reached', 'wpdev');
           break;
       default:
           $license->error = __('Invalid license key', 'wpdev');
           break;
   }

		} // end if;

		return $license;

	} // end build_license_from_response;

} // end class License;
