<?php

namespace WPDev\Dependencies\Amp\Http\Client\Connection;

use WPDev\Dependencies\Amp\CancellationToken;
use WPDev\Dependencies\Amp\Http\Client\Request;
use WPDev\Dependencies\Amp\Promise;
interface ConnectionPool
{
    /**
     * Reserve a stream for a particular request.
     *
     * @param Request           $request
     * @param CancellationToken $cancellation
     *
     * @return Promise<Stream>
     */
    public function getStream(Request $request, CancellationToken $cancellation) : Promise;
}
