# WPDev Bridge + Ajax list tables (Phase 3.1)

How admin list-table refresh maps onto `@wpdev/wpdev-bridge` after checkout
(light AJAX) was covered in Phase 2.

See [`integrate.md`](../integrate.md) and [`wpdev-panel-audit-matrix.md`](wpdev-panel-audit-matrix.md).

## Transport class

| Concern     | Rule                                                              |
| ----------- | ----------------------------------------------------------------- |
| Transport   | `admin-ajax.php`                                                  |
| Action      | `wpdev_list_table_fetch_ajax_results`                             |
| Nonce field | `_ajax_{tableId}_nonce` (per table)                               |
| Envelope    | `wp_send_json_success({ rows, pagination, column_headers, ... })` |
| Hooks       | `wpdev_list_table_update`                                         |

## Bridge API

```ts
import {
  createListTableAjax,
  unwrapListTablePayload,
  hasData,
} from "@wpdev/wpdev-bridge";

const ajax = createListTableAjax(
  {
    tableId: "product_list_table",
    nonce: document.querySelector("#_ajax_product_list_table_nonce")?.value,
  },
  { adminUrl: window.ajaxurl },
);

const payload = await ajax.refresh({ paged: 2, orderby: "name" });
// payload => { rows, pagination, ... } or null when envelope failed
```

`createListTableAjax`:

- defaults transport to `admin`
- injects `_ajax_{tableId}_nonce`
- merges `table_id` on `refresh()`
- returns **unwrapped** data via `unwrapListTablePayload` (not the raw envelope)

## Legacy alignment

`modules/table-builder/assets/js/list-tables/list-tables-factory.js` now:

- treats `success: false` / missing `data` as a no-op (opacity restore only)
- uses a local `payload` variable instead of mutating `response`
- still fires `wp.hooks` `wpdev_list_table_update` with the unwrapped payload

## Settings `ajax_button` (same admin class)

`field-ajax_button.php` fallback path now:

- POSTs to `admin-ajax.php` with `action` + button `nonce`
- guards `success === false` before reading `message`
- prefers `window.wpdev.ajax.post` when available (unchanged)

## Do not

- Reuse checkout `_wpnonce` / `wpdev_checkout` for list tables
- Assume `response.data` exists when `success` is false
- Replace `wpdev_list_table_update` hook names during migration
