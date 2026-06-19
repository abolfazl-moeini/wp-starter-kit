# Packages overview

> Where every npm and Composer package lives, what it does, how they depend on
> each other, and where build outputs land. API signatures:
> [api/js-reference.md](api/js-reference.md) (JS) and
> [api/php-reference.md](api/php-reference.md) (PHP).

## Table of contents

- [JavaScript packages](#javascript-packages)
- [PHP packages (Composer)](#php-packages-composer)
- [CLI and scaffold packages](#cli-and-scaffold-packages)
- [Internal and feature-gated packages](#internal-and-feature-gated-packages)
- [Dependency graph](#dependency-graph)
- [Build output locations](#build-output-locations)
- [Workspace layout](#workspace-layout)
- [Publishability contract](#publishability-contract)
- [See also](#see-also)

---

## JavaScript packages

All npm packages use the `@wpdev/*` scope unless noted. Published packages are
enforced by `tests/packages/publishable.test.js`.

| Package            | npm name                                      | Role                                                                  | Publishable | Entry                        | API reference                                                                          |
| ------------------ | --------------------------------------------- | --------------------------------------------------------------------- | ----------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| CLI                | `@wpdev/cli`                                  | `wpdev` binary — create, add, remove, set, update, doctor, info, list | yes         | `bin/wpdev.js`               | [cli-reference.md](cli-reference.md)                                                   |
| Create shim        | `@wpdev/create-plugin`                        | `npm create @wpdev/plugin` wrapper                                    | yes         | `bin/create-wpdev-plugin.js` | [installer.md](installer.md)                                                           |
| Scaffold engine    | `@wpdev/create-wp-project`                    | Templates, features, manifest, migrations                             | yes         | `src/index.js`               | [api/cli-engine-reference.md](api/cli-engine-reference.md)                             |
| Hooks              | `@wpdev/hooks`                                | Config-driven `@wordpress/hooks` accessor on the deps global          | yes         | `index.js`                   | [api/js-reference.md#wpdevhooks](api/js-reference.md#wpdevhooks)                       |
| Utils              | `@wpdev/utils`                                | `localize` REST URL/nonce helpers                                     | yes         | `index.js`                   | [api/js-reference.md#wpdevutils](api/js-reference.md#wpdevutils)                       |
| REST utils         | `@wpdev/rest-utils`                           | REST client, headers, batch submodule                                 | yes         | `index.js`                   | [api/js-reference.md#wpdevrest-utils](api/js-reference.md#wpdevrest-utils)             |
| HTML utils         | `@wpdev/html-utils`                           | `elementProps`, mount helpers, form DOM                               | yes         | `index.js`                   | [api/js-reference.md#wpdevhtml-utils](api/js-reference.md#wpdevhtml-utils)             |
| UI components      | `@wpdev/ui-components`                        | WDForm CRUD components and store                                      | yes         | `index.js`                   | [api/js-reference.md#wpdevui-components](api/js-reference.md#wpdevui-components)       |
| Fetch (deprecated) | `@wpdev/fetch`                                | Re-export shim → `@wpdev/rest-utils/fetch`                            | yes         | `src/index.ts`               | [api/js-reference.md#wpdevfetch-deprecated](api/js-reference.md#wpdevfetch-deprecated) |
| Translation        | `@wpdev/translation`                          | Translation map parse/merge helpers                                   | yes         | `src/index.js`               | [api/js-reference.md#wpdevtranslation](api/js-reference.md#wpdevtranslation)           |
| Rule engine        | `@wpdev/rule-engine`                          | Signal-tuple declarative rules                                        | yes         | `index.js`                   | [api/js-reference.md#wpdevrule-engine](api/js-reference.md#wpdevrule-engine)           |
| Polaris stack      | `@wpdev/polaris-stack`                        | Design system (CSS vars + layout + components)                        | internal    | `src/index.ts`               | [packages/polaris-stack/README.md](../packages/polaris-stack/README.md)                |
| Build              | `@wpdev/build`                                | esbuild four-stage pipeline scripts                                   | yes         | `index.js`                   | [build-system.md](build-system.md)                                                     |
| Deps extraction    | `@wpdev/dependency-extraction-esbuild-plugin` | WordPress deps extraction for esbuild                                 | yes         | `index.js`                   | [build-system.md](build-system.md)                                                     |

### Library package notes

**`@wpdev/hooks`** — Reads the project's `globalName` from `project.config.json`
(via the deps bundle) and returns the `@wordpress/hooks` instance. No standalone
WordPress dependency at import time; the global is populated by
`assets/bundles/{slug}-deps.js`.

**`@wpdev/rest-utils`** — Primary REST surface for admin bundles. The `/fetch`
subpath provides `createBatchRequest` and `createCache` when `restBatch:on`.
See [fetch-batch.md](fetch-batch.md).

**`@wpdev/ui-components`** — Preact-first WDForm utilities. Peer-depends on
`preact` and optionally `@preact/signals`. Gated by `js ≠ none` and a UI lib.

**`@wpdev/translation`** — Pure functions used by the translation CLI and build
scripts. Safe in Node and browser contexts.

**`@wpdev/polaris-stack`** — Not published to npm in v1. Consumed when
`frontendStack:polaris`. Requires `js=typescript` and `jsLib=react|preact`.

---

## PHP packages (Composer)

| Package         | Composer name               | Role                                           | Publishable     | Entry                 | API reference                                |
| --------------- | --------------------------- | ---------------------------------------------- | --------------- | --------------------- | -------------------------------------------- |
| Framework       | `wpdev/framework`           | `WPDev\Core\*`, `WPDev\Support\*`              | yes (Packagist) | `src/Core/Plugin.php` | [api/php-reference.md](api/php-reference.md) |
| Fault tolerance | `wpdev/php-fault-tolerance` | Circuit breaker, HTTP batch resilience         | yes             | `src/functions.php`   | [fault-tolerance.md](fault-tolerance.md)     |
| MCP integration | `wpdev/mcp-integration`     | WordPress Abilities API bridge                 | internal        | `src/Core/Plugin.php` | [mcp-integration.md](mcp-integration.md)     |
| PHP test tools  | `wpdev/php-test-tools`      | PHPUnit/PHPCS/PHPStan dev tooling meta-package | yes             | —                     | [php-test-tools.md](php-test-tools.md)       |

### Framework package notes

**`wpdev/framework`** — The consumer-facing PHP framework. Installed via
Composer (`distMode:deps`) into `vendor/wpdev/framework/`. Provides
`Plugin`, `ModuleLoader`, REST helpers, asset registration, and shortcodes.
Never copy `src/Core/` into consumer projects in new scaffolds.

**`wpdev/php-fault-tolerance`** — Optional resilience layer when
`faultTolerance:on`. Requires PHP 8.1+ at runtime.

**`wpdev/mcp-integration`** — Feature-gated (`mcpAbilities:on`). Registers
abilities on `wp_abilities_api_init`. See [mcp-integration.md](mcp-integration.md).

---

## CLI and scaffold packages

| Package                    | Command / entry            | Consumers           | Key exports                                         |
| -------------------------- | -------------------------- | ------------------- | --------------------------------------------------- |
| `@wpdev/cli`               | `wpdev`                    | End users, CI       | Commander commands in `src/commands/`               |
| `@wpdev/create-plugin`     | `npm create @wpdev/plugin` | End users           | Delegates to `@wpdev/cli`                           |
| `@wpdev/create-wp-project` | Engine (no bin)            | CLI, tests, scripts | `scaffoldProject`, `addFeature`, `doctorProject`, … |

**Data flow**

```
npm create @wpdev/plugin
  → @wpdev/create-plugin (wrapper)
    → @wpdev/cli (parseFlags, prompts, install runners)
      → @wpdev/create-wp-project (generators, manifest, migrations)
```

Flag parsing is centralized in `packages/cli/src/flags.js` (`KNOWN_FLAGS`).
Engine logic never imports Commander — keeping the boundary testable.

---

## Internal and feature-gated packages

| Path                        | Role                                 | Feature gate              | Notes                                                                    |
| --------------------------- | ------------------------------------ | ------------------------- | ------------------------------------------------------------------------ |
| `packages/wpdev-framework/` | WPDev Admin Framework source         | `phpFramework:wpdev`      | Vendored into `companion-plugins/wpdev/`; excluded from consumer PHPStan |
| `packages/mcp-integration/` | Abilities API bridge                 | `mcpAbilities:on`         | Composer path repo in kit; copied into consumer on add                   |
| `packages/polaris-stack/`   | Design system                        | `frontendStack:polaris`   | npm workspace package; not published standalone in v1                    |
| `core/packages/build/`      | Legacy path alias for `@wpdev/build` | always (when `js ≠ none`) | Same code as `packages/build` in some layouts                            |

---

## Dependency graph

### npm (consumer project runtime)

```
@wpdev/hooks          → (provided by deps bundle global)
@wpdev/utils          → (standalone)
@wpdev/rest-utils     → @wpdev/rest-utils/fetch (internal subpath)
@wpdev/fetch          → @wpdev/rest-utils/fetch (deprecated shim)
@wpdev/html-utils     → (standalone)
@wpdev/ui-components  → preact, @preact/signals (peer)
@wpdev/translation    → (standalone)
@wpdev/rule-engine    → (standalone)
@wpdev/polaris-stack  → preact or react (peer)
```

### npm (kit development / CLI)

```
@wpdev/cli
  → @wpdev/create-wp-project
    → minimatch, generator modules (internal)

@wpdev/create-plugin
  → @wpdev/cli

Consumer scaffold package.json (typical standard preset)
  → @wpdev/hooks, @wpdev/utils, @wpdev/rest-utils, @wpdev/html-utils
  → @wpdev/build, @wpdev/dependency-extraction-esbuild-plugin (dev)
  → preact or react (when jsLib on)
```

### Composer (consumer project)

```
wpdev/framework
  → (no required consumer deps beyond PHP)

wpdev/php-fault-tolerance  (optional, faultTolerance:on)
  → guzzlehttp/guzzle (transitive)

blockstudio/blockstudio  (optional, blocks:on)
  → PHP 8.2+ runtime requirement

wpdev/mcp-integration  (optional, mcpAbilities:on)
  → WordPress 6.9+ Abilities API at runtime
```

### ASCII overview

```
                    ┌─────────────────────┐
                    │  @wpdev/create-plugin │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │     @wpdev/cli      │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────▼─────────────────────┐
         │      @wpdev/create-wp-project (engine)     │
         │  features · generators · manifest · migrate │
         └─────────────────────┬─────────────────────┘
                               │ scaffolds
         ┌─────────────────────▼─────────────────────┐
         │           Consumer plugin project          │
         │  ┌─────────────┐    ┌──────────────────┐  │
         │  │ npm @wpdev/* │    │ wpdev/framework  │  │
         │  │   bundles    │    │    (Composer)    │  │
         │  └─────────────┘    └──────────────────┘  │
         └───────────────────────────────────────────┘
```

---

## Build output locations

| Output              | Path                                 | Produced by                             | Consumed by                        |
| ------------------- | ------------------------------------ | --------------------------------------- | ---------------------------------- |
| JS admin bundles    | `assets/bundles/{Module}-{entry}.js` | `npm run build` / `@wpdev/build`        | `Assets::enqueue_bundle_script()`  |
| Bundle asset PHP    | `assets/bundles/{name}.asset.php`    | esbuild + deps extraction plugin        | WordPress `wp_enqueue_script` deps |
| Deps bundle         | `assets/bundles/{slug}-deps.js`      | esbuild (stage 1)                       | Registered as script dependency    |
| Global deps mapping | `assets/dependencies.ts` or `.js`    | scaffold generator (`js` feature)       | Build config `importAsGlobals`     |
| Compiled CSS        | `assets/stylesheets/*.css`           | esbuild CSS pipeline                    | `Assets::enqueue_bundle_style()`   |
| Translation maps    | `languages/*.json`                   | translation scripts (`i18n:on`)         | PHP `wp_set_script_translations`   |
| Strauss output      | `vendor-prefixed/` (on release)      | `composer strauss` (`vendorScoping:on`) | Production zip                     |
| CI workflow         | `.github/workflows/ci.yml`           | generator (`ci:auto`)                   | GitHub Actions                     |
| Kit manifest        | `wpdev-kit.json`                     | engine                                  | `wpdev doctor`, `wpdev info`       |
| Project config      | `project.config.json`                | engine                                  | PHP `Plugin::config()`, JS build   |

**Release vs dev:** `npm run build` writes to `assets/bundles/`. `npm run release`
runs build + Strauss + zip steps. See [build-outputs.md](build-outputs.md) and
[release-checklist.md](release-checklist.md).

---

## Workspace layout

```
wp-starter-kit/
├── packages/
│   ├── cli/                    # @wpdev/cli
│   ├── cli/create-plugin/      # @wpdev/create-plugin
│   ├── create-wp-project/      # @wpdev/create-wp-project (engine)
│   ├── framework/              # wpdev/framework (Composer)
│   ├── hooks/                  # @wpdev/hooks
│   ├── utils/                  # @wpdev/utils
│   ├── rest-utils/             # @wpdev/rest-utils
│   ├── html-utils/             # @wpdev/html-utils
│   ├── ui-components/          # @wpdev/ui-components
│   ├── fetch/                  # @wpdev/fetch (deprecated shim)
│   ├── translation/            # @wpdev/translation
│   ├── rule-engine/            # @wpdev/rule-engine
│   ├── polaris-stack/          # @wpdev/polaris-stack (internal)
│   ├── mcp-integration/        # wpdev/mcp-integration (internal)
│   ├── wpdev-framework/        # companion plugin source (internal)
│   └── build/                  # @wpdev/build (+ esbuild plugin)
├── core/packages/              # legacy/tooling aliases (build)
├── src/                        # kit's own reference plugin modules
├── assets/bundles/             # committed example build outputs
└── docs/                       # this documentation tree
```

Consumer projects mirror a subset: `src/Modules/`, `assets/`, `tests/`, config
files, and Composer/npm manifests — not the full kit monorepo.

---

## Publishability contract

Publishable npm packages must satisfy `tests/packages/publishable.test.js`:

- Non-empty `files` whitelist in `package.json`
- Semver `version` field
- `main` or `exports` entry point
- Not `private: true`

The three CLI-related packages (`@wpdev/cli`, `@wpdev/create-wp-project`,
`@wpdev/create-plugin`) must be on npm for `npm create @wpdev/plugin@latest` to
work end-to-end.

Composer packages `wpdev/framework` and `wpdev/php-fault-tolerance` publish to
Packagist. Internal packages (`mcp-integration`, `wpdev-framework` source) ship
inside the kit repo or as path repos during development.

---

## See also

- [architecture.md](architecture.md) — how packages fit together
- [framework-as-dependency.md](framework-as-dependency.md) — `distMode` model
- [api/js-reference.md](api/js-reference.md) — JS export signatures
- [api/php-reference.md](api/php-reference.md) — PHP class API
- [api/cli-engine-reference.md](api/cli-engine-reference.md) — engine programmatic API
- [release-checklist.md](release-checklist.md) — npm publish steps
