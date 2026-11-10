<?php

namespace WPDevTest\Http\Exceptions;

if ( ! class_exists( '\PHPUnit\Framework\AssertionFailedError' ) ) {
	class_alias( \RuntimeException::class, '\PHPUnit\Framework\AssertionFailedError' );
}

class AssertionException extends \PHPUnit\Framework\AssertionFailedError {
}
