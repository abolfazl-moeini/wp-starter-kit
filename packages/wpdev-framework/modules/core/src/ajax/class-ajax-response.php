<?php
/**
 * Standard ajax JSON response helpers.
 *
 * @package WPDevFramework\Core\Ajax
 * @since   2.5.0
 */

namespace WPDevFramework\Core\Ajax;

defined( 'ABSPATH' ) || exit;

/**
 * Normalizes ajax responses to { success, code, message, data }.
 */
class Ajax_Response {

	/**
	 * Send a success response and terminate.
	 *
	 * @since 2.5.0
	 *
	 * @param mixed  $data    Payload.
	 * @param string $code    Machine-readable code.
	 * @return void
	 */
	public static function success( $data = null, $code = 'success' ) {

		wp_send_json(
			array(
				'success' => true,
				'code'    => $code,
				'message' => '',
				'data'    => $data,
			)
		);

	} // end success;

	/**
	 * Send an error response and terminate.
	 *
	 * @since 2.5.0
	 *
	 * @param string     $message Error message.
	 * @param string     $code    Machine-readable code.
	 * @param mixed|null $data    Optional payload.
	 * @param int        $status  HTTP status code.
	 * @return void
	 */
	public static function error( $message, $code = 'error', $data = null, $status = 400 ) {

		status_header( $status );

		wp_send_json(
			array(
				'success' => false,
				'code'    => $code,
				'message' => $message,
				'data'    => $data,
			)
		);

	} // end error;

	/**
	 * Send a forbidden response and terminate.
	 *
	 * @since 2.5.0
	 *
	 * @param string $message Optional message.
	 * @return void
	 */
	public static function forbidden( $message = '' ) {

		if ( '' === $message ) {
			$message = __( 'You do not have permission to perform this action.', 'wpdev' );
		}

		self::error( $message, 'forbidden', null, 403 );

	} // end forbidden;

} // end class Ajax_Response;
