<?php
/**
 * No-op resilient helper: single attempt, optional fallback (no retries).
 */

namespace WPDev\FaultTolerance;

final class Resilient
{
    /**
     * @param callable $operation
     * @param array    $options
     * @return mixed
     */
    public static function resilient(callable $operation, array $options = [])
    {
        $fallback = array_key_exists('fallback', $options) ? $options['fallback'] : null;

        try {
            return $operation();
        } catch (\Throwable $e) {
            if ($fallback !== null) {
                return $fallback;
            }
            throw $e;
        }
    }
}
