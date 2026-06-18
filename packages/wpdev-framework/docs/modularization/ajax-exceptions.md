# Ajax Legacy Exception Registry

Documented exceptions to the central `wpdev_register_ajax_handler()` + `Ajax_Response` envelope contract.

| Action / path | Owner | Client | Exit criteria | Deadline |
|---------------|-------|--------|---------------|----------|
| `wpdev_search` | field-builder | selectizer / model fields | All model fields use provider registry + envelope | Next field-builder milestone |
| `wpdev_form_display` / `wpdev_form_handler` | core/form-builder | wubox modals | Form JS reads standard envelope on submit | Next form-builder milestone |
| `wpdev_create_order` / `wpdev_validate_form` | wpdev-checkout | checkout frontend | Checkout JS migrated to `window.wpdev.ajax` | Next checkout milestone |
| Gateway webhooks (nopriv) | wpdev-gateways | external gateways | Separate webhook response contract documented | Ongoing |

New exceptions require: owner module, consuming client, reason, exit criteria, and deadline. Undocumented raw `wp_ajax_*` / `wpdev_ajax_*` handlers fail `composer audit:ajax`.
