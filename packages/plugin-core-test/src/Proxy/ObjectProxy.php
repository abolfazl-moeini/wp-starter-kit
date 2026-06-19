<?php

namespace WPDevTest\Proxy;

class ObjectProxy {

	/**
	 * Store the original class instance.
	 *
	 * @var object
	 * @since 1.0.8
	 */
	protected $instance;

	/**
	 * Store property changes.
	 *
	 * @var array
	 * @since 1.0.8
	 */
	protected $property_stack = [];

	/**
	 * Store the method changes.
	 *
	 * @var array
	 * @since 1.0.8
	 */
	protected $method_stack = [];

	/**
	 * Initialize the object.
	 *
	 * @param object $object
	 *
	 * @since 1.0.8
	 */
	public function __construct( $object ) {

		$this->instance = $object;
	}

	/**
	 * Proxy a property.
	 *
	 * @param string $property
	 * @param mixed  $value
	 *
	 * @since 1.0.8
	 */
	public function property_set( string $property, $value ): void {

		$this->property_stack[ $property ] = $value;
	}

	/**
	 * Get proxy property value.
	 *
	 * @param string $property
	 *
	 * @since 1.0.8
	 * @return mixed
	 */
	public function property_get( string $property ) {

		return $this->property_stack[ $property ] ?? null;
	}

	/**
	 * Proxy a method.
	 *
	 * @param string $method
	 * @param mixed  $value
	 *
	 * @since 1.0.8
	 */
	public function method_set( string $method, $value ): void {

		$this->method_stack[ $method ] = $value;
	}

	/**
	 * @param string $method
	 *
	 * @since 1.0.8
	 * @return mixed
	 */
	public function method_get( string $method ) {

		return $this->method_stack[ $method ] ?? null;
	}

	/**
	 * Proxy a method.
	 *
	 * @param string $method
	 * @param array  $arguments
	 *
	 * @since 1.0.8
	 * @return mixed
	 */
	public function __call( string $method, array $arguments ) {

		$override = $this->method_get( $method );

		if ( isset( $override ) ) {

			return $override;
		}

		return $this->instance->$method( ...$arguments );
	}

	/**
	 * Proxy a property.
	 *
	 * @param string $property
	 *
	 * @since 1.0.8
	 * @return mixed
	 */
	public function __get( string $property ) {

		$override = $this->property_get( $property );

		return $override ?? $this->instance->{$property} ?? null;
	}

	/**
	 * @param string $property
	 * @param mixed  $value
	 *
	 * @since 1.0.8
	 */
	public function __set( string $property, $value ) {

		$this->property_set( $property, $value );
	}

	/**
	 * @param string $property
	 *
	 * @since 1.0.8
	 * @return bool
	 */
	public function __isset( string $property ) {

		return isset( $this->property_stack[ $property ] );
	}

	/**
	 * @param string $property
	 *
	 * @since 1.0.8
	 */
	public function __unset( string $property ) {

		unset( $this->property_stack[ $property ] );
	}
}
