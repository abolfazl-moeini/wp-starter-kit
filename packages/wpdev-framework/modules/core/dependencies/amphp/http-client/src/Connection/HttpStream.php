<?php

namespace WPDev\Dependencies\Amp\Http\Client\Connection;

use WPDev\Dependencies\Amp\CancellationToken;
use WPDev\Dependencies\Amp\Http\Client\Internal\ForbidCloning;
use WPDev\Dependencies\Amp\Http\Client\Internal\ForbidSerialization;
use WPDev\Dependencies\Amp\Http\Client\Request;
use WPDev\Dependencies\Amp\Promise;
use WPDev\Dependencies\Amp\Socket\SocketAddress;
use WPDev\Dependencies\Amp\Socket\TlsInfo;
use function WPDev\Dependencies\Amp\call;
final class HttpStream implements Stream
{
    use ForbidSerialization;
    use ForbidCloning;
    public static function fromConnection(Connection $connection, callable $requestCallback, callable $releaseCallback) : self
    {
        return new self($connection->getLocalAddress(), $connection->getRemoteAddress(), $connection->getTlsInfo(), $requestCallback, $releaseCallback);
    }
    public static function fromStream(Stream $stream, callable $requestCallback, callable $releaseCallback) : self
    {
        return new self($stream->getLocalAddress(), $stream->getRemoteAddress(), $stream->getTlsInfo(), $requestCallback, $releaseCallback);
    }
    /** @var SocketAddress */
    private $localAddress;
    /** @var SocketAddress */
    private $remoteAddress;
    /** @var TlsInfo|null */
    private $tlsInfo;
    /** @var callable */
    private $requestCallback;
    /** @var callable|null */
    private $releaseCallback;
    private function __construct(SocketAddress $localAddress, SocketAddress $remoteAddress, ?TlsInfo $tlsInfo, callable $requestCallback, callable $releaseCallback)
    {
        $this->localAddress = $localAddress;
        $this->remoteAddress = $remoteAddress;
        $this->tlsInfo = $tlsInfo;
        $this->requestCallback = $requestCallback;
        $this->releaseCallback = $releaseCallback;
    }
    public function __destruct()
    {
        if ($this->releaseCallback !== null) {
            ($this->releaseCallback)();
        }
    }
    public function request(Request $request, CancellationToken $cancellation) : Promise
    {
        if ($this->releaseCallback === null) {
            throw new \Error('A stream may only be used for a single request');
        }
        $this->releaseCallback = null;
        return call(function () use($request, $cancellation) {
            foreach ($request->getEventListeners() as $eventListener) {
                (yield $eventListener->startRequest($request));
            }
            return call($this->requestCallback, $request, $cancellation, $this);
        });
    }
    public function getLocalAddress() : SocketAddress
    {
        return $this->localAddress;
    }
    public function getRemoteAddress() : SocketAddress
    {
        return $this->remoteAddress;
    }
    public function getTlsInfo() : ?TlsInfo
    {
        return $this->tlsInfo;
    }
}
