# CLI engine API reference (`@wpdev/create-wp-project`)

> Programmatic surface for scaffolding, feature toggles, migrations, and project
> health checks. The `wpdev` CLI imports these exports from
> `packages/create-wp-project/src/index.js`. For the CLI UX, see
> [cli-reference.md](../cli-reference.md). For feature semantics, see
> [features-reference.md](../features-reference.md).

## Table of contents

- [Package and import](#package-and-import)
- [Scaffold API](#scaffold-api)
- [Feature catalog API](#feature-catalog-api)
- [Manifest API](#manifest-api)
- [Feature mutation API](#feature-mutation-api)
- [Presets API](#presets-api)
- [Migrations API](#migrations-api)
- [Update planning API](#update-planning-api)
- [Doctor API](#doctor-api)
- [Kit status API](#kit-status-api)
- [Config set API](#config-set-api)
- [Manifest shape (`wpdev-kit.json`)](#manifest-shape-wpdev-kitjson)
- [Feature descriptor shape](#feature-descriptor-shape)
- [Error handling contract](#error-handling-contract)
- [Typical workflows](#typical-workflows)

---

## Package and import

```js
import {
  scaffoldProject,
  validateAnswers,
  answersToProjectConfig,
  renderTemplate,
  getFeatureCatalog,
  defaultFeatures,
  normalizeFeatureSet,
  validateFeatureSet,
  buildManifest,
  readManifest,
  writeManifest,
  syncFeaturesToConfig,
  updateJsonFile,
  getPresets,
  applyPreset,
  addFeature,
  removeFeature,
  getMigrations,
  selectMigrations,
  runMigrations,
  compareSemver,
  planUpdate,
  doctorProject,
  getDepVersions,
  getKitStatus,
  setConfigValue,
  isConfigSettable,
} from "@wpdev/create-wp-project";
```

The engine is ESM-only. Node 18+ is required. All filesystem paths passed to
engine functions must be absolute or resolvable from the caller's working
directory.

---

## Scaffold API

### `scaffoldProject(targetDir, answers, options?)`

Create a new consumer project from templates and the generator registry.

**Parameters**

| Name        | Type              | Required | Description                                  |
| ----------- | ----------------- | -------- | -------------------------------------------- |
| `targetDir` | `string`          | yes      | Absolute path where files are written        |
| `answers`   | `ScaffoldAnswers` | yes      | Branding and project metadata                |
| `options`   | `ScaffoldOptions` | no       | Feature set, force overwrite, framework path |

**`ScaffoldAnswers` shape**

| Field               | Type                  | Required | Description                                            |
| ------------------- | --------------------- | -------- | ------------------------------------------------------ |
| `slug`              | `string`              | yes      | Lowercase kebab-case project slug                      |
| `npmScope`          | `string`              | yes      | npm scope without `@`                                  |
| `globalName`        | `string`              | yes      | Valid JS identifier for the global object              |
| `textDomain`        | `string`              | yes      | WordPress text domain                                  |
| `hookPrefix`        | `string`              | yes      | Hook prefix (must not be `wpdev` with wpdev framework) |
| `localizeVar`       | `string`              | no       | JS localize global; defaults to `{globalName}Loc`      |
| `depsBundle`        | `string`              | no       | Deps bundle filename; defaults to `{slug}-deps.js`     |
| `phpFunctionPrefix` | `string`              | no       | PHP function prefix; defaults to `wpdev_`              |
| `uiFramework`       | `'preact' \| 'react'` | yes      | Overridden by `deriveUiFramework` when `jsLib` is set  |
| `projectType`       | `'plugin' \| 'theme'` | no       | Defaults to `plugin`                                   |

**`ScaffoldOptions` shape**

| Field           | Type                     | Default          | Description                               |
| --------------- | ------------------------ | ---------------- | ----------------------------------------- |
| `features`      | `Record<string, string>` | catalog defaults | Validated feature set                     |
| `force`         | `boolean`                | `false`          | Overwrite existing `project.config.json`  |
| `frameworkPath` | `string`                 | —                | Absolute path to `wpdev/framework` source |

**Returns**

```ts
Promise<{
  ok: boolean;
  written?: string[]; // relative paths written
  reason?: string; // human-readable failure
}>;
```

**Purpose:** One-shot project creation. Validates answers and features before any
disk write. Refuses to clobber an existing project unless `force: true`.

**Example**

```js
import { scaffoldProject, defaultFeatures } from "@wpdev/create-wp-project";

const res = await scaffoldProject(
  "/tmp/my-plugin",
  {
    slug: "my-plugin",
    npmScope: "myorg",
    globalName: "MyPlugin",
    textDomain: "my-plugin",
    hookPrefix: "my-plugin",
    uiFramework: "preact",
  },
  {
    features: defaultFeatures(),
    force: false,
  },
);

if (!res.ok) throw new Error(res.reason);
console.log(res.written);
```

---

### `validateAnswers(answers, features?)`

Validate branding fields before scaffold or feature mutation.

**Returns:** `{ ok: boolean, errors: Record<string, string> }`

**Example**

```js
const v = validateAnswers({ slug: "Bad Slug" });
// v.ok === false, v.errors.slug explains kebab-case rule
```

---

### `answersToProjectConfig(answers)`

Map `ScaffoldAnswers` to the `project.config.json` object shape (includes v2
keys like `restNamespace`, `vendorPrefix`, `batchEndpoint`).

**Returns:** `Record<string, unknown>`

---

### `renderTemplate(tmpl, vars)`

Replace `{{token}}` placeholders in a template string. Unknown tokens are left
verbatim so missing config is loud.

**Returns:** `string`

---

## Feature catalog API

### `getFeatureCatalog()`

Return the read-only feature descriptor array in catalog order.

**Returns:** `FeatureDescriptor[]`

---

### `defaultFeatures()`

Return a fresh `{ id: defaultVariant }` object for every catalog feature. Safe to
mutate — does not leak into subsequent calls.

**Returns:** `Record<string, string>`

---

### `normalizeFeatureSet(features)`

Coerce JS-dependent features when `js:none` (sets `jsLib`, `jsTest`, `css`,
`restBatch`, `frontendStack` to off/none equivalents).

**Returns:** `Record<string, string>`

---

### `validateFeatureSet(features, answers?, options?)`

Validate a feature set against catalog shape and cross-feature dependency rules.

**Returns**

```ts
{
  ok: boolean;
  errors: Record<string, string>; // hard violations
  warnings: Record<string, string>; // advisory only
}
```

**Options:** `{ allowUnknown?: boolean }` — when `true`, unknown feature ids are
tolerated (forward-compat reads).

**Example**

```js
const v = validateFeatureSet({
  ...defaultFeatures(),
  faultTolerance: "on",
  phpMinVersion: "7.4",
});
// v.ok === false — faultTolerance requires phpMinVersion ≥ 8.1
```

---

## Manifest API

### `buildManifest({ kitVersion, features, distMode?, generatedAt? })`

Build a manifest object (pure, no I/O).

**Returns**

```ts
{
  schema: 1;
  kitVersion: string;
  distMode: "deps" | "vendored";
  generatedAt: string; // ISO-8601
  features: Record<string, string>;
}
```

---

### `readManifest(dir)`

Read `<dir>/wpdev-kit.json`.

**Returns:** parsed object, or `null` if absent. Throws if JSON is malformed
(message includes absolute path).

---

### `writeManifest(dir, manifest)`

Write `<dir>/wpdev-kit.json` with stable key order and trailing newline.

**Returns:** `Promise<void>`

---

### `syncFeaturesToConfig(dir, features)`

Dual-write `features` into `project.config.json` (creates minimal v2 config if
missing). Updates `uiFramework` when derivable from `jsLib`.

**Returns:** `Promise<void>`

---

### `updateJsonFile(path, mutator)`

Read JSON, apply `mutator(obj)`, write back preserving formatting conventions.

**Returns:** `Promise<void>`

---

## Feature mutation API

### `addFeature(dir, featureId, variant?, options?)`

Turn a feature on or switch its variant in an existing project.

**Parameters**

| Name        | Type     | Description                                       |
| ----------- | -------- | ------------------------------------------------- |
| `dir`       | `string` | Project root                                      |
| `featureId` | `string` | Catalog id (e.g. `js`, `blocks`, `husky`)         |
| `variant`   | `string` | Required for variant features (e.g. `typescript`) |

**Returns**

```ts
Promise<{
  ok: boolean;
  reason?: string;
  written?: string[] | false;
  deps?: Record<string, string>;
  devDeps?: Record<string, string>;
  manifest?: object;
}>;
```

**Safety:** In-memory merge and validation before any write. Generator `owns`
globs limit which paths may be created or overwritten.

**Example**

```js
const res = await addFeature("/path/to/project", "jsTest", "vitest");
```

---

### `removeFeature(dir, featureId, options?)`

Turn a feature off. Deletes only paths owned by the feature (respecting shared
ownership with still-on features).

**Returns**

```ts
Promise<{
  ok: boolean;
  reason?: string;
  removed?: string[];
  written?: string[] | false;
  manifest?: object;
}>;
```

**Example**

```js
const res = await removeFeature("/path/to/project", "husky");
```

---

## Presets API

### `getPresets()`

Return named preset descriptors: `minimal`, `standard`, `full`, `woocommerce`.

**Returns**

```ts
Array<{
  id: string;
  description: string;
  features: Record<string, string>;
}>;
```

---

### `applyPreset(presetId, baseFeatures?)`

Merge a preset's feature set onto an optional base (preset wins on conflict).

**Returns:** `Record<string, string>`

**Example**

```js
import { applyPreset, validateFeatureSet } from "@wpdev/create-wp-project";

const features = applyPreset("minimal");
const v = validateFeatureSet(features);
```

---

## Migrations API

### `getMigrations()`

Return registered kit migrations sorted ascending by semver.

**Returns:** `Array<{ version, description, run(dir) }>`

---

### `selectMigrations(fromVersion, toVersion)`

Select migrations with `from < version <= to`. Throws when `to < from`.

**Returns:** migration descriptor array

---

### `runMigrations(dir, options?)`

Apply schema migrations then version migrations sequentially.

**Options:** `{ toVersion?, installDeps? }`

**Returns**

```ts
Promise<{
  ok: boolean;
  reason?: string;
  applied?: string[];
  manifest?: object;
}>;
```

**Example**

```js
const res = await runMigrations("/path/to/project", { toVersion: "1.0.0" });
```

---

### `compareSemver(a, b)`

Numeric semver compare (not lexicographic). Negative if `a < b`.

**Returns:** `number`

---

## Update planning API

### `planUpdate(dir, toVersion)`

Dry-run planner for `wpdev update`. **Never writes to disk.**

**Returns**

```ts
{
  ok: boolean;
  reason?: string;
  from?: string;
  to?: string;
  noop?: boolean;
  migrations?: Array<{ version: string; description: string }>;
  depChanges?: {
    package: { add: object; remove: object; bump: object };
    composer: { add: object; remove: object; bump: object };
  };
}
```

**Example**

```js
const plan = planUpdate("/path/to/project", "1.0.0");
if (plan.ok && !plan.noop) {
  console.log(plan.migrations, plan.depChanges);
}
```

---

### `getDepVersions()`

Return the kit's canonical dependency version registry used by `planUpdate` and
`doctorProject`.

**Returns:** registry object keyed by package name

---

## Doctor API

### `doctorProject(dir)`

Health check for a consumer project. **Never throws.**

**Returns**

```ts
{
  ok: boolean;           // true iff errors.length === 0
  warnings: string[];
  errors: string[];
}
```

Checks include: manifest readability, schema version, feature/config sync,
owned-path drift, framework deployment mode, dependency ranges, and
`project.config.json` schema validation.

**Example**

```js
const report = doctorProject(process.cwd());
if (!report.ok) {
  console.error(report.errors);
}
```

---

## Kit status API

### `getKitStatus(dir, opts?)`

Project summary for `wpdev info`. Async; never throws on missing manifest.

**Options:** `{ lookupLatest?: (currentVersion) => Promise<string|null> }`

**Returns (success)**

```ts
{
  ok: true;
  kitVersion: string;
  distMode: string;
  features: Record<string, string>;
  path: string;
  updateAvailable?: boolean;
  latestKitVersion?: string;
}
```

**Returns (failure):** `{ ok: false, reason: string }`

**Example**

```js
const status = await getKitStatus(".", {
  lookupLatest: async () => "1.0.1",
});
```

---

## Config set API

### `isConfigSettable(id)`

Whether a feature id is settable via `wpdev set` (not add/remove).

**Settable ids:** `phpMinVersion`, `wpMinVersion`, `license`, `ci`

**Returns:** `boolean`

---

### `setConfigValue(dir, key, value)`

Set a config-only feature variant.

**Returns**

```ts
Promise<{
  ok: boolean;
  reason?: string;
  written?: string[] | false;
  manifest?: object;
}>;
```

**Example**

```js
await setConfigValue("/path/to/project", "phpMinVersion", "8.2");
```

---

## Manifest shape (`wpdev-kit.json`)

The manifest is the durable record of kit version, distribution mode, and
enabled features. Written by `scaffoldProject`, `addFeature`, `removeFeature`,
`setConfigValue`, and `runMigrations`.

| Field                | Type                     | Required | Description                                       |
| -------------------- | ------------------------ | -------- | ------------------------------------------------- |
| `schema`             | `number`                 | yes      | Manifest schema version (currently `1`)           |
| `kitVersion`         | `string`                 | yes      | Kit semver that generated or last touched project |
| `distMode`           | `"deps" \| "vendored"`   | yes      | Framework delivery mode (`deps` is default)       |
| `generatedAt`        | `string`                 | yes      | ISO-8601 timestamp                                |
| `features`           | `Record<string, string>` | yes      | Validated feature variants                        |
| `migratedAt`         | `string`                 | no       | ISO-8601 timestamp of last migration run          |
| `previousKitVersion` | `string`                 | no       | Kit version before last migration                 |

**Example**

```json
{
  "schema": 1,
  "kitVersion": "1.0.0",
  "distMode": "deps",
  "generatedAt": "2026-06-18T12:00:00.000Z",
  "features": {
    "js": "typescript",
    "jsLib": "preact",
    "jsTest": "jest",
    "phpMinVersion": "7.4",
    "phpFramework": "none",
    "phpTest": "phpunit",
    "restBatch": "off",
    "faultTolerance": "off",
    "vendorScoping": "on",
    "husky": "on",
    "css": "none",
    "blocks": "off",
    "license": "gpl2",
    "wpMinVersion": "6.0",
    "exampleFeature": "on",
    "i18n": "on",
    "frontendStack": "none",
    "mcpAbilities": "off",
    "ci": "auto"
  }
}
```

`features` is also mirrored into `project.config.json` so PHP and JS runtimes can
read feature state without parsing `wpdev-kit.json`. See
[features-and-manifest.md](../features-and-manifest.md).

---

## Feature descriptor shape

Each entry from `getFeatureCatalog()` has this shape (source:
`packages/create-wp-project/src/features.js`):

| Field      | Type       | Required | Description                                       |
| ---------- | ---------- | -------- | ------------------------------------------------- |
| `id`       | `string`   | yes      | Stable feature id (matches CLI and manifest keys) |
| `label`    | `string`   | yes      | Human-readable name for CLI output                |
| `variants` | `string[]` | yes      | Allowed values; `variants[0]` is the default      |
| `default`  | `string`   | yes      | Mirrors `variants[0]`                             |
| `notes`    | `string`   | no       | Free-form description for docs and `--help`       |

Generator descriptors (internal to `packages/create-wp-project/src/generators/`)
add `owns` globs and `feature`/`variant` gates — those drive add/remove file
ownership but are not returned by `getFeatureCatalog()`. Use
`getOwnedPathsForFeature(id)` from the generator registry in engine tests when
you need owned paths programmatically.

**Example descriptor**

```js
{
  id: "js",
  label: "JavaScript",
  variants: ["typescript", "pure", "flow", "none"],
  default: "typescript",
  notes: "JavaScript pipeline. `none` = PHP-only plugin.",
}
```

---

## Error handling contract

| API surface                        | Throws? | Failure shape                     |
| ---------------------------------- | ------- | --------------------------------- |
| `scaffoldProject`                  | no      | `{ ok: false, reason }`           |
| `addFeature` / `removeFeature`     | no      | `{ ok: false, reason }`           |
| `setConfigValue`                   | no\*    | `{ ok: false, reason }`           |
| `validateFeatureSet`               | no      | `{ ok: false, errors }`           |
| `readManifest` (malformed JSON)    | yes     | `Error` with file path in message |
| `doctorProject`                    | no      | `{ ok, errors, warnings }`        |
| `getKitStatus`                     | no      | `{ ok: false, reason }`           |
| `planUpdate`                       | no      | `{ ok: false, reason }`           |
| `runMigrations`                    | no      | `{ ok: false, reason }`           |
| `selectMigrations` (invalid range) | yes     | `Error`                           |

\* `setConfigValue` throws on invalid `dir`/`key` type; business failures return
`{ ok: false, reason }`.

---

## Typical workflows

### Programmatic scaffold (CI or test harness)

```js
import { scaffoldProject, applyPreset } from "@wpdev/create-wp-project";

const features = applyPreset("standard");
await scaffoldProject("/tmp/ci-plugin", answers, { features, force: true });
```

### Toggle feature in an existing project

```js
import { addFeature, doctorProject } from "@wpdev/create-wp-project";

const health = doctorProject(dir);
if (!health.ok) throw new Error(health.errors.join("\n"));

const res = await addFeature(dir, "blocks", "on");
if (!res.ok) throw new Error(res.reason);
```

### Upgrade consumer project

```js
import { planUpdate, runMigrations } from "@wpdev/create-wp-project";

const plan = planUpdate(dir, "1.0.0");
if (!plan.ok) throw new Error(plan.reason);
if (!plan.noop) {
  const applied = await runMigrations(dir, { toVersion: "1.0.0" });
}
```

---

## See also

- [scaffold.md](../scaffold.md) — narrative scaffold internals
- [cli-reference.md](../cli-reference.md) — `wpdev` commands and flags
- [features-reference.md](../features-reference.md) — full feature catalog
- [updating-projects.md](../updating-projects.md) — migration and rollback guide
- [features-and-manifest.md](../features-and-manifest.md) — manifest ownership rules
