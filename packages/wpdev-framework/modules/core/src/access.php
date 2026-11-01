<?php
/**
 * Public Access Control API Facades.
 *
 * Implements the uniform registry facade pattern for permissions,
 * AccessManager access policies, and Two-Gate access evaluations.
 *
 * @package WPDevFramework\Core
 * @since   2.13.1
 */

use WPDevFramework\Core\Access\Permission_Registry;
use WPDevFramework\Core\Access\Access_Policy_Registry;
use WPDevFramework\Core\Services\Access_Service;
use WPDev\Access\Exceptions\Validation_Exception;

defined( 'ABSPATH' ) || exit;

/**
 * Report a validation failure without fatalling the request.
 *
 * @since 2.13.1
 *
 * @param string $function Function name.
 * @param string $message  Validation message.
 * @return void
 */
if ( ! function_exists( 'wpdev_access_doing_it_wrong' ) ) {
	function wpdev_access_doing_it_wrong( $function, $message ) {

		if ( function_exists( '_doing_it_wrong' ) ) {
			_doing_it_wrong( $function, $message, '2.13.1' );
		}

	} // end wpdev_access_doing_it_wrong;
} // end if;

/**
 * Retrieve the Access_Service instance.
 *
 * @since 2.13.1
 * @return Access_Service
 */
if ( ! function_exists( 'wpdev_access' ) ) {
	function wpdev_access() {
		static $instance = null;

		if ( class_exists( '\WPDevFramework\Core\Service_Registry', false ) && \WPDevFramework\Core\Service_Registry::has( 'access' ) ) {
			$service = \WPDevFramework\Core\Service_Registry::get( 'access' );
			if ( $service instanceof Access_Service ) {
				return $service;
			}
		}

		if ( function_exists( 'wpdev_services' ) ) {
			$service = wpdev_services( 'access' );
			if ( $service instanceof Access_Service ) {
				return $service;
			}
		}

		if ( null === $instance ) {
			$instance = new Access_Service();
		}

		return $instance;
	} // end wpdev_access;
} // end if;

if ( ! function_exists( 'wpdev_access_contract' ) ) {
	/**
	 * Handshake for the active Access service.
	 *
	 * Fail-closed: older first-loaded Access_Service copies, missing methods,
	 * non-array returns, and thrown errors yield an empty contract rather than
	 * fatalling the request.
	 *
	 * @since 2.13.1
	 * @return array<string, mixed>
	 */
	function wpdev_access_contract(): array {
		try {
			if ( ! function_exists( 'wpdev_access' ) ) {
				return array();
			}

			$service = wpdev_access();
			if ( ! is_object( $service ) || ! method_exists( $service, 'get_contract' ) ) {
				return array();
			}

			$contract = $service->get_contract();
		} catch ( \Throwable $e ) {
			return array();
		}

		return is_array( $contract ) ? $contract : array();
	}
}

/**
 * Register a permission in the catalog.
 *
 * @since 2.13.1
 *
 * @param string $id      Permission identifier (e.g. 'acme.orders.view').
 * @param array  $config  Permission configuration (owner, capability, scope, risk, label, etc.).
 * @param bool   $replace Whether to replace an existing permission with the same ID.
 * @return bool True if registered successfully, false otherwise.
 */
if ( ! function_exists( 'wpdev_register_permission' ) ) {
	function wpdev_register_permission( $id, array $config = array(), $replace = true ) {
		try {
			return Permission_Registry::register( $id, $config, $replace );
		} catch ( Validation_Exception $e ) {
			wpdev_access_doing_it_wrong( __FUNCTION__, $e->getMessage() );
			return false;
		}
	} // end wpdev_register_permission;
} // end if;

/**
 * Retrieve a registered permission from the catalog.
 *
 * @since 2.13.1
 *
 * @param string $id Permission identifier.
 * @return array<string, mixed>|null
 */
if ( ! function_exists( 'wpdev_get_permission' ) ) {
	function wpdev_get_permission( $id ) {
		return Permission_Registry::get( $id );
	} // end wpdev_get_permission;
} // end if;

/**
 * Check whether a permission is registered in the catalog.
 *
 * @since 2.13.1
 *
 * @param string $id Permission identifier.
 * @return bool
 */
if ( ! function_exists( 'wpdev_has_permission' ) ) {
	function wpdev_has_permission( $id ) {
		return Permission_Registry::has( $id );
	} // end wpdev_has_permission;
} // end if;

/**
 * List all registered permissions in the catalog.
 *
 * @since 2.13.1
 *
 * @return array<string, array<string, mixed>>
 */
if ( ! function_exists( 'wpdev_list_permissions' ) ) {
	function wpdev_list_permissions() {
		return Permission_Registry::list();
	} // end wpdev_list_permissions;
} // end if;

/**
 * Unregister a permission from the catalog.
 *
 * @since 2.13.1
 *
 * @param string $id Permission identifier.
 * @return void
 */
if ( ! function_exists( 'wpdev_unregister_permission' ) ) {
	function wpdev_unregister_permission( $id ) {
		Permission_Registry::unregister( $id );
	} // end wpdev_unregister_permission;
} // end if;

/**
 * Register an AccessManager access policy.
 *
 * @since 2.13.1
 *
 * @param string $id      Policy identifier (e.g. 'acme_orders').
 * @param array  $config  Policy configuration (owner, qualifier, version, etc.).
 * @param bool   $replace Whether to replace an existing policy with the same ID.
 * @return bool True if registered successfully, false otherwise.
 */
if ( ! function_exists( 'wpdev_register_access_policy' ) ) {
	function wpdev_register_access_policy( $id, array $config = array(), $replace = true ) {
		try {
			return Access_Policy_Registry::register( $id, $config, $replace );
		} catch ( Validation_Exception $e ) {
			wpdev_access_doing_it_wrong( __FUNCTION__, $e->getMessage() );
			return false;
		}
	} // end wpdev_register_access_policy;
} // end if;

/**
 * Retrieve a registered access policy.
 *
 * @since 2.13.1
 *
 * @param string $id Policy identifier.
 * @return array<string, mixed>|null
 */
if ( ! function_exists( 'wpdev_get_access_policy' ) ) {
	function wpdev_get_access_policy( $id ) {
		return Access_Policy_Registry::get( $id );
	} // end wpdev_get_access_policy;
} // end if;

/**
 * Check whether an access policy is registered.
 *
 * @since 2.13.1
 *
 * @param string $id Policy identifier.
 * @return bool
 */
if ( ! function_exists( 'wpdev_has_access_policy' ) ) {
	function wpdev_has_access_policy( $id ) {
		return Access_Policy_Registry::has( $id );
	} // end wpdev_has_access_policy;
} // end if;

/**
 * List all registered access policies.
 *
 * @since 2.13.1
 *
 * @return array<string, array<string, mixed>>
 */
if ( ! function_exists( 'wpdev_list_access_policies' ) ) {
	function wpdev_list_access_policies() {
		return Access_Policy_Registry::list();
	} // end wpdev_list_access_policies;
} // end if;

/**
 * Unregister an access policy.
 *
 * @since 2.13.1
 *
 * @param string $id Policy identifier.
 * @return void
 */
if ( ! function_exists( 'wpdev_unregister_access_policy' ) ) {
	function wpdev_unregister_access_policy( $id ) {
		Access_Policy_Registry::unregister( $id );
	} // end wpdev_unregister_access_policy;
} // end if;

/**
 * Check whether the current actor has access for an access ID.
 *
 * Evaluates both Gate 1 (native capability) and Gate 2 (AccessManager domain rules).
 *
 * @since 2.13.1
 *
 * @param string $access_id Permission or policy identifier.
 * @param array  $context   Evaluation context.
 * @return bool
 */
if ( ! function_exists( 'wpdev_can' ) ) {
	function wpdev_can( $access_id, array $context = array() ) {
		return wpdev_access()->can( (string) $access_id, $context );
	} // end wpdev_can;
} // end if;

/**
 * Check whether a specified actor has access for an access ID.
 *
 * For server-side and audit evaluation only; never pass untrusted client input.
 *
 * @since 2.13.1
 *
 * @param mixed  $user_id   Target user ID or WP_User instance.
 * @param string $access_id Permission or policy identifier.
 * @param array  $context   Evaluation context.
 * @return bool
 */
if ( ! function_exists( 'wpdev_can_for_user' ) ) {
	function wpdev_can_for_user( $user_id, $access_id, array $context = array() ) {
		return wpdev_access()->can_for_user( $user_id, (string) $access_id, $context );
	} // end wpdev_can_for_user;
} // end if;

/**
 * Require access for an access ID, throwing Access_Denied_Exception on failure.
 *
 * @since 2.13.1
 *
 * @param string $access_id Permission or policy identifier.
 * @param array  $context   Evaluation context.
 * @return void
 * @throws \WPDevFramework\Core\Access\Exceptions\Access_Denied_Exception
 */
if ( ! function_exists( 'wpdev_require_access' ) ) {
	function wpdev_require_access( $access_id, array $context = array() ) {
		wpdev_access()->require_access( (string) $access_id, $context );
	} // end wpdev_require_access;
} // end if;

/**
 * Resolve whether a request args array is allowed to run.
 *
 * Prefers a named access binding. Empty capability after a caller override
 * fails closed. `capability_callback` keeps boolean-cast BC.
 *
 * @since 2.13.1
 *
 * @param array<string, mixed> $args Registration args.
 * @return bool
 */
if ( ! function_exists( 'wpdev_request_access_is_allowed' ) ) {
	function wpdev_request_access_is_allowed( $args ) {

		$args = is_array( $args ) ? $args : array();

		$access_id = '';
		if ( ! empty( $args['access'] ) && is_string( $args['access'] ) ) {
			$access_id = $args['access'];
		} elseif ( ! empty( $args['access_id'] ) && is_string( $args['access_id'] ) ) {
			$access_id = $args['access_id'];
		}

		if ( '' !== $access_id ) {
			if ( function_exists( 'wpdev_can' ) ) {
				return (bool) wpdev_can( $access_id );
			}
			return false;
		}

		if ( ! empty( $args['capability_callback'] ) && is_callable( $args['capability_callback'] ) ) {
			return (bool) call_user_func( $args['capability_callback'] );
		}

		if ( ! empty( $args['capability'] ) && is_string( $args['capability'] ) ) {
			if ( ! function_exists( 'current_user_can' ) ) {
				return false;
			}
			$cap = function_exists( 'wpdev_admin_capability_for' ) ? wpdev_admin_capability_for( $args['capability'] ) : $args['capability'];
			return (bool) current_user_can( $cap );
		}

		return false;

	} // end wpdev_request_access_is_allowed;
} // end if;
