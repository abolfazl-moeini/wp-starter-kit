<?php
/**
 * Global helpers — available on all supported PHP versions.
 * Implementation is Real (8.1+) or Stub (<8.1) via bootstrap autoload.
 */

use WPDev\FaultTolerance\FaultTolerance;
use WPDev\FaultTolerance\HttpClient;
use WPDev\FaultTolerance\Resilient;

if (!function_exists('resilient')) {
    /**
     * @param callable $operation
     * @param array    $options
     * @return mixed
     */
    function resilient(callable $operation, array $options = [])
    {
        return Resilient::resilient($operation, $options);
    }
}

if (!function_exists('http_batch')) {
    /**
     * @param array $requests
     * @return array
     */
    function http_batch(array $requests)
    {
        return HttpClient::batch($requests);
    }
}

if (!function_exists('http_pool')) {
    /**
     * @param array $requests
     * @return array
     */
    function http_pool(array $requests)
    {
        return HttpClient::pool($requests);
    }
}

if (!function_exists('fault_tolerance')) {
    /**
     * @return FaultTolerance
     */
    function fault_tolerance()
    {
        return new FaultTolerance();
    }
}

if (!function_exists('wpdev_fault_tolerance_is_active')) {
    /**
     * True when the full (Real) implementation is loaded (PHP >= 8.1).
     */
    function wpdev_fault_tolerance_is_active(): bool
    {
        return PHP_VERSION_ID >= 80100;
    }
}
