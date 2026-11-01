<?php
/**
 * Access Control Core Service.
 *
 * Coordinates permissions, policies, actor resolution, two-gate evaluation,
 * and security exception dispatching for the WPDev framework.
 *
 * @package WPDevFramework\Core\Services
 * @since   2.13.1
 */

namespace WPDevFramework\Core\Services;

use WPDevFramework\Core\Contracts\Service_Contract;
use WPDevFramework\Core\Access\Permission_Registry;
use WPDevFramework\Core\Access\Access_Policy_Registry;
use WPDevFramework\Core\Access\Exceptions\Access_Denied_Exception;
use WPDev\Access\Contracts\Capability_Resolver_Interface;
use WPDev\Access\Contracts\Evaluator_Interface;
use WPDev\Access\Contracts\Qualifier_Interface;
use WPDev\Access\Decision\Decision;
use WPDev\Access\Resolvers\WordPress_Capability_Resolver;
use WPDev\Access\UserAccess;

defined( 'ABSPATH' ) || exit;

class Access_Service implements Service_Contract {

	/**
	 * Capability resolver.
	 *
	 * @var Capability_Resolver_Interface
	 */
	protected $resolver;

	/**
	 * Constructor.
	 *
	 * @param Capability_Resolver_Interface|null $resolver Optional capability resolver.
	 */
	public function __construct( ?Capability_Resolver_Interface $resolver = null ) {

		$this->resolver = $resolver ? $resolver : new WordPress_Capability_Resolver();

	} // end __construct;

	/**
	 * Unique service identifier.
	 *
	 * @return string
	 */
	public function id() {

		return 'access';

	} // end id;

	public function get_contract(): array {

		return array(
			'contract_version' => 1,
			'provider'         => 'wpdev',
			'service_class'    => static::class,
			'features'         => array(
				'permission_registry'     => true,
				'policy_registry'         => true,
				'native_capability_gate'  => true,
				'explicit_policy_binding' => true,
				'strict_qualifiers'       => true,
				'actor_evaluation'        => false,
				'context_schema'          => false,
				'user_restrictions'       => false,
				'restriction_revision'    => false,
				'pending_barriers'        => false,
				'independent_recovery'    => false,
				'grant_metadata'          => false,
				'surface_bindings'        => false,
				'readonly_preview'        => false,
				'scoped_providers'        => false,
			),
		);

	}

	/**
	 * Boot hooks and listeners for the access service.
	 *
	 * @return void
	 */
	public function boot() {

		if ( function_exists( 'do_action' ) ) {
			/**
			 * Fired when the access service is booted.
			 *
			 * @since 2.13.1
			 * @param Access_Service $service Current service instance.
			 */
			do_action( 'wpdev_access_service_boot', $this );
		}

	} // end boot;

	/**
	 * Set or replace the capability resolver.
	 *
	 * @param Capability_Resolver_Interface $resolver Resolver instance.
	 * @return self
	 */
	public function set_resolver( Capability_Resolver_Interface $resolver ): self {

		$this->resolver = $resolver;
		return $this;

	} // end set_resolver;

	/**
	 * Get the active capability resolver.
	 *
	 * @return Capability_Resolver_Interface
	 */
	public function get_resolver(): Capability_Resolver_Interface {

		return $this->resolver;

	} // end get_resolver;

	/**
	 * Check whether the current user has access for a given access ID.
	 *
	 * @param string $access_id Permission or policy access ID.
	 * @param array  $context   Evaluation context.
	 * @return bool
	 */
	public function can( string $access_id, array $context = array() ): bool {

		return $this->evaluate( $access_id, $context )->is_allowed();

	} // end can;

	/**
	 * Check whether a specific user has access for a given access ID.
	 *
	 * Note: Only for trusted server-side evaluation and audit, never accept actor ID from raw client POST.
	 *
	 * @param mixed  $user_id   Target user ID or WP_User instance.
	 * @param string $access_id Permission or policy access ID.
	 * @param array  $context   Evaluation context.
	 * @return bool
	 */
	public function can_for_user( $user_id, string $access_id, array $context = array() ): bool {

		$context['user_id'] = $user_id;
		$context['actor']   = $user_id;

		return $this->evaluate( $access_id, $context )->is_allowed();

	} // end can_for_user;

	/**
	 * Require access for an access ID, throwing Access_Denied_Exception if not granted.
	 *
	 * @param string $access_id Permission or policy access ID.
	 * @param array  $context   Evaluation context.
	 * @return void
	 * @throws Access_Denied_Exception If access is denied.
	 */
	public function require_access( string $access_id, array $context = array() ): void {

		$decision = $this->evaluate( $access_id, $context );

		if ( ! $decision->is_allowed() ) {
			throw new Access_Denied_Exception(
				sprintf( 'Access denied for "%s" [%s]: %s', $access_id, $decision->get_reason_code(), $decision->get_message() ),
				$access_id,
				$context,
				$decision->get_reason_code()
			);
		}

	} // end require_access;

	/**
	 * Perform the complete Two-Gate Defense-in-Depth access evaluation.
	 *
	 * Gate 1: Native WordPress base capability check (WP_User::has_cap) on target actor/site.
	 * Gate 2: AccessManager business/domain rules (UserAccess/BluePrint).
	 *
	 * Both gates must pass (AND).
	 *
	 * @param string $access_id Access identifier.
	 * @param array  $context   Evaluation context.
	 * @return Decision
	 */
	public function evaluate( string $access_id, array $context = array() ): Decision {

		$access_id = trim( (string) $access_id );

		if ( '' === $access_id ) {
			return Decision::deny( $access_id, Decision::REASON_UNKNOWN_ID, null, $context, 'Empty access ID.' );
		}

		$permission = Permission_Registry::get( $access_id );

		// Every access ID must have a declaration in the permission catalog (fail-closed).
		if ( null === $permission ) {
			return Decision::deny(
				$access_id,
				Decision::REASON_UNKNOWN_ID,
				null,
				$context,
				sprintf( 'Access ID "%s" is not registered in the permission catalog.', $access_id )
			);
		}

		$actor  = $this->resolve_actor( $context );
		$policy = null;
		if ( isset( $permission['policy'] ) && '' !== $permission['policy'] ) {
			if ( is_string( $permission['policy'] ) && '' !== trim( $permission['policy'] ) ) {
				$policy = Access_Policy_Registry::get( $permission['policy'] );
			}

			if ( null === $policy
				|| ! isset( $permission['owner'], $policy['owner'], $policy['qualifier'] )
				|| $policy['owner'] !== $permission['owner']
				|| ! $this->is_valid_qualifier( $policy['qualifier'] )
			) {
				return Decision::deny(
					$access_id,
					Decision::REASON_POLICY_FAILED,
					$actor,
					$context,
					sprintf( 'Invalid explicit policy binding for "%s".', $access_id )
				);
			}
		}

		if ( isset( $permission['qualifier'] ) && ! $this->is_valid_qualifier( $permission['qualifier'] ) ) {
			return Decision::deny(
				$access_id,
				Decision::REASON_POLICY_FAILED,
				$actor,
				$context,
				sprintf( 'Invalid explicit qualifier for "%s".', $access_id )
			);
		}

		if ( ! $this->is_valid_context( $context ) ) {
			return Decision::deny( $access_id, Decision::REASON_INVALID_CONTEXT, $actor, $context, 'Invalid actor or site identifier.' );
		}

		// Verify authentication unless marked as explicitly public.
		$is_public = isset( $permission['public'] ) && true === $permission['public'];

		if ( ! $is_public && ! $this->is_actor_authenticated( $actor ) ) {
			return Decision::deny( $access_id, Decision::REASON_MISSING_ACTOR, $actor, $context, 'Unauthenticated actor for protected access ID.' );
		}

		// Gate 1: Native WordPress Base Capability Check
		if ( ! $is_public ) {
			$base_cap = isset( $permission['capability'] ) ? trim( (string) $permission['capability'] ) : '';

			if ( '' === $base_cap ) {
				return Decision::deny(
					$access_id,
					Decision::REASON_BASE_CAPABILITY_DENIED,
					$actor,
					$context,
					sprintf( 'Protected permission "%s" has no native base capability configured.', $access_id )
				);
			}

			$has_base_cap = $this->resolver->user_can( $actor, $base_cap, $context );

			if ( ! $has_base_cap ) {
				return Decision::deny(
					$access_id,
					Decision::REASON_BASE_CAPABILITY_DENIED,
					$actor,
					$context,
					sprintf( 'Actor lacks native base capability "%s".', $base_cap )
				);
			}
		}

		// Gate 2: AccessManager Domain / Business Rules Check
		$qualifier = $this->resolve_qualifier( $access_id, $permission, $policy );

		if ( null !== $qualifier ) {
			// Ensure qualifier uses our configured resolver if it's a UserAccess subclass
			if ( $qualifier instanceof UserAccess && $qualifier->get_resolver() !== $this->resolver ) {
				$qualifier->set_resolver( $this->resolver );
			}

			try {
				if ( $qualifier instanceof Evaluator_Interface ) {
					$decision = $qualifier->evaluate( $access_id, $context );
					if ( ! $decision->is_allowed() ) {
						return $decision;
					}
				} elseif ( $qualifier instanceof Qualifier_Interface || ( is_object( $qualifier ) && method_exists( $qualifier, 'have_access' ) && is_callable( array( $qualifier, 'have_access' ) ) ) ) {
					if ( true !== $qualifier->have_access( $access_id, $context ) ) {
						return Decision::deny(
							$access_id,
							Decision::REASON_RULE_DENIED,
							$actor,
							$context,
							sprintf( 'AccessManager domain rule denied access for "%s".', $access_id )
						);
					}
				} elseif ( is_callable( $qualifier ) ) {
					$result       = call_user_func( $qualifier, $context, $actor );
					$passes_gate2 = ( true === $result );

					if ( ! $passes_gate2 ) {
						return Decision::deny(
							$access_id,
							Decision::REASON_RULE_DENIED,
							$actor,
							$context,
							sprintf( 'AccessManager domain rule denied access for "%s".', $access_id )
						);
					}
				} else {
					return Decision::deny(
						$access_id,
						Decision::REASON_RULE_DENIED,
						$actor,
						$context,
						sprintf( 'Invalid qualifier for "%s".', $access_id )
					);
				}
			} catch ( \Throwable $e ) {
				return Decision::deny(
					$access_id,
					Decision::REASON_EXCEPTION_THROWN,
					$actor,
					$context,
					$e->getMessage()
				);
			}
		}

		// Both gates satisfied: Allow.
		return Decision::allow( $access_id, $actor, $context, 'Access granted by Two-Gate evaluation.' );

	} // end evaluate;

	protected function is_valid_context( array $context ): bool {
		foreach ( array( 'actor', 'user_id', 'user' ) as $alias ) {
			if ( ! isset( $context[ $alias ] ) ) {
				continue;
			}

			$actor = $context[ $alias ];
			if ( is_object( $actor ) ) {
				if ( ! isset( $actor->ID ) ) {
					return false;
				}
				$actor = $actor->ID;
			}

			if ( ! $this->is_valid_identifier( $actor ) ) {
				return false;
			}
		}

		foreach ( array( 'site_id', 'blog_id' ) as $alias ) {
			if ( isset( $context[ $alias ] ) && ! $this->is_valid_identifier( $context[ $alias ] ) ) {
				return false;
			}
		}

		return true;
	}

	protected function is_valid_identifier( $id ): bool {
		if ( is_int( $id ) ) {
			return $id >= 0;
		}

		if ( ! is_string( $id ) || ! ctype_digit( $id ) ) {
			return false;
		}

		$digits  = ltrim( $id, '0' );
		$maximum = (string) PHP_INT_MAX;

		return strlen( $digits ) < strlen( $maximum )
			|| ( strlen( $digits ) === strlen( $maximum ) && strcmp( $digits, $maximum ) <= 0 );
	}

	protected function is_valid_qualifier( $qualifier ): bool {
		return $qualifier instanceof Evaluator_Interface
			|| $qualifier instanceof Qualifier_Interface
			|| ( is_object( $qualifier ) && method_exists( $qualifier, 'have_access' ) && is_callable( array( $qualifier, 'have_access' ) ) )
			|| is_callable( $qualifier );
	}

	/**
	 * Resolve the qualifier associated with an access ID.
	 *
	 * Enforces strict owner boundary isolation so that foreign plugins cannot supply
	 * or hijack qualifiers for another owner's permission.
	 *
	 * @param string     $access_id  Access identifier.
	 * @param array|null $permission Permission definition or null.
	 * @param array|null $policy     Policy definition or null.
	 * @return mixed Qualifier instance, callable, or null.
	 */
	protected function resolve_qualifier( string $access_id, ?array $permission, ?array $policy ) {

		unset( $access_id );

		if ( ! is_array( $permission ) ) {
			return null;
		}

		$permission_owner = isset( $permission['owner'] ) ? $permission['owner'] : null;

		if ( isset( $permission['qualifier'] ) && null !== $permission['qualifier'] ) {
			return $permission['qualifier'];
		}

		if ( ! is_array( $policy ) || ! isset( $policy['qualifier'] ) ) {
			return null;
		}

		if ( null === $permission_owner || ! isset( $policy['owner'] ) || $policy['owner'] !== $permission_owner ) {
			return null;
		}

		return $policy['qualifier'];

	} // end resolve_qualifier;

	/**
	 * Resolve actor from context.
	 *
	 * @param array $context Context array.
	 * @return mixed Actor ID, WP_User, or null for current user.
	 */
	protected function resolve_actor( array $context ) {

		if ( isset( $context['actor'] ) ) {
			return $context['actor'];
		}

		if ( isset( $context['user_id'] ) ) {
			return $context['user_id'];
		}

		if ( isset( $context['user'] ) ) {
			return $context['user'];
		}

		return null;

	} // end resolve_actor;

	/**
	 * Check whether an actor is authenticated.
	 *
	 * @param mixed $actor Actor representation.
	 * @return bool
	 */
	protected function is_actor_authenticated( $actor ): bool {

		if ( null === $actor ) {
			if ( function_exists( 'is_user_logged_in' ) ) {
				return (bool) is_user_logged_in();
			}
			return false;
		}

		if ( is_int( $actor ) || ( is_string( $actor ) && ctype_digit( $actor ) ) ) {
			return (int) $actor > 0;
		}

		if ( is_object( $actor ) && isset( $actor->ID ) && (int) $actor->ID > 0 ) {
			return true;
		}

		return false;

	} // end is_actor_authenticated;

} // end class Access_Service;
