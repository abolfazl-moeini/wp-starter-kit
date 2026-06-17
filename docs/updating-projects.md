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

## Migrations

A **migration** is a small script under
`packages/create-wp-project/src/migrations/<version>.js` that
patches the consumer project's **glue files** to move from one
kit version to the next. The current shipping example is the
0.2.0 baseline (a no-op that gives the registry a non-empty
catalog).

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

Checks (one per documented drift category):

| Check | What it detects                                                          | Severity |
| ----- | ------------------------------------------------------------------------ | -------- |
| 1     | `wpdev-kit.json` is missing                                               | error    |
| 2     | A feature id in `manifest.features` is not in the catalog                | error    |
| 3     | `manifest.kitVersion` is NEWER than the installed kit's own version      | warning  |
| 4     | `manifest.distMode === "vendored"` and the framework files were modified | warning  |

A **warning** is informational — the project still works, it
just has drift. An **error** is fatal — the project is not in
a state the engine can reason about. The CLI's default exit
code is non-zero when `errors.length > 0`; the `--strict`
flag promotes warnings to errors.

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

## See also

- `docs/features-and-manifest.md` — what the manifest is, the
  feature set, and the `addFeature` / `removeFeature` API.
- `docs/framework-as-dependency.md` — how the kit ships
  (Phase 23), the `distMode` flip from `vendored` → `deps`.
- `plan.v3.md` §24 — the design notes this document implements.
