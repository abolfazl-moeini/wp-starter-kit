# Fault tolerance (WPDev / WD package)

`packages/php-fault-tolerance/` provides optional PHP 8.1+ resilience helpers.
The WPDev Fault Tolerance package (abbreviated **WD FT** in comments) is
self-contained: it has no hard dependency on the main starter kit and is safe
to ship alongside Strauss-scoped Composer vendors in distributed plugins.

Enable in consumer projects with `faultTolerance: on` (requires `phpMinVersion ≥ 8.1`).

## Source layout (6 files)

```
packages/php-fault-tolerance/src/
├── CircuitBreaker.php   — transient-backed circuit breaker
├── CircuitState.php     — Closed | Open | HalfOpen enum (standalone public type)
├── HttpClient.php       — parallel pool() + sequential batch() with SSRF guard
├── Resilient.php        — retry with optional fallback
├── FaultTolerance.php   — static facade over the three domain classes
└── functions.php        — global wrappers (WordPress-style ergonomics)
```

## Global helpers

| Function | Delegates to | Purpose |
|----------|--------------|---------|
| `resilient($operation, $options)` | `Resilient::resilient()` | Retry with delay and fallback |
| `http_batch($requests)` | `HttpClient::batch()` | Sequential `wp_remote_request` (default) |
| `http_pool($requests)` | `HttpClient::pool()` | Parallel `curl_multi` with SSRF blocking |
| `fault_tolerance()` | `new FaultTolerance()` | Facade instance (static methods on class) |

Request shape for HTTP helpers:

```php
[
    ['url' => 'https://api.example.com/a', 'args' => ['method' => 'GET', 'timeout' => 5]],
]
```

## Class API

```php
use WPDev\FaultTolerance\CircuitBreaker;
use WPDev\FaultTolerance\HttpClient;
use WPDev\FaultTolerance\FaultTolerance;

$breaker = FaultTolerance::circuitBreaker('payments', threshold: 5, cooldown: 60);
$responses = HttpClient::batch([['url' => 'https://example.com/']]);
$parallel = HttpClient::pool([['url' => 'https://example.com/']]);
```

## Circuit breaker — transient warning

`CircuitBreaker` stores state in WordPress transients. Under concurrent PHP-FPM
workers, updates are **not atomic**. For strict guarantees, add object-cache
locks or external coordination in production.

## SSRF hygiene

`HttpClient::pool()` and `HttpClient::batch()` block:

- Non-HTTP(S) schemes (`file://`, `ftp://`, …)
- Private and reserved IP ranges (RFC1918, loopback, link-local, IPv6 ULA, …)
- Hostnames that resolve to blocked IPs

Prefer `http_batch()` unless you explicitly need parallelism.

## Strauss / multi-plugin safety

Require `wpdev/php-fault-tolerance` via Composer and scope with Strauss in
release builds so `WPDev\FaultTolerance\*` does not collide with another plugin
shipping the same package unscoped. See [vendor-scoping.md](vendor-scoping.md).

## Tests

```bash
composer test -- --filter FaultTolerance
```

Kit tests live under `tests/phpunit/FaultTolerance/`.