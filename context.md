# extend-kit — Project Context

> Reference document for AI agents working on the WordPress plugin starter kit.
> Read `STRUCTURE.md` first for the folder map and editing boundaries.

---

## 1. Product Goal

Build a reusable **WordPress plugin starter kit / boilerplate** for modern modular plugin development.

The starter supports:

- **Modular monolith** — self-contained feature modules in PHP and JS.
- **TDD workflow** — PHPUnit (147 tests) and Jest (986 tests).
- **Modern JS** — TypeScript, esbuild, Preact/React switch via `uiFramework`.
- **Modern PHP** — source at PHP 8.1+, Rector downgrades for release target (default 7.4).
- **Composer in dev, scoped vendors in dist** — Strauss / php-scoper pipeline.
- **CLI installer** — `wpdev` scaffolds projects, adds/removes features, runs migrations.
- **Build pipeline** — four-stage esbuild (dependencies, components, styles, asset copy).
- **Optional packages** — REST batch fetch, fault tolerance, Gutenberg blocks, i18n, patches.

The implementation lives in `wp-starter-kit/`. Former research folders and plan documents have been removed after porting.

---

## 2. Repository Layout

```text
extend-kit/
├── context.md          # This file
├── STRUCTURE.md        # Folder map + agent rules
└── wp-starter-kit/     # Main project — edit here
```

---

## 3. wp-starter-kit — Architecture

### 3.1 Config (source of truth)

**`project.config.json`** drives branding and runtime behaviour:

| Field                                | Example                 | Purpose                                |
| ------------------------------------ | ----------------------- | -------------------------------------- |
| `slug`                               | `wpdev-starter`         | Plugin slug, bundle prefixes           |
| `globalName`                         | `WPSK`                  | JS global on `window`                  |
| `localizeVar`                        | `WPSKLoc`               | `wp_localize_script` global name       |
| `textDomain`                         | `wpdev-starter`         | i18n text domain                       |
| `hookPrefix`                         | `wpdev`                 | Custom action/filter prefix            |
| `npmScope`                           | `@wpdev`                | Internal npm package scope             |
| `depsBundle`                         | `wpdev-starter-deps.js` | Main dependencies bundle filename      |
| `restNamespace`                      | `wpdev/v1`              | REST API namespace                     |
| `batchEndpoint`                      | `/batch/v1`             | REST batch endpoint for `@wpdev/fetch` |
| `vendorPrefix`                       | `WpskVendor`            | Strauss namespace prefix               |
| `uiFramework`                        | `preact`                | `preact` or `react`                    |
| `phpMinVersion` / `phpSourceVersion` | `7.4` / `8.1`           | Rector targets                         |

**`build.config.json`** — `globalMappings`, `assetMappings`, `styleEntryPoints`.

Org name for esbuild: `ROOT_NAME` env or root `package.json` `name` → `getOrgNameSync()`.

### 3.2 PHP module system

```
src/Core/Plugin.php          → boots plugin, loads modules
src/Core/ModuleLoader.php    → discovers and registers modules
src/Core/ModuleInterface.php → contract for feature modules
src/Modules/ExampleFeature/  → reference module (REST + admin TS entry)
src/Support/                 → REST, queue, shortcodes, assets, auth
```

Consumer projects can depend on `wpdev/framework` (`packages/framework/`) instead of copying `src/`.

### 3.3 JS packages

| Package                 | Role                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `@wpdev/hooks`          | Re-export global hooks from deps bundle                        |
| `@wpdev/utils`          | localize, form helpers                                         |
| `@wpdev/rest-utils`     | REST client + hook dispatch                                    |
| `@wpdev/html-utils`     | DOM helpers, `elementProps`                                    |
| `@wpdev/ui-components`  | Shared UI                                                      |
| `@wpdev/fetch`          | Debounced REST batch client (TypeScript)                       |
| `@wpdev/translation`    | i18n pipeline tooling                                          |
| `@wpdev/rule-engine`    | Declarative validation rules                                   |
| `@wpdev/polaris-stack`  | CSS-variable design foundation (layout/style separation)       |
| `wpdev/mcp-integration` | WordPress Abilities API registration (abilities only, not MCP) |

Build workspaces under `core/packages/build/` produce `assets/bundles/`.

### 3.3.1 Polaris Stack (optional)

`packages/polaris-stack/` — self-contained design system with CSS custom properties, global BEM CSS (Path B), layout primitives (`Stack`, `Grid`, …), and basic styled components (`Button`, `Card`, …).

See `packages/polaris-stack/context.md` (and README.md) for full details and agent rules.

Enable via installer:

```bash
wpdev create my-plugin --js=typescript --js-lib=preact --frontend-stack=polaris --yes
```

Requires `js=typescript` and `jsLib=react|preact`. Incompatible with `css=tailwind` in v1. Generated projects get `src/polaris/` + `src/Modules/PolarisDemo/`.

### 3.3.2 MCP Integration (optional)

`packages/mcp-integration/` — self-contained Composer library (`wpdev/mcp-integration`) that registers WordPress Abilities API abilities. A separate MCP Adapter plugin exposes them as MCP tools; this package does **not** implement MCP servers or transports.

See `packages/mcp-integration/context.md` (and README.md) for full details and agent rules.

Enable via installer:

```bash
wpdev create my-plugin --js=none --mcp-abilities=on --yes
```

PHP-only — no JS pipeline required. Requires WordPress 6.9+ at runtime (installer warns; library shows admin notice when API is missing). Generated projects get a vendored copy under `src/Mcp/` + `src/Modules/McpAbilities/`.

### 3.3.3 Blockstudio blocks (optional)

The `blocks` feature (`blocks:on`) scaffolds [Blockstudio 7](https://blockstudio.dev) — PHP-first Gutenberg blocks with field definitions in `block.json`. No JS build step required; works with `js:none`.

Enable via installer:

```bash
wpdev create my-plugin --blocks=on --yes
wpdev add blocks
wpdev remove blocks
```

Requires **PHP 8.2+** at runtime for Blockstudio vendor code (installer warns when `phpMinVersion < 8.2`; Rector downlevels plugin source only). Generated projects get `blockstudio.json`, `blockstudio/example-hero/`, `src/Modules/Blocks/Module.php`, and `src/blocks-register.php`. See `wp-starter-kit/docs/blocks.md` and `docs/blocks-blockstudio.md`.

### 3.3.4 WPDev Admin Framework (optional, companion plugin)

The `phpFramework` feature (`phpFramework:wpdev`) scaffolds the vendored WPDev Admin Framework as a **companion plugin** at `companion-plugins/wpdev/`. The generated plugin bridges kit modules via `WpdevModuleAdapter::attach()` and includes a `WpdevDemo` reference module.

```bash
wpdev create my-plugin --php-framework=wpdev --hook=acme --php-fn=acme_ --yes
```

When enabled, the project **must not** use `hookPrefix=wpdev` or `phpFunctionPrefix=wpdev_` (hard validation error — the framework owns `wpdev_*`). See `wp-starter-kit/docs/wpdev-adapter.md` and `packages/wpdev-framework/context.md`.

### 3.4 CLI installer (`wpdev`)

| Command                      | Purpose                                            |
| ---------------------------- | -------------------------------------------------- |
| `wpdev create`               | Scaffold new plugin from templates + feature flags |
| `wpdev add` / `wpdev remove` | Toggle features; updates `wpdev-kit.json` manifest |
| `wpdev update`               | Run migrations to newer kit version                |
| `wpdev doctor`               | Validate project health                            |
| `wpdev info`                 | Show manifest + versions                           |

Engine: `packages/create-wp-project/`. CLI front-end: `packages/cli/`.
Wrapper: `npm create @wpdev/plugin@latest`.

See `wp-starter-kit/docs/installer.md` and `docs/features-and-manifest.md`.

### 3.5 Build pipeline

Four parallel stages (`npm run build` / `npm run release`):

1. **dependencies** — `assets/bundles/{slug}-deps.js` + `.asset.php`
2. **components** — `src/Modules/*/assets/entries/*.ts` → `assets/bundles/{Module}-{entry}.js`
3. **styles** — CSS hash sidecars (`.asset.php`)
4. **assets** — copy `node_modules` dist → `assets/libraries` via `assetMappings`

Component discovery ignores `dist/`, `**/node_modules/**`, `examples/`, `tests/`, `assets/`.

### 3.6 Vendor scoping

Release uses Strauss (`strauss.json`) + Rector prefix pipeline (`dev/rector-*.php`, `dev/fix-autoloader.php`). See `docs/vendor-scoping.md`.

Do **not** use a runtime "latest dependency wins" Composer loader in distributed plugins.

### 3.7 Optional backend resilience

`packages/php-fault-tolerance/` — HTTP batch, circuit breaker, retry (PHP 8.1+, opt-in feature flag). See `docs/fault-tolerance.md`.

### 3.8 PHP support libraries (ported)

Reimplemented under `src/Support/` (and `packages/framework/`):

- REST handler abstraction + `AllowBatch` batch responses
- `DeferredCall` queue
- Class-based shortcodes
- `CapabilityPolicy` auth helper

See `docs/php-core-libs.md`, `docs/fetch-batch.md`.

---

## 4. Verification

From `wp-starter-kit/`:

```bash
npm install && composer install   # first-time setup
npm test                          # 110 Jest suites, 986 tests
composer test                     # 147 PHPUnit tests
npm run release                   # full build
npm run check                     # project config validation
npm run typecheck                 # TypeScript
```

CI: `.github/workflows/ci.yml` (test, lint, build, installer job).

---

## 5. Documentation

All detailed docs are in `wp-starter-kit/docs/`. Start at `docs/index.md`.

Key entry points:

| Task                     | Doc                             |
| ------------------------ | ------------------------------- |
| Architecture overview    | `docs/architecture.md`          |
| Scaffold new project     | `docs/installer.md`             |
| Add a module             | `docs/modules.md`               |
| Build system             | `docs/build-system.md`          |
| Feature flags + manifest | `docs/features-and-manifest.md` |
| Upgrade consumer project | `docs/updating-projects.md`     |
| Ship with Composer deps  | `docs/vendor-scoping.md`        |
| Contributing             | `docs/contributing.md`          |

---

## 6. Rules For AI Agents

1. **Edit `wp-starter-kit/` only** unless explicitly told otherwise.
2. **Polaris Stack** implementation lives in `wp-starter-kit/packages/polaris-stack/`. See `packages/polaris-stack/context.md` for agent guidance.
3. **Read `STRUCTURE.md` + relevant `docs/` before large changes.**
4. **TDD first** — add failing test, implement, refactor.
5. **WordPress security** — nonces, caps, sanitize, escape, REST permissions.
6. **Scoped vendors at release** — never rely on cross-plugin Composer resolution.
7. **Config-driven branding** — use `project.config.json`, not hardcoded names.
8. **Module entry glob** — new frontend features go in `src/Modules/{Name}/assets/entries/*.ts`.

---

## 7. Glossary

| Term              | Meaning                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `asset.php`       | PHP sidecar with `dependencies`, `hash`, `internal_packages` for a bundle |
| `importAsGlobals` | esbuild plugin mapping npm imports to WP/global variables                 |
| `wpdev-kit.json`  | Manifest recording enabled features and kit version in generated projects |
| `elementProps`    | Converts HTML `data-*` attributes to component props                      |
| `forceAssets`     | Manual dependency handles added to `.asset.php`                           |
| `assetMappings`   | Config copying `node_modules` dist to `assets/libraries`                  |
