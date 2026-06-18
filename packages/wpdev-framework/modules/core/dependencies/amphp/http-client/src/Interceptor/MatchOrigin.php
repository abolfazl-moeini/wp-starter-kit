<?php

namespace WPDev\Dependencies\Amp\Http\Client\Interceptor;

use WPDev\Dependencies\Amp\CancellationToken;
use WPDev\Dependencies\Amp\Http\Client\ApplicationInterceptor;
use WPDev\Dependencies\Amp\Http\Client\DelegateHttpClient;
use WPDev\Dependencies\Amp\Http\Client\HttpException;
use WPDev\Dependencies\Amp\Http\Client\Internal\ForbidCloning;
use WPDev\Dependencies\Amp\Http\Client\Internal\ForbidSerialization;
use WPDev\Dependencies\Amp\Http\Client\Request;
use WPDev\Dependencies\Amp\Promise;
use WPDev\Dependencies\League\Uri\Http;
use WPDev\Dependencies\Psr\Http\Message\UriInterface;
final class MatchOrigin implements ApplicationInterceptor
{
    use ForbidCloning;
    use ForbidSerialization;
    /** @var ApplicationInterceptor[] */
    private $originMap = [];
    /** @var ApplicationInterceptor|null */
    private $default;
    /**
     * @param ApplicationInterceptor[] $originMap
     * @param ApplicationInterceptor   $default
     *
     * @throws HttpException
     */
    public function __construct(array $originMap, ?ApplicationInterceptor $default = null)
    {
        foreach ($originMap as $origin => $interceptor) {
            if (!$interceptor instanceof ApplicationInterceptor) {
                $type = \is_object($interceptor) ? \get_class($interceptor) : \gettype($interceptor);
                throw new HttpException('Origin map must be a map from origin to ApplicationInterceptor, got ' . $type);
            }
            $this->originMap[$this->checkOrigin($origin)] = $interceptor;
        }
        $this->default = $default;
    }
    public function request(Request $request, CancellationToken $cancellation, DelegateHttpClient $httpClient) : Promise
    {
        $interceptor = $this->originMap[$this->normalizeOrigin($request->getUri())] ?? $this->default;
        if (!$interceptor) {
            return $httpClient->request($request, $cancellation);
        }
        return $interceptor->request($request, $cancellation, $httpClient);
    }
    private function checkOrigin(string $origin) : string
    {
        try {
            $originUri = Http::createFromString($origin);
        } catch (\Exception $e) {
            throw new HttpException("Invalid origin provided: parsing failed: " . $origin);
        }
        if (!\in_array($originUri->getScheme(), ['http', 'https'], \true)) {
            throw new HttpException('Invalid origin with unsupported scheme: ' . $origin);
        }
        if ($originUri->getHost() === '') {
            throw new HttpException('Invalid origin without host: ' . $origin);
        }
        if ($originUri->getUserInfo() !== '') {
            throw new HttpException('Invalid origin with user info, which must not be present: ' . $origin);
        }
        if (!\in_array($originUri->getPath(), ['', '/'], \true)) {
            throw new HttpException('Invalid origin with path, which must not be present: ' . $origin);
        }
        if ($originUri->getQuery() !== '') {
            throw new HttpException('Invalid origin with query, which must not be present: ' . $origin);
        }
        if ($originUri->getFragment() !== '') {
            throw new HttpException('Invalid origin with fragment, which must not be present: ' . $origin);
        }
        return $this->normalizeOrigin($originUri);
    }
    private function normalizeOrigin(UriInterface $uri) : string
    {
        $defaultPort = $uri->getScheme() === 'https' ? 443 : 80;
        return $uri->getScheme() . '://' . $uri->getHost() . ':' . ($uri->getPort() ?? $defaultPort);
    }
}
