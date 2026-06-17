# Framework as a Dependency

> Phase 23 of `plan.v3.md` — the kit's distribution model.
> The `@wpsk/*` packages ship as real npm packages; consumer
> projects install them as `dependencies` / `devDependencies` and
> never vendor framework sources into their own tree.

The wp-starter-kit has two distribution modes for its framework
code:

| Mode       | How the consumer gets the framework                                                                                                             | When                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `vendored` | Framework files are copied into the consumer's tree at scaffold time. Updates are reapplied by `wpsk update`.                                   | Phases 20–22 default; the kit's pre-Phase 23 shape.             |
| `deps`     | Framework lives in `node_modules/@wpsk/*` (JS) and `vendor/wpdev/framework` (PHP). Updates are `composer update` / `npm update` plus migrations. | Phase 23 default (new scaffolds); opt-in for existing projects. |

The `wpdev-kit.json` manifest records which mode a project is on:

```json
{
  "kitVersion": "0.1.0",
  "distMode": "deps",
  "features": { "js": "typescript", "vendorScoping": "off" }
}
```

The `distMode` field is the contract: `scaffoldProject` and
`runMigrations` read it, the doctor uses it to decide which
drift checks apply, and the installer's `wpsk info` command
surfaces it.

This document covers:

1. [How the kit ships](#how-the-kit-ships)
2. [How a consumer consumes it](#how-a-consumer-consumes-it)
3. [Dev mode (workspace) vs published mode](#dev-mode-workspace-vs-published-mode)
4. [When `distMode` flips from `vendored` → `deps`](#when-distmode-flips-from-vendored--deps)

## How the kit ships

The kit is structured as an **npm workspace monorepo**. The
top-level `package.json` declares two workspace roots:

```json
"workspaces": [
  "packages/*",
  "core/packages/*"
]
```

Eight packages are shippable as real npm packages (the
publishable set, asserted by `tests/packages/publishable.test.js`):

| Package                                      | Purpose                                                               | Consumer placement                              |
| -------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| `@wpsk/hooks`                                | WordPress-style hooks runtime                                         | `dependencies`                                  |
| `@wpsk/utils`                                | Generic JS helpers                                                    | `dependencies`                                  |
| `@wpsk/rest-utils`                           | REST helper utilities                                                 | `dependencies`                                  |
| `@wpsk/html-utils`                           | DOM/HTML helpers                                                      | `dependencies`                                  |
| `@wpsk/fetch`                                | Wrapper around `fetch`                                                | `dependencies`                                  |
| `@wpsk/translation`                          | i18n / text-domain helpers                                            | `dependencies`                                  |
| `@wpsk/build`                                | esbuild build pipeline (components, deps, styles, check)              | `devDependencies`                               |
| `@wpsk/dependency-extraction-esbuild-plugin` | esbuild plugin that extracts WP-style script dependency registrations | `devDependencies` (transitive of `@wpsk/build`) |

The internal package `@core/utils` (workspace, not publishable)
holds the `checkProject` logic; `@wpsk/build` exposes a `wpdev-check`
bin that delegates to it. Keeping `@core/utils` internal lets the
kit's own tests reach it via the workspace without polluting the
public package surface.

The PHP side ships as the **`wpdev/framework` Composer package**
(Phase 23.A). It lives at `packages/framework/` and is registered
in the root `composer.json` as a path repository so kit-side
tests resolve to the local checkout.

## How a consumer consumes it

A freshly-scaffolded consumer project (Phase 23 onward) has no
`core/` or `packages/` directory of its own. Instead:

```text
my-project/
├── package.json          # declares @wpsk/* as deps + devDeps
├── composer.json         # declares wpdev/framework as a Composer dep
├── node_modules/
│   └── @wpsk/
│       ├── hooks/
│       ├── utils/
│       ├── rest-utils/
│       ├── html-utils/
│       ├── fetch/
│       ├── translation/
│       ├── build/
│       └── dependency-extraction-esbuild-plugin/
├── vendor/
│   └── wpsk/
│       └── framework/    # Composer-installed wpdev/framework
└── ...
```

### JavaScript side

`npm install` resolves the `@wpsk/*` packages from the
configured registry (or a path repo / npm-link in dev mode).
The build scripts in `package.json` call the bins shipped by
those packages:

```json
{
  "scripts": {
    "build": "npm-run-all --parallel build:dependencies build:components build:styles build:assets",
    "build:dependencies": "wpdev-build-dependencies",
    "build:components": "wpdev-build-components",
    "build:styles": "wpdev-build-styles",
    "build:assets": "wpdev-build-dependencies",
    "check": "wpdev-check"
  },
  "dependencies": {
    "@wpsk/hooks": "^0.1.0",
    "@wpsk/utils": "^0.1.0",
    "@wpsk/rest-utils": "^0.1.0",
    "@wpsk/html-utils": "^0.1.0",
    "@wpsk/fetch": "^0.1.0",
    "@wpsk/translation": "^0.1.0"
  },
  "devDependencies": {
    "@wpsk/build": "^0.1.0",
    "@wpsk/dependency-extraction-esbuild-plugin": "^1.0.0"
  }
}
```

The bins are declared in `@wpsk/build`'s `package.json`:

```json
{
  "name": "@wpsk/build",
  "bin": {
    "wpdev-build-dependencies": "./esbuild-dependencies-cli.js",
    "wpdev-build-components": "./esbuild-components-cli.js",
    "wpdev-build-styles": "./esbuild-styles-cli.js",
    "wpdev-check": "./wpdev-check-cli.js"
  }
}
```

### PHP side

`composer install` resolves `wpdev/framework` from the configured
repository. The consumer's `composer.json` requires the framework
and a path repo (only when the consumer lives next to a kit
checkout):

```json
{
  "require": {
    "wpdev/framework": "*"
  },
  "repositories": [
    {
      "type": "path",
      "url": "../packages/framework",
      "options": { "symlink": true }
    }
  ]
}
```

For a real consumer (no kit checkout present), the `repositories`
entry is omitted and `wpdev/framework` resolves from packagist or
the kit's own Composer registry.

## Dev mode (workspace) vs published mode

The kit's own tests run in **workspace mode**: the monorepo's
`node_modules` is a flat tree of symlinks that point back to the
checked-out package directories. `package.json` resolution for
`@wpsk/hooks` (etc.) returns the source in `packages/hooks/`, not
a copy in `node_modules/@wpsk/hooks/`. This is how `npm test`
inside the kit can run integration tests against the framework
without a publish step.

Two ways to consume the framework:

### Workspace mode (dev)

```bash
# In the kit repo
npm install          # sets up the workspace symlinks
npm test             # tests resolve @wpsk/* from packages/*
```

A consumer that lives **next to** a kit checkout can opt into
the same dev mode by adding a path repo (Composer) or by
`npm link` (npm). The `scaffoldProject` default for
`frameworkPath` is the sibling-relative
`../packages/framework`; the installer's own working directory
is the source of truth for the absolute workspace path.

### Published mode (consumer)

```bash
# In the consumer project
npm install          # pulls @wpsk/* from the configured registry
composer install     # pulls wpdev/framework from packagist / Composer registry
```

No `core/` or `packages/` directory exists in the consumer's
tree. The framework lives entirely under `node_modules/@wpsk/*`
and `vendor/wpdev/framework/`. This is the mode a real
production consumer uses — and the mode Phase 23 builds toward
by default.

### When to use which

| Use case                                                | Mode                            |
| ------------------------------------------------------- | ------------------------------- |
| Running the kit's own test suite                        | Workspace                       |
| Contributing a change to a `@wpsk/*` package            | Workspace                       |
| Building a real consumer project                        | Published                       |
| Continuous integration of a consumer project            | Published                       |
| Smoke-testing a fresh scaffold against the dev checkout | Workspace (path repo + symlink) |

The `wpdev-kit.json` `distMode` field tracks the _consumer's_
mode; the kit itself is always in workspace mode during
development.

## When `distMode` flips from `vendored` → `deps`

The flip is a single field in the manifest. Two migration paths:

### New scaffolds (default behaviour)

`Phase 23` onwards, every freshly-scaffolded project gets:

```json
{
  "kitVersion": "0.1.0",
  "distMode": "deps"
}
```

The scaffold:

1. Emits a `composer.json` that requires `wpdev/framework` (no
   `WPSK\\` → src/ would only have been for the old vendored copies; deps uses the package autoload).
2. Emits a `package.json` that lists the eight `@wpsk/*` packages
   (six runtime, two build) with versions from
   `getDepVersions()`.
3. Emits build scripts that call the installed bins
   (`wpdev-build-dependencies`, etc.) — never the vendored
   `node core/packages/...` path.

### Existing projects (migration)

A pre-Phase 23 project has `distMode: "vendored"` and
`core/packages/*` vendored into its own tree. Migrating is
`wpsk update`'s job (Phase 24). The migration:

1. Adds the `wpdev/framework` Composer require + (in dev mode)
   the path repo.
2. Adds the eight `@wpsk/*` npm packages to `package.json`.
3. Rewrites the build scripts to call the installed bins.
4. Removes the vendored `core/packages/*` tree (only after
   the new dep set resolves successfully and a test
   pass confirms the consumer project still works).
5. Updates `wpdev-kit.json`: `distMode` becomes `"deps"`.

`wpsk doctor` is the safety net: it flags a project that is on
`"vendored"` mode but missing the vendored tree (or on `"deps"`
mode but missing the `@wpsk/*` packages), so a half-applied
migration is always visible.

### Why a single flip, not a per-file one

Some kits try to migrate framework code in pieces: first the
PHP framework, then the JS libs, then the build pipeline. That
works for a small surface but adds three rounds of "is the
project green between steps?" testing. wp-starter-kit flips the
whole framework in one step because:

- The 6 lib packages and the 2 build packages share a single
  registry (`getDepVersions()`); a partial migration is just a
  half-installed registry.
- The composer side (`wpdev/framework`) and the npm side
  (`@wpsk/*`) are independent in the workspace but the
  consumer sees them as a single "framework" — a project on
  `distMode: "deps"` with only one of the two installed is
  broken.
- The migrations registry is the only authority for the
  flip; no inline conditional in the scaffold is needed.

## See also

- `docs/scaffold.md` — the consumer-side scaffold flow.
- `docs/build-system.md` — the esbuild build pipeline and
  the `@wpsk/build` package in detail.
- `docs/updating-projects.md` — `wpsk update` + `wpsk doctor`
  - migrations.
- `docs/features-and-manifest.md` — the `wpdev-kit.json`
  schema and the feature toggles.
- `plan.v3.md` §23 — the full Phase 23 design.
