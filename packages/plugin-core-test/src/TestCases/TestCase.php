<?php

namespace WPDevTest\TestCases;

abstract class TestCase extends BaseTestCase {

	function setUp(): void {

		global $bs_wp_redirects;
		global $bs_exit_status;

		$bs_wp_redirects = array();
		$bs_exit_status  = false;

		parent::setUp();

		if ( class_exists( \BF_Options::class ) ) {
			\BF_Options::$values = [];
		}

		$this->set_current_language( 'en' );
	}


	/**
	 * Create a user and login.
	 *
	 * @param string $as
	 *
	 * @return int logged in user id.
	 */
	public function login( $as = 'subscriber' ) {

		$user_id = $this->factory()->user->create( array( 'role' => $as ) );

		wp_set_current_user( $user_id );

		do_action( 'wp_roles_init', wp_roles() );

		$this->flush_capabilities();

		return $user_id;
	}

	/**
	 * @return bool
	 */
	public function can_switch_user() {

		return defined( 'USER_SWITCHING_OLDUSER_COOKIE' );
	}

	/**
	 * @param int $user_id User id to switch.
	 *
	 * @since 1.0.0
	 * @return bool true on success or false otherwise.
	 */
	public function switch_user( $user_id ) {

		if ( ! $this->can_switch_user() ) {

			$this->markTestSkipped( 'user-switching is not active.' );

			return false;
		}

		if ( ! $current_user_id = get_current_user_id() ) {

			return false;
		}
		$old_token = function_exists( 'wp_get_session_token' ) ? wp_get_session_token() : '';

		$_COOKIE[ USER_SWITCHING_OLDUSER_COOKIE ] = wp_generate_auth_cookie( $current_user_id, time() + 3600, 'logged_in', $old_token );

		wp_set_current_user( $user_id );

		do_action( 'wp_roles_init', wp_roles() );

		$this->flush_capabilities();

		return true;
	}

	public function flush_capabilities() {

		$user = wp_get_current_user();
		$user->get_role_caps();
		$user->update_user_level_from_caps();
	}

	function go_to( $url ) {

		$this->set_permalink_structure( '/%postname%/' );

		return parent::go_to( $url );
	}

	public function method_working_notice( $class, $method, $id = 0 ) {

		if ( $id ) {

			$id = ' #' . $id;
		} else {

			$id = '';
		}

		return sprintf( 'The %s::%s method is not working properly%s.', $class, $method, $id );
	}

	public function template_working_notice( $template_name, $module_name, $id = 0 ) {

		if ( $id ) {

			$id = ' #' . $id;
		} else {

			$id = '';
		}

		return sprintf( 'The template:%s was not found or in %s module%s.', $template_name, $module_name, $id );
	}

	/**
	 * @param string $language
	 */
	public function set_current_language( $language ): bool {
		global $sitepress;

		if ( $sitepress ) {

			$sitepress->set_current_language( $language );

			return true;
		}

		return false;
	}

	/**
	 * @param string $default
	 *
	 * @return string
	 */
	public function get_current_language(): string {
		global $sitepress;

		if ( $sitepress ) {

			return $sitepress->get_current_language();
		}

		$local = get_locale();

		return substr( $local, 0, strpos( $local, '_' ) );
	}

	/**
	 * Fire private/protected method on an object.
	 *
	 * @param object|string $class instance or class name
	 * @param string        $method
	 * @param array         $arguments
	 *
	 * @throws \ReflectionException
	 * @return mixed
	 */
	public function method_call( $class, string $method, array $arguments = [], bool $get_echo = false ) {

		$ref_object   = \is_string( $class ) ? new \ReflectionClass( $class ) : new \ReflectionObject( $class );
		$ref_property = $ref_object->getMethod( $method );
		$ref_property->setAccessible( true );

		$get_echo && ob_start();

		$result = $ref_property->invokeArgs( \is_string( $class ) ? null : $class, $arguments );

		return $get_echo ? ob_get_clean() : $result;
	}

	/**
	 * Set value to a private/protected property.
	 *
	 * @param object|string $class instance or class name
	 * @param string        $property
	 * @param mixed         $value
	 *
	 * @return bool true on success or false otherwise
	 */
	public function property_set( $class, string $property, $value ): bool {

		try {

			$ref_object   = \is_string( $class ) ? new \ReflectionClass( $class ) : new \ReflectionObject( $class );
			$ref_property = $ref_object->getProperty( $property );
			$ref_property->setAccessible( true );
			$ref_property->setValue( $class, $value );

			return true;
		} catch ( \ReflectionException $e ) {
		}

		return false;
	}

	/**
	 * Get value of a private/protected property.
	 *
	 * @param object|string $class instance or class name
	 * @param string        $property
	 * @param mixed &       $value
	 *
	 * @return bool true on success or false otherwise
	 */
	public function property_get( $class, string $property, &$value ): bool {

		try {

			$ref_object   = \is_string( $class ) ? new \ReflectionClass( $class ) : new \ReflectionObject( $class );
			$ref_property = $ref_object->getProperty( $property );
			$ref_property->setAccessible( true );
			//
			$value = $ref_property->getValue( $class );

			return true;
		} catch ( \ReflectionException $e ) {

		}

		return false;
	}

	public function lorem_ipsum(): string {

		return 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
	}

	protected function sample_post_thumbnail( $post_id ) {

		$filename = dirname( __DIR__ ) . '/static/logo.png';

		$thumbnail_id = $this->factory()->attachment->create_upload_object( $filename, $post_id );

		set_post_thumbnail( $post_id, $thumbnail_id );

		return $thumbnail_id;
	}
}
