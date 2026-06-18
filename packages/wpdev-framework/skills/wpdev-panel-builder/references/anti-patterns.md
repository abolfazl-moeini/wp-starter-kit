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