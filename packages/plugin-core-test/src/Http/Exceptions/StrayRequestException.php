<?php

namespace WPDevTest\Http\Exceptions;

use RuntimeException;

class StrayRequestException extends RuntimeException {

	/**
	 * Create an exception for an unmocked request.
	 *
	 * @param string $url
	 * @param string $method
	 * @return self
	 */
	public static function forRequest( string $url, string $method ): self {
		return new self(
			sprintf(
				'Attempted request to [%s] with method [%s] without a matching mock response while stray requests are prevented.',
				$url,
				$method
			)
		);
	}
}
