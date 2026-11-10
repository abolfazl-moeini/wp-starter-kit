<?php

namespace WPDevTest\Http;

class RecordedRequest {

	/**
	 * Full requested URL.
	 *
	 * @var string
	 */
	protected $url;

	/**
	 * Raw arguments passed to the HTTP transport.
	 *
	 * @var array
	 */
	protected $args;

	/**
	 * Normalized HTTP method (UPPERCASE).
	 *
	 * @var string
	 */
	protected $method;

	/**
	 * Normalized headers with lowercase keys (RFC 7230).
	 *
	 * @var array
	 */
	protected $normalizedHeaders = [];

	/**
	 * Raw headers as passed in $args.
	 *
	 * @var array
	 */
	protected $rawHeaders = [];

	/**
	 * Raw request body.
	 *
	 * @var mixed
	 */
	protected $body;

	/**
	 * Decoded JSON cache.
	 *
	 * @var array|null
	 */
	protected $decodedJson = null;

	/**
	 * Parsed query parameters.
	 *
	 * @var array
	 */
	protected $queryParams = [];

	/**
	 * Parsed URL scheme.
	 *
	 * @var string
	 */
	protected $scheme = '';

	/**
	 * Parsed URL host.
	 *
	 * @var string
	 */
	protected $host = '';

	/**
	 * Parsed URL port.
	 *
	 * @var int|null
	 */
	protected $port = null;

	/**
	 * Parsed URL path.
	 *
	 * @var string
	 */
	protected $path = '';

	/**
	 * Raw query string.
	 *
	 * @var string
	 */
	protected $queryString = '';

	/**
	 * RecordedRequest constructor.
	 *
	 * @param string $url
	 * @param array  $args
	 */
	public function __construct( string $url, array $args = [] ) {
		$this->url  = $url;
		$this->args = $args;

		$rawMethod    = isset( $args['method'] ) ? trim( (string) $args['method'] ) : '';
		$this->method = $rawMethod !== '' ? strtoupper( $rawMethod ) : 'GET';
		$this->body   = $args['body'] ?? '';

		$this->parseHeaders( $args['headers'] ?? [] );
		$this->parseUrlComponents( $url );
	}

	/**
	 * Parse headers and build case-insensitive dictionary per RFC 7230.
	 *
	 * @param mixed $headers
	 */
	protected function parseHeaders( $headers ): void {
		if ( is_string( $headers ) ) {
			$lines  = preg_split( "/\r\n|\n|\r/", trim( $headers ) );
			$parsed = [];
			foreach ( $lines as $line ) {
				if ( strpos( $line, ':' ) !== false ) {
					list( $k, $v ) = explode( ':', $line, 2 );
					$parsed[ trim( $k ) ] = trim( $v );
				}
			}
			$headers = $parsed;
		}

		if ( ! is_array( $headers ) ) {
			$headers = [];
		}

		$this->rawHeaders        = $headers;
		$this->normalizedHeaders = [];

		foreach ( $headers as $name => $value ) {
			$this->normalizedHeaders[ strtolower( trim( (string) $name ) ) ] = $value;
		}
	}

	/**
	 * Parse URL components safely, handling multibyte characters.
	 *
	 * @param string $url
	 */
	protected function parseUrlComponents( string $url ): void {
		$safeUrl = preg_replace_callback( '/[^\x20-\x7e]/', function ( $m ) {
			return rawurlencode( $m[0] );
		}, $url );

		$parsed = parse_url( $safeUrl );
		if ( false === $parsed || ! is_array( $parsed ) ) {
			return;
		}

		$this->scheme      = isset( $parsed['scheme'] ) ? strtolower( $parsed['scheme'] ) : '';
		$this->host        = isset( $parsed['host'] ) ? strtolower( $parsed['host'] ) : '';
		$this->port        = isset( $parsed['port'] ) ? (int) $parsed['port'] : null;
		$this->path        = isset( $parsed['path'] ) ? rawurldecode( $parsed['path'] ) : '/';
		$this->queryString = isset( $parsed['query'] ) ? $parsed['query'] : '';

		if ( $this->queryString !== '' ) {
			parse_str( $this->queryString, $this->queryParams );
		}
	}

	/**
	 * Get full requested URL.
	 *
	 * @return string
	 */
	public function url(): string {
		return $this->url;
	}

	/**
	 * Get URL without query string or fragment.
	 *
	 * @return string
	 */
	public function cleanUrl(): string {
		$clean = '';
		if ( $this->scheme !== '' ) {
			$clean .= $this->scheme . '://';
		}
		if ( $this->host !== '' ) {
			$clean .= $this->host;
			if ( $this->port !== null ) {
				$clean .= ':' . $this->port;
			}
		}
		$clean .= $this->path;

		return $clean !== '' ? $clean : strtok( $this->url, '?#' );
	}

	/**
	 * Get URL path.
	 *
	 * @return string
	 */
	public function path(): string {
		return $this->path;
	}

	/**
	 * Get URL host.
	 *
	 * @return string
	 */
	public function host(): string {
		return $this->host;
	}

	/**
	 * Get URL scheme.
	 *
	 * @return string
	 */
	public function scheme(): string {
		return $this->scheme;
	}

	/**
	 * Get URL port.
	 *
	 * @return int|null
	 */
	public function port(): ?int {
		return $this->port;
	}

	/**
	 * Get raw query string.
	 *
	 * @return string
	 */
	public function queryString(): string {
		return $this->queryString;
	}

	/**
	 * Get HTTP method in uppercase.
	 *
	 * @return string
	 */
	public function method(): string {
		return $this->method;
	}

	/**
	 * Check if HTTP method matches given method (case-insensitive).
	 *
	 * @param string $method
	 * @return bool
	 */
	public function isMethod( string $method ): bool {
		return strtoupper( $method ) === $this->method;
	}

	/**
	 * Check if request is a GET request.
	 *
	 * @return bool
	 */
	public function isGet(): bool {
		return 'GET' === $this->method;
	}

	/**
	 * Check if request is a POST request.
	 *
	 * @return bool
	 */
	public function isPost(): bool {
		return 'POST' === $this->method;
	}

	/**
	 * Check if request is a PUT request.
	 *
	 * @return bool
	 */
	public function isPut(): bool {
		return 'PUT' === $this->method;
	}

	/**
	 * Check if request is a PATCH request.
	 *
	 * @return bool
	 */
	public function isPatch(): bool {
		return 'PATCH' === $this->method;
	}

	/**
	 * Check if request is a DELETE request.
	 *
	 * @return bool
	 */
	public function isDelete(): bool {
		return 'DELETE' === $this->method;
	}

	/**
	 * Check if request is a HEAD request.
	 *
	 * @return bool
	 */
	public function isHead(): bool {
		return 'HEAD' === $this->method;
	}

	/**
	 * Check if request content-type indicates JSON.
	 *
	 * @return bool
	 */
	public function isJson(): bool {
		$contentType = (string) $this->header( 'content-type', '' );

		return strpos( strtolower( $contentType ), 'application/json' ) !== false;
	}

	/**
	 * Retrieve a header value case-insensitively (RFC 7230).
	 *
	 * @param string $name
	 * @param mixed  $default
	 * @return mixed
	 */
	public function header( string $name, $default = null ) {
		$key = strtolower( trim( $name ) );

		return array_key_exists( $key, $this->normalizedHeaders )
			? $this->normalizedHeaders[ $key ]
			: $default;
	}

	/**
	 * Check if a header exists (and optionally has a specific value or wildcard pattern).
	 *
	 * @param string $name
	 * @param mixed  $value
	 * @return bool
	 */
	public function hasHeader( string $name, $value = null ): bool {
		$key = strtolower( trim( $name ) );
		if ( ! array_key_exists( $key, $this->normalizedHeaders ) ) {
			return false;
		}

		if ( null === $value || '*' === $value ) {
			return true;
		}

		$current = $this->normalizedHeaders[ $key ];
		if ( is_array( $current ) ) {
			if ( is_string( $value ) ) {
				return in_array( $value, $current, true );
			}
			return false;
		}

		if ( is_string( $value ) && strpos( $value, '*' ) !== false ) {
			$regex = RequestMatcher::wildcardToRegex( $value );
			return (bool) preg_match( $regex, (string) $current );
		}

		return (string) $current === (string) $value;
	}

	/**
	 * Get all headers as normalized lowercase key-value pairs.
	 *
	 * @return array
	 */
	public function headers(): array {
		return $this->normalizedHeaders;
	}

	/**
	 * Get raw headers as originally provided.
	 *
	 * @return array
	 */
	public function rawHeaders(): array {
		return $this->rawHeaders;
	}

	/**
	 * Get the request body as a string.
	 *
	 * @return string
	 */
	public function body(): string {
		if ( is_array( $this->body ) ) {
			return http_build_query( $this->body );
		}

		return (string) $this->body;
	}

	/**
	 * Get raw body (string, array, etc.).
	 *
	 * @return mixed
	 */
	public function rawBody() {
		return $this->body;
	}

	/**
	 * Get a query parameter or all query parameters.
	 * Supports dot-notation for nested query keys.
	 *
	 * @param string|null $key
	 * @param mixed       $default
	 * @return mixed
	 */
	public function query( ?string $key = null, $default = null ) {
		if ( null === $key ) {
			return $this->queryParams;
		}

		return $this->arrayGet( $this->queryParams, $key, $default );
	}

	/**
	 * Check if a query parameter exists (and optionally matches expected value or wildcard).
	 *
	 * @param string $key
	 * @param mixed  $value
	 * @return bool
	 */
	public function hasQuery( string $key, $value = null ): bool {
		$current = $this->query( $key );
		if ( null === $current ) {
			return false;
		}

		if ( null === $value || '*' === $value ) {
			return true;
		}

		if ( is_string( $value ) && strpos( $value, '*' ) !== false ) {
			$regex = RequestMatcher::wildcardToRegex( $value );
			return (bool) preg_match( $regex, (string) $current );
		}

		return (string) $current === (string) $value;
	}

	/**
	 * Get decoded JSON payload, with optional dot-notation key.
	 *
	 * @param string|null $key
	 * @param mixed       $default
	 * @return mixed
	 */
	public function json( ?string $key = null, $default = null ) {
		if ( null === $this->decodedJson ) {
			$raw     = $this->body();
			$decoded = json_decode( $raw, true );
			$this->decodedJson = is_array( $decoded ) ? $decoded : [];
		}

		if ( null === $key ) {
			return $this->decodedJson;
		}

		return $this->arrayGet( $this->decodedJson, $key, $default );
	}

	/**
	 * Get payload data (from JSON or array body).
	 *
	 * @param string|null $key
	 * @param mixed       $default
	 * @return mixed
	 */
	public function data( ?string $key = null, $default = null ) {
		if ( is_array( $this->body ) ) {
			if ( null === $key ) {
				return $this->body;
			}
			return $this->arrayGet( $this->body, $key, $default );
		}

		return $this->json( $key, $default );
	}

	/**
	 * Get raw WordPress request arguments.
	 *
	 * @return array
	 */
	public function args(): array {
		return $this->args;
	}

	/**
	 * Get cookies passed in request.
	 *
	 * @return array
	 */
	public function cookies(): array {
		return isset( $this->args['cookies'] ) && is_array( $this->args['cookies'] )
			? $this->args['cookies']
			: [];
	}

	/**
	 * Traverse array using dot notation.
	 *
	 * @param array  $array
	 * @param string $key
	 * @param mixed  $default
	 * @return mixed
	 */
	protected function arrayGet( array $array, string $key, $default = null ) {
		if ( array_key_exists( $key, $array ) ) {
			return $array[ $key ];
		}

		$current = $array;
		foreach ( explode( '.', $key ) as $segment ) {
			if ( is_array( $current ) && array_key_exists( $segment, $current ) ) {
				$current = $current[ $segment ];
			} else {
				return $default;
			}
		}

		return $current;
	}
}
