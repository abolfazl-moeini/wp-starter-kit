<?php
/**
 * Facade — same surface as Real; delegates to Stub classes.
 */

namespace WPDev\FaultTolerance;

final class FaultTolerance
{
    public static function circuitBreaker(
        string $key,
        int $threshold = 5,
        int $cooldown = 60
    ): CircuitBreaker {
        return new CircuitBreaker($key, $threshold, $cooldown);
    }

    public static function httpPool(array $requests): array
    {
        return HttpClient::pool($requests);
    }

    public static function httpBatch(array $requests): array
    {
        return HttpClient::batch($requests);
    }

    /**
     * @param mixed    $fallback
     * @return mixed
     */
    public static function resilient(
        callable $fn,
        int $retries = 3,
        int $delay = 100,
        $fallback = null
    ) {
        return Resilient::resilient(
            $fn,
            [
                'retries'  => $retries,
                'delayMs'  => $delay,
                'fallback' => $fallback,
            ]
        );
    }
}
