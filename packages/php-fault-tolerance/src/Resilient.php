<?php
declare(strict_types=1);

namespace WPDev\FaultTolerance;

/**
 * Retry helper with optional fallback.
 */
final class Resilient
{
    /**
     * @template T
     * @param callable():T $operation
     * @param array{retries?:int,delayMs?:int,fallback?:mixed} $options
     * @return T
     */
    public static function resilient(callable $operation, array $options = []): mixed
    {
        $retries = $options['retries'] ?? 2;
        $delayMs = (int) ( $options['delayMs'] ?? 0 );
        $fallback = $options['fallback'] ?? null;
        $attempt = 0;
        $last = null;

        while ($attempt <= $retries) {
            try {
                return $operation();
            } catch (\Throwable $e) {
                $last = $e;
                $attempt++;
                if ($delayMs > 0) {
                    usleep($delayMs * 1000);
                }
            }
        }

        if ($fallback !== null) {
            return $fallback;
        }

        throw $last ?? new \RuntimeException('Resilient operation failed');
    }
}