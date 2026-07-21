<?php
declare(strict_types=1);

namespace WPDev\FaultTolerance;

enum CircuitState: string
{
    case Closed = 'closed';
    case Open = 'open';
    case HalfOpen = 'half_open';
}