<?php
/**
 * Plugin Name: Conflict Plugin Alpha
 * Version: 0.0.1
 */
declare(strict_types=1);

$autoload = __DIR__ . '/vendor-prefixed/autoload.php';
if (is_file($autoload)) {
    require_once $autoload;
}