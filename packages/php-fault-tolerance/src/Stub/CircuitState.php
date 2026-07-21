<?php
/**
 * Stub circuit states — string constants (PHP 7.4-safe).
 * Real implementation uses a backed enum with the same case names.
 */

namespace WPDev\FaultTolerance;

final class CircuitState
{
    public const Closed = 'closed';
    public const Open = 'open';
    public const HalfOpen = 'half_open';
}
