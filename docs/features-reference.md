# Features reference

> Full catalog of all 19 installer features (including `ci`). For the manifest
> model and ownership rules, see [features-and-manifest.md](features-and-manifest.md).
> Engine validation: `validateFeatureSet()` in
> `packages/create-wp-project/src/features.js`.

## Table of contents

- [Feature matrix](#feature-matrix)
- [Toggle types](#toggle-types)
- [Per-feature reference](#per-feature-reference)
- [Validation rules](#validation-rules)
- [Normalization rules](#normalization-rules)
- [Warnings (non-blocking)](#warnings-non-blocking)
- [See also](#see-also)

---

## Feature matrix

| ID               | Label                | Variants                      | Default    | Dependencies                            | Conflicts                   | Toggle     |
| ---------------- | -------------------- | ----------------------------- | ---------- | --------------------------------------- | --------------------------- | ---------- |
| `js`             | JavaScript           | typescript, pure, flow, none  | typescript | —                                       | `none` disables JS stack    | add/remove |
| `jsLib`          | JavaScript Library   | none, preact, react           | none       | `js ≠ none`                             | —                           | add/remove |
| `jsTest`         | JavaScript Testing   | jest, vitest, none            | jest       | `js ≠ none`                             | —                           | add/remove |
| `phpMinVersion`  | PHP                  | 7.4–8.3                       | 7.4        | —                                       | `faultTolerance` needs ≥8.1 | **set**    |
| `phpFramework`   | PHP Framework        | none, wpdev                   | none       | —                                       | prefixes ≠ `wpdev`/`wpdev_` | add/remove |
| `phpTest`        | PHP Testing          | phpunit, none                 | phpunit    | —                                       | —                           | add/remove |
| `restBatch`      | REST Batch           | off, on                       | off        | `js ≠ none`                             | —                           | add/remove |
| `faultTolerance` | Fault Tolerance      | off, on                       | off        | `phpMinVersion ≥ 8.1`                   | —                           | add/remove |
| `vendorScoping`  | Vendor Scoping       | on, off                       | on         | —                                       | —                           | add/remove |
| `husky`          | Husky                | on, off                       | on         | `js ≠ none` for package.json            | —                           | add/remove |
| `css`            | CSS                  | none, sass, tailwind, postcss | none       | `js ≠ none`                             | polaris vs tailwind (v1)    | add/remove |
| `blocks`         | Blocks               | off, on                       | off        | PHP 8.2+ runtime (Blockstudio)          | —                           | add/remove |
| `license`        | License              | gpl2, gpl3, mit               | gpl2       | —                                       | —                           | **set**    |
| `wpMinVersion`   | WordPress            | 5.8, 6.0, 6.2, 6.4, 6.6       | 6.0        | —                                       | —                           | **set**    |
| `exampleFeature` | Example Feature      | on, off                       | on         | —                                       | —                           | add/remove |
| `i18n`           | Internationalization | on, off                       | on         | —                                       | —                           | add/remove |
| `frontendStack`  | Frontend Stack       | none, polaris                 | none       | `js=typescript`, `jsLib∈{preact,react}` | `css=tailwind` (v1)         | add/remove |
| `mcpAbilities`   | MCP Abilities        | off, on                       | off        | WP 6.9+ runtime                         | —                           | add/remove |
| `ci`             | CI                   | auto, off                     | auto       | any test runner for emission            | —                           | **set**    |

---

## Toggle types

| Type           | CLI                                                  | Features                                         |
| -------------- | ---------------------------------------------------- | ------------------------------------------------ |
| **add/remove** | `wpdev add <id> [--variant v]` / `wpdev remove <id>` | Most features                                    |
| **set**        | `wpdev set <id> <variant>`                           | `phpMinVersion`, `wpMinVersion`, `license`, `ci` |

Config-only features have no on/off state — only a variant among allowed values.

---

## Per-feature reference

### `js` — JavaScript

| Property         | Value                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Label**        | JavaScript                                                                                                                                 |
| **Variants**     | `typescript` _(default)_, `pure`, `flow`, `none`                                                                                           |
| **Enables**      | esbuild pipeline, `package.json`, JS entries, build scripts                                                                                |
| **Owned paths**  | `assets/dependencies.ts` (typescript), `assets/dependencies.js` (pure/flow), `.flowconfig` (flow); core owns `package.json`, build configs |
| **Dependencies** | None                                                                                                                                       |
| **Conflicts**    | `none` → `jsLib`, `jsTest`, `css`, `restBatch`, `frontendStack` forced off                                                                 |
| **Toggle**       | `wpdev add js --variant typescript` / `wpdev remove js`                                                                                    |

See [js-variants.md](js-variants.md) and [build-system.md](build-system.md).

---

### `jsLib` — JavaScript Library

| Property         | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| **Label**        | JavaScript Library                                                         |
| **Variants**     | `none` _(default)_, `preact`, `react`                                      |
| **Enables**      | UI framework alias in esbuild; sets `uiFramework` in `project.config.json` |
| **Owned paths**  | Marker file in generator (`jsLib` ownership marker)                        |
| **Dependencies** | `js ≠ none`                                                                |
| **Conflicts**    | Meaningless when `js:none`                                                 |
| **Toggle**       | `wpdev add jsLib --variant preact` / `wpdev remove jsLib`                  |

See [react-preact-switch.md](react-preact-switch.md).

---

### `jsTest` — JavaScript Testing

| Property         | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| **Label**        | JavaScript Testing                                                 |
| **Variants**     | `jest` _(default)_, `vitest`, `none`                               |
| **Enables**      | Jest or Vitest config, test scripts in `package.json`              |
| **Owned paths**  | `jest.config.*`, `vitest.config.*`, test setup files per generator |
| **Dependencies** | `js ≠ none`                                                        |
| **Toggle**       | `wpdev add jsTest --variant vitest` / `wpdev remove jsTest`        |

See [php-test-tools.md](php-test-tools.md) for PHP-side testing.

---

### `phpMinVersion` — PHP

| Property         | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| **Label**        | PHP                                                                |
| **Variants**     | `7.4` _(default)_, `8.0`, `8.1`, `8.2`, `8.3`                      |
| **Enables**      | Rector downgrade target, `composer.json` `require.php`             |
| **Owned paths**  | Refreshed via glue (not deleted on set)                            |
| **Dependencies** | None                                                               |
| **Conflicts**    | `faultTolerance:on` requires ≥ `8.1`; `blocks:on` warns if `< 8.2` |
| **Toggle**       | `wpdev set phpMinVersion 8.2`                                      |

---

### `phpFramework` — PHP Framework

| Property         | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| **Label**        | PHP Framework                                                           |
| **Variants**     | `none` _(default)_, `wpdev`                                             |
| **Enables**      | `companion-plugins/wpdev/`, `FrameworkBridge.php`, `WpdevModuleAdapter` |
| **Owned paths**  | `companion-plugins/wpdev/**`, bridge files, demo module                 |
| **Dependencies** | None                                                                    |
| **Validation**   | `hookPrefix ≠ wpdev`, `phpFunctionPrefix ≠ wpdev_`                      |
| **Toggle**       | `wpdev add phpFramework --variant wpdev` / `wpdev remove phpFramework`  |

See [wpdev-adapter.md](wpdev-adapter.md).

---

### `phpTest` — PHP Testing

| Property        | Value                                                           |
| --------------- | --------------------------------------------------------------- |
| **Label**       | PHP Testing                                                     |
| **Variants**    | `phpunit` _(default)_, `none`                                   |
| **Enables**     | `phpunit.xml`, `tests/phpunit/bootstrap.php`, Composer dev deps |
| **Owned paths** | `phpunit.xml`, `tests/phpunit/bootstrap.php`                    |
| **Toggle**      | `wpdev add phpTest` / `wpdev remove phpTest`                    |

---

### `restBatch` — REST Batch

| Property         | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| **Label**        | REST Batch                                                         |
| **Variants**     | `off` _(default)_, `on`                                            |
| **Enables**      | REST batch endpoint module, `@wpdev/rest-utils/fetch` batch client |
| **Owned paths**  | `src/Modules/RestBatch/**`                                         |
| **Dependencies** | `js ≠ none`                                                        |
| **Toggle**       | `wpdev add restBatch` / `wpdev remove restBatch`                   |

See [fetch-batch.md](fetch-batch.md).

---

### `faultTolerance` — Fault Tolerance

| Property         | Value                                                      |
| ---------------- | ---------------------------------------------------------- |
| **Label**        | Fault Tolerance                                            |
| **Variants**     | `off` _(default)_, `on`                                    |
| **Enables**      | `wpdev/php-fault-tolerance` Composer dependency            |
| **Owned paths**  | `docs/fault-tolerance.md` (generator-owned doc stub)       |
| **Dependencies** | `phpMinVersion ≥ 8.1`                                      |
| **Toggle**       | `wpdev add faultTolerance` / `wpdev remove faultTolerance` |

See [fault-tolerance.md](fault-tolerance.md).

---

### `vendorScoping` — Vendor Scoping

| Property        | Value                                                    |
| --------------- | -------------------------------------------------------- |
| **Label**       | Vendor Scoping                                           |
| **Variants**    | `on` _(default)_, `off`                                  |
| **Enables**     | Strauss config in `composer.json`, `strauss.json`        |
| **Owned paths** | `strauss.json`                                           |
| **Toggle**      | `wpdev add vendorScoping` / `wpdev remove vendorScoping` |

See [vendor-scoping.md](vendor-scoping.md).

---

### `husky` — Husky

| Property         | Value                                                             |
| ---------------- | ----------------------------------------------------------------- |
| **Label**        | Husky                                                             |
| **Variants**     | `on` _(default)_, `off`                                           |
| **Enables**      | `.husky/pre-commit`, `.husky/commit-msg`, `commitlint.config.cjs` |
| **Owned paths**  | `.husky/**`, `commitlint.config.cjs`                              |
| **Dependencies** | Requires `package.json` (`js ≠ none` or husky-only edge cases)    |
| **Toggle**       | `wpdev add husky` / `wpdev remove husky`                          |

When both `js:none` and `husky:off`, `package.json` may be omitted entirely.

---

### `css` — CSS

| Property         | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| **Label**        | CSS                                                                |
| **Variants**     | `none` _(default)_, `sass`, `tailwind`, `postcss`                  |
| **Enables**      | CSS build step in esbuild pipeline                                 |
| **Owned paths**  | `.sassrc`, `tailwind.config.js`, `postcss.config.js` (per variant) |
| **Dependencies** | `js ≠ none`                                                        |
| **Conflicts**    | `frontendStack:polaris` incompatible with `tailwind` in v1         |
| **Toggle**       | `wpdev add css --variant sass` / `wpdev remove css`                |

See [css-variants.md](css-variants.md).

---

### `blocks` — Blocks

| Property         | Value                                                           |
| ---------------- | --------------------------------------------------------------- |
| **Label**        | Blocks                                                          |
| **Variants**     | `off` _(default)_, `on`                                         |
| **Enables**      | Blockstudio 7, `blockstudio/` directory, blocks module          |
| **Owned paths**  | `blockstudio/**`, blocks module paths                           |
| **Dependencies** | PHP 8.2+ at runtime for Blockstudio vendor; WP 6.7+ recommended |
| **Toggle**       | `wpdev add blocks` / `wpdev remove blocks`                      |

See [blocks.md](blocks.md) and [blocks-blockstudio.md](blocks-blockstudio.md).

---

### `license` — License

| Property        | Value                                       |
| --------------- | ------------------------------------------- |
| **Label**       | License                                     |
| **Variants**    | `gpl2` _(default)_, `gpl3`, `mit`           |
| **Enables**     | `LICENSE` file, plugin header license field |
| **Owned paths** | `LICENSE`                                   |
| **Toggle**      | `wpdev set license gpl3`                    |

**Warning:** `mit` may be rejected by WordPress.org plugin directory review (GPL
compatibility policy). Scaffold still proceeds.

---

### `wpMinVersion` — WordPress

| Property     | Value                                         |
| ------------ | --------------------------------------------- |
| **Label**    | WordPress                                     |
| **Variants** | `6.0` _(default)_, `5.8`, `6.2`, `6.4`, `6.6` |
| **Enables**  | `Requires at least` in plugin header          |
| **Toggle**   | `wpdev set wpMinVersion 6.4`                  |

---

### `exampleFeature` — Example Feature

| Property        | Value                                                      |
| --------------- | ---------------------------------------------------------- |
| **Label**       | Example Feature                                            |
| **Variants**    | `on` _(default)_, `off`                                    |
| **Enables**     | `src/Modules/ExampleFeature/` demo CRUD module             |
| **Owned paths** | `src/Modules/ExampleFeature/**`                            |
| **Toggle**      | `wpdev add exampleFeature` / `wpdev remove exampleFeature` |

`woocommerce` preset sets this to `off`.

---

### `i18n` — Internationalization

| Property        | Value                                               |
| --------------- | --------------------------------------------------- |
| **Label**       | Internationalization                                |
| **Variants**    | `on` _(default)_, `off`                             |
| **Enables**     | Translation pipeline scripts, `languages/` scaffold |
| **Owned paths** | `languages/**`                                      |
| **Toggle**      | `wpdev add i18n` / `wpdev remove i18n`              |

See [translation.md](translation.md).

---

### `frontendStack` — Frontend Stack

| Property         | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| **Label**        | Frontend Stack                                                             |
| **Variants**     | `none` _(default)_, `polaris`                                              |
| **Enables**      | `@wpdev/polaris-stack`, Polaris demo module                                |
| **Owned paths**  | `src/polaris/**`, `src/Modules/PolarisDemo/**`                             |
| **Dependencies** | `js=typescript`, `jsLib ∈ {preact, react}`                                 |
| **Conflicts**    | `css=tailwind` in v1                                                       |
| **Toggle**       | `wpdev add frontendStack --variant polaris` / `wpdev remove frontendStack` |

---

### `mcpAbilities` — MCP Abilities

| Property         | Value                                                                |
| ---------------- | -------------------------------------------------------------------- |
| **Label**        | MCP Abilities                                                        |
| **Variants**     | `off` _(default)_, `on`                                              |
| **Enables**      | `wpdev/mcp-integration`, `McpAbilities` module, ability registration |
| **Owned paths**  | `src/Mcp/**`, `src/Modules/McpAbilities/**`                          |
| **Dependencies** | WordPress 6.9+ Abilities API at runtime                              |
| **Toggle**       | `wpdev add mcpAbilities` / `wpdev remove mcpAbilities`               |

See [mcp-integration.md](mcp-integration.md).

---

### `ci` — CI

| Property        | Value                                                 |
| --------------- | ----------------------------------------------------- |
| **Label**       | CI                                                    |
| **Variants**    | `auto` _(default)_, `off`                             |
| **Enables**     | `.github/workflows/ci.yml` when any test runner is on |
| **Owned paths** | `.github/workflows/ci.yml`                            |
| **Toggle**      | `wpdev set ci off` / `wpdev set ci auto`              |

With `ci:auto` and all test runners off, the workflow file is not emitted.

See [ci.md](ci.md).

---

## Validation rules

`validateFeatureSet()` enforces these **hard** rules (errors block scaffold/add/set):

| Rule                                                                 | Error key                           |
| -------------------------------------------------------------------- | ----------------------------------- |
| Every catalog id present with allowed variant                        | per-id shape errors                 |
| Unknown feature ids (strict mode)                                    | synthetic key errors                |
| `js:none` → `jsLib`, `jsTest`, `css`, `restBatch` must be off/none   | per dependent id                    |
| `faultTolerance:on` → `phpMinVersion ≥ 8.1`                          | `faultTolerance`                    |
| `frontendStack:polaris` → `js=typescript` + `jsLib ∈ {preact,react}` | `frontendStack`                     |
| `frontendStack:polaris` + `css=tailwind`                             | `frontendStack`                     |
| `phpFramework:wpdev` → prefixes must not be `wpdev` / `wpdev_`       | `phpFramework`, `phpFunctionPrefix` |

Run validation in tests or scripts:

```js
import { validateFeatureSet, defaultFeatures } from "@wpdev/create-wp-project";

const result = validateFeatureSet({
  ...defaultFeatures(),
  faultTolerance: "on",
  phpMinVersion: "7.4",
});
// result.ok === false
```

---

## Normalization rules

`normalizeFeatureSet()` runs before validation in the CLI. When `js:none`:

| Field           | Coerced to               |
| --------------- | ------------------------ |
| `jsLib`         | `none`                   |
| `jsTest`        | `none`                   |
| `css`           | `none`                   |
| `restBatch`     | `off`                    |
| `frontendStack` | `none` (if was not none) |

Use normalization when merging flags and presets to avoid stale dependent values.

---

## Warnings (non-blocking)

| Condition                           | Warning key    | Message summary                    |
| ----------------------------------- | -------------- | ---------------------------------- |
| `license:mit`                       | `license`      | WordPress.org GPL policy advisory  |
| `blocks:on` + low `wpMinVersion`    | `blocks`       | Blockstudio targets WP 6.7+        |
| `blocks:on` + `phpMinVersion < 8.2` | `blocksPhp`    | Blockstudio runtime needs PHP 8.2+ |
| `mcpAbilities:on`                   | `mcpAbilities` | Requires WP 6.9+ Abilities API     |

Warnings do not set `ok: false`. The CLI surfaces them before scaffold.

---

## See also

- [features-and-manifest.md](features-and-manifest.md) — manifest schema
- [cli-reference.md](cli-reference.md) — commands and flags
- [api/cli-engine-reference.md](api/cli-engine-reference.md) — `getFeatureCatalog`, `validateFeatureSet`
- [troubleshooting.md](troubleshooting.md) — validation and toggle failures
- [mcp-integration.md](mcp-integration.md) — `mcpAbilities` integration guide
