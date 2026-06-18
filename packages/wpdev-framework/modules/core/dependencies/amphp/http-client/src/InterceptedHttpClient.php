<?php

namespace WPDev\Dependencies\Amp\Http\Client;

use WPDev\Dependencies\Amp\CancellationToken;
use WPDev\Dependencies\Amp\Http\Client\Internal\ForbidCloning;
use WPDev\Dependencies\Amp\Http\Client\Internal\ForbidSerialization;
use WPDev\Dependencies\Amp\Promise;
use function WPDev\Dependencies\Amp\call;
final class InterceptedHttpClient implements DelegateHttpClient
{
    use ForbidCloning;
    use ForbidSerialization;
    /** @var DelegateHttpClient */
    private $httpClient;
    /** @var ApplicationInterceptor */
    private $interceptor;
    public function __construct(DelegateHttpClient $httpClient, ApplicationInterceptor $interceptor)
    {
        $this->httpClient = $httpClient;
        $this->interceptor = $interceptor;
    }
    public function request(Request $request, CancellationToken $cancellation) : Promise
    {
        return call(function () use($request, $cancellation) {
            foreach ($request->getEventListeners() as $eventListener) {
                (yield $eventListener->startRequest($request));
            }
            return $this->interceptor->request($request, $cancellation, $this->httpClient);
        });
    }
}
