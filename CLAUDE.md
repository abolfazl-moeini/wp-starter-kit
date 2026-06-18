# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup
npm install && composer install

# Development (watch mode)
npm run dev

# Tests
npm test                          # All Jest suites (986 tests, tests/**/*.test.[jt]s)
npx jest tests/packages/addFeature.test.js  # Single Jest file
composer test                     # PHPUnit (tests/phpunit/)
./vendor/bin/phpunit tests/phpunit/Core/  # Single PHPUnit directory

# Build
npm run release                   # Full production build (4 parallel stages)
npm run build                     # Same as release but via npm-run-all
npm run dev                       # Watch mode for JS

# Validation
npm run check                     # Validate project.config.json
npm run typecheck                 # TypeScript (tsc --noEmit)
npm run lint:js                   # ESLint
composer validate:phpstan         # PHPStan analysis
composer validate:cs              # PHPCS WordPress coding standards

# CLI tools (internal, not installed globally)
npm run scaffold                  # packages/create-wp-project — scaffold new plugin
npm run add-feature               # packages/create-wp-project — add feature to project
npm run doctor                    # packages/create-wp-project — validate project health

# Vendor scoping (release only)
composer scope:vendor             # Strauss prefix (runs auto on post-install)
composer release                  # rector:prefix + fix-autoloader
```

> If Composer's platform PHP is 7.4 but you run PHP 8.2+ locally, install with:
> `composer install --ignore-platform-req=php --no-scripts`

## Architecture

### Config-driven: two source-of-truth files

**`project.config.json`** drives all branding and runtime behavior. Key fields:

- `slug`, `globalName`, `localizeVar`, `textDomain`, `hookPrefix`, `npmScope` — plugin identity
- `uiFramework` — `preact` or `react` (aliased via `package.json` `react → @preact/compat`)
- `phpMinVersion` / `phpSourceVersion` — Rector downgrade targets (default 7.4 / 8.1)
- `vendorPrefix` — Strauss namespace prefix for dist

**`build.config.json`** — `globalMappings` (npm → WP global), `assetMappings` (node_modules → `assets/libraries`), `styleEntryPoints`.

### PHP module system

`src/Core/Plugin.php` boots the plugin and delegates to `ModuleLoader`, which discovers and registers anything implementing `ModuleInterface`. New features go in `src/Modules/{Name}/` with a `Module.php` implementing `ModuleInterface`. Frontend entries go in `src/Modules/{Name}/assets/entries/*.ts`.

PHP namespaces: `WPDev\Core`, `WPDev\Modules\*`, `WPDev\Support\*`, `WPDev\Adapters\*`.

### JS build pipeline (4 parallel stages)

1. **dependencies** (`build:dependencies`) → `assets/bundles/{slug}-deps.js` + `.asset.php`
2. **components** (`build:components`) — auto-discovers `src/Modules/*/assets/entries/*.ts` → `assets/bundles/{Module}-{entry}.js`
3. **styles** (`build:styles`) — CSS with hash sidecars
4. **assets** (`build:assets`) — copies `node_modules` dist → `assets/libraries` per `assetMappings`

The `.asset.php` sidecar (PHP array: `dependencies`, `hash`, `internal_packages`) is consumed by WordPress for script enqueueing.

### CLI installer engine (`packages/create-wp-project/`)

The `wpdev` CLI scaffolds and manages projects. Key internals:

- `features.js` — single source of truth for the feature catalog (`getFeatureCatalog()`, `defaultFeatures()`, `validateFeatureSet()`). Adding a feature id here is a contract change.
- `manifest.js` — reads/writes `wpdev-kit.json` (schema, kitVersion, distMode, feature set)
- `plan-update.js` — pure dry-run planner; NO disk writes; returns a plain JSON plan
- `addFeature.js` / `removeFeature.js` — toggle features; update `wpdev-kit.json`
- `migrations/` — versioned migration steps for `wpdev update --run`

The update flow is intentionally two-phase: `wpdev update` prints the plan (read-only), `wpdev update --run` applies it.

### Feature flags

Every scaffold is shaped by its feature set (`{ featureId: variant }`). Key features:

| Feature         | Purpose                                                      |
| --------------- | ------------------------------------------------------------ |
| `js`            | `typescript`/`pure`/`flow`/`none` — JS pipeline              |
| `jsLib`         | `none`/`preact`/`react`                                      |
| `phpMinVersion` | Rector downgrade target                                      |
| `phpFramework`  | `none`/`wpdev` — companion plugin with WPDev Admin Framework |
| `blocks`        | Blockstudio 7 Gutenberg blocks (PHP 8.2+ runtime)            |
| `frontendStack` | `none`/`polaris` — Polaris Stack design system               |
| `mcpAbilities`  | WordPress Abilities API (WP 6.9+)                            |
| `vendorScoping` | Strauss prefix on release                                    |

### Vendor scoping

Strauss (`strauss.json`) + Rector prefix pipeline (`dev/rector-*.php`) scope vendors at release time. Never rely on cross-plugin Composer resolution. The Strauss `post-install-cmd` runs automatically; the Rector step is release-only.

### Optional packages (git submodules)

- `packages/polaris-stack/` — design system (CSS custom props, BEM, layout primitives). Context: `packages/polaris-stack/context.md`
- `packages/mcp-integration/` — WordPress Abilities API library. Context: `packages/mcp-integration/context.md`

Clone with: `git clone --recurse-submodules <url>` or `git submodule update --init --recursive`

## Key conventions

- **TDD first** — add failing test, implement, refactor. Tests live in `tests/` (Jest) and `tests/phpunit/` (PHPUnit).
- **WordPress security** — nonces, capability checks, sanitize inputs, escape outputs, REST `permission_callback` on every endpoint.
- **Config-driven** — use `project.config.json` values, never hardcode slug/namespace/prefix.
- **PHP 8.1 source, 7.4 dist** — write source at 8.1+; Rector handles downgrade for release.
- **Module entry glob** — new frontend features must land in `src/Modules/{Name}/assets/entries/*.ts` to be auto-discovered by the build.
- `react` / `react-dom` resolve to `@preact/compat` at install time — do not import React APIs that Preact compat doesn't support without checking.

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
>
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
>
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).
