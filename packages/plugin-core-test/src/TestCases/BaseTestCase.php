<?php

namespace WPDevTest\TestCases;

use Exception;
use PHPUnit\Framework\MockObject;

abstract class BaseTestCase extends \WP_UnitTestCase {

	public function setUp(): void {

		parent::setUp();

		$GLOBALS['bs_exit_status'] = false;

		global $wp_rest_server, $wp_actions;
		$wp_rest_server = null;
		unset( $wp_actions['rest_api_init'] );

		if ( class_exists( \WPDev\Support\Rest\RestSetup::class )
			&& ! has_action( 'rest_api_init', [ \WPDev\Support\Rest\RestSetup::class, 'rest_init' ] ) ) {
			\WPDev\Support\Rest\RestSetup::setup();
		}
	}

	public function tearDown(): void {
		if ( class_exists( \WPDev\Core\Plugin::class ) && method_exists( \WPDev\Core\Plugin::class, 'reset_for_tests' ) ) {
			\WPDev\Core\Plugin::reset_for_tests();
		}
		if ( class_exists( \WPDev\Support\Rest\RestSetup::class ) && method_exists( \WPDev\Support\Rest\RestSetup::class, 'flush' ) ) {
			\WPDev\Support\Rest\RestSetup::flush();
		}

		global $wp_rest_server;
		$wp_rest_server = null;

		parent::tearDown();
	}

	protected static function factory() {

		static $factory = null;

		if ( ! $factory ) {
			$factory = new \WPDevTest\Factory();
		}

		return $factory;
	}


	/**
	 * Set up the expectation that a filter will be applied during the test.
	 *
	 * todo: add custom error message support
	 *
	 * @param $filter
	 *
	 * @return MockObject\Builder\InvocationMocker
	 */
	public function expectFilter( $filter, ...$arguments ): MockObject\Builder\InvocationMocker {

		$mock = $this->getMockBuilder( \stdClass::class )
		             ->setMethods( [ 'callback' ] )
		             ->getMock();

		add_filter( $filter, [ $mock, 'callback' ], PHP_INT_MAX, count( $arguments ) );

		return $mock->expects( $this->once() )
		            ->method( 'callback' )
		            ->with( ...$arguments )
		            ->willReturn( $arguments[0] ?? null );
	}

	/**
	 * @param string   $action
	 * @param callable $callback
	 * @param int      $priority
	 */
	public function expectAddAction( string $action, callable $callback, int $priority = 10, string $message = null ) {

		global $wp_filter;

		$idx = _wp_filter_build_unique_id( $action, $callback, $priority );

		if ( ! isset( $wp_filter[ $action ]->callbacks[ $priority ][$idx] ) ) {

			throw new Exception( $message ?? sprintf( 'the action "%s" was not found', $action ) );
		}

		$this->expectNotToPerformAssertions();
	}
}
