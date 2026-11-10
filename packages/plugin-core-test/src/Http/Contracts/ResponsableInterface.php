<?php

namespace WPDevTest\Http\Contracts;

interface ResponsableInterface {

	/**
	 * Convert to a WordPress HTTP response array or WP_Error.
	 *
	 * @return array|\WP_Error
	 */
	public function toWpResponse();
}
