<?php
/**
 * Ajax service contract.
 *
 * @package WPDevFramework\Core\Contracts
 * @since   2.4.0
 */

namespace WPDevFramework\Core\Contracts;

defined( 'ABSPATH' ) || exit;

/**
 * Contract for ajax transport in WPDev.
 */
interface Ajax_Service_Contract extends Service_Contract {

	/**
	 * Register a light-ajax action listener.
	 *
	 * @param string   $action   Action slug (without wpdev_ajax_ prefix).
	 * @param callable $callback Handler callback.
	 * @param int      $priority Hook priority.
	 * @return void
	 */
	public function listen( $action, $callback, $priority = 10 );

	/**
	 * Register an ajax handler with transport and security options.
	 *
	 * @since 2.6.0
	 *
	 * @param string               $action   Action slug (without prefix).
	 * @param callable             $callback Handler callback.
	 * @param array<string, mixed> $args     transport, nopriv, capability, skip_nonce, etc.
	 * @return void
	 */
	public function register_handler( $action, $callback, $args = array() );

	/**
	 * Register an AJAX-loaded tab group.
	 *
	 * @since 2.6.0
	 *
	 * @param string   $group    Tab group slug.
	 * @param callable $callback Tab renderer callback.
	 * @return void
	 */
	public function register_tabs( $group, $callback );

	/**
	 * Build URL for loading a registered admin tab.
	 *
	 * @since 2.6.0
	 *
	 * @param string $group Tab group slug.
	 * @param string $tab   Tab slug.
	 * @return string
	 */
	public function tab_url( $group, $tab = '' );

	/**
	 * Send a JSON success response and terminate.
	 *
	 * @param mixed  $data Response payload.
	 * @param string $code Machine-readable code.
	 * @return void
	 */
	public function respond_success( $data = null, $code = 'success' );

	/**
	 * Send a JSON error response and terminate.
	 *
	 * @param string     $message Error message.
	 * @param string     $code    Machine-readable code.
	 * @param mixed|null $data    Optional payload.
	 * @param int        $status  HTTP status code.
	 * @return void
	 */
	public function respond_error( $message, $code = 'error', $data = null, $status = 400 );

	/**
	 * Register an async listener.
	 *
	 * @param string   $id       Listener id.
	 * @param callable $callable Callback.
	 * @param mixed    ...$args  Optional callback args.
	 * @return void
	 */
	/**
	 * Register an authenticated AJAX action with mandatory capability and CSRF protection.
	 *
	 * @param string               $action       Action slug without prefix.
	 * @param string|null          $nonceAction  Nonce action name.
	 * @param string|callable      $capability   Required user capability.
	 * @param string|callable      $handler      Handler class name or callable.
	 * @param array<string, mixed> $schema       Request validation schema.
	 * @param array<string, mixed> $args         Additional transport options.
	 * @param string|null          $nonce_action Nonce action snake_case fallback.
	 * @return array<string, mixed> Surface registration record.
	 */
	public function authenticated( $action, $nonceAction = null, $capability = 'manage_options', $handler = null, array $schema = array(), array $args = array(), $nonce_action = null );

	/**
	 * Register a public read AJAX action.
	 *
	 * @param string               $action  Action slug without prefix.
	 * @param string|callable      $handler Handler class name or callable.
	 * @param array<string, mixed> $schema  Request validation schema.
	 * @param array<string, mixed> $args    Additional options.
	 * @return array<string, mixed> Surface registration record.
	 */
	public function public_read( $action, $handler, array $schema = array(), array $args = array() );

	/**
	 * Alias for authenticated AJAX action with capability enforcement.
	 *
	 * @param string               $action      Action slug without prefix.
	 * @param string               $nonceAction Nonce action name.
	 * @param string|callable      $capability  Required user capability.
	 * @param string|callable      $handler     Handler class name or callable.
	 * @param array<string, mixed> $schema      Request validation schema.
	 * @param array<string, mixed> $args        Additional options.
	 * @return array<string, mixed> Surface registration record.
	 */
	public function capability_write( $action, $nonceAction, $capability, $handler, array $schema = array(), array $args = array() );

} // end interface Ajax_Service_Contract;
