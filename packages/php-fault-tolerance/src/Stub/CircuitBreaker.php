<?php
/**
 * No-op circuit breaker (PHP < 8.1): always closed, always runs the operation.
 */

namespace WPDev\FaultTolerance;

final class CircuitBreaker
{
    /** @var string */
    private $key;

    /** @var int */
    private $failureThreshold;

    /** @var int */
    private $cooldownSeconds;

    /** @var mixed */
    private $fallback;

    /**
     * @param string $key
     * @param int    $failureThreshold
     * @param int    $cooldownSeconds
     * @param mixed  $fallback
     */
    public function __construct(
        string $key,
        int $failureThreshold = 3,
        int $cooldownSeconds = 60,
        $fallback = null
    ) {
        $this->key = $key;
        $this->failureThreshold = $failureThreshold;
        $this->cooldownSeconds = $cooldownSeconds;
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
     * @param callable $operation
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
