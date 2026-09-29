<?php

declare(strict_types=1);

namespace WPDev\Chameleon\Data;

use LogicException;

/**
 * CircularDependencyException: Thrown when contract dependencies form a cycle.
 */
class CircularDependencyException extends LogicException {
}
