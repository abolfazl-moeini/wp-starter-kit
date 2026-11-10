<?php

namespace WPDevTest\Http;

use WPDevTest\Http\Contracts\ResponsableInterface;
use WPDevTest\Http\Exceptions\SequenceExhaustedException;

class MockResponseSequence implements ResponsableInterface {

	/**
	 * Queued responses.
	 *
	 * @var array<ResponsableInterface>
	 */
	protected $responses = [];

	/**
	 * Fallback response when queue is exhausted.
	 *
	 * @var ResponsableInterface|null
	 */
	protected $fallback = null;

	/**
	 * Number of responses served so far.
	 *
	 * @var int
	 */
	protected $servedCount = 0;

	/**
	 * Whether to silently return 200 OK when empty instead of throwing.
	 *
	 * @var bool
	 */
	protected $dontFailWhenEmpty = false;

	/**
	 * MockResponseSequence constructor.
	 *
	 * @param array $responses
	 */
	public function __construct( array $responses = [] ) {
		foreach ( $responses as $response ) {
			$this->push( $response );
		}
	}

	/**
	 * Push a response to the end of the sequence.
	 *
	 * @param mixed $response
	 * @param int   $status
	 * @param array $headers
	 * @return self
	 */
	public function push( $response, int $status = 200, array $headers = [] ): self {
		$this->responses[] = $this->normalizeResponse( $response, $status, $headers );

		return $this;
	}

	/**
	 * Push an explicit MockResponse.
	 *
	 * @param MockResponse $response
	 * @return self
	 */
	public function pushResponse( MockResponse $response ): self {
		$this->responses[] = $response;

		return $this;
	}

	/**
	 * Push an empty response with the specified status.
	 *
	 * @param int   $status
	 * @param array $headers
	 * @return self
	 */
	public function pushStatus( int $status, array $headers = [] ): self {
		$this->responses[] = MockResponse::empty( $status )->withHeaders( $headers );

		return $this;
	}

	/**
	 * Set a fallback response when the sequence is exhausted.
	 *
	 * @param mixed $response
	 * @return self
	 */
	public function whenEmpty( $response ): self {
		$this->fallback = $this->normalizeResponse( $response );

		return $this;
	}

	/**
	 * Fallback to an empty 200 response when empty instead of throwing an exception.
	 *
	 * @return self
	 */
	public function dontFailWhenEmpty(): self {
		$this->dontFailWhenEmpty = true;

		return $this;
	}

	/**
	 * Remaining response count.
	 *
	 * @return int
	 */
	public function count(): int {
		return count( $this->responses );
	}

	/**
	 * Check if sequence has no remaining queued responses.
	 *
	 * @return bool
	 */
	public function isEmpty(): bool {
		return empty( $this->responses );
	}

	/**
	 * Get the number of responses served so far.
	 *
	 * @return int
	 */
	public function servedCount(): int {
		return $this->servedCount;
	}

	/**
	 * Pop the next response and convert to a WordPress response array or WP_Error.
	 *
	 * @param string $url
	 * @return array|\WP_Error
	 * @throws SequenceExhaustedException
	 */
	public function toWpResponse( string $url = '' ) {
		if ( ! empty( $this->responses ) ) {
			$this->servedCount++;
			$next = array_shift( $this->responses );

			return $next->toWpResponse();
		}

		if ( null !== $this->fallback ) {
			$this->servedCount++;

			return $this->fallback->toWpResponse();
		}

		if ( $this->dontFailWhenEmpty ) {
			$this->servedCount++;

			return MockResponse::empty( 200 )->toWpResponse();
		}

		throw SequenceExhaustedException::forUrl( $url, $this->servedCount );
	}

	/**
	 * Normalize mixed input into a ResponsableInterface instance.
	 *
	 * @param mixed $response
	 * @param int   $status
	 * @param array $headers
	 * @return ResponsableInterface
	 */
	protected function normalizeResponse( $response, int $status = 200, array $headers = [] ): ResponsableInterface {
		if ( $response instanceof ResponsableInterface ) {
			return $response;
		}

		if ( is_callable( $response ) ) {
			return new class( $response ) implements ResponsableInterface {
				protected $callback;
				public function __construct( $callback ) {
					$this->callback = $callback;
				}
				public function toWpResponse() {
					$result = call_user_func( $this->callback );
					if ( $result instanceof ResponsableInterface ) {
						return $result->toWpResponse();
					}
					if ( is_object( $result ) && ( $result instanceof \WP_Error || get_class( $result ) === 'WP_Error' ) ) {
						return $result;
					}
					if ( is_array( $result ) ) {
						return isset( $result['response']['code'] ) && isset( $result['body'] )
							? $result
							: MockResponse::json( $result )->toWpResponse();
					}
					if ( is_int( $result ) ) {
						return MockResponse::empty( $result )->toWpResponse();
					}
					return MockResponse::make( (string) $result )->toWpResponse();
				}
			};
		}

		if ( is_array( $response ) ) {
			return MockResponse::json( $response, $status, $headers );
		}

		if ( is_int( $response ) ) {
			return MockResponse::empty( $response )->withHeaders( $headers );
		}

		if ( is_string( $response ) ) {
			return MockResponse::make( $response, $status, $headers );
		}

		if ( is_object( $response ) && ( $response instanceof \WP_Error || get_class( $response ) === 'WP_Error' ) ) {
			return MockResponse::wpError( $response );
		}

		return MockResponse::make( (string) $response, $status, $headers );
	}
}
