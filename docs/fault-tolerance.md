# Fault tolerance (optional)

`packages/php-fault-tolerance/` provides small PHP 8.1+ resilience helpers.
The package is optional and separate from the 7.4-compatible core.

## Modules

- `CircuitBreaker` + `CircuitState` — transient-backed open/closed/half-open.
- `resilient()` — retry with optional fallback.
- `http_batch()` — sequential `wp_remote_request` (default).
- `http_pool()` — parallel edge case with private-host blocking.

## Transient warning

Circuit breaker state uses WordPress transients. Under concurrent PHP-FPM
workers, state is **not atomic**. Document this limitation in production
deployments; consider object-cache locks for strict guarantees.

## SSRF

`http_pool()` blocks localhost and RFC1918 hosts. Prefer `http_batch()` unless
you explicitly need parallelism.
