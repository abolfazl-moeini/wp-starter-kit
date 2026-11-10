<?php

namespace WPDevTest\Http;

class RequestMatcher {

	/**
	 * Determine if a request matches the given pattern.
	 *
	 * @param mixed           $pattern URL string (with optional wildcards or regex) or callable
	 * @param RecordedRequest $request
	 * @return bool
	 */
	public static function matches( $pattern, RecordedRequest $request ): bool {
		if ( '*' === $pattern ) {
			return true;
		}

		if ( is_callable( $pattern ) ) {
			return (bool) call_user_func( $pattern, $request );
		}

		if ( ! is_string( $pattern ) ) {
			return false;
		}

		// 1. Regex pattern e.g. #^https://...$# or /^https:.../
		if ( self::isRegex( $pattern ) ) {
			return (bool) ( preg_match( $pattern, $request->url() ) || preg_match( $pattern, $request->cleanUrl() ) );
		}

		// 2. Wildcard pattern e.g. 'https://tamland.ir/api/*' or '*savePayment*'
		if ( strpos( $pattern, '*' ) !== false ) {
			return self::matchesWildcard( $pattern, $request );
		}

		// 3. Exact matching with query normalization
		return self::matchesExact( $pattern, $request );
	}

	/**
	 * Match wildcard pattern.
	 *
	 * @param string          $pattern
	 * @param RecordedRequest $request
	 * @return bool
	 */
	protected static function matchesWildcard( string $pattern, RecordedRequest $request ): bool {
		// If wildcard pattern contains a query string e.g. 'https://api.com/*?foo=bar'
		if ( strpos( $pattern, '?' ) !== false ) {
			list( $pathPattern, $queryPattern ) = explode( '?', $pattern, 2 );

			// Path part must match clean URL or full URL
			$pathRegex   = self::wildcardToRegex( $pathPattern );
			$pathMatches = preg_match( $pathRegex, $request->cleanUrl() )
				|| preg_match( $pathRegex, $request->url() )
				|| preg_match( $pathRegex, self::stripScheme( $request->cleanUrl() ) );

			if ( ! $pathMatches ) {
				return false;
			}

			// If query pattern is empty or '*' then any query (or no query) matches
			if ( $queryPattern === '' || $queryPattern === '*' ) {
				return true;
			}

			// Query part: all params in queryPattern must be present and match in request
			parse_str( $queryPattern, $expectedParams );
			foreach ( $expectedParams as $key => $val ) {
				if ( ! $request->hasQuery( (string) $key, $val ) ) {
					return false;
				}
			}

			return true;
		}

		// Wildcard without query: matches regardless of appended query strings (P2.2)
		$regex = self::wildcardToRegex( $pattern );

		// Check against:
		// 1) Clean URL (path only without query string)
		// 2) Full URL (with query string)
		// 3) Clean URL without scheme (e.g. pattern was 'tamland.ir/api/*')
		// 4) Full URL without scheme
		return (bool) (
			preg_match( $regex, $request->cleanUrl() )
			|| preg_match( $regex, $request->url() )
			|| preg_match( $regex, self::stripScheme( $request->cleanUrl() ) )
			|| preg_match( $regex, self::stripScheme( $request->url() ) )
		);
	}

	/**
	 * Match exact URL with query normalization.
	 *
	 * @param string          $pattern
	 * @param RecordedRequest $request
	 * @return bool
	 */
	protected static function matchesExact( string $pattern, RecordedRequest $request ): bool {
		$normalizedPattern = self::normalizeUrl( $pattern );
		$normalizedActual  = self::normalizeUrl( $request->url() );

		if ( $normalizedPattern === $normalizedActual ) {
			return true;
		}

		// Scheme-agnostic matching
		if ( self::stripScheme( $normalizedPattern ) === self::stripScheme( $normalizedActual ) ) {
			return true;
		}

		// If pattern has no query string, also check clean URL
		if ( strpos( $pattern, '?' ) === false ) {
			$normalizedCleanActual = self::normalizeUrl( $request->cleanUrl() );
			if ( $normalizedPattern === $normalizedCleanActual || self::stripScheme( $normalizedPattern ) === self::stripScheme( $normalizedCleanActual ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Parse URL safely, handling non-ASCII / multibyte characters.
	 *
	 * @param string $url
	 * @return array|null
	 */
	public static function parseUrl( string $url ): ?array {
		$safeUrl = preg_replace_callback( '/[^\x20-\x7e]/', function ( $m ) {
			return rawurlencode( $m[0] );
		}, $url );

		$parsed = parse_url( $safeUrl );
		if ( false === $parsed || ! is_array( $parsed ) ) {
			return null;
		}

		return $parsed;
	}

	/**
	 * Normalize a URL:
	 * - Lowercases scheme and host
	 * - Normalizes root path ('/' and '' become consistent)
	 * - Trims trailing slash from path
	 * - Parses, sorts, and re-encodes query parameters alphabetically (recursive)
	 *
	 * @param string $url
	 * @return string
	 */
	public static function normalizeUrl( string $url ): string {
		$parsed = self::parseUrl( $url );
		if ( null === $parsed ) {
			return trim( $url );
		}

		$scheme = isset( $parsed['scheme'] ) ? strtolower( $parsed['scheme'] ) : '';
		$host   = isset( $parsed['host'] ) ? strtolower( $parsed['host'] ) : '';
		$port   = isset( $parsed['port'] ) ? (int) $parsed['port'] : null;
		$path   = isset( $parsed['path'] ) ? rawurldecode( $parsed['path'] ) : '';

		if ( $path === '/' || $path === '' ) {
			$path = '';
		} else {
			$path = rtrim( $path, '/' );
		}

		$query = '';
		if ( isset( $parsed['query'] ) && $parsed['query'] !== '' ) {
			parse_str( $parsed['query'], $queryParams );
			$sortedParams = self::sortArrayRecursive( $queryParams );
			$query        = '?' . http_build_query( $sortedParams );
		}

		$normalized = '';
		if ( $scheme !== '' ) {
			$normalized .= $scheme . '://';
		}
		if ( $host !== '' ) {
			$normalized .= $host;
			if ( $port !== null && ! ( ( 'http' === $scheme && 80 === $port ) || ( 'https' === $scheme && 443 === $port ) ) ) {
				$normalized .= ':' . $port;
			}
		}
		$normalized .= $path . $query;

		return $normalized !== '' ? $normalized : trim( $url );
	}

	/**
	 * Convert wildcard string into a regular expression.
	 *
	 * @param string $pattern
	 * @return string
	 */
	public static function wildcardToRegex( string $pattern ): string {
		$parts       = explode( '*', $pattern );
		$quotedParts = array_map( function ( $part ) {
			return preg_quote( $part, '#' );
		}, $parts );

		return '#^' . implode( '.*', $quotedParts ) . '$#i';
	}

	/**
	 * Recursively sort array by keys.
	 *
	 * @param array $array
	 * @return array
	 */
	public static function sortArrayRecursive( array $array ): array {
		foreach ( $array as $key => $value ) {
			if ( is_array( $value ) ) {
				$array[ $key ] = self::sortArrayRecursive( $value );
			}
		}

		ksort( $array );

		return $array;
	}

	/**
	 * Strip scheme ('http://' or 'https://') from a URL.
	 *
	 * @param string $url
	 * @return string
	 */
	public static function stripScheme( string $url ): string {
		return preg_replace( '#^https?://#i', '', $url );
	}

	/**
	 * Check if a string is a regex delimiter expression.
	 *
	 * @param string $pattern
	 * @return bool
	 */
	public static function isRegex( string $pattern ): bool {
		if ( strlen( $pattern ) < 3 ) {
			return false;
		}

		$first = $pattern[0];

		// Hashes or tildes are unambiguous regex delimiters
		if ( $first === '#' || $first === '~' ) {
			if ( preg_match( '#^([' . preg_quote( $first, '#' ) . ']).*\\1[imsxADSUXJu]*$#s', $pattern ) ) {
				return @preg_match( $pattern, '' ) !== false;
			}
			return false;
		}

		// Slashes: only treat as regex if it contains regex metacharacters and ends with /modifiers
		if ( $first === '/' && preg_match( '#^/.*(?<!\\\\)/[imsxADSUXJu]*$#s', $pattern ) ) {
			// Ensure it has at least one regex metacharacter (^, $, *, +, ?, (, [, {, \\)
			if ( preg_match( '/[\^$*+?(\[{\\\\]/', $pattern ) ) {
				return @preg_match( $pattern, '' ) !== false;
			}
		}

		return false;
	}

	/**
	 * Match expected query parameters against request query parameters.
	 *
	 * @param array           $expected
	 * @param RecordedRequest $request
	 * @return bool
	 */
	public static function matchesQuery( array $expected, RecordedRequest $request ): bool {
		foreach ( $expected as $key => $value ) {
			if ( ! $request->hasQuery( (string) $key, $value ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Match expected method against request.
	 *
	 * @param string          $method
	 * @param RecordedRequest $request
	 * @return bool
	 */
	public static function matchesMethod( string $method, RecordedRequest $request ): bool {
		return $request->isMethod( $method );
	}

	/**
	 * Match expected headers against request.
	 *
	 * @param array           $headers
	 * @param RecordedRequest $request
	 * @return bool
	 */
	public static function matchesHeaders( array $headers, RecordedRequest $request ): bool {
		foreach ( $headers as $name => $value ) {
			if ( ! $request->hasHeader( (string) $name, $value ) ) {
				return false;
			}
		}

		return true;
	}
}
