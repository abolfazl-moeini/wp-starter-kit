# WPDev — Framework / Examples / Playground decoupling (AI context)

> **Purpose:** Give AI assistants a single, accurate reference for the **2.8.1+ separation** between the WPDev Framework core plugin, the optional **wpdev-examples** plugin, and the optional **wpdev-playground** plugin.  
> **Audience:** LLMs, code agents, reviewers.  
> **Scope:** Bootstrap ownership, admin menus, path resolution, parity, and regression guards — not a full module inventory.  
> **Path convention:** All paths below are **relative to the framework plugin root** (`wpdev/`), unless noted as sibling plugins under the same `plugins/` directory.

---

## 1. Repository layout (three plugins)

Typical WordPress install:

```text
wp-content/plugins/
├── wpdev/                    ← Framework core (this repo)
├── wpdev-examples/           ← Optional WaaS domain modules (sibling)
└── wpdev-playground/         ← Optional dev sandbox menu (sibling)
```

| Plugin | Entry file | Defines |
|--------|------------|---------|
| Framework | `wpdev.php` | `WPDEV_PLUGIN_FILE`, `WPDEV_PLUGIN_DIR`, … |
| Examples | `../wpdev-examples/wpdev-examples.php` | `WPDEV_EXAMPLES_DIR`, `WPDEV_EXAMPLES_FILE`, `WPDEV_EXAMPLES_URL` |
| Playground | `../wpdev-playground/wpdev-playground.php` | `WPDEV_PLAYGROUND_DIR`, `WPDEV_PLAYGROUND_FILE`, `WPDEV_PLAYGROUND_URL` |

The framework **must boot and remain usable** with only `wpdev` active. Examples and playground are **optional siblings**, not subfolders inside `wpdev/examples/` (that tree was removed in 2.8.0).

---

## 2. Problem we solved

**Before decoupling (≤ 2.8.0):**

- `modules/core/setup.php` booted playground infrastructure when `WPDEV_PLAYGROUND_RUN` was defined.
- The framework scanned `examples/playground-*` or sibling paths for sandbox panels.
- `wpdev_load_examples()` could run from core setup, silently pulling in `../wpdev-examples`.
- Helpers like the removed boolean playground activation helper and `is_plugin_active()` mixed **“is plugin loaded?”** with **“should this code run?”**.
- WaaS modules sometimes registered **both** Framework menus and Playground sandbox panels, causing duplicate or misplaced menus.

**After decoupling (2.8.1+):**

- **Bootstrap ownership** is explicit: each plugin owns its own `plugins_loaded` hook.
- **Runtime gates** use **defined constants** only (`WPDEV_PLAYGROUND_DIR`, `WPDEV_EXAMPLES_DIR`).
- Playground **panel discovery** lives only in `../wpdev-playground/wpdev-playground.php`.
- WaaS **production admin pages** live only under the Framework menu via `../wpdev-examples/includes/`.
- Playground **library code** lives in `../wpdev-playground/includes/`; the framework does **not** boot it or ship playground/examples infrastructure files.

---

## 3. Activation matrix (expected admin UX)

| Active plugins | Framework module menus | WaaS site-admin pages (`wpdev` parent) | Playground menu (`wpdev-playground` + `wpdev-pg-*`) |
|----------------|------------------------|----------------------------------------|-----------------------------------------------------|
| `wpdev` only | Yes | No | No |
| `wpdev` + `wpdev-examples` | Yes | Yes | No |
| `wpdev` + `wpdev-playground` | Yes | No | Yes (core builder sandboxes only) |
| All three | Yes | Yes | Yes (separate top-level menu; no WaaS sandbox duplicates) |

**Menu rules:**

- **Framework** → top-level `wpdev` + builder module submenus (`settings-panel-builder`, `table-builder`, …).
- **Examples** → WaaS CRUD/list pages registered under **`wpdev`** (site admin), not under Playground.
- **Playground** → top-level **`wpdev-playground`** + submenus **`wpdev-pg-{module-id}`** for **core builder demos** in `../wpdev-playground/playground-*/playground.php`.

WaaS modules **must not** ship `../wpdev-examples/{module}/playground.php` sandbox files anymore.

---

## 4. Runtime gates (what to use instead of removed helpers)

### Removed (do not reintroduce)

| Removed API | Why |
|-------------|-----|
| Removed boolean playground activation helper | Replaced by constant gate |
| `WPDEV_PLAYGROUND_RUN` as a PHP constant in runtime | Replaced by activating `wpdev-playground` (CLI may still use env var name for CI — see below) |
| `is_plugin_active( 'wpdev-playground/...' )` for separation | Use `defined( 'WPDEV_PLAYGROUND_DIR' )` |
| Sibling fallbacks `../wpdev-examples`, `../wpdev-playground` inside framework | Plugin entrypoints must define constants |

### Correct gates

```php
// Playground APIs (panels, loader, helpers)
if ( ! defined( 'WPDEV_PLAYGROUND_DIR' ) ) {
    return;
}

// Examples-backed parity / WaaS contract / shim paths
if ( ! defined( 'WPDEV_EXAMPLES_DIR' ) ) {
    return;
}

// Both required for “real production page parity” in playground context
Playground_Parity_Registry::real_pages_enabled(); // internally checks both DIR constants
```

Path helpers (owned by sibling plugins, not the framework):

- `wpdev_playground_dir()` → `../wpdev-playground/includes/functions/playground-paths.php`
- `wpdev_playground_example_helper_path( $id, $file )` → helpers under `../wpdev-playground/playground-{id}/`
- `wpdev_examples_playground_contract_dir()` → `../wpdev-examples/includes/` (when `WPDEV_EXAMPLES_DIR` is set)

There is **no** silent sibling discovery in these helpers.

---

## 5. Bootstrap sequence

### Framework (`modules/core/setup.php`)

Loads autoloaders, registers the `core` module, and exposes admin/page APIs.

**Does not:**

- call `Playground_Loader::init()`
- call `wpdev_load_examples()`
- require `../wpdev-playground/` or `../wpdev-examples/` trees

### Examples (`../wpdev-examples/wpdev-examples.php`)

```text
plugins_loaded @ priority 5
  → wpdev_examples_boot()
       → wpdev_load_examples()          // framework API in modules/core/src/class-examples-loader.php
       → Examples_Shim_Autoloader uses WPDEV_EXAMPLES_DIR
  → requires ../wpdev-examples/includes/waas-contract.php early
```

`waas-contract.php` wires:

- filters for playground domain module lists
- `wpdev_load` @ 6 → `wpdev_examples_register_site_admin_parity_pages()`

### Playground (`../wpdev-playground/wpdev-playground.php`)

```text
plugins_loaded @ priority 4
  → wpdev_playground_boot()
       → require modules/core/src/playground/*   (shared library from framework)
       → Playground_Loader::init()
  → hook wpdev_playground_include_panels
       → glob ../wpdev-playground/*/playground.php
       → include each panel (guarded by WPDEV_PLAYGROUND_FILE in panel files)
```

**Panel discovery hook:** `wpdev_playground_include_panels`  
**Framework loader** (`Playground_Loader::include_playgrounds()`) only fires that action; it does **not** scan directories itself.

---

## 6. Responsibility split

### Framework core (`wpdev/`)

| Owns | Does not own |
|------|----------------|
| Module loader, builders, AJAX, settings, admin page registry | Booting optional plugins |
| Shared playground **library** under `modules/core/src/playground/` | `playground.php` panel files on disk |
| `wpdev_register_admin_page()`, `wpdev_register_playground_panel()` API | WaaS menu registration (examples plugin) |
| `Playground_Contract`, `Playground_Registry`, `Playground_Loader` classes | Scanning `../wpdev-playground` for panels |
| Path helpers in `playground-paths.php` | Examples module trees |

Key library files:

```text
modules/core/src/playground/
├── class-playground-loader.php      # menu + include_playgrounds() → do_action only
├── class-playground-registry.php
├── class-playground-contract.php    # CORE_MODULE_IDS; WaaS lists via filters
├── class-playground-parity-registry.php
├── functions.php                    # wpdev_register_playground_panel()
├── functions-playground.php
└── functions-playground-landing.php
```

### Examples plugin (`../wpdev-examples/`)

| Owns | Does not own |
|------|----------------|
| WaaS domain modules (`products/`, `checkout/`, … each with `setup.php`) | Playground top-level menu |
| Site-admin pages under Framework menu | `playground.php` sandbox panels per module |
| Contract wiring in `includes/` | Booting `Playground_Loader` |

Critical includes:

```text
../wpdev-examples/includes/
├── waas-contract.php              # bootstrap filters + wpdev_load hook
├── waas-playground-module-ids.php # wpdev_playground_domain_module_ids filter
├── waas-parity-slugs.php          # wpdev_playground_parity_page_slug_map filter
└── site-admin-parity-pages.php    # wpdev_register_admin_page() for WaaS lists/edits
```

**Important fix (2.8.3):** `site-admin-parity-pages.php` registers Framework menus whenever `wpdev_register_admin_page()` exists — **not** only when playground parity hooks exist. That way WaaS menus appear when Examples is active but Playground is off.

### Playground plugin (`../wpdev-playground/`)

| Owns | Does not own |
|------|----------------|
| All `playground-*/playground.php` sandbox panels (~13 core builders) | WaaS `wpdev-*` sandbox panels |
| `wpdev_playground_include_panels()` discovery | Parity page class registration under `wpdev` |
| Helper PHP/JS under `playground-{id}/` | `Playground_Contract` core lists (framework) |

Panel files guard execution with:

```php
if ( ! defined( 'WPDEV_PLAYGROUND_FILE' ) ) {
    return;
}
```

Registration uses framework API:

```php
wpdev_register_playground_panel( 'table-builder', [ 'title' => '...', 'type' => 'render', ... ] );
```

`wpdev_register_playground_panel()` returns `false` when:

1. `WPDEV_PLAYGROUND_DIR` is undefined, or
2. `Playground_Parity_Registry::uses_sandbox_panel( $module_id )` is false (WaaS real-page modules when both plugins active).

---

## 7. Parity model (Playground + Examples together)

When **both** `WPDEV_PLAYGROUND_DIR` and `WPDEV_EXAMPLES_DIR` are defined:

- `Playground_Parity_Registry::real_pages_enabled()` is typically **true**.
- WaaS module ids from parity definitions (`wpdev-products`, …) use **production admin pages** under menu parent **`wpdev`**, not sandbox `wpdev-pg-*` panels.
- Core builder modules (`table-builder`, `field-builder`, …) **keep** sandbox panels under **`wpdev-playground`**.

`real_page_module_ids()` includes only module ids starting with `wpdev-` from parity definitions — **not** core builders like `admin-custom-page`.

Slug map and module metadata come from examples filters, not hardcoded framework lists:

- `wpdev_playground_domain_module_ids`
- `wpdev_playground_domain_interactive_module_ids`
- `wpdev_playground_parity_page_slug_map`
- `wpdev_playground_parity_page_definitions`

`Playground_Parity_Registry::init()` is intentionally empty; Framework WaaS menus are registered from examples `includes/`.

---

## 8. Module require, examples paths, and legacy shims

### Central resolver (2.8.4)

All framework code that needs a file inside the examples plugin must use:

```php
wpdev_examples_dir();                           // plugin root, or ''
wpdev_examples_file( 'sites/src/functions/site.php' ); // absolute path, or ''
```

Implementation: `modules/core/src/functions/examples-paths.php` (loaded from `modules/core/setup.php`).

Resolution order matches `Examples_Loader::examples_dir()`:

1. `WPDEV_EXAMPLES_DIR` constant
2. `wpdev_examples_dir` filter
3. Legacy in-plugin `wpdev/examples/` (BC only)

**Multisite sunrise:** `modules/wizard/class-sunrise.php` runs before `plugins_loaded`. If site helpers are required at sunrise, define `WPDEV_EXAMPLES_DIR` in `wp-config.php` (or use the `wpdev_examples_dir` filter from an mu-plugin) so `wpdev_examples_file()` can resolve before the examples plugin entrypoint runs.

Public function loading:

- `modules/core/src/functions/module-require.php` map entries use the `@examples/…` logical prefix.
- `wpdev_resolve_public_function_path()` delegates to `wpdev_examples_file()`.
- `wpdev_require_public_function( 'site' )` etc. remain the public API.

Site duplication:

- `modules/core/src/helpers/class-site-duplicator.php` requires `../wpdev-examples/sites/src/duplication/duplicate.php` **only** via `wpdev_examples_file()`.

Legacy shims:

- `modules/core/src/functions/module-require.php` → `wpdev_resolve_public_function_path()`
- `modules/core/src/class-legacy-shim-autoloader.php` → uses `WPDEV_EXAMPLES_DIR`, not hardcoded sibling paths

Examples autoloading:

- `modules/core/src/class-examples-loader.php` — delegates to `wpdev_examples_dir()`; activated only through `wpdev_load_examples()` from the examples plugin entrypoint

---

## 9. CI / regression env (not runtime)

CLI scripts may still accept **`WPDEV_PLAYGROUND_RUN=1`** as an **environment variable** before WordPress loads.  
`bin/regression-result.php` maps that env to **`WPDEV_PLAYGROUND_DIR`** / **`WPDEV_PLAYGROUND_FILE`** — it does **not** define a runtime `WPDEV_PLAYGROUND_RUN` PHP constant.

Prefer activating the real plugin in integration tests; unit tests use `tests/unit-tests/playground-test-helpers.php`:

- `wpdev_test_activate_playground_plugin( $framework_root )`
- `wpdev_test_register_playground_panel_includes( $framework_root )`

---

## 10. Enforcement (audits & tests)

Run from framework root:

```bash
php bin/audit-playground-separation.php
php bin/audit-playground-contract-sync.php
./vendor/bin/phpunit --filter Playground
```

`bin/audit-playground-separation.php` checks (among others):

- Framework `setup.php` does not boot playground or examples
- `Playground_Loader` delegates to `wpdev_playground_include_panels`
- Playground plugin boots `Playground_Loader::init()`
- No `../wpdev-examples/*/playground.php` sandbox files
- No removed boolean playground activation helper in `playground-paths.php`

Key tests:

```text
tests/unit-tests/Core/PlaygroundIndependenceTest.php
tests/unit-tests/Core/PlaygroundMenuTest.php
tests/unit-tests/Core/PlaygroundParityTest.php
tests/unit-tests/Smoke/PlaygroundSmokeTest.php
tests/unit-tests/playground-test-helpers.php
```

---

## 11. Rules for AI agents

### Do

- Gate playground code with `defined( 'WPDEV_PLAYGROUND_DIR' )`.
- Gate examples-specific paths with `defined( 'WPDEV_EXAMPLES_DIR' )`.
- Add new **core builder** sandboxes under `../wpdev-playground/playground-{id}/playground.php`.
- Add new **WaaS admin pages** via `../wpdev-examples/includes/site-admin-parity-pages.php` (or filtered definitions).
- Extend WaaS playground **metadata** via filters in `../wpdev-examples/includes/`, not hardcoded arrays in framework contract.
- Run separation audits when touching bootstrap, loader, or menu registration.

### Do not

- Re-add the removed boolean playground activation helper, `WPDEV_PLAYGROUND_RUN` PHP constant gates, or `is_plugin_active()` checks for this boundary.
- Boot `Playground_Loader::init()` or `wpdev_load_examples()` from `modules/core/setup.php`.
- Scan sibling directories from framework for playground panels or examples modules.
- Add `playground.php` under `../wpdev-examples/{waas-module}/` for sandbox menus.
- Register WaaS list pages under `wpdev-playground` parent (use Framework `wpdev` parent).
- Put WaaS playground panels in `../wpdev-playground/` (only `playground-*` core demos belong there).

### When fixing menu bugs, check

1. Is `WPDEV_EXAMPLES_DIR` defined? → WaaS pages should register on `wpdev_load` from examples includes.
2. Is `WPDEV_PLAYGROUND_DIR` defined? → Sandbox panels register via `wpdev_playground_include_panels`.
3. Is the module id in `real_page_module_ids()`? → sandbox registration is suppressed for that id when parity is on.
4. Is the module id a **core** builder (`table-builder`, …)? → it should **never** be in `real_page_module_ids()`.

---

## 12. Quick file index

| Concern | Location |
|---------|----------|
| Framework bootstrap | `modules/core/setup.php` |
| Playground path API | `modules/core/src/functions/playground-paths.php` |
| Examples path API | `modules/core/src/functions/examples-paths.php` |
| Register sandbox panel | `modules/core/src/playground/functions.php` |
| Loader (action only) | `modules/core/src/playground/class-playground-loader.php` |
| Parity registry | `modules/core/src/playground/class-playground-parity-registry.php` |
| Contract / core module list | `modules/core/src/playground/class-playground-contract.php` |
| Examples entry | `../wpdev-examples/wpdev-examples.php` |
| WaaS menus + contract | `../wpdev-examples/includes/` |
| Playground entry + discovery | `../wpdev-playground/wpdev-playground.php` |
| Sandbox panel files | `../wpdev-playground/playground-*/playground.php` |
| Separation audit | `bin/audit-playground-separation.php` |
| Test helpers | `tests/unit-tests/playground-test-helpers.php` |
| Original extract plan | `docs/modularization/playground-extract-plan.md` |
| Broader AI context | `docs/modularization/AI-PROJECT-CONTEXT.md` |

---

## 13. Version markers

| Version | Change |
|---------|--------|
| 2.8.0 | Removed in-plugin `examples/` tree; examples become sibling plugin |
| 2.8.1 | Playground extract to sibling plugin; remove framework boot of loader |
| 2.8.3 | WaaS contract in `includes/`; Framework menus independent of playground boot; filters for domain module ids |
| 2.8.4 | `wpdev_examples_dir()` / `wpdev_examples_file()`; sunrise + Site_Duplicator use resolver; `@examples/` map prefix |

When in doubt, trust **`bin/audit-playground-separation.php`** and **`PlaygroundIndependenceTest`** over older docs that mention `WPDEV_PLAYGROUND_RUN` or framework-owned playground boot.
