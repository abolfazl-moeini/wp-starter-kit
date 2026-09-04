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
| 19 | Rewriting `require` paths for core WordPress files (e.g. `class-wp-list-table.php`) during closure inlining / standalone packaging, or allowing `Base_List_Table` to be mangled | Keep core WordPress includes (`ABSPATH . 'wp-admin/includes/...'`) intact with safe existence guards, and freeze `Base_List_Table` in public classes (`$frozen_public_classes`) | WordPress core files do not exist inside `FrameworkClosure/`. Replacing core requires with closure-relative paths or mangling `Base_List_Table` causes fatal `Class 'WP_List_Table' not found` when loading list tables in admin or frontend |
| 20 | Hardcoding Persian (Farsi) strings as the source text in gettext functions (`__()`, `_e()`, `esc_html__()`, etc.), or omitting default fallback strings from the POT/PO catalog | Pass pure English source strings to all gettext calls, generate POT via `wp i18n make-pot`, and provide translations in `languages/{domain}-fa_IR.po` + compiled `.mo` | Violates WordPress internationalization standards; prevents multilingual support; untranslated fallback strings in `wpdev_get_setting('key', __('Default', 'domain'))` leak raw English onto frontend components (e.g. `#floating-banner`) when options are unset |
| 21 | Relying solely on `<plugin>/languages/` when stale translation files exist under `wp-content/languages/plugins/` | Synchronize or purge stale `{domain}-{locale}.mo` files from `WP_LANG_DIR . '/plugins/'` during local testing and deployment | WordPress `load_plugin_textdomain()` checks `WP_LANG_DIR . '/plugins/'` *before* the plugin's internal `languages/` directory. A stale global MO file will permanently mask newly compiled plugin translations |