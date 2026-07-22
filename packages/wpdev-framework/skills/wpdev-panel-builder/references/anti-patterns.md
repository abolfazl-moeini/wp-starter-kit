# Anti-patterns (common agent mistakes)

| # | Never do this | Do this instead | Why |
|---|--------------|-----------------|-----|
| 1 | `modules/wpdev-products/` | `@examples/products/` in sibling plugin | Layer separation |
| 2 | `wpdev_register_list_table()` for domain CRUD | `new My_List_Table()` in `List_Admin_Page::table()` | Products pattern |
| 3 | `playground.php` in `@examples/{slug}/` | `@playground/playground-{module}/playground.php` | Boot contract |
| 4 | Guess `wpdev_register_*` signature | Read [api-cookbook.md](api-cookbook.md) entry | Prevents fatal |
| 5 | `WPDev\` namespace in new code | `WPDevFramework\` (match surrounding file) | Autoloader |
| 6 | Call cross-example API without check | `wpdev_example_is_loaded( 'wpdev-{slug}' )` guard | Soft dependency |
| 7 | `require` from `modules/*/src/` | Public `wpdev_*` facade only | API contract |
| 8 | Register widgets before `wpdev_load` | `wpdev_on_load()` or `add_action( 'wpdev_load', ... )` | Lifecycle |
| 9 | Bare `examples/` paths in docs | `@examples/{slug}/` alias | Consistent navigation |
| 10 | Absolute file-system paths | `@framework` / `@examples` / `@playground` | Portable skill |
| 11 | `wpdev-examples/wpdev-products/` folder | `@examples/products/` + module id `wpdev-products` | Naming rule |
| 12 | PHP under `inc/` | `modules/` or `@examples/` only | Legacy artifact |
| 13 | Settings section icon as bare WP `dashicons-*` only | Prefer `dashicons-wpdev-*` for left-nav | Settings chrome renders the class as-is |
| 14 | Settings `repeater` with empty `values` and no `.field-repeater` seed row | Let the framework seed a blank line (or pass one empty row) | “Add new Line” clones the last `.field-repeater`; missing row → `cloneNode` null |
| 15 | Expect settings `repeater` POST to land under the parent slug alone | Assemble `subfield[]` columns in `wpdev_pre_save_settings` | `Settings_Save` does not reshape repeater columns |
| 16 | Many `md:wpdev-w-1/2` fields inside a repeater for a “compact card” | Host CSS Grid (`display: contents` + areas) or stacked full-width | Flex half + gap overflows / sparse column |
| 17 | Call `__( …, 'host-domain' )` while registering settings on `wpdev_load` / `plugins_loaded` | Defer until `init` (after `load_plugin_textdomain`) | WP 6.7 `_load_textdomain_just_in_time` notice |
| 18 | `wpdev_register_plugin_settings_link( …, __( 'Settings', 'host' ) )` on `plugins_loaded` | Register on `init`, or pass empty label | Same JIT notice |