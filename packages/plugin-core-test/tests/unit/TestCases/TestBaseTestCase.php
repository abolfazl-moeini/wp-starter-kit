<?php

namespace WPDevTest\Unit\TestCases;

use WPDevTest\Unit as TestRoot;
use WPDevTest\{
	TestCases\BaseTestCase
};

class TestBaseTestCase extends TestRoot\TestCase {

	public function testExpectAddActionWithWrongHook() {

		$this->expectException( \Exception::class );

		$test_case = new SampleBaseTestCase();
		$test_case->expectAddAction( 'wpdev/hook/name', [ $this, '_sample_callback' ], 20 );
	}

	public function testExpectAddActionWithWrongPriority() {

		add_action( 'wpdev/hook/name-2', [ $this, '_sample_callback' ], 22 );
		add_action( 'wpdev/hook/name-2', '_return_false' );

		$this->expectException( \Exception::class );

		$test_case = new SampleBaseTestCase();
		$test_case->expectAddAction( 'wpdev/hook/name-2', [ $this, '_sample_callback' ], 20 );
	}

	public function testExpectAddActionWithWrongCallback() {

		add_action( 'wpdev/hook/name-3', [ $this, '_sample_callback' ], 22 );
		add_action( 'wpdev/hook/name-3', '_return_false' );

		$this->expectException( \Exception::class );

		$test_case = new SampleBaseTestCase();
		$test_case->expectAddAction( 'wpdev/hook/name-3', [ $this, '_sample_callback2' ], 22 );
	}


	public function testExpectAddActionCorrect() {

		add_action( 'wpdev/hook/name-5', [ $this, '_sample_callback' ], 22 );

		$this->expectNotToPerformAssertions();

		$test_case = new SampleBaseTestCase();
		$test_case->expectAddAction( 'wpdev/hook/name-5', [ $this, '_sample_callback' ], 22 );
	}


	public function testExpectAddActionShouldFireExpectNotToPerformAssertions() {

		add_action( 'wpdev/hook/name-6', [ $this, '_sample_callback' ], 22 );

		$test_case = new SampleBaseTestCase();
		$test_case->expectAddAction( 'wpdev/hook/name-6', [ $this, '_sample_callback' ], 22 );

		$this->assertTrue( $test_case->doesNotPerformAssertions() );
	}

	public function _sample_callback( $x ) {

		return $x;
	}

	public function _sample_callback2( $x ) {

		return $x;
	}
}