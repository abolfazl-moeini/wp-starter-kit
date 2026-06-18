# API cookbook — domain APIs

Use only when building checkout, payment gateways, events, widget datasources, Jumper commands, or migrations. Panel APIs: [api-cookbook.md](api-cookbook.md).

Manifest `examples/{slug}/` = `@examples/{slug}/`.

---

## Checkout

### wpdev_register_checkout_field_type

| Field | Value |
|-------|-------|
| Module | checkout (example) |
| Signature | `wpdev_register_checkout_field_type( string $field_type_id, string $field_type_class_name )` |
| Hook | `wpdev_load` |
| When | Custom signup/checkout field renderer |
| Full example | `@examples/checkout/setup.php` |
| Doc | `@examples/checkout/API_DOC.md` |

```php
wpdev_register_checkout_field_type( 'pricing-table', Pricing_Table_Field_Template::class );
```

### wpdev_get_checkout_form

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_checkout_form( mixed $checkout_form_id )` |
| When | Load checkout form config by id |
| Full example | `@examples/checkout/src/functions/checkout-form.php` |

```php
$form = wpdev_get_checkout_form( $form_id );
```

### wpdev_get_checkout_form_by_slug

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_checkout_form_by_slug( string $checkout_form_slug )` |
| When | Resolve form by slug |
| Full example | `@examples/checkout/src/functions/checkout-form.php` |

```php
$form = wpdev_get_checkout_form_by_slug( 'signup' );
```

### wpdev_get_checkout_forms

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_checkout_forms( array $query = array() )` |
| When | Query checkout forms |
| Full example | `@examples/checkout/src/functions/checkout-form.php` |

```php
$forms = wpdev_get_checkout_forms( array( 'limit' => 10 ) );
```

### wpdev_create_checkout_form

| Field | Value |
|-------|-------|
| Signature | `wpdev_create_checkout_form( array $checkout_form_data )` |
| When | Build checkout field set programmatically |
| Full example | `@examples/checkout/src/functions/checkout-form.php` |

```php
$form = wpdev_create_checkout_form( array( 'name' => __( 'Signup', 'wpdev' ), 'fields' => array() ) );
```

### wpdev_create_checkout_fields

| Field | Value |
|-------|-------|
| Signature | `wpdev_create_checkout_fields( array $fields = array() )` |
| When | Build checkout field set programmatically |
| Full example | `@examples/checkout/src/functions/checkout.php` |

```php
$fields = wpdev_create_checkout_fields( array( /* field definitions */ ) );
```

---

## Gateways

### wpdev_register_gateway

| Field | Value |
|-------|-------|
| Module | gateways (example) |
| Signature | `wpdev_register_gateway( string $id, string $title, string $desc, string $class_name, bool $hidden = false )` |
| Hook | `wpdev_register_gateways` action |
| When | Register single payment gateway |
| Full example | `@examples/gateways/setup.php` |
| Doc | `@examples/gateways/API_DOC.md` |

```php
add_action( 'wpdev_register_gateways', static function () {
    wpdev_register_gateway(
        'stripe',
        __( 'Stripe', 'wpdev' ),
        __( 'Credit card payments via Stripe.', 'wpdev' ),
        Stripe_Gateway::class,
        false
    );
} );
```

### wpdev_get_gateway

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_gateway( string $id )` |
| When | Retrieve registered gateway instance |
| Full example | `@examples/gateways/src/functions/gateway.php` |

```php
$gateway = wpdev_get_gateway( 'stripe' );
```

### wpdev_get_gateways

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_gateways(): array` |
| When | List all gateways |
| Full example | `@examples/gateways/src/functions/gateway.php` |

```php
$gateways = wpdev_get_gateways();
```

---

## Events

### wpdev_register_event_type

| Field | Value |
|-------|-------|
| Module | events (example) |
| Signature | `wpdev_register_event_type( string $slug, array $args = array() )` |
| Hook | `wpdev_register_all_events` action |
| When | Register auditable event type |
| Full example | `@examples/events/setup.php` |
| Doc | `@examples/events/API_DOC.md` |

```php
add_action( 'wpdev_register_all_events', static function () {
    wpdev_register_event_type( 'membership.created', array(
        'label' => __( 'Membership Created', 'wpdev' ),
    ) );
} );
```

### wpdev_do_event

| Field | Value |
|-------|-------|
| Signature | `wpdev_do_event( string $slug, array $payload = array() )` |
| When | Emit domain event |
| Full example | `@examples/events/src/functions/event.php` |

```php
wpdev_do_event( 'membership.created', array( 'membership_id' => $id ) );
```

### wpdev_get_event_type

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_event_type( string $slug )` |
| When | Read event type config |
| Full example | `@examples/events/src/functions/event.php` |

### wpdev_get_event_types

| Field | Value |
|-------|-------|
| Signature | `wpdev_get_event_types(): array` |
| When | List all event types |
| Full example | `@examples/events/src/functions/event.php` |

---

## Widget datasources

### wpdev_register_widget_datasource

| Field | Value |
|-------|-------|
| Module | admin-widget-builder |
| Signature | `wpdev_register_widget_datasource( string $id, callable $callable, bool $replace = true )` |
| Hook | `wpdev_load` |
| When | Named datasource for dashboard widgets |
| Playground | `@playground/playground-admin-widget-builder/` |
| Full example | `@examples/checkout/`, `@examples/admin-custom-page-dashboard-widgets/` |
| Doc | `@framework/modules/admin-widget-builder/API_DOC.md` |

```php
wpdev_register_widget_datasource( 'checkout-signups', static function () {
    return array( 'count' => 0 );
} );
```

### wpdev_register_general_dashboard_statistics_widgets

| Field | Value |
|-------|-------|
| Signature | `wpdev_register_general_dashboard_statistics_widgets()` |
| When | Register bundled general KPI widgets |
| Full example | `@examples/admin-custom-page-dashboard-widgets/src/register-dashboard-statistics-widgets.php` |

```php
add_action( 'wpdev_load', static function () {
    if ( wpdev_module_is_loaded( 'admin-custom-page' ) ) {
        wpdev_register_general_dashboard_statistics_widgets();
    }
}, 5 );
```

### wpdev_register_tax_dashboard_statistics_widgets

| Field | Value |
|-------|-------|
| Signature | `wpdev_register_tax_dashboard_statistics_widgets()` |
| When | Register tax tab KPI widgets |
| Full example | `@examples/admin-custom-page-dashboard-widgets/src/register-dashboard-statistics-widgets.php` |

```php
add_action( 'wpdev_load', static function () {
    if ( wpdev_module_is_loaded( 'admin-custom-page' ) ) {
        wpdev_register_tax_dashboard_statistics_widgets();
    }
}, 5 );
```

---

## Jumper (command palette)

### wpdev_register_jumper_command

| Field | Value |
|-------|-------|
| Module | admin-widget-builder |
| Signature | `wpdev_register_jumper_command( string $id, array $config = array(), bool $replace = true )` |
| Hook | `wpdev_load` |
| When | Add command-palette entry |
| Full example | `@examples/dashboard/` |
| Doc | `@framework/modules/admin-widget-builder/API_DOC.md` |

```php
wpdev_register_jumper_command( 'goto-products', array(
    'label' => __( 'Go to Products', 'wpdev' ),
    'url'   => wpdev_network_admin_url( 'wpdev-products' ),
) );
```

### wpdev_register_jumper_namespace

| Field | Value |
|-------|-------|
| Signature | `wpdev_register_jumper_namespace( string $id, array $config = array(), bool $replace = true )` |
| When | Group jumper commands |
| Full example | `@examples/dashboard/` |

```php
wpdev_register_jumper_namespace( 'navigation', array( 'label' => __( 'Navigation', 'wpdev' ) ) );
```

---

## Migration

### wpdev_register_migration

| Field | Value |
|-------|-------|
| Module | core |
| Signature | `wpdev_register_migration( string $slug, callable $callback )` |
| Hook | Module `setup.php` (early) |
| When | Versioned data migration on upgrade |
| Full example | `@examples/products/setup.php` (deprecated shims) |
| Doc | `@framework/modules/core/API_DOC.md` |

```php
wpdev_register_migration( 'wpdev-products-2-1-0', static function () {
    // Run dbDelta or data fixes.
} );
```

---

## Domain action hooks (not registry functions)

Register callbacks on these hooks; they are not `wpdev_register_*` functions.

| Hook | Purpose | Example usage |
|------|---------|---------------|
| `wpdev_register_gateways` | Register payment gateways | `add_action( 'wpdev_register_gateways', array( $this, 'register' ) )` |
| `wpdev_register_all_events` | Register event types | `add_action( 'wpdev_register_all_events', array( $this, 'register_events' ) )` |
| `wpdev_register_jumper_commands` | Register Jumper commands | `add_action( 'wpdev_register_jumper_commands', array( $this, 'register_jumper' ) )` |
| `wpdev_register_field_types` | Register checkout field types | Fired by signup-fields manager |
| `wpdev_register_field_templates` | Register checkout field templates | Fired by field-templates manager |

---

## Soft dependencies

### wpdev_example_is_loaded

| Field | Value |
|-------|-------|
| Signature | `wpdev_example_is_loaded( string $module_id ): bool` — VERIFY_IN_SOURCE |
| When | Guard cross-example API calls |
| Doc | `@framework/docs/CONTEXT.md` |

```php
if ( wpdev_example_is_loaded( 'wpdev-products' ) ) {
    $product = wpdev_get_product( $id );
}
```