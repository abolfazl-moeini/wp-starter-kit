<?php

namespace WPDevTest\Http;

use WPDevTest\Http\Contracts\ResponsableInterface;
use WPDevTest\Http\Exceptions\AssertionException;
use WPDevTest\Http\Exceptions\StrayRequestException;

class HttpMock {

	/**
	 * Whether HttpMock is actively intercepting requests.
	 *
	 * @var bool
	 */
	protected static $active = false;

	/**
	 * Whether fail-closed stray request prevention is armed.
	 *
	 * @var bool
	 */
	protected static $preventStrayRequests = false;

	/**
	 * Registered URL pattern => response handlers.
	 *
	 * @var array<string|int, mixed>
	 */
	protected static $handlers = [];

	/**
	 * Optional fallback handler callable.
	 *
	 * @var callable|null
	 */
	protected static $fallbackHandler = null;

	/**
	 * Registry of recorded outbound requests.
	 *
	 * @var array<RecordedRequest>
	 */
	protected static $recordedRequests = [];

	/**
	 * Whether pre_http_request filter is hooked.
	 *
	 * @var bool
	 */
	protected static $hookRegistered = false;

	/**
	 * Register fake responses or handlers.
	 *
	 * Usage:
	 *   HttpMock::fake(); // all requests return 200 OK
	 *   HttpMock::fake( fn( RecordedRequest $req ) => HttpMock::response('OK') );
	 *   HttpMock::fake([
	 *       'api.example.com/*' => HttpMock::json(['status' => 1]),
	 *       '*' => HttpMock::response('Fallback'),
	 *   ]);
	 *   HttpMock::fake([
	 *       fn( RecordedRequest $req ) => $req->url() === 'x' ? HttpMock::response('x') : null,
	 *   ]);
	 *
	 * @param mixed $callbacks
	 */
	public static function fake( $callbacks = null ): void {
		self::$active = true;
		self::ensureHooked();

		if ( null === $callbacks ) {
			self::$handlers['*'] = MockResponse::empty( 200 );
			return;
		}

		if ( is_callable( $callbacks ) ) {
			self::$fallbackHandler = $callbacks;
			return;
		}

		if ( is_array( $callbacks ) ) {
			foreach ( $callbacks as $pattern => $response ) {
				if ( is_int( $pattern ) && is_callable( $response ) ) {
					self::$handlers[] = $response;
				} else {
					self::$handlers[ (string) $pattern ] = self::normalizeHandler( $response );
				}
			}
		}
	}

	/**
	 * Create a synthetic MockResponse instance.
	 *
	 * @param string|array $body
	 * @param int          $status
	 * @param array        $headers
	 * @return MockResponse
	 */
	public static function response( $body = '', int $status = 200, array $headers = [] ): MockResponse {
		return MockResponse::make( $body, $status, $headers );
	}

	/**
	 * Create a JSON MockResponse instance.
	 *
	 * @param mixed $data
	 * @param int   $status
	 * @param array $headers
	 * @return MockResponse
	 */
	public static function json( $data = [], int $status = 200, array $headers = [] ): MockResponse {
		return MockResponse::json( $data, $status, $headers );
	}

	/**
	 * Create an empty MockResponse instance.
	 *
	 * @param int $status
	 * @return MockResponse
	 */
	public static function empty( int $status = 200 ): MockResponse {
		return MockResponse::empty( $status );
	}

	/**
	 * Create a failed MockResponse instance (500 Internal Server Error).
	 *
	 * @param int    $status
	 * @param string $body
	 * @return MockResponse
	 */
	public static function failed( int $status = 500, $body = '' ): MockResponse {
		return MockResponse::failed( $status, $body );
	}

	/**
	 * Create a MockResponse representing a WP_Error.
	 *
	 * @param mixed  $code
	 * @param string $message
	 * @param mixed  $data
	 * @return MockResponse
	 */
	public static function wpError( $code = 'http_request_failed', string $message = 'HTTP request failed.', $data = null ): MockResponse {
		return MockResponse::wpError( $code, $message, $data );
	}

	/**
	 * Create a MockResponseSequence.
	 *
	 * @param array $responses
	 * @return MockResponseSequence
	 */
	public static function sequence( array $responses = [] ): MockResponseSequence {
		return new MockResponseSequence( $responses );
	}

	/**
	 * Arm fail-closed stray request prevention.
	 * Unmocked outbound HTTP calls throw StrayRequestException.
	 *
	 * @param bool $prevent
	 */
	public static function preventStrayRequests( bool $prevent = true ): void {
		self::$preventStrayRequests = $prevent;
		if ( $prevent ) {
			self::ensureHooked();
		}
	}

	/**
	 * Allow unmocked HTTP requests to bypass HttpMock and reach native transport.
	 */
	public static function allowStrayRequests(): void {
		self::$preventStrayRequests = false;
	}

	/**
	 * Check if stray requests are currently prevented.
	 *
	 * @return bool
	 */
	public static function isPreventingStrayRequests(): bool {
		return self::$preventStrayRequests;
	}

	/**
	 * Intercept WordPress HTTP calls via pre_http_request filter.
	 *
	 * @param false|array|\WP_Error $preempt
	 * @param array                 $parsed_args
	 * @param string                $url
	 * @return false|array|\WP_Error
	 * @throws StrayRequestException
	 */
	public static function handle( $preempt, $parsed_args, $url ) {
		if ( ! self::$active && ! self::$preventStrayRequests ) {
			return $preempt;
		}

		$request = new RecordedRequest( (string) $url, is_array( $parsed_args ) ? $parsed_args : [] );
		self::$recordedRequests[] = $request;

		$response = self::resolveResponse( $request );

		if ( null !== $response ) {
			return self::formatResponse( $response, (string) $url, is_array( $parsed_args ) ? $parsed_args : [] );
		}

		if ( self::$preventStrayRequests ) {
			throw StrayRequestException::forRequest( $request->url(), $request->method() );
		}

		return $preempt;
	}

	/**
	 * Resolve matching response for the given request with strict priority:
	 * 1. Exact URL matches
	 * 2. Specific wildcard / regex patterns (longer/more specific first)
	 * 3. Array callbacks
	 * 4. Universal catch-all ('*')
	 * 5. Fallback handler callback
	 *
	 * @param RecordedRequest $request
	 * @return mixed|null
	 */
	protected static function resolveResponse( RecordedRequest $request ) {
		$exactHandlers    = [];
		$patternHandlers  = [];
		$callbackHandlers = [];
		$universalHandler = null;

		foreach ( self::$handlers as $pattern => $handler ) {
			if ( is_int( $pattern ) ) {
				if ( is_callable( $handler ) ) {
					$callbackHandlers[] = $handler;
				}
				continue;
			}

			$pattern = (string) $pattern;

			if ( '*' === $pattern ) {
				$universalHandler = $handler;
			} elseif ( strpos( $pattern, '*' ) !== false || RequestMatcher::isRegex( $pattern ) ) {
				$patternHandlers[ $pattern ] = $handler;
			} else {
				$exactHandlers[ $pattern ] = $handler;
			}
		}

		// 1. Try exact URL matches
		foreach ( $exactHandlers as $pattern => $handler ) {
			if ( RequestMatcher::matches( $pattern, $request ) ) {
				return self::evaluateHandler( $handler, $request );
			}
		}

		// 2. Try specific wildcard patterns (longest/most specific first)
		if ( ! empty( $patternHandlers ) ) {
			uksort( $patternHandlers, function ( $a, $b ) {
				return strlen( $b ) <=> strlen( $a );
			} );

			foreach ( $patternHandlers as $pattern => $handler ) {
				if ( RequestMatcher::matches( $pattern, $request ) ) {
					return self::evaluateHandler( $handler, $request );
				}
			}
		}

		// 3. Try registered array callbacks
		foreach ( $callbackHandlers as $callback ) {
			$result = call_user_func( $callback, $request );
			if ( null !== $result ) {
				return $result;
			}
		}

		// 4. Try universal wildcard catch-all ('*')
		if ( null !== $universalHandler ) {
			return self::evaluateHandler( $universalHandler, $request );
		}

		// 5. Try fallback callback
		if ( null !== self::$fallbackHandler ) {
			$result = call_user_func( self::$fallbackHandler, $request );
			if ( null !== $result ) {
				return $result;
			}
		}

		return null;
	}

	/**
	 * Evaluate a handler (calling it if callable, or returning directly).
	 *
	 * @param mixed           $handler
	 * @param RecordedRequest $request
	 * @return mixed
	 */
	protected static function evaluateHandler( $handler, RecordedRequest $request ) {
		if ( is_callable( $handler ) && ! ( $handler instanceof ResponsableInterface ) ) {
			return call_user_func( $handler, $request );
		}

		return $handler;
	}

	/**
	 * Format a resolved response into a WordPress-compliant HTTP response array or WP_Error.
	 *
	 * @param mixed  $response
	 * @param string $url
	 * @param array  $parsed_args
	 * @return array|\WP_Error
	 */
	protected static function formatResponse( $response, string $url = '', array $parsed_args = [] ) {
		$result = null;

		if ( $response instanceof MockResponseSequence ) {
			$result = $response->toWpResponse( $url );
		} elseif ( $response instanceof ResponsableInterface ) {
			$result = $response->toWpResponse();
		} elseif ( is_object( $response ) && ( $response instanceof \WP_Error || get_class( $response ) === 'WP_Error' ) ) {
			$result = $response;
		} elseif ( is_array( $response ) ) {
			if ( isset( $response['response']['code'] ) && isset( $response['body'] ) ) {
				$result = $response;
			} else {
				$result = MockResponse::json( $response )->toWpResponse();
			}
		} elseif ( is_int( $response ) ) {
			$result = MockResponse::empty( $response )->toWpResponse();
		} else {
			$result = MockResponse::make( (string) $response )->toWpResponse();
		}

		// Handle file streaming to disk if requested
		if ( is_array( $result ) && ! empty( $parsed_args['filename'] ) ) {
			$filename = $parsed_args['filename'];
			$result['filename'] = $filename;

			if ( ! empty( $parsed_args['stream'] ) && isset( $result['body'] ) ) {
				$dir = dirname( $filename );
				if ( ! is_dir( $dir ) ) {
					@mkdir( $dir, 0777, true );
				}
				@file_put_contents( $filename, $result['body'] );
			}
		}

		return $result;
	}

	/**
	 * Normalize a handler definition.
	 *
	 * @param mixed $response
	 * @return mixed
	 */
	protected static function normalizeHandler( $response ) {
		if ( $response instanceof ResponsableInterface || is_callable( $response ) ) {
			return $response;
		}

		if ( is_array( $response ) ) {
			return MockResponse::json( $response );
		}

		if ( is_int( $response ) ) {
			return MockResponse::empty( $response );
		}

		if ( is_object( $response ) && ( $response instanceof \WP_Error || get_class( $response ) === 'WP_Error' ) ) {
			return MockResponse::wpError( $response );
		}

		return MockResponse::make( (string) $response );
	}

	/**
	 * Assert that at least one request matching callback or URL pattern was recorded.
	 *
	 * @param callable|string $callback fn( RecordedRequest $request ): bool or URL pattern
	 * @throws AssertionException
	 */
	public static function assertSent( $callback ): void {
		if ( is_string( $callback ) ) {
			self::assertSentTo( $callback );
			return;
		}

		if ( ! is_callable( $callback ) ) {
			throw new AssertionException( 'assertSent expects a callable or URL pattern string.' );
		}

		foreach ( self::$recordedRequests as $request ) {
			if ( (bool) call_user_func( $callback, $request ) ) {
				self::recordPhpUnitAssertion();
				return;
			}
		}

		throw new AssertionException( 'An expected HTTP request was not sent.' );
	}

	/**
	 * Assert that NO request matching callback or URL pattern was recorded.
	 *
	 * @param callable|string $callback fn( RecordedRequest $request ): bool or URL pattern
	 * @throws AssertionException
	 */
	public static function assertNotSent( $callback ): void {
		if ( is_string( $callback ) ) {
			self::assertNotSentTo( $callback );
			return;
		}

		if ( ! is_callable( $callback ) ) {
			throw new AssertionException( 'assertNotSent expects a callable or URL pattern string.' );
		}

		$count = 0;
		foreach ( self::$recordedRequests as $request ) {
			if ( (bool) call_user_func( $callback, $request ) ) {
				$count++;
			}
		}

		if ( $count > 0 ) {
			throw new AssertionException(
				sprintf( 'An unexpected HTTP request was sent %d time(s).', $count )
			);
		}

		self::recordPhpUnitAssertion();
	}

	/**
	 * Assert number of requests sent, optionally matching a filter or URL pattern.
	 *
	 * @param int                  $expectedCount
	 * @param callable|string|null $callbackOrPattern
	 * @throws AssertionException
	 */
	public static function assertSentCount( int $expectedCount, $callbackOrPattern = null ): void {
		if ( null === $callbackOrPattern ) {
			$actual = count( self::$recordedRequests );
			if ( $actual !== $expectedCount ) {
				throw new AssertionException(
					sprintf( 'Expected %d HTTP request(s), but %d were sent.', $expectedCount, $actual )
				);
			}

			self::recordPhpUnitAssertion();
			return;
		}

		$actual = 0;
		foreach ( self::$recordedRequests as $request ) {
			if ( is_string( $callbackOrPattern ) ) {
				if ( RequestMatcher::matches( $callbackOrPattern, $request ) ) {
					$actual++;
				}
			} elseif ( is_callable( $callbackOrPattern ) ) {
				if ( (bool) call_user_func( $callbackOrPattern, $request ) ) {
					$actual++;
				}
			}
		}

		if ( $actual !== $expectedCount ) {
			throw new AssertionException(
				sprintf( 'Expected %d HTTP request(s) matching filter, but %d were sent.', $expectedCount, $actual )
			);
		}

		self::recordPhpUnitAssertion();
	}

	/**
	 * Assert that no requests were sent.
	 *
	 * @throws AssertionException
	 */
	public static function assertNothingSent(): void {
		self::assertSentCount( 0 );
	}

	/**
	 * Assert that a request was sent to a specific URL pattern.
	 *
	 * @param string        $pattern
	 * @param callable|null $callback Optional additional inspection callback
	 * @throws AssertionException
	 */
	public static function assertSentTo( string $pattern, ?callable $callback = null ): void {
		foreach ( self::$recordedRequests as $request ) {
			if ( RequestMatcher::matches( $pattern, $request ) ) {
				if ( null === $callback || (bool) call_user_func( $callback, $request ) ) {
					self::recordPhpUnitAssertion();
					return;
				}
			}
		}

		throw new AssertionException(
			sprintf( 'No HTTP request was sent matching URL [%s].', $pattern )
		);
	}

	/**
	 * Assert that NO request was sent to a specific URL pattern.
	 *
	 * @param string        $pattern
	 * @param callable|null $callback Optional additional inspection callback
	 * @throws AssertionException
	 */
	public static function assertNotSentTo( string $pattern, ?callable $callback = null ): void {
		foreach ( self::$recordedRequests as $request ) {
			if ( RequestMatcher::matches( $pattern, $request ) ) {
				if ( null === $callback || (bool) call_user_func( $callback, $request ) ) {
					throw new AssertionException(
						sprintf( 'An unexpected HTTP request was sent matching URL [%s].', $pattern )
					);
				}
			}
		}

		self::recordPhpUnitAssertion();
	}

	/**
	 * Record a successful assertion with PHPUnit if available.
	 */
	protected static function recordPhpUnitAssertion(): void {
		if ( class_exists( '\PHPUnit\Framework\Assert' ) ) {
			\PHPUnit\Framework\Assert::assertTrue( true );
		}
	}

	/**
	 * Get recorded requests, optionally filtered by a callback.
	 *
	 * @param callable|null $callback
	 * @return array<RecordedRequest>
	 */
	public static function recorded( ?callable $callback = null ): array {
		if ( null === $callback ) {
			return self::$recordedRequests;
		}

		return array_values( array_filter( self::$recordedRequests, $callback ) );
	}

	/**
	 * Get total count of recorded requests.
	 *
	 * @return int
	 */
	public static function recordedCount(): int {
		return count( self::$recordedRequests );
	}

	/**
	 * Check if any requests have been recorded.
	 *
	 * @return bool
	 */
	public static function hasRecorded(): bool {
		return ! empty( self::$recordedRequests );
	}

	/**
	 * Get the last recorded request, or null if none.
	 *
	 * @return RecordedRequest|null
	 */
	public static function lastRequest(): ?RecordedRequest {
		if ( empty( self::$recordedRequests ) ) {
			return null;
		}

		$keys    = array_keys( self::$recordedRequests );
		$lastKey = end( $keys );

		return self::$recordedRequests[ $lastKey ];
	}

	/**
	 * Reset all HttpMock state and remove pre_http_request filter.
	 */
	public static function reset(): void {
		self::$active               = false;
		self::$preventStrayRequests = false;
		self::$handlers             = [];
		self::$fallbackHandler      = null;
		self::$recordedRequests     = [];

		self::removeHook();
	}

	/**
	 * Ensure pre_http_request filter is hooked into WordPress.
	 */
	protected static function ensureHooked(): void {
		if ( ! self::$hookRegistered && function_exists( 'add_filter' ) ) {
			add_filter( 'pre_http_request', [ self::class, 'handle' ], 10, 3 );
			self::$hookRegistered = true;
		}
	}

	/**
	 * Remove pre_http_request filter from WordPress.
	 */
	protected static function removeHook(): void {
		if ( function_exists( 'remove_filter' ) ) {
			remove_filter( 'pre_http_request', [ self::class, 'handle' ], 10 );
		}
		self::$hookRegistered = false;
	}
}
