<?php
/**
 * Dual-load bootstrap for wpdev/php-fault-tolerance.
 *
 * PHP >= 8.1 → Real/ (full circuit breaker, HTTP pool/batch, retries)
 * PHP <  8.1 → Stub/ (same public API, no-op / passthrough behaviour)
 *
 * Composer autoload should only load this file (files), not PSR-4 both trees.
 */
if (defined('WPDEV_FAULT_TOLERANCE_BOOTED')) {
    return;
}

define('WPDEV_FAULT_TOLERANCE_BOOTED', true);

$wpdev_ft_impl = (PHP_VERSION_ID >= 80100) ? 'Real' : 'Stub';
$wpdev_ft_base = __DIR__ . '/' . $wpdev_ft_impl . '/';

/**
 * @param string $class
 */
spl_autoload_register(
    static function ($class) use ($wpdev_ft_base) {
        $prefix = 'WPDev\\FaultTolerance\\';
        $len = strlen($prefix);
        if (strncmp($class, $prefix, $len) !== 0) {
            return;
        }
        $relative = str_replace('\\', '/', substr($class, $len));
        $file = $wpdev_ft_base . $relative . '.php';
        if (is_readable($file)) {
            require $file;
        }
    },
    true,
    true
);

// Always define global helpers (they resolve via the autoloader above).
require_once __DIR__ . '/functions.php';
