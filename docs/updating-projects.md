# Updating Projects

> Phase 24 of `plan.v3.md` — the installer's update flow:
> `wpdev update` (dry-run by default), `wpdev update --run` (apply),
> `wpdev doctor` (drift report), and the rollback policy.

Generated projects are not write-once. The kit ships a small
**update / migration mechanism** so a project can move safely
from one kit version to the next. The mechanism is the same
Angular/Nx "migration script per version" model, adapted to
the wp-starter-kit's `wpdev-kit.json` manifest.

This document covers:

1. [The update flow](#the-update-flow)
2. [Migrations](#migrations)
3. [Doctor: drift detection](#doctor-drift-detection)
4. [Rollback](#rollback)
5. [Manifest schema versions](#manifest-schema-versions)
6. [The dry-run plan](#the-dry-run-plan)

## The update flow

The installer's `wpdev update` command runs in two phases:

```bash
# Phase 1 — dry-run (default). Prints the plan, writes nothing.
wpdev update                          # → kitVersion 0.1.0 → 0.2.0
wpdev update --to 0.3.0               # → target a specific version

# Phase 2 — apply. Runs the migrations, bumps the manifest.
wpdev update --run                    # → applies the plan
wpdev update --run --to 0.3.0         # → applies to a specific target
```

The dry-run step is the **safe default**. Every installer's
help text leads with "read the plan first, then run with
`--run`". The plan is a JSON object the CLI prints
human-readable:

```json
{
  "ok": true,
  "from": "0.1.0",
  "to": "0.2.0",
  "migrations": [
    {
      "version": "0.2.0",
      "description": "no-op baseline (registry smoke test)"
    }
  ],
  "depChanges": {
    "package": {
      "add": {},
      "remove": {},
      "bump": { "typescript": { "from": "^5.0.0", "to": "^5.6.0" } }
    },
    "composer": { "add": {}, "remove": {}, "bump": {} }
  }
}
```

If the project is already at or past the target version, the
plan is `{ ok: true, noop: true, current: "0.2.0" }` — no
migrations listed, no dep changes. The dry-run step is
**fail-soft**: a missing manifest is `{ ok: false, reason:
"no manifest" }`, never a throw.

## Migration trail

After a successful `wpdev update --run`, the manifest records:

| Field                | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `kitVersion`         | Current kit version (e.g. `1.0.0`)             |
| `previousKitVersion` | Version before the last migration              |
| `migratedAt`         | ISO timestamp of the last successful migration |
| `schema`             | Manifest schema number (currently `1`)         |

The trail lets `wpdev doctor` detect version skew and gives you an
audit log in `wpdev-kit.json` without reading git history.

## Schema migrations

Schema bumps run **before** version migrations. The kit ships a
`SCHEMA_MIGRATIONS` registry in `migrations/index.js`:

1. Read manifest `schema` field.
2. Apply every schema migration with `fromSchema < current < toSchema`.
3. Then run version migrations in `(from, to]` order.

Current schema path: `0 → 1` (adds/normalizes the `schema` field).

If a consumer manifest has an **unsupported** schema (newer than the
running kit knows), `readManifest()` and `doctorProject()` report a
clear "upgrade the kit first" error — never a silent crash.

## Dependency changes

The dry-run plan includes `depChanges` computed by `computeDepChanges()`:

```json
{
  "depChanges": {
    "package": {
      "add": {},
      "remove": {},
      "bump": { "typescript": { "from": "^5.0.0", "to": "^5.6.0" } }
    },
    "composer": { "add": {}, "remove": {}, "bump": {} }
  }
}
```

On `wpdev update --run`, `applyDepChanges()` patches `package.json` and
`composer.json`. During migrations, removes are skipped (`applyRemoves: false`)
so migration-added deps (e.g. commitlint) are not clobbered. Run
`--install` to apply lockfile changes after the migration.

## Migrations

A **migration** is a small script under
`packages/create-wp-project/src/migrations/<version>.js` that
patches the consumer project's **glue files** to move from one
kit version to the next. Registered versions include `0.2.0`, `0.3.0`,
`0.4.0`, and `1.0.0` (framework-as-dependency path resolution).

### Registry

The kit ships a sorted registry of all registered migrations:

```js
import { getMigrations } from "@wpdev/create-wp-project";
// → [{ version: "0.2.0", description: "no-op baseline ...", run: [Function] }, ...]
```

New migrations are added in two places:

1. Create `src/migrations/<version>.js` exporting
   `{ version, description, run(dir) }`.
2. Add the import + push to the `MIGRATIONS` array in
   `src/migrations/index.js`.

The explicit import map (vs `fs.readdir`) keeps the dependency
graph visible and tree-shaking friendly.

### Selection

`selectMigrations(from, to)` returns every registered migration
with a version in the half-open range `(from, to]`. A range
with no registered migration returns `[]`. A downgrade
attempt (`to < from`) **throws** — the caller has a
version-range bug and silently returning `[]` would mask it.

```js
selectMigrations("0.1.0", "0.3.0"); // → [0.2.0]
selectMigrations("0.2.0", "0.2.0"); // → []   (already at target)
selectMigrations("0.3.0", "0.1.0"); // throws (refuse to downgrade)
```

Sort is **numeric** semver, not lexicographic — `0.9.0 <
0.10.0`, because the underlying `compareSemver` splits on `.`
and parses each component as an integer. The test in
`migrations.select.test.js` locks the property.

### Idempotency

Running the same update twice is safe. `runMigrations` is
anchored to the manifest, not the caller's `from` argument:

```js
await runMigrations(dir, { from: "0.1.0", to: "0.2.0" });
// → { ok: true, ran: ["0.2.0"], from: "0.1.0", to: "0.2.0" }

await runMigrations(dir, { from: "0.1.0", to: "0.2.0" });
// → { ok: true, ran: [], alreadyCurrent: true, ... }
// manifest.kitVersion is now "0.2.0" — the second call is a no-op.
```

### Scope guardrails (weak-agent safety)

Per plan.v3.md §24:

- Migrations MUST be **idempotent** (safe to re-run).
- Migrations MUST NOT edit user code under `src/Modules/*`.
  The kit never rewrites a user's modules. If a migration
  needs the user to make a change, it adds a
  `MIGRATION-NOTES-<version>.md` file instead.
- A failing migration halts the chain at THAT version
  (`runMigrations` returns `{ ok: false, failedAt: <version>}`)
  and the manifest is **not** bumped. Half-applied migrations
  are a known limitation; the recommended recovery is
  [`git checkout .`](#rollback).

## Doctor: drift detection

The installer's `wpdev doctor` command runs `doctorProject(dir)`
and prints the result. The doctor is a **safe** read-only
operation — it never throws, never writes, never auto-fixes.

```bash
wpdev doctor                  # → prints { ok, warnings, errors }
wpdev doctor --strict         # → exits non-zero on warnings too
```

The result is a small object:

```js
{
  ok: true,            // true iff errors.length === 0
  warnings: [],        // non-fatal drift
  errors: []           // fatal — `wpdev update` is recommended
}
```

Checks include:

| Check              | What it detects                             | Severity |
| ------------------ | ------------------------------------------- | -------- |
| Missing manifest   | `wpdev-kit.json` absent                     | error    |
| Unknown features   | Feature id not in catalog (strict mode)     | error    |
| Forward-compat     | Unknown future feature ids from a newer kit | warning  |
| Variant drift      | Manifest variant not in catalog variants    | error    |
| Kit version skew   | `kitVersion` newer than installed kit       | warning  |
| Owned-file drift   | Generator-owned files modified on disk      | warning  |
| Vendored shim      | `distMode:vendored` framework files changed | warning  |
| Unsupported schema | Manifest schema newer than kit supports     | error    |

**Forward-compat:** An older kit reading a manifest written by a newer kit
warns on unknown feature ids (`allowUnknown: true` in validation) rather
than hard-failing. Upgrade the kit to understand new features.

A **warning** is informational — the project still works. An **error**
is fatal. Exit code `1` on errors; `--strict` promotes warnings to errors.

## Rollback

Automated rollback (reverse migrations) is **not** implemented
in v3. The recommended recovery path is:

```bash
# Before running `wpdev update --run`, the CLI prints:
#   "It is strongly recommended to commit your changes before
#    applying migrations. Rollback path: git checkout ."

git add -A
git commit -m "pre-update: 0.1.0 → 0.2.0"
wpdev update --run
# If something went wrong:
git checkout .
```

The `MIGRATION-NOTES-<version>.md` files a migration may
generate include manual rollback instructions for any change
that needs human action (e.g. "rename your `My_Foo` class to
`My_Bar` because the kit dropped the alias in 0.3.0").

Full automated rollback is deferred to a future version.

## Manifest schema versions

The manifest's `schema` field is a versioned number (currently
`1`). When the kit bumps the schema (e.g. `1 → 2`), the
upgrade requires a **migration**:

- A new migration in the registry handles the upgrade.
- The migration's `run(dir)` reads the old `schema` field,
  performs the field renames / additions / removals, and
  writes the new shape.
- `readManifest()` always reads the `schema` field. If the
  version is **unsupported** by the running kit, the reader
  reports it as a `doctorProject` error with a clear
  **"upgrade the kit first"** message.

Unknown schema versions are **never silently ignored**. A
consumer that hand-edits `wpdev-kit.json` to a future schema
that the running kit doesn't understand will see a clear
"this kit is too old — run `wpdev update`" error from the
doctor, not a silent crash later in the build.

## The dry-run plan

The plan shape (locked by `tests/packages/update.plan.test.js`):

```ts
{
  ok: boolean,
  from?: string,           // current kitVersion (omitted when noop)
  to?: string,             // requested target (omitted when noop)
  noop?: boolean,          // true when to <= from
  current?: string,        // present when noop
  migrations?: Array<{ version: string, description: string }>,
  depChanges?: {
    package:  { add: Record<string,string>, remove: Record<string,string>, bump: Record<string,{from:string,to:string}> },
    composer: { add: Record<string,string>, remove: Record<string,string>, bump: Record<string,{from:string,to:string}> }
  },
  reason?: string          // present when ok === false
}
```

The `depChanges` object reports:

- `add[dep]` — dep is in the kit's registry but missing from
  the project. The update would install it.
- `remove[dep]` — dep is in the project but not in the kit's
  registry. The update would uninstall it. The value is the
  project's current range (informational).
- `bump[dep] = { from, to }` — dep is in both, with a
  different range. The value is the project's current range
  and the registry's new range.

A dep file that doesn't exist (e.g. a PHP-only project with
no `package.json`) contributes an empty `projectDeps` to the
diff — every registry entry shows up as `add`. The dry-run
step does not crash on missing dep files.

## 1.0.0 framework migration

The `1.0.0` migration moves consumer projects to framework-as-dependency
(`distMode: deps`). It:

- Resolves the framework path via Composer (`vendor/wpdev/framework/`)
- Sets `frameworkNamespace` from `project.config.json`
- Writes `MIGRATION-NOTES-1.0.0.md` with manual steps for custom edits

Override the framework source during migration with:

```bash
WPDEV_FRAMEWORK_SRC=/path/to/wpdev-framework wpdev update --run
```

## Complete update workflow

```bash
# 1. Commit current state
git add -A && git commit -m "pre-update snapshot"

# 2. Dry-run — read the plan
wpdev update
wpdev update --to 1.0.0

# 3. Apply
wpdev update --run --to 1.0.0 --install

# 4. Verify
wpdev doctor
composer test && npm test
```

Re-running step 3 with the same target is idempotent (`alreadyCurrent: true`).

## See also

- [features-and-manifest.md](features-and-manifest.md) — manifest schema
- [features-reference.md](features-reference.md) — full feature catalog
- [cli-reference.md](cli-reference.md) — `wpdev update` flags
- [framework-as-dependency.md](framework-as-dependency.md) — `distMode` model
