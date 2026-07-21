# Fault tolerance (WPDev / WD package)

`packages/php-fault-tolerance/` provides resilience helpers with a **dual-mode**
runtime:

| Runtime PHP | Mode | Behaviour |
|-------------|------|-----------|
| ≥ 8.1 | **Real** | Circuit breaker, retries, curl_multi pool, SSRF guards |
| < 8.1 | **Stub** | Same public API; no-op / single-shot / sequential HTTP |

Install is always safe: package requires **PHP ≥ 7.4**. Bootstrap picks Real
or Stub via `PHP_VERSION_ID` (not `phpMinVersion` in config).

Enable in consumer projects with `faultTolerance: on` (scaffold **default**).

Helper: `wpdev_fault_tolerance_is_active()` → `true` only when Real is loaded.

## Source layout

```
packages/php-fault-tolerance/src/
├── bootstrap.php        — files autoload; registers Real or Stub autoloader
├── functions.php        — global helpers (always defined)
├── Real/                — full implementation (PHP 8.1+)
│   ├── CircuitBreaker.php
│   ├── CircuitState.php   — backed enum
│   ├── HttpClient.php
│   ├── Resilient.php
│   └── FaultTolerance.php
└── Stub/                — PHP 7.4-safe no-op wrappers
    ├── CircuitBreaker.php
    ├── CircuitState.php   — string constants
    ├── HttpClient.php
    ├── Resilient.php
    └── FaultTolerance.php
```

## Global helpers

| Function | Delegates to | Purpose |
|----------|--------------|---------|
| `resilient($operation, $options)` | `Resilient::resilient()` | Retry with delay and fallback |
| `http_batch($requests)` | `HttpClient::batch()` | Sequential `wp_remote_request` (default) |
| `http_pool($requests)` | `HttpClient::pool()` | Parallel `curl_multi` with SSRF blocking |
| `fault_tolerance()` | `new FaultTolerance()` | Facade instance (static methods on class) |
| `wpdev_fault_tolerance_is_active()` | — | `true` when Real (PHP ≥ 8.1) is loaded |

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