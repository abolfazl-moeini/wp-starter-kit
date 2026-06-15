# Build Pipeline Outputs

This document describes the on-disk artifacts produced by each `npm run build:*` step
in the wp-starter-kit build pipeline. It complements the high-level `plan.md` (Phase 1)
and the `project.config.json` schema.

> **TL;DR**
>
> | Script               | Produces                                                                        | Format                         |
> | -------------------- | ------------------------------------------------------------------------------- | ------------------------------ |
> | `build:dependencies` | `assets/bundles/<depsBundle>` + `.asset.php`                                    | IIFE wrapped in `<globalName>` |
> | `build:components`   | `assets/bundles/<dirname>.js` + `.asset.php` (one per `components/*/script.js`) | ESM bundle                     |
> | `build:styles`       | `<file>.asset.php` next to each `styleEntryPoints` entry                        | PHP array                      |
> | `build:assets`       | copied `node_modules/<lib>` → `assets/libraries/<lib>`                          | file system copy               |
> | `build` (root)       | runs all four in parallel via `npm-run-all`                                     | —                              |
> | `release`            | runs all four sequentially                                                      | —                              |

---

## 1. Dependencies bundle

Script: `npm run build:dependencies`
Entry: `core/packages/build/esbuild-dependencies.js`
Source: `assets/dependencies.js`

### Output

```
assets/bundles/<depsBundle>
assets/bundles/<depsBundle>.asset.php
```

Where `<depsBundle>` comes from `project.config.json → depsBundle`
(e.g. `wpsk-starter-deps.js`).

### Bundle format

- **Format:** `iife` (Immediately Invoked Function Expression).
- **Global name:** `project.config.json → globalName` (e.g. `WPSK`).
  After the script runs, `window[globalName]` exists and exposes:
  - `<globalName>.hooks` — hook registry created in `assets/dependencies.js`
    (e.g. `WPSK.hooks.doAction('wpsk-request-ajax-start', ...)`)
  - `<globalName>.table` — alias for `window.Tabulator` (when used)
  - `<globalName>.utils` — re-exported `@<npmScope>/utils`
  - `<globalName>.<other>` — anything explicitly exported from
    `assets/dependencies.js`

### Sidecar (`.asset.php`)

```php
<?php return array(
  'dependencies' => array('wp-i18n', 'wp-hooks'),
  'internal_packages' => array('hooks', 'utils'),
  'hash' => 'c568f2d6d0e6d06c227ef8663e6187be',
);
```

PHP uses this to:

- Enqueue the bundle with the right WordPress script dependencies (`wp-i18n`,
  `wp-hooks`, …).
- Bust caches with `?ver=<hash>`.

> **Important:** the sidecar is **only** used by `wp_register_script` /
> `wp_enqueue_script` consumers on the PHP side. The JS bundle itself does not
> parse it.

### Plugin

`importAsGlobals(globalMappings, internalItems)` is wired with:

- `globalMappings` from `build.config.json` (e.g. `{ "tabulator-tables": "WPSK.table" }`)
- The internal `<npmScope>/utils` mapping: `${globalName}.utils`.

This means the bundle can `import { x } from "@<npmScope>/utils"` even though
that package is not on disk at runtime — the import is rewritten to a
reference on the IIFE global.

---

## 2. Component bundles

Script: `npm run build:components`
Entry: `core/packages/build/esbuild-components.js`
Source: `components/**/script.js` (glob, excluding `node_modules/**` and `assets/**`).

### Output

For each `components/<name>/script.js`:

```
assets/bundles/<name>.js
assets/bundles/<name>.asset.php
```

Where `<name>` is the basename of the directory containing `script.js`. This
naming is the "component bundle" contract — PHP enqueues by directory name.

### Bundle format

- **Format:** ESM (default esbuild output for `entryPoints`).
- **Format:** esbuild `iife` is **not** used (components are loaded individually
  via `wp_enqueue_script`, not via the global IIFE).
- **Force-injected dependency:** the dependencies bundle handle — derived from
  `projectConfig.depsBundle` minus the `.js` extension (e.g. `wpsk-starter-deps`).
  The handle is always appended to the `.asset.php → dependencies` array so
  WordPress loads the deps bundle **before** the component bundle.

### Sidecar

```php
<?php return array(
  'dependencies' => array('wpsk-starter-deps', 'wp-i18n'),
  'internal_packages' => array('utils'),
  'hash' => 'abc123...',
);
```

> **Key behavior:** `Promise.all(jsfiles.map(async (f) => { ... }))` is used
> (see BUG-05 in `plan.md` §0.A). All component builds run in parallel and the
> script awaits all of them. If you see incomplete bundles after a build, the
> `Promise.all` wrapper is missing — port it back from the live source.

---

## 3. Style hash

Script: `npm run build:styles`
Entry: `core/packages/build/esbuild-styles.js`
Source paths: `build.config.json → styleEntryPoints` (array of strings).

### Output

For each entry in `styleEntryPoints`:

```
<file>.asset.php
```

The `.asset.php` is written **next to the source CSS file**, not under
`assets/bundles/`. This matches WordPress's convention for sibling-style
cache-busting.

### Content

```php
<?php return array('hash' => 'd41d8cd98f00b204e9800998ecf8427e');
```

The hash is an MD5 of the CSS file's bytes. PHP uses it as the
`wp_enqueue_style(..., ['ver' => $hash])` value to bust browser caches.

> **Why no esbuild call?** This step does **not** compile CSS. It only
> fingerprints the file. The actual CSS pipeline (postcss/sass/etc.) is the
> caller's responsibility — by the time this script runs, the CSS file
> referenced in `styleEntryPoints` should already exist on disk.

### Errors

- Missing source file → rejects with a clear error
  (`buildStyleAssetFile: source CSS file not found at <path>`).
- Empty `styleEntryPoints` array → resolves with `[]` (no-op).

---

## 4. Asset linking

Script: `npm run build:assets` (alias: `npm run prepare:assets`)
Entry: `build/build-assets.js`
Source: `build.config.json → assetMappings`.

### Modes

| Flag          | Effect                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| _(none)_      | Copy every `assetMapping.source` → `assetMapping.destination`.                                       |
| `--validate`  | Validate `build.config.json` shape; print success; no copy.                                          |
| `--dry-run`   | Log every planned copy (with `[dry-run]` prefix); no I/O. Returns `{ mode: 'dry-run', planned: N }`. |
| _(no config)_ | Exits 1 with a clear error.                                                                          |

### Output

For each `assetMapping`:

```
<destination>/
```

The destination is a recursive mirror of the source (`fs.promises.cp` with
`{ recursive: true }`). Use `options.overwrite === false` in the config to
opt out of overwriting an existing destination.

### Example config

```json
{
  "assetMappings": [
    {
      "source": "node_modules/tabulator-tables/dist",
      "destination": "assets/libraries/tabulator"
    }
  ]
}
```

---

## 5. Top-level orchestration

### `npm run build` (default — dev)

Runs all four sub-builders **in parallel** via `npm-run-all --parallel`:

```
build:dependencies
build:components
build:styles
build:assets
```

Why parallel? None of the four reads from a file produced by another:

- `build:dependencies` writes to `assets/bundles/<depsBundle>`.
- `build:components` writes to `assets/bundles/<dirname>.js`.
- `build:styles` writes to `<cssFile>.asset.php` next to each entry.
- `build:assets` copies to `assets/libraries/<lib>`.

There is one shared read: `build.config.json` is read by all four. The
seeded `build.config.example.json` is the canonical reference; if a
`build.config.json` is missing, the sub-builders will fail with a clear
error.

### `npm run release` (sequential — production)

```
build:dependencies && build:components && build:styles && build:assets
```

Sequential is preferred for releases because the `composer rector:prefix`
and `composer rector:build` steps that run after this in CI may want to
inspect intermediate artifacts.

### `npm run build:all`

Alternative entry point that uses the explicit `core/packages/build/build-all.js`
orchestrator. Same effect as `npm run build`, but with structured failure
reporting (returns `{ results, failures }` and rejects with `failures` list).

### `npm run prepare`

Alias for `npm run build:assets`. Runs automatically before `npm publish` —
but since this package is `private: true`, the hook is dormant in normal use.

---

## 6. Where to find each artifact

| Artifact          | Path                                    | When produced                       |
| ----------------- | --------------------------------------- | ----------------------------------- |
| Deps bundle JS    | `assets/bundles/<depsBundle>`           | every `build:dependencies`          |
| Deps sidecar      | `assets/bundles/<depsBundle>.asset.php` | every `build:dependencies`          |
| Component JS      | `assets/bundles/<dirname>.js`           | every `build:components`            |
| Component sidecar | `assets/bundles/<dirname>.asset.php`    | every `build:components`            |
| Style sidecar     | `<cssFile>.asset.php` (next to source)  | every `build:styles`                |
| Library mirror    | `assets/libraries/<lib>/...`            | every `build:assets` (default mode) |

## 7. globalMappings usage

`build.config.json → globalMappings` tells `esbuild` how to rewrite bare
imports of third-party libraries to references on the IIFE global.

```json
{
  "globalMappings": {
    "tabulator-tables": "WPSK.table"
  }
}
```

With this config, a component bundle that contains `import { Tabulator } from
"tabulator-tables"` will be rewritten to use `WPSK.table.Tabulator` at runtime,
which is bridged from `window.Tabulator` (loaded by WordPress's enqueue
pipeline) via an alias in `assets/dependencies.js`:

```js
export const table = { Tabulator: window.Tabulator };
```

### Why split `globalName` and `globalMappings`?

- `globalName` lives in `project.config.json` because it identifies **this**
  project (the IIFE global). It is rebuilt on every dep bundle.
- `globalMappings` lives in `build.config.json` because it identifies
  **third-party libraries** and their bridge points. It can be shared across
  projects that use the same libraries.

Mixing them would couple the build-config file to the project identity,
forcing every project to re-declare the same bridge points.

---

## 8. Verifying outputs

After `npm run build`, every artifact in the table above should be on disk.
A quick smoke test:

```bash
npm run build
ls assets/bundles/
# expect: <depsBundle>, <dirname>.js (one per component), ...
ls assets/libraries/
# expect: each assetMapping destination
find . -name "*.asset.php" -not -path "*/node_modules/*"
# expect: all component + deps + style sidecars
```

If any artifact is missing, the corresponding sub-builder's stderr will
contain the failure reason. Use `npm run build:assets -- --dry-run` to verify
asset mappings without writing to disk.
