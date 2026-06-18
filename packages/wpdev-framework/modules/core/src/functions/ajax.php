<?php
/**
 * AJAX registration helpers (J-01).
 *
 * @package WPDevFramework\Functions
 * @since   2.6.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Wrap an AJAX handler with nonce and capability checks (mirrors Ajax_Service).
 *
 * @since 2.6.0
 *
 * @param callable             $callback Handler callback.
 * @param array<string, mixed> $args     Registration args.
 * @return callable
 */
function wpdev_wrap_ajax_handler_callback( $callback, $args = array() ) {

	$args = array_merge(
		array(
			'capability'          => 'manage_network',
			'capability_callback' => null,
			'nonce_action'        => 'wpdev-ajax-nonce',
			'nonce_field'         => 'nonce',
			'skip_nonce'          => false,
		),
		$args
	);

	return static function () use ( $callback, $args ) {
		if ( empty( $args['skip_nonce'] ) && function_exists( 'check_ajax_referer' ) ) {
			$nonce_ok = check_ajax_referer(
				$args['nonce_action'],
				$args['nonce_field'],
				false
			);

			if ( ! $nonce_ok ) {
				if ( class_exists( 'WPDev\\Core\\Ajax\\Ajax_Response' ) ) {
					\WPDevFramework\Core\Ajax\Ajax_Response::forbidden( __( 'Invalid security token.', 'wpdev' ) );
					return;
				}

				wp_send_json_error( __( 'Invalid security token.', 'wpdev' ), 403 );
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
			if ( class_exists( 'WPDev\\Core\\Ajax\\Ajax_Response' ) ) {
				\WPDevFramework\Core\Ajax\Ajax_Response::forbidden( __( 'You do not have permission to perform this action.', 'wpdev' ) );
				return;
			}

			wp_send_json_error( __( 'You do not have permission to perform this action.', 'wpdev' ), 403 );
			return;
		}

		return call_user_func_array( $callback, func_get_args() );
	};

} // end wpdev_wrap_ajax_handler_callback;

/**
 * Register an admin-ajax / light-ajax handler via Ajax_Service (J-01).
 *
 * Falls back to `add_action( 'wp_ajax_{$action}', ... )` when the service is
 * unavailable (early bootstrap or unit tests).
 *
 * @since 2.6.0
 *
 * @param string               $action   Action slug without the wp_ajax_ prefix.
 * @param callable             $callback Handler callback.
 * @param array<string, mixed> $args     Optional. transport, nopriv, priority.
 * @return void
 */
function wpdev_register_ajax_handler( $action, $callback, $args = array() ) {

	if ( function_exists( 'wpdev_services' ) && wpdev_services( 'ajax' ) ) {
		wpdev_services( 'ajax' )->register_handler( $action, $callback, $args );
		return;
	}

	$transport     = isset( $args['transport'] ) ? $args['transport'] : 'admin';
	$nopriv        = ! empty( $args['nopriv'] );
	$priority      = isset( $args['priority'] ) ? (int) $args['priority'] : 10;
	$accepted_args = isset( $args['accepted_args'] ) ? (int) $args['accepted_args'] : 1;
	$callback      = wpdev_wrap_ajax_handler_callback( $callback, $args );

	if ( 'light' === $transport || 'both' === $transport ) {
		add_action( 'wpdev_ajax_' . $action, $callback, $priority, $accepted_args );

		if ( $nopriv || 'nopriv' === $transport ) {
			add_action( 'wpdev_ajax_nopriv_' . $action, $callback, $priority, $accepted_args );
		}
	}

	if ( 'nopriv' === $transport ) {
		add_action( 'wp_ajax_nopriv_' . $action, $callback, $priority, $accepted_args );
		return;
	}

	if ( 'admin' === $transport || 'both' === $transport ) {
		add_action( 'wp_ajax_' . $action, $callback, $priority, $accepted_args );

		if ( $nopriv ) {
			add_action( 'wp_ajax_nopriv_' . $action, $callback, $priority, $accepted_args );
		}
	}

} // end wpdev_register_ajax_handler;

/**
 * Register an AJAX-loaded admin tab group (J-06).
 *
 * @since 2.6.0
 *
 * @param string   $group    Tab group slug (usually page id).
 * @param callable $callback Receives tab slug; echoes or returns HTML.
 * @return void
 */
function wpdev_register_ajax_tabs( $group, $callback ) {

	if ( function_exists( 'wpdev_services' ) && wpdev_services( 'ajax' ) ) {
		wpdev_services( 'ajax' )->register_tabs( $group, $callback );
		return;
	}

	if ( class_exists( 'WPDev\\Core\\Ajax\\Ajax_Tab_Loader' ) ) {
		\WPDevFramework\Core\Ajax\Ajax_Tab_Loader::register( $group, $callback );
	}

} // end wpdev_register_ajax_tabs;

/**
 * Build the URL that loads a registered AJAX tab.
 *
 * @since 2.6.0
 *
 * @param string $group Tab group slug.
 * @param string $tab   Tab slug.
 * @return string
 */
function wpdev_ajax_tab_url( $group, $tab = '' ) {

	if ( function_exists( 'wpdev_services' ) && wpdev_services( 'ajax' ) ) {
		return wpdev_services( 'ajax' )->tab_url( $group, $tab );
	}

	if ( class_exists( 'WPDev\\Core\\Ajax\\Ajax_Tab_Loader' ) ) {
		return \WPDevFramework\Core\Ajax\Ajax_Tab_Loader::url( $group, $tab );
	}

	return '';

} // end wpdev_ajax_tab_url;

if ( ! function_exists( 'wpdev_ajax_success' ) ) {
	/**
	 * Send a standard success JSON response (J-02).
	 *
	 * Uses Ajax_Response when available; falls back to wp_send_json_success().
	 *
	 * @since 2.6.0
	 *
	 * @param mixed  $data Payload.
	 * @param string $code Machine-readable code.
	 * @return void
	 */
	function wpdev_ajax_success( $data = null, $code = 'success' ) {

		if ( class_exists( 'WPDev\\Core\\Ajax\\Ajax_Response' ) ) {
			\WPDevFramework\Core\Ajax\Ajax_Response::success( $data, $code );
			return;
		}

		wp_send_json_success( $data );

	} // end wpdev_ajax_success;
}

if ( ! function_exists( 'wpdev_ajax_error' ) ) {
	/**
	 * Send a standard error JSON response (J-02).
	 *
	 * @since 2.6.0
	 *
	 * @param string     $message Error message.
	 * @param string     $code    Machine-readable code.
	 * @param mixed|null $data    Optional payload.
	 * @param int        $status  HTTP status.
	 * @return void
	 */
	function wpdev_ajax_error( $message, $code = 'error', $data = null, $status = 400 ) {

		if ( class_exists( 'WPDev\\Core\\Ajax\\Ajax_Response' ) ) {
			\WPDevFramework\Core\Ajax\Ajax_Response::error( $message, $code, $data, $status );
			return;
		}

		wp_send_json_error( $data ? $data : $message );

	} // end wpdev_ajax_error;
}

if ( ! function_exists( 'wpdev_ajax_error_wp_error' ) ) {
	/**
	 * Send an error response from a WP_Error instance.
	 *
	 * @since 2.6.0
	 *
	 * @param \WP_Error|string $error  Error object or message.
	 * @param int              $status HTTP status code.
	 * @return void
	 */
	function wpdev_ajax_error_wp_error( $error, $status = 400 ) {

		if ( $error instanceof \WP_Error ) {
			wpdev_ajax_error(
				$error->get_error_message(),
				$error->get_error_code() ? $error->get_error_code() : 'error',
				$error->get_error_data(),
				$status
			);
			return;
		}

		wpdev_ajax_error( is_string( $error ) ? $error : __( 'Unknown error.', 'wpdev' ), 'error', null, $status );

	} // end wpdev_ajax_error_wp_error;
}
