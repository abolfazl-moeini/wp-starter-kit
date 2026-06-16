# Features and Manifest

> Phase 20 / 22 of `plan.v3.md` — feature flags, the `wpsk-kit.json`
> manifest, owned-paths, and the runtime mutation API
> (`addFeature` / `removeFeature` / variant switch).

A wp-starter-kit project is shaped by its **feature set**: a flat
record of `{ featureId: variant }` describing which features are
on and in which variant. The feature set is the project's source
of truth — every generator, every template, every runtime helper
reads it. This document covers:

1. [What a feature is](#what-a-feature-is)
2. [The `wpsk-kit.json` manifest](#the-wpsk-kitjson-manifest)
3. [Owned paths and the safety rule](#owned-paths-and-the-safety-rule)
4. [Adding a feature later (`addFeature`)](#adding-a-feature-later-addfeature)
5. [Switching variants](#switching-variants)
6. [Removing a feature (`removeFeature`)](#removing-a-feature-removefeature)
7. [CLI integration](#cli-integration)

## What a feature is

A **feature** is a toggle or variant selection in the catalog
(`packages/create-wp-project/src/features.js`). Each catalog row
has a stable `id`, a list of allowed `variants`, and a default
(the first variant). Examples:

| id               | variants                              | default      | purpose                                                                                       |
| ---------------- | ------------------------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| `js`             | `typescript`, `pure`, `flow`, `none`  | `typescript` | JavaScript pipeline. `none` = PHP-only plugin.                                                |
| `jsLib`          | `none`, `preact`, `react`             | `none`       | UI library. Only meaningful when `js !== "none"`.                                             |
| `jsTest`         | `jest`, `vitest`, `none`              | `jest`       | JS unit testing tool. Only when `js !== "none"`.                                              |
| `phpMinVersion`  | `7.4`, `8.0`, `8.1`, `8.2`, `8.3`     | `7.4`        | Lowest PHP version to support (drives Rector downgrade).                                      |
| `phpFramework`   | `none`, `wpdev`                       | `none`       | Use wpdev-framework? `wpdev` adds an adapter.                                                 |
| `phpTest`        | `phpunit`, `none`                     | `phpunit`    | PHP unit testing. PHPUnit on by default.                                                      |
| `restBatch`      | `off`, `on`                           | `off`        | REST batch endpoint + `@scope/fetch` JS client.                                               |
| `faultTolerance` | `off`, `on`                           | `off`        | PHP fault-tolerance package. Requires PHP ≥ 8.1.                                              |
| `vendorScoping`  | `on`, `off`                           | `on`         | Strauss vendor scoping on release.                                                            |
| `husky`          | `on`, `off`                           | `on`         | Git pre-commit hooks via husky.                                                               |
| `css`            | `none`, `sass`, `tailwind`, `postcss` | `none`       | CSS framework. Requires `js !== "none"`.                                                      |
| `blocks`         | `off`, `on`                           | `off`        | Gutenberg block support. Requires `js !== "none"` + WP ≥ 5.8.                                 |
| `license`        | `gpl2`, `gpl3`, `mit`                 | `gpl2`       | License.                                                                                      |
| `wpMinVersion`   | `6.0`, `5.8`, `6.2`, `6.4`, `6.6`     | `6.0`        | Minimum WordPress version.                                                                    |
| `exampleFeature` | `on`, `off`                           | `on`         | Include the ExampleFeature demo module.                                                       |
| `i18n`           | `on`, `off`                           | `on`         | Translation pipeline.                                                                         |
| `frontendStack`  | `none`, `polaris`                     | `none`       | Optional Polaris Stack design foundation. Requires `js=typescript` and `jsLib=react\|preact`. |

The catalog is the **single source of truth** — adding a new
feature id here without updating `plan.v3.md §1` is a contract
change. The plan table is the documentation contract; this file
is the engine contract.

Dependency rules (the §1.1 table in `plan.v3.md`) live in
`validateFeatureSet()` in `features.js`. They are pure functions
(no I/O) and run before any generator writes — a violation
returns `{ok: false, reason}` and writes nothing.

## The `wpsk-kit.json` manifest

Every wp-starter-kit project carries a `wpsk-kit.json` at its
root. The manifest is the durable record of the project's kit
state — kit version, distribution mode, generation timestamp,
and the feature set.

Shape:

```json
{
  "schema": 1,
  "kitVersion": "0.1.0",
  "distMode": "deps",
  "generatedAt": "2026-06-15T12:34:56.789Z",
  "features": {
    "js": "typescript",
    "jsLib": "preact",
    "jsTest": "jest",
    "phpMinVersion": "8.1",
    "phpFramework": "wpdev",
    "phpTest": "phpunit",
    "restBatch": "on",
    "faultTolerance": "off",
    "vendorScoping": "on",
    "husky": "on",
    "css": "tailwind",
    "blocks": "on",
    "license": "gpl2",
    "wpMinVersion": "6.4",
    "exampleFeature": "off",
    "i18n": "on"
  }
}
```

Field semantics:

- **`schema: 1`** — the manifest schema version. A future major
  kit version that breaks the shape will bump this and provide
  a migration. The engine refuses to read a manifest whose
  `schema` it does not understand.
- **`kitVersion: "x.y.z"`** — the kit version that last
  generated or migrated this project. Bumped by migrations
  (Phase 24), **not** by `addFeature` / `removeFeature` (those
  preserve `kitVersion` so the version reflects the last
  intentional kit-level change, not manual feature toggles).
- **`distMode: "vendored" | "deps"`** — `"deps"` (Phase 23+ default) means the framework lives in `vendor/wpsk/framework` (Composer) + `@wpsk/*` (npm). `"vendored"` is the legacy mode for projects generated before the switch (framework source copies under src/Core in the project tree). Migrations convert vendored projects.
  flips it to `"deps"`.
- **`generatedAt: "ISO-8601"`** — the timestamp the manifest
  was last written. **Idempotency tests freeze this value** so
  a no-op call does not bump it. Migrations and `update`
  operations do bump it.
- **`features: { id: variant, ... }`** — the validated feature
  set. Every catalog id is present; every value is one of the
  catalog's allowed variants.

The file is intentionally human-editable — consumers can read
it directly to learn which features are on. The engine
preserves unknown fields and unknown feature ids verbatim
when writing the manifest (forward-compat with future kit
versions).

The same `features` object is also written to
`project.config.json` under a `features` key, via
`syncFeaturesToConfig()`. Why duplicate?

- `wpsk-kit.json` is the durable kit state (kitVersion,
  distMode, generatedAt, features).
- `project.config.json` is the project's primary config —
  every runtime helper (the kit's PHP classes, the JS asset
  bundle, the REST router) reads it. Putting `features` in
  BOTH means a consumer that only knows about
  `project.config.json` (pre-Phase 20 readers) can still
  answer "which features are on?" without discovering
  `wpsk-kit.json`.

`addFeature`, `removeFeature`, and `scaffoldProject` all call
`syncFeaturesToConfig` after writing the manifest, so the two
files are always consistent on disk.

## Owned paths and the safety rule

Every generator declares an `owns: string[]` field — the
**globs of file paths the generator is allowed to create,
overwrite, or delete**. Phase 22's `addFeature` and
`removeFeature` honor a strict safety rule:

> A generator in additive / remove mode may only create,
> overwrite, or delete files matched by its own `owns` globs.
> If a write or delete would land outside `owns`, the engine
> throws (a hard error), not a silent touch of user code.

In practice:

- `addFeature('husky', 'on')` writes only `.husky/pre-commit`
  (the `husky` generator's owned file). It does not touch
  `package.json` (which the core generator owns), the user's
  `src/`, or any file outside `.husky/pre-commit`.
- `removeFeature('husky')` deletes only files in the
  `husky` generator's `owns` list. Files owned by other
  still-ON features are protected (shared-owned protection:
  the walker checks every other feature's `owns` and skips
  files matched by any of them).
- Files matched by **neither** the removed feature's `owns`
  nor any other feature's `owns` are not touched at all.

A file outside `owns` is a safety violation. The engine
does not have an "override" mode that bypasses the check —
a generator that needs to write a file must declare it in
its own `owns` list. This is enforced by `filterToOwned()`
in `addFeature.js` and by the `collectOtherOwns()` +
`isMatchedByAny()` filter in `removeFeature.js`.

The walker skips `node_modules`, `vendor`, `dist`, `build`,
and `.git` directories unconditionally — the engine never
touches them even if a generator's `owns` somehow matched
them.

## Adding a feature later (`addFeature`)

The installer's `wpsk add <feature>` command calls
`addFeature(dir, id, variant, { force? })` from
`packages/create-wp-project/src/addFeature.js`.

Semantics:

1. **Read** the manifest from `<dir>/wpsk-kit.json`. Missing
   manifest → **throw** (the caller asserted "this is a
   project, add a feature").
2. **Validate** the merged set `{ ...current, [id]: variant }`
   against `validateFeatureSet`. A violation returns
   `{ok: false, reason}` and writes nothing.
3. **Find** the generator descriptor for `(id, variant)` via
   the registry. Unknown id → `{ok: false, reason}`. `id ===
"core"` → `{ok: false, reason}` (core is always-on and is
   owned by the scaffold path, not the mutation path).
4. **Run** the generator with the merged feature set as
   `ctx.features` (so per-generator gates that depend on
   another feature see the post-add state). The output is
   filtered to only the generator's `owns` files; a leak
   throws.
5. **Idempotency**: if the manifest already records the
   feature as on with the same variant, the call is a
   no-op returning `{ok: true, noop: true}`. The
   no-op does **not** byte-compare files — refreshing a
   stale body is the job of `update` / migrations (Phase 24).
6. **Variant switch** (see [below](#switching-variants)):
   the walker computes the delete-set (files in the OLD
   variant's `owns` that the NEW variant doesn't claim),
   unlinks them, then writes the new files.
7. **Write** each owned file to disk. Directories are created
   on demand.
8. **Update** `wpsk-kit.json` (via `writeManifest` +
   `buildManifest`).
9. **Update** `project.config.json`'s `features` key (via
   `syncFeaturesToConfig`).

The return value is:

```js
{
  ok: true,
  written: string[],        // relative file paths the call wrote
  deleted: string[],        // relative file paths the call deleted (variant switch)
  deps: Record<string,string>,
  devDeps: Record<string,string>,
  manifest: Object,         // the new manifest
}
```

or, on validation failure / unknown id / core:

```js
{ ok: false, reason: string, written: [] }
```

The CLI uses `deps` + `devDeps` to inform the user which
npm packages to install. `written` is the list of relative
file paths the call wrote (manifest + project.config.json
are bookkeeping; only generator-emitted files are in
`written`).

Example:

```js
import { addFeature } from "@wpsk/create-wp-project";

const res = await addFeature("/path/to/project", "husky", "on");
if (res.ok) {
  console.log("Wrote:", res.written);
  console.log("Now run: npm install", Object.keys(res.devDeps).join(" "));
} else {
  console.error("Failed:", res.reason);
}
```

## Switching variants

A variant switch is an `addFeature` call where the feature is
already on with a **different** variant. The engine:

1. Computes the OLD variant's `owns` list (the descriptor for
   the current variant).
2. Computes the NEW variant's `owns` list (the descriptor for
   the requested variant).
3. Walks the project tree. For every file matched by the OLD
   `owns` AND not matched by the NEW `owns`, delete it.
4. Writes the NEW variant's owned files (the normal write
   path).
5. Updates the manifest + `project.config.json`.

Files matched by BOTH the OLD and NEW `owns` are kept (the
NEW variant will overwrite them via the normal write path
if it emits them). Files matched by NEITHER are untouched.

Example: switching `jsTest: jest` → `jsTest: vitest`. The
`jest` variant owns `jest.config.js`, `jest.setup.ts`, and
`tests/jest/**`. The `vitest` variant owns `vitest.config.ts`,
`vitest.setup.ts`, and `tests/vitest/**`. The walker
deletes `jest.config.js` and `jest.setup.ts` (not claimed
by vitest), keeps `tests/jest/**` if vitest claims it
(typically no — vitest uses `tests/vitest/**`), and writes
the vitest files.

Variant switches preserve the `kitVersion` field in the
manifest — only migrations and `update` operations bump it.

## Removing a feature (`removeFeature`)

The installer's `wpsk remove <feature>` command calls
`removeFeature(dir, id, { force? })` from
`packages/create-wp-project/src/removeFeature.js`. The
mirror of `addFeature`: turn a feature OFF in an EXISTING
project, deleting only the files the feature's generator
OWNS.

Semantics:

1. **Read** the manifest. Missing manifest → `{ok: false,
reason}` (a softer "if this is a project, turn X off"
   return — the CLI's report-back path prefers this to a
   throw).
2. **`id === "core"`** → `{ok: false, reason}`. Core is
   always-on.
3. **Unknown id** → `{ok: false, reason}`. The catalog is
   the source of truth.
4. **Compute** the new feature set with the OFF value (the
   catalog's `"off"` variant, or `"none"` for variant
   features like `js` / `css` / `phpTest`).
5. **Validate** the merged set. A violation returns
   `{ok: false, reason}` and writes nothing.
6. **Find** the generator descriptor for the CURRENT
   variant (so we know which `owns` list to delete from).
7. **Walk** the project tree. For every file matched by the
   removed feature's `owns` AND not matched by any other
   still-ON feature's `owns`, delete it.
8. **Update** `wpsk-kit.json` and `project.config.json`.

The return value is:

```js
{
  ok: true,
  written: false,            // removeFeature never emits new files
  removed: string[],         // relative file paths the call deleted
  manifest: Object,          // the new manifest
}
```

or, on refuse:

```js
{ ok: false, reason: string, removed: [] }
```

`written: false` is fixed — `removeFeature` never emits new
files. It's part of the return shape so the caller's "did
anything change?" check is uniform across `addFeature` and
`removeFeature`.

## CLI integration

The installer (the `wpsk` CLI) wraps `addFeature` and
`removeFeature` for end users. The CLI does the work of
mapping CLI flags to API calls, prompting for confirmation,
and reporting the result. From a consumer's perspective:

```bash
# Turn husky on
wpsk add husky

# Turn a variant feature on
wpsk add css --variant=tailwind

# Switch a variant
wpsk add jsTest --variant=vitest

# Turn a feature off
wpsk remove husky
```

The CLI shows the `deps` and `devDeps` from the result so
the user knows which packages to install. The `written` and
`removed` lists are shown in the post-mutation summary so
the user can review what changed.

The CLI also does a pre-flight check: if the target
directory does not have a `wpsk-kit.json`, it suggests
running `wpsk create` first (the scaffold path). The engine
APIs themselves do not do this check — they let the caller
decide how to handle a missing manifest.
