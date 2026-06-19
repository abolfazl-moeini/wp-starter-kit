<?php

namespace WPDevTest\Unit\Proxy;

use WPDevTest\Proxy\ObjectProxy;
use WPDevTest\Unit as TestRoot;

class TestObjectProxy extends TestRoot\TestCase {


	/**
	 * @covers ObjectProxy::__construct
	 */
	public function test_construct_method() {

		$sample_object = new SampleObject();
		$instance      = new ObjectProxy( $sample_object );
		//
		$this->property_get( $instance, 'instance', $actual );

		$this->assertSame( $sample_object, $actual );
	}

	/**
	 * @covers ObjectProxy::property_set
	 */
	public function test_property_set() {

		$sample_object = new SampleObject();
		$instance      = new ObjectProxy( $sample_object );
		$instance->property_set( 'key', 'override' );
		//
		$this->property_get( $instance, 'property_stack', $actual );

		$this->assertEquals( [
			'key' => 'override'
		], $actual );
	}

	/**
	 * @covers ObjectProxy::property_get
	 */
	public function test_property_get() {

		$sample_object = new SampleObject();
		$instance      = new ObjectProxy( $sample_object );
		$this->property_set( $instance, 'property_stack', [
			'key' => 'override'
		] );

		$this->assertEquals( 'override', $instance->property_get( 'key' ) );
	}

	/**
	 * @covers ObjectProxy::method_set
	 */
	public function test_method_set() {

		$sample_object = new SampleObject();
		$instance      = new ObjectProxy( $sample_object );
		$instance->method_set( 'method', 'override' );
		//
		$this->property_get( $instance, 'method_stack', $actual );

		$this->assertEquals( [
			'method' => 'override'
		], $actual );
	}

	/**
	 * @covers ObjectProxy::method_get
	 */
	public function test_method_get() {

		$sample_object = new SampleObject();
		$instance      = new ObjectProxy( $sample_object );
		$this->property_set( $instance, 'method_stack', [
			'method' => 'override'
		] );
		//

		$this->assertEquals( 'override', $instance->method_get( 'method' ) );
	}

	/**
	 * @covers ObjectProxy::__call
	 */
	public function test_call_method_override_value() {

		$sample_object = new SampleObject();
		$instance      = new ObjectProxy( $sample_object );
		$this->property_set( $instance, 'method_stack', [
			'method' => 'override()'
		] );

		$this->assertEquals( 'override()', $instance->method() );
	}


	/**
	 * @covers ObjectProxy::__call
	 */
	public function test_call_method_fire_original_method() {

		$sample_object = $this->createTestProxy( SampleObject::class );
		$instance      = new ObjectProxy( $sample_object );
		$this->property_set( $instance, 'method_stack', [] );

		$sample_object->expects( $this->once() )
		              ->method( 'method' )
		              ->with( 1, 'two' );

		$this->assertEquals( 'method()', $instance->method( 1, 'two' ) );
	}

	/**
	 * @covers ObjectProxy::__get
	 */
	public function test_get_method_override() {

		$sample_object = new SampleObject();
		$instance      = new ObjectProxy( $sample_object );
		$this->property_set( $instance, 'property_stack', [
			'prop' => 'override'
		] );

		$this->assertEquals( 'override', $instance->prop );
	}

	/**
	 * @covers ObjectProxy::__get
	 */
	public function test_get_method_original_prop() {

		$sample_object = new SampleObject();
		$instance      = new ObjectProxy( $sample_object );
		$this->property_set( $instance, 'property_stack', [] );

		$this->assertEquals( 'value', $instance->key );
		$this->assertNull( $instance->wrong );
	}


	/**
	 * @covers ObjectProxy::__set
	 */
	public function test_set_method() {

		$instance         = new ObjectProxy( new SampleObject() );
		$instance->prop_1 = 'value';

		$this->property_get( $instance, 'property_stack', $actual );

		$this->assertEquals( [
			'prop_1' => 'value'
		], $actual );
	}

	/**
	 * @covers ObjectProxy::__isset
	 */
	public function test_isset_method() {

		$instance = new ObjectProxy( new SampleObject() );

		$this->property_set( $instance, 'property_stack', [
			'prop_1' => 'value'
		] );

		$this->assertTrue( isset( $instance->prop_1 ) );
		$this->assertFalse( isset( $instance->prop_2 ) );
	}

	/**
	 * @covers ObjectProxy::__unset
	 */
	public function test_unset_method() {

		$instance = new ObjectProxy( new SampleObject() );

		$this->property_set( $instance, 'property_stack', [
			'prop_1' => 'value'
		] );

		unset( $instance->prop_1 );

		$this->property_get( $instance, 'property_stack', $actual );

		$this->assertEquals( [], $actual );
	}
}
