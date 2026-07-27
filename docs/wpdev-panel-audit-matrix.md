# WPDev panel audit matrix (Phase 3)

Use this matrix before migrating a WPDev panel onto `@wpdev/wpdev-bridge` + Polaris.

See [`integrate.md`](../integrate.md) and [`wpdev-bridge-checkout.md`](wpdev-bridge-checkout.md).

## Columns

| Column            | What to capture                                            |
| ----------------- | ---------------------------------------------------------- |
| Panel / module    | e.g. checkout, products list, settings                     |
| DOM root          | Existing selector / needs new mount node                   |
| JS entry type     | jQuery / Vue-era / mixed / none                            |
| Transport         | admin AJAX / light AJAX / REST / mixed                     |
| Nonce policy      | shared `wpdev-ajax-nonce` / feature nonce / custom / none  |
| Localized globals | `wpdev_*` vars already present                             |
| Frontend hooks    | `wp.hooks` action/filter names used                        |
| `.ps-scope` safe? | Can wrap only the mount region without clobbering WP admin |

## Seeded rows (from current codebase)

| Panel                        | DOM root                                  | JS type            | Transport                   | Nonce                                  | Globals                       | Hooks                                 | ps-scope               |
| ---------------------------- | ----------------------------------------- | ------------------ | --------------------------- | -------------------------------------- | ----------------------------- | ------------------------------------- | ---------------------- |
| Checkout / cart              | `#wpdev-order-summary-content`, form root | Vue + jQuery mixed | light (+ late for validate) | feature `wpdev_checkout` as `_wpnonce` | `wpdev_checkout`              | `wpdev_on_create_order`, change hooks | Yes — shell only       |
| Field templates (checkout)   | template holders                          | jQuery/Vue         | light                       | feature `wpdev_checkout`               | `wpdev_checkout`              | template fetch hooks                  | N/A (markup)           |
| Ajax list tables             | list table wrappers                       | jQuery + Vue deps  | admin                       | per-table `_ajax_{id}_nonce`           | `wpdev_list_table`            | `wpdev_list_table_update`             | Caution — admin chrome |
| Settings ajax_button         | field row                                 | inline JS          | admin                       | shared via `wpdev.ajax`                | `wpdev_ajax`                  | none typical                          | Yes — field region     |
| Vue apps (fields/customizer) | `[data-state]` apps                       | Vue-era            | mostly admin                | varies                                 | `wpdev_settings`, app globals | `wpdev_{app}_mounted/changed`         | Caution                |

## Per-panel migration steps

1. Fill the matrix row.
2. Confirm `readWpdevFeatureConfig()` can see required URLs/nonces (or add localize keys).
3. Choose client:
   - shared framework actions → `createWpdevAjax(config.ajax)`
   - checkout light handlers → `createCheckoutAjax(config.checkout, config.ajax)`
4. Replace ad-hoc `jQuery.ajax` / bare `fetch` gradually; keep PHP handlers unchanged.
5. Guard every success path with `hasData(res)`.
6. Preserve existing `wp.hooks` names via `getWpdevHooks()`.
7. Add Polaris only as a scoped shell (`.ps-scope`), not a full page restyle.

## Transport / nonce quick rules

| Transport    | Typical URL helper                             | Default nonce field          | Notes                                             |
| ------------ | ---------------------------------------------- | ---------------------------- | ------------------------------------------------- |
| admin        | `admin-ajax.php` / `wpdev_ajax.admin_ajax_url` | `nonce` (`wpdev-ajax-nonce`) | Prefer `window.wpdev.ajax` / `createWpdevAjax`    |
| light        | `wpdev_ajax_url()` / `?wpdev-ajax=1`           | often feature-specific       | Handler must be registered before light ajax runs |
| light + late | `wpdev_ajax_url('init')`                       | feature-specific             | Needed when handler needs full WP `init`          |
| REST         | `@wpdev/rest-utils`                            | `X-WP-Nonce`                 | Not the same as WPDev ajax envelope               |

## Do not

- Unify all panels onto one nonce action.
- Assume light-ajax always returns JSON (handler missing → bare `1`).
- Wrap entire `wp-admin` body in `.ps-scope`.
- Remove `wp.hooks` extension points while migrating.
