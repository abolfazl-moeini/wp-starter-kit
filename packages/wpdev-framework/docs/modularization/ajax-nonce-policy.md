# Ajax Nonce Policy (J-007)

## Rules

1. **Admin ajax** (`admin-ajax.php` / `wp_ajax_*`): verify nonce with `check_ajax_referer()` or `wp_verify_nonce()` before mutating data.
2. **Light ajax** (`?wpdev-ajax=`): actions must validate nonce when the handler changes state; read-only search may use capability checks only where documented.
3. **List table refresh** (`wp_ajax_wpdev_list_table_fetch_ajax_results`): capability via `user_can_ajax_refresh()` on the table instance; no separate nonce (WordPress admin session + capability).
4. **Error shape**: use `WPDevFramework\Core\Ajax\Ajax_Response` or `wpdev_services('ajax')->respond_error( $message, $code, $data, $status )`.
5. **Checkout** (`wpdev_ajax_wpdev_validate_form` / `create_order`): frontend passes `wpdev-register-nonce`; server validation is field-based via `Checkout::validate()` (document when adding new checkout ajax endpoints).

## Response contract (J-006)

```json
{
  "success": false,
  "code": "forbidden",
  "message": "Human-readable message",
  "data": null
}
```

## Inventory

See `ajax-inventory.md` for action list. When adding actions, document:

| Column | Description |
|--------|-------------|
| Action | Hook / query arg |
| Nonce param | `_wpnonce`, custom field, or `none` |
| Capability | Required cap |
| Priv | `logged-in` / `nopriv` |

## Static audit (J-007)

```bash
php bin/audit-ajax-nonces.php
# composer audit:ajax
```

Heuristic: each file registering `wp_ajax_*` / `wpdev_ajax_*` must contain a nonce or capability pattern (see script). Exemptions: list-table refresh, search, checkout validate/create, field-template render, visit counter, ajax service registration wrapper.

**Review queue:** cleared 2026-05-28 — all flagged handlers now enforce capability checks; run `composer audit:ajax` to verify.

## Checklist (new ajax handlers)

- [ ] Nonce verified for state-changing handlers
- [ ] Capability checked (`wpdev_user_can()` or table method)
- [ ] Errors use `Ajax_Response` / service helpers
- [ ] Action listed in `ajax-inventory.md`
