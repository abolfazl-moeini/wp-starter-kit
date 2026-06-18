<?php

namespace WPDev\Dependencies\Amp\Http\Client\Connection;

use WPDev\Dependencies\Amp\Http\Client\HttpException;
final class UnprocessedRequestException extends HttpException
{
    public function __construct(HttpException $previous)
    {
        parent::__construct("The request was not processed and can be safely retried", 0, $previous);
    }
}
