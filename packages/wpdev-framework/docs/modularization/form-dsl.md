# Form DSL (K2-001)

WPDev forms are built from **fields**, **views**, **state**, and **handlers**.

## Registration

Register forms only via `Form_Service` on `wpdev_register_forms`:

```php
add_action( 'wpdev_register_forms', function () {
    wpdev_services( 'form' )->register( 'my_form', array(
        'fields'  => array( /* Field definitions */ ),
        'handler' => 'my_form_handler',
    ) );
} );
```

## Fields

Field definitions use `WPDevFramework\UI\Field` (field-builder). Sanitize via `Field_Type_Registry::sanitize( $type, $value, $field )`.

## Views

Form markup templates live under `modules/form-builder/views/` and legacy `views/` fallback.

## State

Client state: Vue apps (`field-builder/assets/js/vue-apps.js`) or serialized form data on submit.

## Fields via the resolver (K2-02)

`Form::render()` resolves each field template through `wpdev_field_view( $this->views, $field->type )`
(K1-01) rather than hardcoding `settings/fields/field-{type}`. Set `views` to a
context (`settings`, `admin`, `checkout`) or a raw view root. The `model` field
type (K1-07) loads its options over AJAX (selectizer) — see
`examples/example-03-payment-modal.php`.

## Modal form lifecycle (K2-03)

1. **Display** — register with `wpdev_register_form( $id, [...] )` (or
   `wpdev_services('form')->register()`); open with `wpdev_modal_open( $id )` /
   `wpdev_services('modal')->open( $id )` and render the trigger via
   `Modal_Service::render_button()`.
2. **Submit** — wubox posts to `wpdev_ajax_wpdev_form_handler`; `Form_Manager`
   runs `security_checks()` + nonce, then calls the form `handler`.
3. **Refresh** — the handler returns JSON; include
   `data.refresh_table => '{table_id}'` so `list-tables.js` live-reloads the
   matching `data-table-id` table (K2-04). For bulk confirms the
   `Bulk_Action_Pipeline` response triggers the refresh (K2-05).

## Handlers

- **Modal forms**: open/submit through `Modal_Service` (K2-003), not direct `Form_Manager`.
- **Bulk confirm**: table bulk actions → `Modal_Service` + form id.

## Examples

- `examples/example-01.php` — minimal modal confirm form.
- `examples/example-02.php` — bulk confirm delete via `Bulk_Action_Pipeline` (K2-05).
- `examples/example-03-payment-modal.php` — Add Payment modal + products AJAX field (K2-04).

## Hooks

- `wpdev_register_form` — per-form registration
- `wpdev_register_forms` — bootstraps all forms (License gate on `wpdev_register_forms`)

See `forms-inventory.md` for registered form ids.
