<?php
/**
 * Declarative REST Route Registrar.
 *
 * Provides high-level, strictly-governed primitives for declaring REST endpoints
 * with automatic permission callbacks, mandatory capability enforcement, request
 * schema validation, and automatic surface catalog registration.
 *
 * @package WPDevFramework\Core\Rest
 * @since   2.14.0
 */

namespace WPDevFramework\Core\Rest;

use InvalidArgumentException;
use WPDevFramework\Core\Contracts\Service_Contract;
use WPDevFramework\Core\Security\Surface_Registry;
use WPDevFramework\Core\Security\Surface_Type;

defined( 'ABSPATH' ) || exit;

/**
 * Route Registrar primitive implementation.
 */
class Route_Registrar implements Service_Contract {

	/**
	 * Queued route registration callbacks waiting for `rest_api_init`.
	 *
	 * @var array<callable>
	 */
	protected $pending_registrations = array();

	/**
	 * Whether the registrar has hooked into rest_api_init.
	 *
	 * @var bool
	 */
	protected $hooked = false;

	/**
	 * Service identifier.
	 *
	 * @return string
	 */
	public function id() {
		return 'routes';
	}

	/**
	 * Boot the route registrar service.
	 *
	 * @return void
	 */
	public function boot() {
		if ( ! $this->hooked && function_exists( 'add_action' ) ) {
			add_action( 'rest_api_init', array( $this, 'flush_registrations' ) );
			$this->hooked = true;
		}
	}

	/**
	 * Flush all pending route registrations onto the WordPress REST server.
	 *
	 * @return void
	 */
	public function flush_registrations() {
		while ( ! empty( $this->pending_registrations ) ) {
			$registration = array_shift( $this->pending_registrations );
			call_user_func( $registration );
		}
	}

	/**
	 * Register a mutating (write) REST route with mandatory capability authorization.
	 *
	 * Surface Model: CapabilityWrite.
	 *
	 * @param string               $namespace  Route namespace (e.g. 'acme/v1').
	 * @param string               $route      Route path (e.g. '/settings').
	 * @param string|callable      $capability Required user capability (mandatory; cannot be empty).
	 * @param string|callable      $handler    Handler class name or callable.
	 * @param array<string, mixed> $schema     Input validation schema / endpoint argument constraints.
	 * @param array<string, mixed> $args       Additional endpoint arguments (e.g. methods).
	 * @return array<string, mixed> Registered surface metadata.
	 * @throws InvalidArgumentException If capability is missing or empty.
	 */
	public function write( $namespace, $route, $capability, $handler, array $schema = array(), array $args = array() ) {

		if ( empty( $capability ) || ( is_string( $capability ) && trim( $capability ) === '' ) ) {
			throw new InvalidArgumentException(
				sprintf( 'Write route "%s%s" requires a non-empty capability.', $namespace, $route )
			);
		}

		$methods = isset( $args['methods'] ) ? $args['methods'] : 'POST';

		$surface = Surface_Registry::register(
			Surface_Type::CAPABILITY_WRITE,
			'rest',
			rtrim( $namespace, '/' ) . '/' . ltrim( $route, '/' ),
			$capability,
			$handler,
			$schema,
			array_merge( $args, array( 'methods' => $methods ) )
		);

		$this->schedule_wp_route(
			$namespace,
			$route,
			$methods,
			$handler,
			$this->create_permission_callback( $capability ),
			$schema,
			$args
		);

		return $surface;
	}

	/**
	 * Register a read REST route (public or authenticated).
	 *
	 * Surface Model: PublicRead (if capability is null) or AuthenticatedRead.
	 *
	 * @param string                      $namespace  Route namespace.
	 * @param string                      $route      Route path.
	 * @param string|callable             $handler    Handler class name or callable.
	 * @param string|callable|null        $capability Optional capability for authenticated read.
	 * @param array<string, mixed>        $schema     Input validation schema.
	 * @param array<string, mixed>        $args       Additional options.
	 * @return array<string, mixed> Registered surface metadata.
	 */
	public function read( $namespace, $route, $handler, $capability = null, array $schema = array(), array $args = array() ) {

		$type    = empty( $capability ) ? Surface_Type::PUBLIC_READ : Surface_Type::AUTHENTICATED_READ;
		$methods = isset( $args['methods'] ) ? $args['methods'] : 'GET';

		$surface = Surface_Registry::register(
			$type,
			'rest',
			rtrim( $namespace, '/' ) . '/' . ltrim( $route, '/' ),
			$capability,
			$handler,
			$schema,
			array_merge( $args, array( 'methods' => $methods ) )
		);

		$permission_callback = empty( $capability )
			? '__return_true'
			: $this->create_permission_callback( $capability );

		$this->schedule_wp_route(
			$namespace,
			$route,
			$methods,
			$handler,
			$permission_callback,
			$schema,
			$args
		);

		return $surface;
	}

	/**
	 * Register an authenticated read REST route.
	 *
	 * Surface Model: AuthenticatedRead.
	 *
	 * @param string               $namespace  Route namespace.
	 * @param string               $route      Route path.
	 * @param string|callable      $capability Required read capability (defaults to 'read').
	 * @param string|callable      $handler    Handler class name or callable.
	 * @param array<string, mixed> $schema     Input validation schema.
	 * @param array<string, mixed> $args       Additional options.
	 * @return array<string, mixed>
	 */
	public function authenticated_read( $namespace, $route, $capability, $handler, array $schema = array(), array $args = array() ) {
		return $this->read( $namespace, $route, $handler, $capability ?: 'read', $schema, $args );
	}

	/**
	 * Register a signed webhook endpoint.
	 *
	 * Surface Model: SignedWebhook.
	 *
	 * @param string               $namespace  Route namespace.
	 * @param string               $route      Route path.
	 * @param string|callable      $handler    Handler class name or callable.
	 * @param callable             $verifier   Webhook cryptographic signature verification callback.
	 * @param array<string, mixed> $schema     Input validation schema.
	 * @param array<string, mixed> $args       Additional options.
	 * @return array<string, mixed>
	 */
	public function webhook( $namespace, $route, $handler, $verifier, array $schema = array(), array $args = array() ) {

		$methods = isset( $args['methods'] ) ? $args['methods'] : 'POST';

		$surface = Surface_Registry::register(
			Surface_Type::SIGNED_WEBHOOK,
			'rest',
			rtrim( $namespace, '/' ) . '/' . ltrim( $route, '/' ),
			null,
			$handler,
			$schema,
			array_merge( $args, array( 'methods' => $methods ) )
		);

		$this->schedule_wp_route(
			$namespace,
			$route,
			$methods,
			$handler,
			$verifier,
			$schema,
			$args
		);

		return $surface;
	}

	/**
	 * Build a robust permission callback from a capability string or callback.
	 *
	 * @param string|callable $capability Capability string or custom evaluation callable.
	 * @return callable
	 */
	public function create_permission_callback( $capability ) {
		return static function ( $request = null ) use ( $capability ) {
			if ( is_callable( $capability ) ) {
				return (bool) call_user_func( $capability, $request );
			}

			if ( function_exists( 'is_user_logged_in' ) && ! is_user_logged_in() ) {
				if ( function_exists( 'rest_authorization_required_code' ) && class_exists( '\WP_Error' ) ) {
					return new \WP_Error(
						'rest_not_logged_in',
						__( 'You must be logged in to access this endpoint.', 'wpdev' ),
						array( 'status' => rest_authorization_required_code() )
					);
				}
				return false;
			}

			if ( function_exists( 'current_user_can' ) ) {
				$cap = function_exists( 'wpdev_admin_capability_for' )
					? wpdev_admin_capability_for( (string) $capability )
					: (string) $capability;

				if ( current_user_can( $cap ) ) {
					return true;
				}

				if ( class_exists( '\WP_Error' ) ) {
					return new \WP_Error(
						'rest_forbidden',
						__( 'You do not have permission to perform this action.', 'wpdev' ),
						array( 'status' => 403 )
					);
				}
				return false;
			}

			return false;
		};
	}

	/**
	 * Wrap the user handler with automatic class instantiation and schema validation.
	 *
	 * @param string|callable      $handler Handler callable or class name.
	 * @param array<string, mixed> $schema  Schema definition.
	 * @return callable
	 */
	public function wrap_handler( $handler, array $schema = array() ) {
		return static function ( $request = null ) use ( $handler, $schema ) {
			// Validate schema constraints if defined and request is present
			if ( ! empty( $schema ) && is_object( $request ) && method_exists( $request, 'get_params' ) ) {
				$params = $request->get_params();
				foreach ( $schema as $param_name => $rules ) {
					if ( is_array( $rules ) && ! empty( $rules['required'] ) && ! isset( $params[ $param_name ] ) ) {
						if ( class_exists( '\WP_Error' ) ) {
							return new \WP_Error(
								'rest_missing_param',
								sprintf( 'Missing required parameter: %s', $param_name ),
								array( 'status' => 400 )
							);
						}
					}
				}
			}

			if ( is_string( $handler ) && class_exists( $handler ) ) {
				$instance = new $handler();
				if ( method_exists( $instance, 'handle' ) ) {
					return $instance->handle( $request );
				}
				if ( is_callable( $instance ) ) {
					return $instance( $request );
				}
			}

			if ( is_callable( $handler ) ) {
				return call_user_func( $handler, $request );
			}

			$repr = is_object( $handler ) ? get_class( $handler ) : ( is_string( $handler ) ? $handler : gettype( $handler ) );
			throw new InvalidArgumentException( sprintf( 'Handler is not callable or valid class: %s', $repr ) );
		};
	}

	/**
	 * Schedule route registration with WordPress REST server.
	 *
	 * @param string               $namespace           Route namespace.
	 * @param string               $route               Route path.
	 * @param string|string[]      $methods             HTTP methods.
	 * @param string|callable      $handler             Endpoint handler.
	 * @param callable|string      $permission_callback Permission callback.
	 * @param array<string, mixed> $schema              Schema rules.
	 * @param array<string, mixed> $args                Extra arguments.
	 * @return void
	 */
	protected function schedule_wp_route( $namespace, $route, $methods, $handler, $permission_callback, array $schema = array(), array $args = array() ) {

		$wrapped_handler = $this->wrap_handler( $handler, $schema );

		$registration = static function () use ( $namespace, $route, $methods, $wrapped_handler, $permission_callback, $schema, $args ) {
			if ( ! function_exists( 'register_rest_route' ) ) {
				return;
			}

			$endpoint_args = array(
				'methods'             => $methods,
				'callback'            => $wrapped_handler,
				'permission_callback' => $permission_callback,
			);

			if ( ! empty( $schema ) ) {
				$endpoint_args['args'] = $schema;
			}

			if ( ! empty( $args['args'] ) && is_array( $args['args'] ) ) {
				$endpoint_args['args'] = array_merge( isset( $endpoint_args['args'] ) ? $endpoint_args['args'] : array(), $args['args'] );
			}

			register_rest_route( $namespace, $route, $endpoint_args );
		};

		if ( function_exists( 'did_action' ) && did_action( 'rest_api_init' ) ) {
			call_user_func( $registration );
		} else {
			$this->pending_registrations[] = $registration;
			$this->boot();
		}
	}
}

// Backward compatibility alias for legacy WPDev namespace.
if ( ! class_exists( 'WPDev\Core\Rest\Route_Registrar', false ) ) {
	class_alias( Route_Registrar::class, 'WPDev\Core\Rest\Route_Registrar' );
}
