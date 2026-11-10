<?php

namespace WPDevTest\Http;

use WPDevTest\Http\Contracts\ResponsableInterface;

class MockResponse implements ResponsableInterface {

	/**
	 * HTTP status code.
	 *
	 * @var int
	 */
	protected $status = 200;

	/**
	 * HTTP status reason phrase.
	 *
	 * @var string
	 */
	protected $statusMessage = '';

	/**
	 * Response body.
	 *
	 * @var string
	 */
	protected $body = '';

	/**
	 * Response headers.
	 *
	 * @var array
	 */
	protected $headers = [];

	/**
	 * Response cookies.
	 *
	 * @var array
	 */
	protected $cookies = [];

	/**
	 * Optional WP_Error instance.
	 *
	 * @var mixed
	 */
	protected $error = null;

	/**
	 * Standard HTTP status phrases.
	 *
	 * @var array<int, string>
	 */
	protected static $statusPhrases = [
		100 => 'Continue',
		101 => 'Switching Protocols',
		200 => 'OK',
		201 => 'Created',
		202 => 'Accepted',
		204 => 'No Content',
		206 => 'Partial Content',
		300 => 'Multiple Choices',
		301 => 'Moved Permanently',
		302 => 'Found',
		304 => 'Not Modified',
		307 => 'Temporary Redirect',
		308 => 'Permanent Redirect',
		400 => 'Bad Request',
		401 => 'Unauthorized',
		403 => 'Forbidden',
		404 => 'Not Found',
		405 => 'Method Not Allowed',
		408 => 'Request Timeout',
		409 => 'Conflict',
		422 => 'Unprocessable Entity',
		429 => 'Too Many Requests',
		500 => 'Internal Server Error',
		502 => 'Bad Gateway',
		503 => 'Service Unavailable',
		504 => 'Gateway Timeout',
	];

	/**
	 * MockResponse constructor.
	 *
	 * @param string|array $body
	 * @param int          $status
	 * @param array        $headers
	 */
	public function __construct( $body = '', int $status = 200, array $headers = [] ) {
		if ( is_array( $body ) ) {
			$this->body = (string) json_encode( $body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
			if ( ! self::hasHeaderKey( $headers, 'content-type' ) ) {
				$headers['Content-Type'] = 'application/json';
			}
		} else {
			$this->body = (string) $body;
		}

		$this->status  = $status;
		$this->headers = $headers;
	}

	/**
	 * Create a synthetic response.
	 *
	 * @param string|array $body
	 * @param int          $status
	 * @param array        $headers
	 * @return self
	 */
	public static function make( $body = '', int $status = 200, array $headers = [] ): self {
		return new self( $body, $status, $headers );
	}

	/**
	 * Create a JSON response.
	 *
	 * @param mixed $data
	 * @param int   $status
	 * @param array $headers
	 * @return self
	 */
	public static function json( $data, int $status = 200, array $headers = [] ): self {
		if ( ! self::hasHeaderKey( $headers, 'content-type' ) ) {
			$headers['Content-Type'] = 'application/json';
		}

		return new self( (string) json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ), $status, $headers );
	}

	/**
	 * Create an empty response with the specified status.
	 *
	 * @param int $status
	 * @return self
	 */
	public static function empty( int $status = 200 ): self {
		return new self( '', $status );
	}

	/**
	 * Create a failed response (default 500).
	 *
	 * @param int    $status
	 * @param string $body
	 * @return self
	 */
	public static function failed( int $status = 500, $body = '' ): self {
		return new self( $body, $status );
	}

	/**
	 * Create a response representing a WordPress WP_Error.
	 *
	 * @param mixed  $code
	 * @param string $message
	 * @param mixed  $data
	 * @return self
	 */
	public static function wpError( $code = 'http_request_failed', string $message = 'HTTP request failed.', $data = null ): self {
		$instance = new self( '', 500 );

		if ( is_object( $code ) && ( $code instanceof \WP_Error || get_class( $code ) === 'WP_Error' ) ) {
			$instance->error = $code;
		} elseif ( class_exists( '\WP_Error' ) ) {
			$instance->error = new \WP_Error( (string) $code, $message, $data );
		} else {
			// Minimal fallback representation
			$fallback = new class( (string) $code, $message, $data ) {
				public $errors     = [];
				public $error_data = [];
				public function __construct( $c, $m, $d ) {
					$this->errors[ $c ][] = $m;
					if ( null !== $d ) {
						$this->error_data[ $c ] = $d;
					}
				}
				public function get_error_code() {
					$keys = array_keys( $this->errors );
					return $keys[0] ?? '';
				}
				public function get_error_message( $c = '' ) {
					$c = $c ?: $this->get_error_code();
					return $this->errors[ $c ][0] ?? '';
				}
			};
			$instance->error = $fallback;
		}

		return $instance;
	}

	/**
	 * Set the HTTP status code and optional message.
	 *
	 * @param int    $status
	 * @param string $message
	 * @return self
	 */
	public function withStatus( int $status, string $message = '' ): self {
		$this->status        = $status;
		$this->statusMessage = $message;

		return $this;
	}

	/**
	 * Set response headers.
	 *
	 * @param array $headers
	 * @return self
	 */
	public function withHeaders( array $headers ): self {
		$this->headers = array_merge( $this->headers, $headers );

		return $this;
	}

	/**
	 * Set a single header.
	 *
	 * @param string $name
	 * @param string $value
	 * @return self
	 */
	public function withHeader( string $name, string $value ): self {
		$this->headers[ $name ] = $value;

		return $this;
	}

	/**
	 * Set the response body.
	 *
	 * @param string $body
	 * @return self
	 */
	public function withBody( string $body ): self {
		$this->body = $body;

		return $this;
	}

	/**
	 * Set JSON response body.
	 *
	 * @param mixed $data
	 * @return self
	 */
	public function withJson( $data ): self {
		$this->body = (string) json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		if ( ! self::hasHeaderKey( $this->headers, 'content-type' ) ) {
			$this->headers['Content-Type'] = 'application/json';
		}

		return $this;
	}

	/**
	 * Attach a cookie.
	 *
	 * @param string $name
	 * @param string $value
	 * @param array  $attributes
	 * @return self
	 */
	public function withCookie( string $name, string $value, array $attributes = [] ): self {
		$this->cookies[] = array_merge( [
			'name'  => $name,
			'value' => $value,
		], $attributes );

		return $this;
	}

	/**
	 * Attach multiple cookies.
	 *
	 * @param array $cookies
	 * @return self
	 */
	public function withCookies( array $cookies ): self {
		foreach ( $cookies as $cookie ) {
			if ( is_array( $cookie ) && isset( $cookie['name'], $cookie['value'] ) ) {
				$this->withCookie( $cookie['name'], $cookie['value'], $cookie );
			}
		}

		return $this;
	}

	/**
	 * Attach a WP_Error instance.
	 *
	 * @param mixed $error
	 * @return self
	 */
	public function withError( $error ): self {
		$this->error = $error;

		return $this;
	}

	/**
	 * Get HTTP status code.
	 *
	 * @return int
	 */
	public function status(): int {
		return $this->status;
	}

	/**
	 * Get HTTP status phrase.
	 *
	 * @return string
	 */
	public function statusMessage(): string {
		if ( ! empty( $this->statusMessage ) ) {
			return $this->statusMessage;
		}

		return self::$statusPhrases[ $this->status ] ?? 'OK';
	}

	/**
	 * Get response body.
	 *
	 * @return string
	 */
	public function body(): string {
		return $this->body;
	}

	/**
	 * Decode JSON response body.
	 *
	 * @param string|null $key
	 * @param mixed       $default
	 * @return mixed
	 */
	public function decodeJson( ?string $key = null, $default = null ) {
		$decoded = json_decode( $this->body, true );
		if ( ! is_array( $decoded ) ) {
			return $default;
		}

		if ( null === $key ) {
			return $decoded;
		}

		if ( array_key_exists( $key, $decoded ) ) {
			return $decoded[ $key ];
		}

		$current = $decoded;
		foreach ( explode( '.', $key ) as $segment ) {
			if ( is_array( $current ) && array_key_exists( $segment, $current ) ) {
				$current = $current[ $segment ];
			} else {
				return $default;
			}
		}

		return $current;
	}

	/**
	 * Get all headers.
	 *
	 * @return array
	 */
	public function headers(): array {
		return $this->headers;
	}

	/**
	 * Get a header value case-insensitively.
	 *
	 * @param string $name
	 * @param mixed  $default
	 * @return mixed
	 */
	public function header( string $name, $default = null ) {
		$target = strtolower( trim( $name ) );
		foreach ( $this->headers as $k => $v ) {
			if ( strtolower( trim( (string) $k ) ) === $target ) {
				return $v;
			}
		}

		return $default;
	}

	/**
	 * Get all cookies.
	 *
	 * @return array
	 */
	public function cookies(): array {
		return $this->cookies;
	}

	/**
	 * Check if this response represents an error.
	 *
	 * @return bool
	 */
	public function isError(): bool {
		return $this->error !== null;
	}

	/**
	 * Get the wrapped WP_Error, if any.
	 *
	 * @return mixed
	 */
	public function error() {
		return $this->error;
	}

	/**
	 * Check if status is 2xx.
	 *
	 * @return bool
	 */
	public function isOk(): bool {
		return $this->status >= 200 && $this->status < 300;
	}

	/**
	 * Alias for isOk().
	 *
	 * @return bool
	 */
	public function isSuccessful(): bool {
		return $this->isOk();
	}

	/**
	 * Check if status is 3xx.
	 *
	 * @return bool
	 */
	public function isRedirect(): bool {
		return $this->status >= 300 && $this->status < 400;
	}

	/**
	 * Check if status is 4xx.
	 *
	 * @return bool
	 */
	public function isClientError(): bool {
		return $this->status >= 400 && $this->status < 500;
	}

	/**
	 * Check if status is 5xx.
	 *
	 * @return bool
	 */
	public function isServerError(): bool {
		return $this->status >= 500 && $this->status < 600;
	}

	/**
	 * Convert to a WordPress HTTP response array or WP_Error.
	 *
	 * @return array|\WP_Error
	 */
	public function toWpResponse() {
		if ( null !== $this->error ) {
			return $this->error;
		}

		return [
			'headers'  => $this->headers,
			'body'     => (string) $this->body,
			'response' => [
				'code'    => $this->status,
				'message' => $this->statusMessage(),
			],
			'cookies'  => $this->cookies,
			'filename' => null,
		];
	}

	/**
	 * Check if a header key exists case-insensitively in an array.
	 *
	 * @param array  $headers
	 * @param string $key
	 * @return bool
	 */
	protected static function hasHeaderKey( array $headers, string $key ): bool {
		$target = strtolower( $key );
		foreach ( array_keys( $headers ) as $k ) {
			if ( strtolower( (string) $k ) === $target ) {
				return true;
			}
		}

		return false;
	}
}
