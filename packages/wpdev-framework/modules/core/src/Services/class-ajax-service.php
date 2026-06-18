<?php
/**
 * Ajax service wrapper.
 *
 * @package WPDevFramework\Core\Services
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Services;

use WPDevFramework\Ajax;
use WPDevFramework\Async_Calls;
use WPDevFramework\Core\Ajax\Ajax_Response;
use WPDevFramework\Core\Ajax\Ajax_Tab_Loader;
use WPDevFramework\Core\Contracts\Ajax_Service_Contract;
use WPDevFramework\Light_Ajax;

// Ensure ajax transport classes load from modules/core when the service boots.
require_once dirname( __DIR__ ) . '/ajax/class-ajax-response.php';
require_once dirname( __DIR__ ) . '/ajax/class-ajax.php';
require_once dirname( __DIR__ ) . '/ajax/class-light-ajax.php';
require_once dirname( __DIR__ ) . '/ajax/class-async-calls.php';
require_once dirname( __DIR__ ) . '/ajax/class-ajax-tab-loader.php';

defined( 'ABSPATH' ) || exit;

/**
 * Wraps legacy ajax classes behind the core service contract.
 */
class Ajax_Service implements Ajax_Service_Contract {

	/**
	 * Legacy ajax singleton.
	 *
	 * @var Ajax|null
	 */
	protected $ajax;

	/**
	 * {@inheritdoc}
	 */
	public function id() {

		return 'ajax';

	} // end id;

	/**
	 * {@inheritdoc}
	 */
	public function boot() {

		$this->ajax = Ajax::get_instance();
		Light_Ajax::get_instance();
		Ajax_Tab_Loader::boot();

	} // end boot;

	/**
	 * {@inheritdoc}
	 */
	public function listen( $action, $callback, $priority = 10 ) {

		add_action( 'wpdev_ajax_' . $action, $callback, $priority );
		add_action( 'wpdev_ajax_nopriv_' . $action, $callback, $priority );

	} // end listen;

	/**
	 * Register an ajax handler against a chosen transport (J-01).
	 *
	 * Standardizes handler registration so feature modules stop calling
	 * add_action('wp_ajax_*') directly. Pair with respond_success/respond_error
	 * for the { success, code, message, data } envelope (J-02).
	 *
	 * @since 2.6.0
	 *
	 * @param string   $action    Action slug (without prefix).
	 * @param callable $callback  Handler callback.
	 * @param array    $args      { transport: 'admin'|'light'|'both'|'nopriv', nopriv: bool, priority: int, accepted_args: int }.
	 * @return void
	 */
	public function register_handler( $action, $callback, $args = array() ) {

		$args = array_merge(
			array(
				'transport'            => 'admin',
				'nopriv'               => false,
				'priority'             => 10,
				'accepted_args'        => 1,
				'capability'           => 'manage_network',
				'capability_callback'  => null,
				'nonce_action'         => 'wpdev-ajax-nonce',
				'nonce_field'          => 'nonce',
				'skip_nonce'           => false,
			),
			$args
		);

		$callback = $this->wrap_handler_with_security( $callback, $args );

		$transport     = $args['transport'];
		$priority      = (int) $args['priority'];
		$accepted_args = (int) $args['accepted_args'];

		if ( 'light' === $transport || 'both' === $transport ) {
			add_action( 'wpdev_ajax_' . $action, $callback, $priority, $accepted_args );

			if ( $args['nopriv'] || 'nopriv' === $transport ) {
				add_action( 'wpdev_ajax_nopriv_' . $action, $callback, $priority, $accepted_args );
			}
		}

		if ( 'nopriv' === $transport ) {
			add_action( 'wp_ajax_nopriv_' . $action, $callback, $priority, $accepted_args );
			return;
		}

		if ( 'admin' === $transport || 'both' === $transport ) {
			add_action( 'wp_ajax_' . $action, $callback, $priority, $accepted_args );

			if ( $args['nopriv'] ) {
				add_action( 'wp_ajax_nopriv_' . $action, $callback, $priority, $accepted_args );
			}
		}

	} // end register_handler;

	/**
	 * Wrap a handler with nonce and capability checks.
	 *
	 * @since 2.6.0
	 *
	 * @param callable             $callback Original handler.
	 * @param array<string, mixed> $args     Registration args.
	 * @return callable
	 */
	protected function wrap_handler_with_security( $callback, array $args ) {

		return static function () use ( $callback, $args ) {
			if ( empty( $args['skip_nonce'] ) && function_exists( 'check_ajax_referer' ) ) {
				$nonce_ok = check_ajax_referer(
					$args['nonce_action'],
					$args['nonce_field'],
					false
				);

				if ( ! $nonce_ok ) {
					Ajax_Response::forbidden( __( 'Invalid security token.', 'wpdev' ) );
					return;
				}
			}

			$allowed = true;

			if ( ! empty( $args['capability_callback'] ) && is_callable( $args['capability_callback'] ) ) {
				$allowed = (bool) call_user_func( $args['capability_callback'] );
			} elseif ( ! empty( $args['capability'] ) && function_exists( 'current_user_can' ) ) {
				$cap     = function_exists( 'wpdev_admin_capability_for' ) ? wpdev_admin_capability_for( $args['capability'] ) : $args['capability'];
				$allowed = current_user_can( $cap );
			}

			if ( ! $allowed ) {
				Ajax_Response::forbidden( __( 'You do not have permission to perform this action.', 'wpdev' ) );
				return;
			}

			return call_user_func_array( $callback, func_get_args() );
		};

	} // end wrap_handler_with_security;

	/**
	 * Register an AJAX-loaded tab group (J-06).
	 *
	 * @since 2.6.0
	 *
	 * @param string   $group    Tab group slug (usually the page id).
	 * @param callable $callback Receives the requested tab slug; echoes/returns HTML.
	 * @return void
	 */
	public function register_tabs( $group, $callback ) {

		Ajax_Tab_Loader::register( $group, $callback );

	} // end register_tabs;

	/**
	 * Build the AJAX URL that loads a registered tab.
	 *
	 * @since 2.6.0
	 *
	 * @param string $group Tab group slug.
	 * @param string $tab   Tab slug.
	 * @return string
	 */
	public function tab_url( $group, $tab = '' ) {

		return Ajax_Tab_Loader::url( $group, $tab );

	} // end tab_url;

	/**
	 * {@inheritdoc}
	 */
	public function respond_success( $data = null, $code = 'success' ) {

		Ajax_Response::success( $data, $code );

	} // end respond_success;

	/**
	 * {@inheritdoc}
	 */
	public function respond_error( $message, $code = 'error', $data = null, $status = 400 ) {

		Ajax_Response::error( $message, $code, $data, $status );

	} // end respond_error;

	/**
	 * Register an async listener via the legacy Async_Calls registry.
	 *
	 * @since 2.5.0
	 *
	 * @param string   $id       Listener id.
	 * @param callable $callable Callback.
	 * @param mixed    ...$args  Optional callback args.
	 * @return void
	 */
	public function register_async_listener( $id, $callable, ...$args ) {

		Async_Calls::register_listener( $id, $callable, ...$args );

	} // end register_async_listener;

	/**
	 * Install all registered async listeners.
	 *
	 * @since 2.5.0
	 *
	 * @return void
	 */
	public function install_async_listeners() {

		Async_Calls::install_listeners();

	} // end install_async_listeners;

	/**
	 * Return the underlying legacy ajax instance.
	 *
	 * @return Ajax
	 */
	public function instance() {

		return $this->ajax ?: Ajax::get_instance();

	} // end instance;

} // end class Ajax_Service;
