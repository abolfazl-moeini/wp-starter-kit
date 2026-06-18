<?php

namespace WPDev\Dependencies\Amp\Http\Client\Connection;

use WPDev\Dependencies\Amp\CancellationToken;
use WPDev\Dependencies\Amp\Http\Client\Internal\ForbidCloning;
use WPDev\Dependencies\Amp\Http\Client\Internal\ForbidSerialization;
use WPDev\Dependencies\Amp\Http\Client\NetworkInterceptor;
use WPDev\Dependencies\Amp\Http\Client\Request;
use WPDev\Dependencies\Amp\Promise;
use WPDev\Dependencies\Amp\Socket\SocketAddress;
use WPDev\Dependencies\Amp\Socket\TlsInfo;
use function WPDev\Dependencies\Amp\call;
final class InterceptedStream implements Stream
{
    use ForbidCloning;
    use ForbidSerialization;
    /** @var Stream */
    private $stream;
    /** @var NetworkInterceptor|null */
    private $interceptor;
    public function __construct(Stream $stream, NetworkInterceptor $interceptor)
    {
        $this->stream = $stream;
        $this->interceptor = $interceptor;
    }
    public function request(Request $request, CancellationToken $cancellation) : Promise
    {
        if (!$this->interceptor) {
            throw new \Error(__METHOD__ . ' may only be invoked once per instance. ' . 'If you need to implement retries or otherwise issue multiple requests, register an ApplicationInterceptor to do so.');
        }
        $interceptor = $this->interceptor;
        $this->interceptor = null;
        return call(function () use($interceptor, $request, $cancellation) {
            foreach ($request->getEventListeners() as $eventListener) {
                (yield $eventListener->startRequest($request));
            }
            return $interceptor->requestViaNetwork($request, $cancellation, $this->stream);
        });
    }
    public function getLocalAddress() : SocketAddress
    {
        return $this->stream->getLocalAddress();
    }
    public function getRemoteAddress() : SocketAddress
    {
        return $this->stream->getRemoteAddress();
    }
    public function getTlsInfo() : ?TlsInfo
    {
        return $this->stream->getTlsInfo();
    }
}
