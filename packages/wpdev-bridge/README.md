# @wpdev/wpdev-bridge

Adapter layer between **WPDev framework** frontend contracts (AJAX, localized
globals, `wp.hooks`) and **wp-starter-kit** module entries when
`frontendStack: polaris` is enabled.

This package implements Phase 1 of [`integrate.md`](../../integrate.md).

## Install

```bash
npm install @wpdev/wpdev-bridge
```

In the kit monorepo it is available via workspaces (`packages/wpdev-bridge`).

## Usage

```ts
import {
  createWpdevAjax,
  createCheckoutAjax,
  readWpdevFeatureConfig,
  getWpdevHooks,
  hasData,
} from "@wpdev/wpdev-bridge";

const config = readWpdevFeatureConfig();
const ajax = createCheckoutAjax(config.checkout, config.ajax);
const hooks = getWpdevHooks();

const res = await ajax.post("wpdev_create_order", { products: [1] });

if (!hasData(res) || !(res.data as { order?: unknown })?.order) {
  throw new Error(res.message || "Order create failed");
}

hooks.doAction("wpdev_on_create_order", null, res.data);
```

Generic framework AJAX:

```ts
const ajax = createWpdevAjax(config.ajax);
const res = await ajax.post("wpdev_search", {
  model: "product",
  search: "pro",
});
```

## API

| Export                                  | Role                                                          |
| --------------------------------------- | ------------------------------------------------------------- |
| `createWpdevAjax(cfg)`                  | Admin/light client; prefers `window.wpdev.ajax`               |
| `createCheckoutAjax(checkout, ajaxCfg)` | Light AJAX + `_wpnonce` checkout nonce                        |
| `normalizeEnvelope(json)`               | Map payloads / bare `1` to `{ success, code, message, data }` |
| `hasData(envelope)`                     | Guard before reading `envelope.data`                          |
| `withNonce(data, options, cfg)`         | Merge nonce field into payload                                |
| `readWpdevFeatureConfig(options?)`      | Map `wpdev_ajax` / `wpdev_checkout` / localize root           |
| `isCheckoutAjaxReady(config)`           | Minimum checkout nonce + light URL check                      |
| `getWpdevHooks(globalName?)`            | Kit hooks → `wp.hooks` → noop                                 |
| `doWpdevAction` / `applyWpdevFilters`   | Convenience wrappers                                          |

Subpath imports: `@wpdev/wpdev-bridge/ajax`, `/config`, `/hooks`, `/types`.

Checkout defaults:

- nonce field: `_wpnonce`
- transport: `light`
- `wpdev_validate_form` uses `lateAjaxUrl` when set

## Part of wp-starter-kit

This package is part of [wp-starter-kit](../../README.md).

API reference: [docs/api/js-reference.md](../../docs/api/js-reference.md#wpdevwpdev-bridge).

See also:

- Plan: [`integrate.md`](../../integrate.md)
- Checkout reference: [`docs/wpdev-bridge-checkout.md`](../../docs/wpdev-bridge-checkout.md)
- Panel matrix: [`docs/wpdev-panel-audit-matrix.md`](../../docs/wpdev-panel-audit-matrix.md)
