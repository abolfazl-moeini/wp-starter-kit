<?php

namespace WPDevTest\TestCases;

abstract class BaseAjaxTestCase extends \WP_Ajax_UnitTestCase {

	/**
	 * @since 1.0.0
	 * @return string
	 */
	abstract public function ajax_action(): string;

	public function setUp(): void {

		parent::setUp();

		$GLOBALS['bs_exit_status']  = false;
		$GLOBALS['pb_wp_redirects'] = '';
	}


	/**
	 * @param array $params
	 *
	 * @return \WP_Error|array
	 */
	public function request( $params = [] ) {

		$this->_last_response = '';
		$_GET                 = [];

		// Make the request.
		try {

			foreach ( $params as $key => $value ) {

				$_GET[ $key ] = $value;
			}

			$this->_handleAjax( $this->ajax_action() );

		} catch ( \WPAjaxDieContinueException $e ) {

			unset( $e );
		}

		$json       = json_decode( $this->_last_response, true );
		$last_error = json_last_error();

		return $last_error == 0 || JSON_ERROR_NONE == $last_error ? $json : $this->_last_response;
	}

	/**
	 * Create a user and login.
	 *
	 * @param string $as
	 *
	 * @return int logged in user id.
	 */
	public function login( $as = 'administrator' ) {

		$user_id = $this->factory()->user->create( array( 'role' => $as ) );

		wp_set_current_user( $user_id );

		do_action( 'wp_roles_init', wp_roles() );

		$this->flush_capabilities();

		return $user_id;
	}

	public function flush_capabilities() {

		$user = wp_get_current_user();
		$user->get_role_caps();
		$user->update_user_level_from_caps();
	}


	protected static function factory() {

		static $factory = null;

		if ( ! $factory ) {
			$factory = new \WPDevTest\Factory();
		}

		return $factory;
	}

	protected function _handleAjax( $action ) {

		remove_action( 'admin_init', '_maybe_update_core' );
		remove_action( 'admin_init', '_maybe_update_plugins' );
		remove_action( 'admin_init', '_maybe_update_themes' );

		return parent::_handleAjax( $action );
	}
}
