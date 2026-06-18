<?php

namespace WPDev\Dependencies\Amp\Http\Client\Interceptor;

use WPDev\Dependencies\Amp\CancellationToken;
use WPDev\Dependencies\Amp\Http\Client\ApplicationInterceptor;
use WPDev\Dependencies\Amp\Http\Client\Connection\Stream;
use WPDev\Dependencies\Amp\Http\Client\DelegateHttpClient;
use WPDev\Dependencies\Amp\Http\Client\Internal\ForbidCloning;
use WPDev\Dependencies\Amp\Http\Client\Internal\ForbidSerialization;
use WPDev\Dependencies\Amp\Http\Client\NetworkInterceptor;
use WPDev\Dependencies\Amp\Http\Client\Request;
use WPDev\Dependencies\Amp\Http\Client\Response;
use WPDev\Dependencies\Amp\Promise;
use function WPDev\Dependencies\Amp\call;
class ModifyResponse implements NetworkInterceptor, ApplicationInterceptor
{
    use ForbidCloning;
    use ForbidSerialization;
    /** @var callable(Response):(\Generator<mixed, mixed, mixed, Response|null>|Promise<Response>|Response|null) */
    private $mapper;
    /**
     * @psalm-param callable(Response):(\Generator<mixed, mixed, mixed, Response|null>|Promise<Response>|Response|null) $mapper
     */
    public function __construct(callable $mapper)
    {
        $this->mapper = $mapper;
    }
    public final function requestViaNetwork(Request $request, CancellationToken $cancellation, Stream $stream) : Promise
    {
        return call(function () use($request, $cancellation, $stream) {
            $response = (yield $stream->request($request, $cancellation));
            $mappedResponse = (yield call($this->mapper, $response));
            \assert($mappedResponse instanceof Response || $mappedResponse === null);
            return $mappedResponse ?? $response;
        });
    }
    public function request(Request $request, CancellationToken $cancellation, DelegateHttpClient $httpClient) : Promise
    {
        return call(function () use($request, $cancellation, $httpClient) {
            $request->interceptPush($this->mapper);
            $response = (yield $httpClient->request($request, $cancellation));
            $mappedResponse = (yield call($this->mapper, $response));
            \assert($mappedResponse instanceof Response || $mappedResponse === null);
            return $mappedResponse ?? $response;
        });
    }
}
