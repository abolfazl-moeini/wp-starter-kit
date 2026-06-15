<?php
declare(strict_types=1);

namespace WPSK\FaultTolerance;

/**
 * Simple circuit breaker backed by WordPress transients.
 */
final class CircuitBreaker
{
    private string $key;
    private int $failureThreshold;
    private int $cooldownSeconds;
    private mixed $fallback;

    public function __construct(
        string $key,
        int $failureThreshold = 3,
        int $cooldownSeconds = 60,
        mixed $fallback = null
    ) {
        $this->key = $key;
        $this->failureThreshold = $failureThreshold;
        $this->cooldownSeconds = $cooldownSeconds;
        $this->fallback = $fallback;
    }

    public function state(): CircuitState
    {
        $data = $this->read();
        if (($data['opened_at'] ?? 0) > 0) {
            $elapsed = time() - (int) $data['opened_at'];
            if ($elapsed >= $this->cooldownSeconds) {
                return CircuitState::HalfOpen;
            }
            return CircuitState::Open;
        }
        return CircuitState::Closed;
    }

    /**
     * @param callable():mixed $operation
     */
    public function call(callable $operation): mixed
    {
        $state = $this->state();
        if ($state === CircuitState::Open) {
            if ($this->fallback !== null) {
                return $this->fallback;
            }
            throw new \RuntimeException("Circuit {$this->key} is open");
        }

        try {
            $result = $operation();
            if ($state === CircuitState::HalfOpen || ($this->read()['failures'] ?? 0) > 0) {
                $this->write(['failures' => 0, 'opened_at' => 0]);
            }
            return $result;
        } catch (\Throwable $e) {
            $data = $this->read();
            $failures = (int) ($data['failures'] ?? 0) + 1;
            $openedAt = $failures >= $this->failureThreshold ? time() : 0;
            $this->write(['failures' => $failures, 'opened_at' => $openedAt]);

            if ($this->fallback !== null) {
                return $this->fallback;
            }
            throw $e;
        }
    }

    /** @return array{failures:int,opened_at:int} */
    private function read(): array
    {
        $stored = get_transient($this->storageKey());
        return is_array($stored) ? $stored : ['failures' => 0, 'opened_at' => 0];
    }

    /** @param array{failures:int,opened_at:int} $data */
    private function write(array $data): void
    {
        set_transient($this->storageKey(), $data, $this->cooldownSeconds * 2);
    }

    private function storageKey(): string
    {
        return 'wpsk_cb_' . $this->key;
    }
}