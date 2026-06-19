<?php

namespace WPDevTest\Unit;

abstract class TestCase extends \WP_UnitTestCase {

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

			$ref_object   =  \is_string($class) ?  new \ReflectionClass( $class ): new \ReflectionObject( $class );
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
	 * @param string $property
	 * @param mixed &$value
	 *
	 * @return bool true on success or false otherwise
	 */
	public function property_get( $class, string $property, &$value ): bool {

		try {

			$ref_object   =  \is_string($class) ?  new \ReflectionClass( $class ): new \ReflectionObject( $class );
			$ref_property = $ref_object->getProperty( $property );
			$ref_property->setAccessible( true );
			//
			$value = $ref_property->getValue( $class );

			return true;
		} catch ( \ReflectionException $e ) {

		}

		return false;
	}
}
