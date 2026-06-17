# JavaScript hooks inventory

The `@wpdev/hooks` package exposes the WordPress `@wordpress/hooks` instance
from the deps bundle (`assets/dependencies.ts`). All inter-module JS
extensibility goes through that single object — never call `createHooks()` in
component bundles.

## Canonical usage

```js
import { getHooks } from "@wpdev/hooks";

const hooks = getHooks();

hooks.addAction(
  `${__WPDEV_HOOK_PREFIX__}.rest.before_request`,
  "@wpdev/rest-utils",
  (endpoint, options = {}) => {
    // side effects or mutation
  },
);
```

Build-time defines (from `project.config.json`):

| Define | Source field | Purpose |
|--------|--------------|---------|
| `__WPDEV_HOOK_PREFIX__` | `hookPrefix` | Namespace for hook names |
| `__WPDEV_GLOBAL_NAME__` | `globalName` | IIFE global on `window` |
| `__WPDEV_SLUG__` | `slug` | REST namespace segment |

## Naming conventions

**Target pattern (new hooks):** `{hookPrefix}.{module}.{event}` — lowercase,
dot-separated, prefix from config (never hardcode `wpdev`).

**Legacy pattern (kit today):** `{hookPrefix}-{module-or-area}-{event}` — hyphen
separated, matching WordPress PHP `{$hook_prefix}_*` style. Existing hooks below
use this form; migrate to dot notation when breaking changes are acceptable.

| Hook name | Type | Arguments | Package | Description |
|-----------|------|-----------|---------|-------------|
| `{hookPrefix}-request-ajax-start` | action | `(endpoint, options)` | `@wpdev/rest-utils` | Fired before a REST/AJAX request starts |
| `{hookPrefix}-request-ajax-done` | action | `(endpoint, options)` | `@wpdev/rest-utils` | Fired after a REST/AJAX request completes (success or error) |
| `{hookPrefix}-request-ajax-error` | action | `(error, endpoint, options)` | `@wpdev/rest-utils` | Fired when a REST/AJAX request fails |
| `{hookPrefix}-form-init` | action | `(container, formApi)` | `@wpdev/ui-components` (WDForm) | Fired when a WDForm mounts |
| `{hookPrefix}-form-changed` | action | `(null, fieldName, value)` | `@wpdev/ui-components` (WDForm) | Fired on field change |
| `{hookPrefix}-form-submit` | action | `(null, values)` | `@wpdev/ui-components` (WDForm) | Fired before submit handler runs |
| `{hookPrefix}-form-success` | action | `(null, result)` | `@wpdev/ui-components` (WDForm) | Fired after successful submit |
| `{hookPrefix}-form-error` | action | `(null, error)` | `@wpdev/ui-components` (WDForm) | Fired when submit throws |

`{hookPrefix}` is replaced at runtime with `project.config.json → hookPrefix`
(or the `__WPDEV_HOOK_PREFIX__` build define). Default fallback: `wpdev`.

## Where hooks are registered

### REST loading indicators (scaffold `assets/dependencies.ts`)

Generated projects subscribe to `-request-ajax-start` / `-request-ajax-done` to
toggle a `document.body` loading class. See `TEMPLATE_DEPENDENCIES_TS` in the
create-wp-project generator.

### `@wpdev/rest-utils`

Dispatches start/done/error around `restRequest()` and `restXRequest()`.
Hook names are built in `resolveActions()` from the injected prefix.

### WDForm (`@wpdev/ui-components`)

`fireHook()` dispatches form lifecycle actions using the form's `hookPrefix`
prop (default `wpdev`).

## Namespace argument

The second argument to `addAction` / `addFilter` is the **package namespace**
(e.g. `'@wpdev/rest-utils'`, `'theme'` in scaffold templates). Use your package
name so removals are traceable.

## Related docs

- [hooks.md](hooks.md) — PHP `{$hookPrefix}_*` hooks from `ModuleLoader`
- [asset-mappings.md](asset-mappings.md) — how `__WPDEV_*` defines reach bundles
- [modules.md](modules.md) — PHP module boot and asset registration