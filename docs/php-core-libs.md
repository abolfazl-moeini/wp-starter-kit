# PHP support libraries

wp-starter-kit reimplements useful `php-core-libs/` behavior under `src/Support/`
with no legacy private dependencies.

## REST (`src/Support/Rest/`)

- `RestSetup` — dynamic `restNamespace` from `project.config.json`.
- `RestHandler` — safe exception responses, strong `permission_callback`.
- `AllowBatch` — opt-in WordPress REST batch support.
- `BatchResponse::wrap()` — `extra.cacheKey` contract for `@wpsk/fetch`.

## Queue (`src/Support/Queue/DeferredCall.php`)

- Refuses to queue after hook fired (`did_action`).
- Priority support and callable validation.

## Shortcodes (`src/Support/Shortcodes/`)

- Class-based handlers with `shortcode_atts()` sanitization.
- Output passed through `wp_kses_post()`.

## Auth (`src/Support/Auth/CapabilityPolicy.php`)

- `CapabilityPolicy::can()` and `rest_permission()` for REST reuse.

## Security requirements

- Every REST route must implement `permission_callback`.
- Sanitize input; escape output in shortcodes and admin UI.
