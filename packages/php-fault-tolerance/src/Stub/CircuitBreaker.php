<?php
/**
 * No-op circuit breaker (PHP < 8.1): always closed, always runs the operation.
 */

namespace WPDev\FaultTolerance;

final class CircuitBreaker
{
    /** @var mixed */
    private $fallback;

    /**
     * @param mixed  $fallback
     */
    public function __construct(
        string $key,
        int $failureThreshold = 3,
        int $cooldownSeconds = 60,
        $fallback = null
    ) {
        $this->fallback = $fallback;
    }

    /**
     * @return string CircuitState::Closed
     */
    public function state(): string
    {
        return CircuitState::Closed;
    }

    /**
     * @return mixed
     */
    public function call(callable $operation)
    {
        try {
            return $operation();
        } catch (\Throwable $e) {
            if ($this->fallback !== null) {
                return $this->fallback;
            }
            throw $e;
        }
    }
}
