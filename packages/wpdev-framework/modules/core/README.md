# WPDev Core Module

Foundation module providing module loading, service registry, and legacy bridges.

## Services

| Id | Wrapper | Legacy class |
|----|---------|--------------|
| `ajax` | `Ajax_Service` | `WPDevFramework\Ajax`, `WPDevFramework\Light_Ajax`, `WPDevFramework\Async_Calls` |
| `modal` | `Modal_Service` | `Form_Manager` + `add_wubox()` |
| `form` | `Form_Service` | `WPDevFramework\Managers\Form_Manager` |
| `screen_options` | `Screen_Options_Service` | List table screen options |
| `tour` | `Tour_Service` | `WPDevFramework\UI\Tours` |
| `view` | `View_Service` | `wpdev_get_template()` |

## Usage

```php
// Access a service
wpdev_services( 'ajax' )->listen( 'my_action', function () {
    wpdev_services( 'ajax' )->respond_success( array( 'ok' => true ) );
} );

// Register a modal form (legacy API preserved)
wpdev_services( 'form' )->register( 'my_modal', array(
    'title'   => 'Edit Item',
    'handler' => 'my_handler',
) );

// Render a view
wpdev_view( 'base/list', array( 'title' => 'Items' ) );
```

## Canonical paths (2.5.0)

| Layer | Path |
|-------|------|
| `WPDevFramework\Helpers\*` | `src/helpers/` (+ `validation-rules/`) |
| `WPDevFramework\Objects\*` | `src/objects/` |
| `WPDevFramework\Managers\Form_Manager` | `src/form/` |
| `WPDevFramework\API\*` / `WPDevFramework\Apis\*` | `src/api/` (schemas under `src/api/schemas/`) |
| `WPDevFramework\Compat\*` | `src/compat/` |
| `WPDevFramework\Traits\*` | `src/traits/` |
| `WPDevFramework\Installers\*` | `src/installers/` |
| `WPDevFramework\Loaders\*` | `src/loaders/` |
| `WPDevFramework\Contracts\*` | `src/contracts/` |
| Root plugin classes (`Cron`, `Scripts`, `Logger`, …) | `src/class-*.php` |
| Procedural helpers | `src/functions/` (`wpdev_public_function_map()`) |
| Bootstrap loaders | `src/legacy/load-public-apis.php`, `load-extra-components.php`, `load-managers.php` |
| `WPDevFramework\Country\*` + city repositories | `src/country/` |

Phase 2.9 removed all `inc/**/*.php` shims; load via `Legacy_Shim_Autoloader` and `wpdev_require_public_function()`.

## Module loader

Modules declare themselves in `setup.php`:

```php
use WPDevFramework\Core\Module_Loader;

Module_Loader::register( 'my-module', array(
    'path'         => __DIR__,
    'dependencies' => array( 'core', 'field-builder' ),
) );
```

Load order is resolved automatically by `Module_Loader::load_all()`.

## Lifecycle hooks

- `wpdev_init` — early setup
- `wpdev_load` — after requirements met
- `wpdev_register_forms` — modal/ajax forms
- `wpdev_admin_pages` — admin pages
- `wpdev_modules_loaded` — all modules loaded

## Tour guide (admin walkthrough)

The core module includes a Shepherd-based tour service. Any module can register a guided tour
for admin pages (for example dashboard onboarding or contextual help modals).

### Public entrypoint

Use:

```php
wpdev_create_tour( string $id, array $steps = [], bool $once = true );
```

- `$id`: unique tour id per flow/page.
- `$steps`: Shepherd step definitions (see step schema below).
- `$once`: when `true` (default), tour is shown once per user and persisted in user settings.

### Where to register tours

Register tours before admin header rendering. Recommended places:

- inside admin page callbacks/hooks during page load
- inside module hooks that run before `in_admin_header`

Avoid late calls after `in_admin_header`; late registration is ignored by design.

### Step schema

Each step supports Shepherd fields plus WPDev conventions used in production:

- `id` (string): step id.
- `title` (string): step title.
- `text` (string|array): message body. Arrays are joined into paragraphs automatically.
- `attachTo` (array): optional target and position:
  - `element` (CSS selector)
  - `on` (`top`, `bottom`, `left`, `right`, ...)
- `buttons` (array): optional CTA buttons:
  - `text`, `classes`, `url`, optional `target`
  - WPDev auto-converts `url` to click action.

WPDev automatically appends a primary next/finish button to each step.

### Minimal example

```php
wpdev_create_tour(
	'my_module_intro',
	array(
		array(
			'id'    => 'intro',
			'title' => __( 'Welcome', 'wpdev' ),
			'text'  => array(
				__( 'This page helps you configure your module.', 'wpdev' ),
				__( 'Follow these quick steps to get started.', 'wpdev' ),
			),
		),
		array(
			'id'       => 'filters',
			'title'    => __( 'Filters', 'wpdev' ),
			'text'     => __( 'Use this area to narrow results.', 'wpdev' ),
			'attachTo' => array(
				'element' => '#dashboard-filters',
				'on'      => 'bottom',
			),
			'buttons'  => array(
				array(
					'classes' => 'button wpdev-text-xs',
					'text'    => __( 'Open docs', 'wpdev' ),
					'url'     => 'https://help.wpdev.ir/',
					'target'  => '_blank',
				),
			),
		),
	),
	true
);
```

### Behavior and controls

- Completion is persisted via AJAX action `wpdev_mark_tour_as_finished`.
- Once completed, the same tour id is skipped for that user when `$once = true` (stored in user meta `wpdev_tour_{id}`).
- Global hide switch: setting `hide_tours` disables all tours.
- Override completion logic with:
  - filter `wpdev_tour_finished( bool $finished, string $id, int $user_id )`.

### Real references in codebase

- `modules/admin-custom-page/class-top-level-admin-page.php` (`wpdev-dashboard` tour)
- `wpdev-examples/products/src/admin/class-product-edit-admin-page.php` (`new_product_warning` tour; requires **wpdev-examples** plugin)
