<?php

namespace WPDevTest\Http\Exceptions;

use UnderflowException;

class SequenceExhaustedException extends UnderflowException {

	/**
	 * Create an exception for an exhausted response sequence.
	 *
	 * @param string $url
	 * @param int    $count
	 * @return self
	 */
	public static function forUrl( string $url, int $count ): self {
		return new self(
			sprintf(
				'[FATAL] Mock response sequence for [%s] exhausted after %d requests.',
				$url !== '' ? $url : 'unknown URL',
				$count
			)
		);
	}
}
