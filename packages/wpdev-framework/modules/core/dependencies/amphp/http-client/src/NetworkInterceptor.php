<?php

namespace WPDev\Dependencies\Amp\Http\Client;

use WPDev\Dependencies\Amp\CancellationToken;
use WPDev\Dependencies\Amp\Http\Client\Connection\Stream;
use WPDev\Dependencies\Amp\Promise;
/**
 * Allows intercepting an HTTP request after the connection to the remote server has been established.
 */
interface NetworkInterceptor
{
    /**
     * Intercepts an HTTP request after the connection to the remote server has been established.
     *
     * The implementation might modify the request and/or modify the response after the promise returned from
     * `$stream->request(...)` resolved.
     *
     * A NetworkInterceptor SHOULD NOT short-circuit and SHOULD delegate to the `$stream` passed as third argument
     * exactly once. The only exception to this is throwing an exception, e.g. because the TLS settings used are
     * unacceptable. If you need short circuits, use an {@see ApplicationInterceptor} instead.
     *
     * @param Request           $request
     * @param CancellationToken $cancellation
     * @param Stream            $stream
     *
     * @return Promise<Response>
     */
    public function requestViaNetwork(Request $request, CancellationToken $cancellation, Stream $stream) : Promise;
}
