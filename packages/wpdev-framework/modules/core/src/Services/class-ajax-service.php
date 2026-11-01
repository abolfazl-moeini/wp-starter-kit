<?php
/**
 * Ajax service wrapper.
 *
 * @package WPDevFramework\Core\Services
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Services;

use InvalidArgumentException;
use WPDevFramework\Ajax;
use WPDevFramework\Async_Calls;
use WPDevFramework\Core\Ajax\Ajax_Response;
use WPDevFramework\Core\Ajax\Ajax_Tab_Loader;
use WPDevFramework\Core\Contracts\Ajax_Service_Contract;
use WPDevFramework\Core\Security\Surface_Registry;
use WPDevFramework\Core\Security\Surface_Type;
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
	 * Register an authenticated AJAX action with mandatory capability and CSRF protection.
	 *
	 * Surface Model: CapabilityWrite.
	 *
	 * @param string               $action       Action slug without prefix.
	 * @param string|null          $nonceAction  Nonce action name.
	 * @param string|callable      $capability   Required user capability (mandatory; cannot be empty).
	 * @param string|callable      $handler      Handler class name or callable.
	 * @param array<string, mixed> $schema       Request validation schema.
	 * @param array<string, mixed> $args         Additional transport options.
	 * @param string|null          $nonce_action Nonce action snake_case fallback.
	 * @return array<string, mixed> Surface registration record.
	 * @throws InvalidArgumentException If capability is missing or empty.
	 */
	public function authenticated( $action, $nonceAction = null, $capability = 'manage_options', $handler = null, array $schema = array(), array $args = array(), $nonce_action = null ) {

		if ( empty( $capability ) || ( is_string( $capability ) && trim( $capability ) === '' ) ) {
			throw new InvalidArgumentException(
				sprintf( 'Authenticated AJAX action "%s" requires a non-empty capability.', $action )
			);
		}

		$nonce = null !== $nonceAction ? $nonceAction : ( null !== $nonce_action ? $nonce_action : $action );

		$surface = Surface_Registry::register(
			Surface_Type::CAPABILITY_WRITE,
			'ajax',
			$action,
			$capability,
			$handler,
			$schema,
			array_merge( $args, array( 'nonce_action' => $nonce ) )
		);

		$wrapped_handler = $this->wrap_handler_with_schema( $handler, $schema );

		$registration_args = array_merge(
			array(
				'transport'    => 'admin',
				'nopriv'       => false,
				'capability'   => $capability,
				'nonce_action' => $nonce,
			),
			$args
		);

		$this->register_handler( $action, $wrapped_handler, $registration_args );

		return $surface;
	}

	/**
	 * Register a public read AJAX action.
	 *
	 * Surface Model: PublicRead.
	 *
	 * @param string               $action  Action slug without prefix.
	 * @param string|callable      $handler Handler class name or callable.
	 * @param array<string, mixed> $schema  Request validation schema.
	 * @param array<string, mixed> $args    Additional options.
	 * @return array<string, mixed> Surface registration record.
	 */
	public function public_read( $action, $handler, array $schema = array(), array $args = array() ) {

		$surface = Surface_Registry::register(
			Surface_Type::PUBLIC_READ,
			'ajax',
			$action,
			null,
			$handler,
			$schema,
			$args
		);

		$wrapped_handler = $this->wrap_handler_with_schema( $handler, $schema );

		$registration_args = array_merge(
			array(
				'transport'  => 'both',
				'nopriv'     => true,
				'skip_nonce' => true,
				'capability' => null,
			),
			$args
		);

		$this->register_handler( $action, $wrapped_handler, $registration_args );

		return $surface;
	}

	/**
	 * Alias for authenticated AJAX action with capability enforcement.
	 *
	 * Surface Model: CapabilityWrite.
	 *
	 * @param string               $action      Action slug without prefix.
	 * @param string               $nonceAction Nonce action name.
	 * @param string|callable      $capability  Required user capability.
	 * @param string|callable      $handler     Handler class name or callable.
	 * @param array<string, mixed> $schema      Request validation schema.
	 * @param array<string, mixed> $args        Additional options.
	 * @return array<string, mixed> Surface registration record.
	 */
	public function capability_write( $action, $nonceAction, $capability, $handler, array $schema = array(), array $args = array() ) {
		return $this->authenticated( $action, $nonceAction, $capability, $handler, $schema, $args );
	}

	/**
	 * Wrap handler with schema validation and automatic class instantiation.
	 *
	 * @param string|callable      $handler Handler callable or class name.
	 * @param array<string, mixed> $schema  Schema constraints.
	 * @return callable
	 */
	protected function wrap_handler_with_schema( $handler, array $schema = array() ) {
		return static function () use ( $handler, $schema ) {
			if ( ! empty( $schema ) && isset( $_REQUEST ) && is_array( $_REQUEST ) ) {
				foreach ( $schema as $param_name => $rules ) {
					if ( is_array( $rules ) && ! empty( $rules['required'] ) && ! isset( $_REQUEST[ $param_name ] ) ) {
						Ajax_Response::bad_request(
							sprintf( 'Missing required parameter: %s', $param_name )
						);
						return;
					}
				}
			}

			if ( is_string( $handler ) && class_exists( $handler ) ) {
				$instance = new $handler();
				if ( method_exists( $instance, 'handle' ) ) {
					return $instance->handle();
				}
				if ( is_callable( $instance ) ) {
					return $instance();
				}
			}

			if ( is_callable( $handler ) ) {
				return call_user_func_array( $handler, func_get_args() );
			}

			throw new InvalidArgumentException( sprintf( 'Handler is not callable or valid class: %s', var_export( $handler, true ) ) );
		};
	}

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

			if ( function_exists( 'wpdev_request_access_is_allowed' ) ) {
				$allowed = wpdev_request_access_is_allowed( $args );
			} elseif ( ! empty( $args['capability_callback'] ) && is_callable( $args['capability_callback'] ) ) {
				$allowed = (bool) call_user_func( $args['capability_callback'] );
			} elseif ( ! empty( $args['capability'] ) && function_exists( 'current_user_can' ) ) {
				$cap     = function_exists( 'wpdev_admin_capability_for' ) ? wpdev_admin_capability_for( $args['capability'] ) : $args['capability'];
				$allowed = (bool) current_user_can( $cap );
			} else {
				$allowed = false;
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
