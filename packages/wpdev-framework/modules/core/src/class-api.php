<?php
/**
 * Default API hooks.
 *
 * @package WPDev
 * @subpackage API
 * @since 2.0.0
 */

namespace WPDevFramework;

// Exit if accessed directly
defined('ABSPATH') || exit;

/**
 * Adds a lighter ajax option to WPDev.
 *
 * @since 1.9.14
 */
class API {

	use \WPDevFramework\Traits\Singleton;

	/**
     * Namespace of our API endpoints
     *
     * @since 1.7.4
     * @var string
     */
	private string $namespace = 'wu';

	/**
     * Version fo the API, this is used to build the API URL
     *
     * @since 1.7.4
     * @var string
     */
	private string $api_version = 'v2';

	/**
	 * Initiates the API hooks
	 *
	 * @since 1.7.4
	 * @return void
	 */
	public function __construct() {

		/**
		 * Fire the `wpdev_register_api_settings` action so the settings
		 * panel (admin-setting-page-defaults example) can register the
		 * API & Webhooks fields. Runs on `wpdev_load` so the framework
		 * modules are fully booted before the example hooks in.
		 *
		 * @since 2.8.1
		 */
		add_action( 'wpdev_load', array( $this, 'add_settings' ), 20 );

		/**
		 * Refreshing API credentials
		 *
		 * @since 1.7.4
		 */
		add_action('wpdev_before_save_settings', array($this, 'refresh_API_credentials'), 10);

		/**
		 * Register the routes
	     *
		 * @since 1.7.4
		 */
		add_action('rest_api_init', array($this, 'register_routes'));

		/**
		 * Log API errors
		 *
		 * @since 2.0.0
		 */
		add_action('rest_request_after_callbacks', array($this, 'log_api_errors'), 10, 3);

		/**
		 * We need to bypass the WP Core auth errors in our routes so we can use our api keys
		 *
		 * @since 2.1.2
		 */
		add_filter('rest_authentication_errors', array($this, 'maybe_bypass_wp_auth'), 1);

	} // end __construct;

	/**
	 * Maybe bypass the WP Core auth errors in our routes so we can use our api keys.
	 *
	 * @since 2.1.2
	 *
	 * @param WP_Error|null|bool $result Error from another authentication handler, null if we should handle it, or another value if not.
	 * @return WP_Error|null|bool The current filter value or true if we should handle it.
	 */
	public function maybe_bypass_wp_auth($result) {

		// Another plugin already bypass this request
		if ($result === true) {

			return $result;

		} // end if;

		$current_route = $_SERVER['REQUEST_URI'];

		$rest_url  = rest_url();
		$rest_path = rtrim(parse_url($rest_url, PHP_URL_PATH), '/');

		if (strncmp((string) $current_route, $rest_path . '/' . $this->get_namespace(), strlen($rest_path . '/' . $this->get_namespace())) !== 0) {

			return $result;

		} // end if;

		return true;

	} // end maybe_bypass_wp_auth;

	/**
	 * Allow admins to refresh their API credentials.
	 *
	 * @since 1.7.4
	 * @return void
	 */
	public function refresh_API_credentials() { // phpcs:ignore

		if (wpdev_request('submit_button') === 'refresh_api_credentials') {

			if ( function_exists( 'wpdev_current_user_can_admin' ) ) {
				if ( ! wpdev_current_user_can_admin( 'manage_network' ) ) {
					return;
				}
			} elseif ( ! current_user_can( 'manage_network' ) ) {
				return;
			}

			wpdev_save_setting('api_url', network_site_url());

			wpdev_save_setting('api_key', wp_generate_password(24, false));

			wpdev_save_setting('api_secret', wp_generate_password(24, false));

			wp_safe_redirect(network_admin_url('admin.php?page=wpdev-settings&tab=api&api=refreshed&updated=1'));

			exit;

		} // end if;

	} // end refresh_API_credentials;

	/**
	 * Add the admin interface to create new webhooks
	 *
	 * The framework no longer registers the API & Webhooks settings
	 * section directly. The owning example (admin-setting-page-defaults)
	 * listens to the `wpdev_register_api_settings` action and decides
	 * whether to register the section and fields.
	 *
	 * @since 1.7.4
	 * @since 2.8.1 Section registration moved to admin-setting-page-defaults.
	 *
	 * @return void
	 */
	public function add_settings() {

		/**
		 * Allow the settings panel to register API & Webhooks fields.
		 *
		 * @since 2.8.1
		 */
		do_action( 'wpdev_register_api_settings' );

	} // end add_settings;

	/**
	 * Returns the namespace of our API endpoints.
	 *
	 * @since 1.7.4
	 * @return string
	 */
	public function get_namespace() {

		return "$this->namespace/$this->api_version";

	} // end get_namespace;

	/**
	 * Returns the credentials.
	 *
	 * @since 1.7.4
	 * @return array
	 */
	public function get_auth() {

		return array(
			'api_key'    => wpdev_get_setting('api_key', 'prevent'),
			'api_secret' => wpdev_get_setting('api_secret', 'prevent'),
		);

	} // end get_auth;

	/**
	 * Validate a pair of API credentials
	 *
	 * @since 1.7.4
	 * @param string $api_key The API key.
	 * @param string $api_secret The API secret.
	 * @return boolean
	 */
	public function validate_credentials($api_key, $api_secret) {

		return compact('api_key', 'api_secret') === $this->get_auth(); // phpcs:ignore

	} // end validate_credentials;

	/**
	 * Check if we can log api calls.
	 *
	 * @since 2.0.0
	 * @return boolean
	 */
	public function should_log_api_calls() {

		return apply_filters('wpdev_should_log_api_calls', wpdev_get_setting('api_log_calls', false));

	} // end should_log_api_calls;

	/**
	 * Checks if we should log api calls or not, and if we should, log them.
	 *
	 * @since 2.0.0
	 *
	 * @param WP_REST_Request $request The request sent.
	 */
	public function maybe_log_api_call($request) {

		if ($this->should_log_api_calls()) {

			$payload = array(
				'route'       => $request->get_route(),
				'method'      => $request->get_method(),
				'url_params'  => $request->get_url_params(),
				'body_params' => $request->get_body()
			);

			wpdev_log_add('api-calls', json_encode($payload, JSON_PRETTY_PRINT));

		} // end if;

	} // end maybe_log_api_call;

	/**
	 * Log api errors.
	 *
	 * @since 2.0.0
	 *
	 * @param mixed            $result The result of the REST API call.
	 * @param string|array     $handler The callback.
	 * @param \WP_REST_Request $request The request object.
	 * @return mixed
	 */
	public function log_api_errors($result, $handler, $request) {

		if (is_wp_error($result) && strncmp($request->get_route(), '/wu', strlen('/wu')) === 0) {
			/*
			 * Log API call here if we didn't log it before.
			 */
			if (!$this->should_log_api_calls()) {

				$payload = array(
					'route'       => $request->get_route(),
					'method'      => $request->get_method(),
					'url_params'  => $request->get_url_params(),
					'body_params' => $request->get_body()
				);

				wpdev_log_add('api-errors', json_encode($payload, JSON_PRETTY_PRINT));

			} // end if;

			wpdev_log_add('api-errors', $result);

		} // end if;

		return $result;

	} // end log_api_errors;

	/**
	 * Tries to validate the API key and secret from the request
	 *
	 * @since 1.7.4
	 * @param \WP_REST_Request $request WP Request Object.
	 * @return boolean
	 */
	public function check_authorization($request) {

		if (isset($_SERVER['PHP_AUTH_USER']) && $_SERVER['PHP_AUTH_USER']) {

			$api_key    = $_SERVER['PHP_AUTH_USER'];
			$api_secret = $_SERVER['PHP_AUTH_PW'];

		} else {

			$params = $request->get_params();

			$api_key    = wpdev_get_isset($params, 'api_key', wpdev_get_isset($params, 'api-key'));
			$api_secret = wpdev_get_isset($params, 'api_secret', wpdev_get_isset($params, 'api-secret'));

		} // end if;

		if ($api_key === false) {

			return false;

		} // end if;

		return $this->validate_credentials($api_key, $api_secret);

	} // end check_authorization;

	/**
	 * Checks if the API routes are available or not, via the settings.
	 *
	 * @since 1.7.4
	 * @return boolean
	 */
	public function is_api_enabled() {

		/**
		 * Allow plugin developers to force a given state for the API.
		 *
		 * @since 1.7.4
		 * @return boolean
		 */
		return apply_filters('wpdev_is_api_enabled', wpdev_get_setting('enable_api', true));

	} // end is_api_enabled;

	/**
	 * Register the API routes.
	 *
	 * @since 1.7.4
	 * @return void
	 */
	public function register_routes() {

		if (!$this->is_api_enabled()) {

			return;

		} // end if;

		$namespace = $this->get_namespace();

		register_rest_route($namespace, '/auth', array(
			'methods'             => 'GET',
			'callback'            => array($this, 'auth'),
			'permission_callback' => array($this, 'check_authorization'),
		));

		/**
		 * Allow additional routes to be registered.
		 *
		 * This is used by our /register endpoint.
		 *
		 * @since 2.0.0
		 * @param self $this The current API instance.
		 */
		do_action('wpdev_register_rest_routes', $this);

	} // end register_routes;

	/**
	 * Dummy endpoint to low services to test the authentication method being used.
	 *
	 * @since 1.7.4
	 *
	 * @param \WP_REST_Request $request WP Request Object.
	 * @return void
	 */
	public function auth($request) {

		$current_site = get_current_site();

		wp_send_json(array(
			'success' => true,
			'label'   => $current_site->site_name,
			'message' => __('Welcome to our API', 'wpdev'),
		));

	} // end auth;

} // end class API;
