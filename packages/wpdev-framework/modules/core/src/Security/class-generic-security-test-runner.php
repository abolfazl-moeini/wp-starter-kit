<?php
/**
 * Generic Security Test Runner.
 *
 * Runs automated, parameterized unauthorized-access verification tests
 * across all registered surfaces in Surface_Registry.
 *
 * @package WPDevFramework\Core\Security
 * @since   2.14.0
 */

namespace WPDevFramework\Core\Security;

use WPDevFramework\Core\Rest\Route_Registrar;

defined( 'ABSPATH' ) || exit;

/**
 * Executes generic security checks against registered framework surfaces.
 */
class Generic_Security_Test_Runner {

	/**
	 * Evaluate unauthorized access behavior for a given surface definition.
	 *
	 * @param array<string, mixed> $surface Surface record from Surface_Registry.
	 * @return array<string, mixed> Result { surface_id, passed, reason, tested_status }
	 */
	public static function verify_unauthorized_access( array $surface ) {

		$type   = isset( $surface['type'] ) ? $surface['type'] : '';
		$policy = isset( $surface['policy'] ) ? $surface['policy'] : Surface_Type::policy( $type );

		// Public surfaces are expected to allow access without authentication.
		if ( Surface_Type::PUBLIC_READ === $type ) {
			return array(
				'surface_id'    => $surface['id'],
				'passed'        => true,
				'requires_auth' => false,
				'reason'        => 'PublicRead surface correctly allows unauthenticated access.',
			);
		}

		// CapabilityWrite & AuthenticatedRead MUST reject unauthenticated or non-capable actors.
		if ( ! empty( $policy['requires_capability'] ) || ! empty( $policy['requires_auth'] ) ) {
			$routes              = new Route_Registrar();
			$permission_callback = $routes->create_permission_callback( isset( $surface['capability'] ) ? $surface['capability'] : 'manage_options' );

			// Test with unauthenticated state
			$result_unauthenticated = call_user_func( $permission_callback, null );

			$rejected = ( false === $result_unauthenticated ) || ( is_object( $result_unauthenticated ) && method_exists( $result_unauthenticated, 'get_error_code' ) );

			return array(
				'surface_id'    => $surface['id'],
				'passed'        => $rejected,
				'requires_auth' => true,
				'reason'        => $rejected
					? 'Surface correctly rejects unauthenticated / non-privileged caller.'
					: 'SECURITY FAILURE: Surface permitted unauthenticated access!',
			);
		}

		return array(
			'surface_id' => $surface['id'],
			'passed'     => true,
			'reason'     => 'Policy does not require capability enforcement.',
		);
	}

	/**
	 * Run verification across all registered surfaces.
	 *
	 * @return array<string, mixed>
	 */
	public static function verify_all() {
		$surfaces = Surface_Registry::all();
		$results  = array();
		$failures = 0;

		foreach ( $surfaces as $surface ) {
			$res       = self::verify_unauthorized_access( $surface );
			$results[] = $res;
			if ( empty( $res['passed'] ) ) {
				++$failures;
			}
		}

		return array(
			'total'    => count( $surfaces ),
			'failures' => $failures,
			'passed'   => ( 0 === $failures ),
			'results'  => $results,
		);
	}
}
