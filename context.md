# wp-starter-kit — AI agent context

> **Primary orientation file for agents** working in this repository (and on plugins
> scaffolded from it). Prefer this document over stale chat memory.
>
> Companion maps: `STRUCTURE.md` (folder map), `CLAUDE.md` (commands), `docs/index.md`
> (human docs), `skills/` (playbooks for modular PHP/JS).

---

## 1. What this project is

**wp-starter-kit** is a **WordPress plugin starter kit + installer**:

1. **Kit monorepo** — build pipeline, shared packages, tests, CLI, docs.
2. **Scaffold engine** — `wpdev create` / `add` / `remove` / `update` / `doctor` generates
   consumer plugins shaped by a **feature set**.
3. **Reference plugin** — this repo itself boots as `wpdev-starter` and hosts
   example modules used as templates.

Goals for generated plugins:

- **Modular monolith** — features as PHP modules + co-located JS entries.
- **Config-driven branding** — never hardcode slug/prefix; use `wpdev.json`.
- **TDD** — Jest (JS/CLI/scaffold) + PHPUnit (PHP).
- **Modern JS** — TypeScript, esbuild, Preact (default) or React.
- **Modern PHP source** — write ≥8.1; release can target 7.4 via Rector.
- **Safe distribution** — Strauss/php-scoper vendor scoping at release (no shared Composer across plugins).
- **Optional stacks** — Polaris UI, Abilities API (MCP surface via separate adapter), fault-tolerance, WPDev Admin Framework as soft-dep.

**Not in scope (removed / avoided):**

- Blockstudio / `blocks` feature (fully removed; no `companion-plugins` clone of blocks).
- Vendoring WPDev Admin Framework into `companion-plugins/` (soft-dep + admin notice only).
- Deep relative JS imports like `../../../../polaris` (use package names).

---

## 2. Repo identity

| Item                          | Value                                                   |
| ----------------------------- | ------------------------------------------------------- |
| Package name                  | `@wpdev/starter` (`package.json`)                       |
| Plugin bootstrap (kit itself) | `wpdev-starter.php`                                     |
| Config source of truth        | `wpdev.json` (branding + optional `features` + `build`) |
| Module runtime for consumers  | `packages/framework` → Composer PSR-4 `WPDev\`          |
| Installer engine              | `packages/create-wp-project/`                           |
| CLI                           | `packages/cli/` (`wpdev` binary)                        |
| Project agent skills          | `skills/wpdev-php-modules`, `skills/wpdev-js-modules`   |

This path **is** the kit root (`…/wp-starter-kit/`). Parent `extend-kit/` may hold other products; **default edit surface is this directory**.

---

## 3. High-level architecture

```text
wp-starter-kit/
├── wpdev-starter.php          # Kit plugin bootstrap
├── wpdev.json                 # Branding + build + (optional) features
├── src/                       # Kit’s own modules (ExampleFeature, …)
│   └── Modules/{Feature}/     # PHP feature + assets/entries/*.ts(x)
├── packages/
│   ├── framework/             # Core + Support runtime (shipped into consumers)
│   ├── create-wp-project/     # Scaffold / add / remove / migrate / doctor
│   ├── cli/                   # wpdev CLI UX
│   ├── polaris-stack/         # Design system (often git submodule)
│   ├── mcp-integration/       # Abilities API library
│   ├── php-fault-tolerance/   # Real/Stub dual-mode FT
│   ├── plugin-core-test/      # PHPUnit bases for consumers
│   ├── hooks, utils, rest-utils, html-utils, ui-components, …
│   └── wpdev-framework/       # WPDev Admin Framework SOURCE (reference only)
├── core/packages/build/       # esbuild CLIs (deps, components, styles, assets)
├── assets/bundles/            # Build outputs + .asset.php sidecars
├── skills/                    # Agent skills for modular PHP/JS
├── docs/                      # Human documentation
├── tests/                     # Jest + PHPUnit
└── dev/                       # Rector, release helpers, Strauss-related
```

### Two “products” in one tree

| Audience                       | What they use                                                       |
| ------------------------------ | ------------------------------------------------------------------- |
| **Kit developers**             | Full monorepo, generators, CI, docs                                 |
| **Plugin authors (consumers)** | Output of `wpdev create` — subset of packages + their `src/Modules` |

When generating, **do not assume** consumers have kit-only paths (e.g. full `packages/cli`).

---

## 4. Config: `wpdev.json`

Single branding/runtime source of truth (kit + consumers after scaffold):

| Field                                | Purpose                                                     |
| ------------------------------------ | ----------------------------------------------------------- |
| `slug`                               | Plugin slug, file names, bundle prefixes                    |
| `globalName`                         | JS global on `window` (deps IIFE)                           |
| `localizeVar`                        | `wp_localize_script` object name                            |
| `textDomain`                         | i18n                                                        |
| `hookPrefix`                         | Custom actions/filters prefix                               |
| `npmScope`                           | Internal npm scope (e.g. `@wpdev`)                          |
| `depsBundle`                         | Deps bundle filename (`{slug}-deps.js`)                     |
| `phpFunctionPrefix`                  | PHP function prefix                                         |
| `uiFramework`                        | `preact` \| `react` (derived from `jsLib` when scaffolding) |
| `restNamespace`                      | REST namespace (e.g. `wpdev/v1`)                            |
| `batchEndpoint`                      | Batch path for rest-utils                                   |
| `vendorPrefix`                       | Strauss prefix for release                                  |
| `phpMinVersion` / `phpSourceVersion` | Platform / Rector                                           |
| `build.assetMappings`                | Copy node dist → `assets/libraries`                         |
| `build.globalMappings`               | esbuild import → global maps                                |
| `build.styleEntryPoints`             | CSS entries                                                 |
| `features`                           | Feature set on consumers (`{ id: variant }`)                |
| `schema` / `kitVersion` / `distMode` | Manifest fields on consumers                                |

**Rule:** Never hardcode branding strings in new modules; read config / generated constants.

---

## 5. Feature catalog (installer)

Source of truth: `packages/create-wp-project/src/features.js`
(`getFeatureCatalog()`, `defaultFeatures()`, `validateFeatureSet()`, `normalizeFeatureSet()`).

| Feature id       | Variants (typical)                       | Notes                                                             |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `js`             | `typescript` / `pure` / `flow` / `none`  | JS pipeline                                                       |
| `jsLib`          | `none` / `preact` / `react`              | Requires `js ≠ none` for real libs                                |
| `jsTest`         | `jest` / `vitest` / `none`               |                                                                   |
| `phpMinVersion`  | `7.4`…`8.3`                              |                                                                   |
| `phpFramework`   | `none` / `wpdev`                         | Soft-dep; **no** companion-plugins; admin notice in main file     |
| `phpTest`        | `phpunit` / `none`                       |                                                                   |
| `phpUnitDocker`  | `off` / `on`                             | Needs phpunit                                                     |
| `e2eTest`        | `none` / `playwright`                    | Opt-in; Playwright + wp-env under `tests/e2e/` (`full` preset on) |
| `restBatch`      | `off` / `on`                             | Needs `js ≠ none`                                                 |
| `faultTolerance` | `on` / `off`                             | Default **on**; dual-mode Real/Stub (no force-off on PHP 7.4)     |
| `vendorScoping`  | `on` / `off`                             |                                                                   |
| `husky`          | `on` / `off`                             |                                                                   |
| `css`            | `none` / `sass` / `tailwind` / `postcss` | Needs js; polaris ⊕ tailwind conflict                             |
| `license`        | `gpl2` / `gpl3` / `mit`                  | MIT → warning for .org                                            |
| `wpMinVersion`   | `6.0`…                                   |                                                                   |
| `exampleFeature` | `on` / `off`                             | Canonical module demo                                             |
| `i18n`           | `on` / `off`                             |                                                                   |
| `frontendStack`  | `none` / `polaris`                       | Needs typescript + preact\|react                                  |
| `mcpAbilities`   | `off` / `on`                             | WP 6.9+ runtime warning                                           |
| `ci`             | `auto` / …                               |                                                                   |

**Adding a feature id is a contract change** — update catalog, generator, tests, docs.

Presets: `minimal`, `standard` (default for `--yes`), `full`, `woocommerce` in `presets.js`.

---

## 6. PHP modular system

### 6.1 Runtime location

- **Consumers:** `packages/framework/src/` autoloaded as `WPDev\`.
- **Kit tree:** also has `src/Core`, `src/Support`, `src/Modules` for dogfooding; prefer treating **`packages/framework`** as the canonical runtime for generated projects.

Namespaces:

- `WPDev\Core\` — `Plugin`, `ModuleLoader`, `ModuleInterface`, `AbstractModule`
- `WPDev\Support\` — Rest, Shortcodes, WpCli, Assets, Queue, Templates, AccessManager, Auth
- `WPDev\Adapters\` — `WpdevModuleAdapter` (phpFramework:wpdev)
- `{Vendor}\Modules\{Feature}\` — consumer feature code under `src/Modules/`

### 6.2 Module contract

Every feature implements `ModuleInterface`:

- `get_slug(): string` — **stable public id** (do not rename after release)
- `boot(): void` — register hooks/setup only; keep thin
- Optional: extend `AbstractModule` and override `should_boot()`

Canonical layout:

```text
src/Modules/{Name}/
├── Module.php
├── Rest/                 # RestHandler subclasses
├── Cli/                  # WP-CLI Command subclasses
├── Shortcodes/           # Shortcode subclasses
├── Access/               # AccessManager blueprints
├── Queue/                # DeferredCall wiring
├── Templates/            # PHP views
└── assets/entries/       # JS entries (see §7)
```

Reference: `src/Modules/ExampleFeature/` + generator templates in `create-wp-project`.

### 6.3 Registration lifecycle

1. Bootstrap `{slug}.php`: PHP version gate, constants, Composer autoload, `Plugin::boot()` on `plugins_loaded` @10.
2. `composer.json` **`autoload.files`** load thin `src/*-register.php` scripts that call `Plugin::loader()->register(new Module())` (often @5).
3. Loader boots modules (~@11). Call `Plugin::set_plugin_dir()` / `Assets::set_plugin_dir()` so paths resolve from plugin root.

**Critical:** After changing `autoload.files` or deleting register PHP, run:

```bash
composer dump-autoload -o
```

Stale `vendor/composer/autoload_files.php` causes fatals (e.g. missing `blocks-register.php` after feature removal). Kit `addFeature`/`removeFeature` best-effort dump; `wpdev doctor` flags missing/stale maps.

### 6.4 Support APIs (use these — do not reinvent)

| API                             | Purpose                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `RestSetup` + `RestHandler`     | REST routes, permissions, batch — **not** raw `register_rest_route` in modules     |
| `ShortcodesSetup` + `Shortcode` | Frontend shortcodes + lazy enqueue — **not** bare `add_shortcode` for kit patterns |
| `CliSetup` + `Command`          | WP-CLI — **not** bare `WP_CLI::add_command` in modules                             |
| `Assets`                        | Register/enqueue `assets/bundles/*` + localize                                     |
| `DeferredCall`                  | Queue work before/after hooks (uncertain boot order)                               |
| `Template`                      | PHP partials                                                                       |
| `UserAccess` / `BluePrint`      | Declarative capability rules                                                       |
| `CapabilityPolicy`              | REST/admin access helpers                                                          |
| `WpdevModuleAdapter`            | Soft attach when WPDev Admin Framework present                                     |

### 6.5 phpFramework:wpdev

- Soft dependency on **site-installed** WPDev Admin Framework plugin.
- Scaffold: `FrameworkBridge`, demo module, `Requires Plugins: wpdev`, **admin notice in main plugin file** if inactive.
- **Does not** create `companion-plugins/` or auto-submodule.
- Reserves prefixes `hookPrefix=wpdev` and `phpFunctionPrefix=wpdev_` for the framework (validation error if consumer reuses them).

### 6.6 Other PHP packages

| Package                        | Role                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `packages/php-fault-tolerance` | Dual Real (≥8.1) / Stub; mirrored into consumers with Composer `symlink: false` (Docker-safe)   |
| `packages/mcp-integration`     | Abilities API (not MCP transport); WP 6.9+                                                      |
| `packages/plugin-core-test`    | PHPUnit bases for consumers                                                                     |
| `packages/wpdev-framework`     | Full admin framework source (kit reference / submodule area) — not default consumer vendor path |

Agent playbook: **`skills/wpdev-php-modules/SKILL.md`**.

---

## 7. JS modular system + build

### 7.1 Entry discovery

esbuild **components** stage globs:

- `src/Modules/*/assets/entries/*.ts`
- `src/Modules/*/assets/entries/*.tsx` (JSX / automatic runtime)
- Legacy: `**/script.js` (avoid for new work)

Output:

```text
src/Modules/ExampleFeature/assets/entries/admin.ts
  → assets/bundles/ExampleFeature-admin.js
  → ExampleFeature-admin.asset.php
```

PHP enqueues via `Assets` using the same relative path. **Name must match.**

### 7.2 Four build stages

| Stage        | Command surface      | Output                                       |
| ------------ | -------------------- | -------------------------------------------- |
| dependencies | `build:dependencies` | `assets/bundles/{depsBundle}` + asset.php    |
| components   | `build:components`   | Module entry bundles                         |
| styles       | `build:styles`       | CSS + hash sidecars                          |
| assets       | `build:assets`       | `assetMappings` copies to `assets/libraries` |

```bash
npm run dev       # watch
npm run build     # parallel stages
npm run release   # production build entry used in kit
```

Ignores when discovering entries: `dist/`, `**/node_modules/**`, `examples/`, `tests/`, `assets/`.

### 7.3 Imports — package names only

**Forbidden:**

```ts
import "../../../../polaris/styles.css";
```

**Required:**

```ts
import "@wpdev/polaris-stack/styles.css";
import { Stack, Button, setPolarisTheme } from "@wpdev/polaris-stack";
```

Consumer Polaris: files under **`src/polaris/`** with local `package.json` name `@wpdev/polaris-stack` and `file:src/polaris` dependency. esbuild aliases (`getProjectAliases` / `getBuildAliases` in `core/packages/build/getJsxOptions.js`) resolve when `src/polaris` exists. tsconfig paths: `@/*` → `src/*`, polaris package paths.

### 7.4 JS packages

| Package                | Role                                  |
| ---------------------- | ------------------------------------- |
| `@wpdev/hooks`         | Actions/filters bridge to deps bundle |
| `@wpdev/utils`         | `localize.api()` REST url/nonce       |
| `@wpdev/rest-utils`    | Batch fetch / cache                   |
| `@wpdev/html-utils`    | DOM helpers                           |
| `@wpdev/ui-components` | WDForm etc.                           |
| `@wpdev/fetch`         | Deprecated shim → rest-utils          |
| `@wpdev/translation`   | i18n tooling                          |
| `@wpdev/rule-engine`   | Client rules                          |
| `@wpdev/polaris-stack` | Design system                         |

### 7.5 Preact / React

- Default: `react` / `react-dom` npm-aliased to `@preact/compat`.
- esbuild also aliases for preact projects.
- JSX: `react-jsx` + `jsxImportSource` preact|react — prefer `.tsx` over `h(...)`.
- Do not use React-only APIs unsupported by Preact compat without checking.

### 7.6 Polaris rules (non-negotiable)

See `packages/polaris-stack/context.md`:

- **Layout** primitives (`Stack`, `Grid`, …) ≠ **style** components (`Button`, `Card`, …).
- No layout props on styled components; wrap with layout for spacing.
- Tokens `--ps-*`; theme via `setPolarisTheme` / `data-theme` — no ThemeProvider.
- Global BEM CSS Path B; import `styles.css` once per page path.
- No runtime CSS-in-JS.

Agent playbook: **`skills/wpdev-js-modules/SKILL.md`**.

---

## 8. Installer / CLI engine

| Command                | Role                                                   |
| ---------------------- | ------------------------------------------------------ |
| `wpdev create`         | Scaffold project from features + branding              |
| `wpdev add` / `remove` | Toggle feature; rewrite owned paths + glue             |
| `wpdev update`         | Plan (read-only) then `--run` migrations               |
| `wpdev doctor`         | Health: features, owned files, composer autoload drift |
| `wpdev info` / `set`   | Inspect / set config-only features                     |

Internals (`packages/create-wp-project/src/`):

| File                                 | Role                                                  |
| ------------------------------------ | ----------------------------------------------------- |
| `features.js`                        | Catalog + validation                                  |
| `generators/*`                       | Emit files per feature                                |
| `manifest.js`                        | Read/write consumer `wpdev.json`                      |
| `addFeature.js` / `removeFeature.js` | Mutate features + dump-autoload                       |
| `refresh-glue.js`                    | Re-emit core-owned package.json / composer / tsconfig |
| `composer-dump.js`                   | Best-effort `composer dump-autoload`                  |
| `migrations/`                        | Versioned upgrade steps                               |
| `plan-update.js`                     | Pure plan JSON (no disk writes)                       |

CLI UX: `packages/cli/`. Wrapper: `npm create @wpdev/plugin@latest` (when published).

**Update is two-phase:** `wpdev update` prints plan; `wpdev update --run` applies.

---

## 9. Vendor scoping & release

- Dev: normal Composer + npm.
- Release dist: Strauss (`extra.strauss` / scripts) + Rector prefix/downgrade (`dev/rector-*.php`; consumers get them via scaffold / migration `2.2.0`; `release:dist` downgrades `dist/`).
- **Never** ship plugins that depend on another plugin’s `vendor/` for class resolution.
- `platform-check` often disabled; runtime PHP gate lives in main plugin file.

Release-ish commands (kit):

```bash
npm run release
composer scope:vendor    # post-install often runs strauss
# full prefix pipeline as documented in docs/vendor-scoping.md
```

---

## 10. Testing & verification

```bash
# Setup
npm install && composer install
# If host PHP > composer platform:
# composer install --ignore-platform-req=php --no-scripts

# JS / scaffold / CLI
npm test
npx jest tests/packages/addFeature.test.js

# PHP
composer test
./vendor/bin/phpunit tests/phpunit/Core/

# Quality
npm run typecheck
npm run lint:js
npm run check
composer validate:phpstan   # when configured
composer validate:cs
```

Locations:

- Jest: `tests/**/*.test.[jt]s` (packages, cli, build, …)
- PHPUnit: `tests/phpunit/`
- CI: `.github/workflows/ci.yml` (tests, lint, build, installer e2e)

**TDD:** fail → implement → refactor. Feature/generator changes require package tests.

---

## 11. Security baseline (WordPress)

Every agent-written feature must:

- Capability checks on admin + REST `permission_callback`
- Nonces on state-changing forms/ajax
- Sanitize inputs; escape outputs
- `$wpdb->prepare` for SQL
- No secrets in repo; no eval of user content

---

## 12. Commands cheat sheet

```bash
# Dev
npm run dev
npm run build

# Scaffold (from kit)
npm run scaffold
# or
node packages/cli/bin/wpdev.js create /path/to/plugin --yes

# Feature toggle on a consumer
node packages/cli/bin/wpdev.js add phpFramework --variant wpdev --yes
node packages/cli/bin/wpdev.js remove exampleFeature --yes
node packages/cli/bin/wpdev.js doctor /path/to/plugin

# Health of kit
npm run doctor
npm test && composer test
```

Examples:

```bash
wpdev create my-plugin --js=typescript --js-lib=preact --frontend-stack=polaris --yes
wpdev create my-plugin --php-framework=wpdev --hook=acme --php-fn=acme_ --yes
wpdev create my-plugin --js=none --mcp-abilities=on --yes
```

---

## 13. Documentation map

| Need                | Where                                            |
| ------------------- | ------------------------------------------------ |
| Docs index          | `docs/index.md`                                  |
| Architecture        | `docs/architecture.md`                           |
| Features + manifest | `docs/features-and-manifest.md`                  |
| Module how-to       | `docs/module-guide.md`                           |
| Build outputs       | `docs/build-outputs.md` / `docs/build-system.md` |
| WPDev adapter       | `docs/wpdev-adapter.md`                          |
| Vendor scoping      | `docs/vendor-scoping.md`                         |
| Fault tolerance     | `docs/fault-tolerance.md`                        |
| Polaris agent rules | `packages/polaris-stack/context.md`              |
| MCP / Abilities     | `packages/mcp-integration/context.md`            |
| PHP modules skill   | `skills/wpdev-php-modules/SKILL.md`              |
| JS modules skill    | `skills/wpdev-js-modules/SKILL.md`               |
| Folder map          | `STRUCTURE.md`                                   |
| Command list        | `CLAUDE.md`                                      |

---

## 14. Hard rules for AI agents

1. **Orient here first**, then `STRUCTURE.md` / relevant `docs/` / `skills/*` for deep work.
2. **Edit this kit** unless the user points at a consumer path (e.g. nikamooz-sample).
3. **TDD** for behavior changes; update scaffold tests when generators change.
4. **Config-driven** branding — no hardcoded slugs/prefixes in new code.
5. **Modules** for features — not fat bootstrap files.
6. **Support APIs** for REST/CLI/shortcodes/assets — no bypass patterns in feature modules.
7. **JS entries** only under `src/Modules/*/assets/entries/*.{ts,tsx}` for discovery.
8. **Package-name imports** for Polaris and `@wpdev/*` — never deep relative climbs.
9. **composer dump-autoload** after autoload.files changes; never leave stale vendor maps.
10. **No Blockstudio / no companion-plugins** recreation for phpFramework.
11. **phpFramework=wpdev** must not use reserved `wpdev` / `wpdev_` prefixes.
12. **Polaris** layout ≠ style; see polaris context.
13. **Security** always (caps, nonces, sanitize, escape, REST permissions).
14. **Scoped vendors** for distributed plugins — no cross-plugin Composer runtime.
15. Prefer **project skills** under `skills/` when implementing modular PHP/JS.

---

## 15. Glossary

| Term                   | Meaning                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Feature set            | Map `{ featureId: variant }` shaping scaffold output                                          |
| Generator              | Emits owned files for a feature (`packages/create-wp-project/src/generators/`)                |
| Glue                   | Core-owned files refreshed after feature toggle (`package.json`, `composer.json`, `tsconfig`) |
| `.asset.php`           | Sidecar: `dependencies`, `hash`, `internal_packages` for WP enqueue                           |
| deps bundle            | Shared IIFE (`depsBundle`) with hooks/globals                                                 |
| Module entry           | `src/Modules/{Name}/assets/entries/{entry}.ts(x)`                                             |
| Soft-dep               | Runtime optional dependency (notice if missing; no hard fatal required)                       |
| Strauss                | Namespace prefixing of Composer vendor for safe multi-plugin installs                         |
| Rector                 | PHP rewrite: downgrade / prefix for release                                                   |
| dual-mode FT           | php-fault-tolerance Real on 8.1+, Stub no-op below                                            |
| `@wpdev/polaris-stack` | Design system package name (kit package or consumer `src/polaris`)                            |

---

## 16. Anti-patterns (quick ban list)

| Do not                                       | Do instead                                        |
| -------------------------------------------- | ------------------------------------------------- |
| Feature logic in `{slug}.php`                | `src/Modules/{Name}/Module.php`                   |
| `register_rest_route` in module boot         | `RestSetup::register`                             |
| `../../../../polaris` imports                | `@wpdev/polaris-stack`                            |
| Recreate `companion-plugins/wpdev`           | Soft-dep + main-file notice                       |
| Add Blockstudio feature                      | Removed permanently                               |
| Skip dump-autoload after files list change   | Always dump                                       |
| Hardcode `wpdev` brand strings in generators | `wpdev.json` / template vars                      |
| Giant shared `helpers.php`                   | Module-private services or Support only if shared |

---

_Last aligned with kit architecture: modular framework package, soft-dep phpFramework, Polaris package imports, fault-tolerance dual-mode, Blockstudio removed, agent skills under `skills/`._
