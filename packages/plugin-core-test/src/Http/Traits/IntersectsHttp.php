<?php

namespace WPDevTest\Http\Traits;

use WPDevTest\Http\HttpMock;

trait IntersectsHttp {

	/**
	 * Automatically called by PHPUnit after each test.
	 *
	 * @after
	 */
	public function resetHttpMock(): void {
		HttpMock::reset();
	}

	/**
	 * Convenience wrapper for HttpMock::fake().
	 *
	 * @param mixed $callbacks
	 */
	public function fakeHttp( $callbacks = null ): void {
		HttpMock::fake( $callbacks );
	}

	/**
	 * Convenience wrapper for HttpMock::preventStrayRequests().
	 *
	 * @param bool $prevent
	 */
	public function preventStrayHttp( bool $prevent = true ): void {
		HttpMock::preventStrayRequests( $prevent );
	}

	/**
	 * Convenience wrapper for HttpMock::assertSent().
	 *
	 * @param callable $callback
	 */
	public function assertHttpSent( callable $callback ): void {
		HttpMock::assertSent( $callback );
	}

	/**
	 * Convenience wrapper for HttpMock::assertNotSent().
	 *
	 * @param callable $callback
	 */
	public function assertHttpNotSent( callable $callback ): void {
		HttpMock::assertNotSent( $callback );
	}

	/**
	 * Convenience wrapper for HttpMock::assertNothingSent().
	 */
	public function assertNothingHttpSent(): void {
		HttpMock::assertNothingSent();
	}
}
