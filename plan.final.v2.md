# wp-starter-kit — Final Release Plan v2 (Continuation)

> **Purpose**: Continuation plan for `wp-starter-kit` after `plan.final.md` (Phases 0–9) is
> fully done. Closes the remaining gaps, completes stub docs, adds missing API references,
> hardens publish readiness, and prepares the project for Open Source v1.0.0 release.
>
> **Scope**: All edits happen inside `wp-starter-kit/` unless a task says otherwise.
> Read `context.md` and `STRUCTURE.md` (repo root) before starting.
>
> **Assumption**: Every task in `plan.final.md` Phases 0–9 is **DONE**. If any phase is
> not done, complete it in `plan.final.md` first before starting this plan.
>
> **Source**: This plan merges `plan2.final.md` (now deleted) with additional gaps found by
> auditing the actual working tree.
>
> **Target audience**: A basic AI agent that reads/edits files and runs tests but is weak at
> holding large context. Every task is self-contained with exact file paths and commands.

---

## 0. How To Use This Plan (READ FIRST)

### 0.1 Task format

Every task has a fixed shape:

```
### Task P{n}-T{m}: <title>
- Type: bugfix | feature | refactor | docs | test | chore
- Gap refs: GP-XXX                    (see §2; "—" if none)
- Depends on: P{n}-T{k}               (or "none")
- Files: <exact repo-relative paths from wp-starter-kit/>
- Steps:
  1. <precise action, with file:line where relevant>
  2. ...
- TDD: <failing test to add FIRST, or "n/a (docs/chore)">
- Verify: <exact command(s) from wp-starter-kit/>
- Acceptance: <bullet list of pass conditions>
```

### 0.2 Non-negotiable rules

1. **TDD first** for every `bugfix`/`feature`/`refactor`: write a failing test, confirm it
   FAILS, implement until it PASSES. Never implement first.
2. **One task at a time.** Finish (green tests + verify command passes) before next task.
3. **Never edit outside `wp-starter-kit/`** unless the task explicitly says so.
4. **WordPress security** on any PHP change: nonces, caps, sanitize, escape, REST
   `permission_callback`.
5. **Config-driven branding**: never hardcode `wpdev`/`WPDev`/`wpdev-starter` in runtime
   code. Read from `project.config.json` / `wpdev-kit.json`.
6. **Do not commit** unless user explicitly asks. Do not push. Do not tag.
7. **Run the verify command exactly as written.** If it fails, fix it before continuing.
8. **Minimal changes.** Don't refactor unrelated code inside a task.
9. **No comments** unless a task explicitly requires a doc-comment for a public API.
10. **When a task says "see §X"**, read that section of THIS plan before editing.

### 0.3 Standard verification commands (run from `wp-starter-kit/`)

| Intent                    | Command                               |
| ------------------------- | ------------------------------------- |
| Full JS test suite        | `npm test`                            |
| Single Jest file          | `npx jest tests/path/to/file.test.js` |
| Full PHP test suite       | `composer test`                       |
| TypeScript check          | `npm run typecheck`                   |
| Lint JS                   | `npm run lint:js`                     |
| Project config validation | `npm run check`                       |
| Full build                | `npm run build`                       |
| Release build             | `npm run release`                     |
| Architecture test         | `composer test:architecture`          |
| PHPStan                   | `composer validate:phpstan`           |
| Code style                | `composer validate:cs`                |

### 0.4 Test file conventions

- **Jest**: ESM `import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals"`.
  Test files match `**/tests/**/*.test.[jt]s`. Tmp dirs via `node:os` + `node:fs`.
- **PHPUnit**: `declare(strict_types=1);`, namespace `WPDev\Tests\<Area>`, extend
  `PHPUnit\Framework\TestCase`. Call `wpdev_test_reset_wp_state()` in `setUp()`.
- **Docs tests**: `tests/docs/docsIndex.test.js` enforces required docs AND that each is
  linked from `docs/index.md`. **When you add or rename a doc, update `docs/index.md` and
  the test in the same task.**

---

## 1. State After `plan.final.md` — Confirmed Working Tree

The following are confirmed from the actual working tree before this plan starts:

### 1.1 What IS done

- CLI commands: `create`, `add`, `remove`, `set`, `update`, `doctor`, `info`, `list`
  (all exist in `packages/cli/src/commands/`).
- Package version: `@wpdev/create-wp-project` is `1.0.0`.
- API docs: `docs/api/php-reference.md` (321 lines), `docs/api/js-reference.md` (382 lines).
- Key docs: `cli-reference.md`, `features-reference.md`, `module-guide.md`,
  `packages-overview.md`, `updating-projects.md`, `wpdev-adapter.md`, `php-core-libs.md`.

### 1.2 What is NOT done (gaps confirmed in working tree)

| Area                               | Status                                                             |
| ---------------------------------- | ------------------------------------------------------------------ |
| `docs/api/cli-engine-reference.md` | **MISSING**                                                        |
| `docs/api/hooks-reference.md`      | **MISSING**                                                        |
| `docs/troubleshooting.md`          | **MISSING**                                                        |
| `packages-overview.md`             | 65 lines — **STUB** (target ≥200)                                  |
| `cli-reference.md`                 | 154 lines — **BELOW TARGET** (target ≥350)                         |
| `features-reference.md`            | 232 lines — **BELOW TARGET** (target ≥400)                         |
| `docs/api/php-reference.md`        | 321 lines — slightly below target of 350                           |
| `docs/api/js-reference.md`         | 382 lines — slightly below target of 400                           |
| Config drift validator             | `validate-config.js` likely missing                                |
| Human-readable CLI error messages  | `ui.js` humanizeValidationErrors likely missing                    |
| Build freshness check in release   | `build-dist.php` stub check                                        |
| `prepublishOnly` safety scripts    | Missing on CLI packages                                            |
| Package READMEs                    | Many publishable packages missing `README.md`                      |
| E2E wrapper test                   | `tests/cli/createWrapper.test.js` likely incomplete                |
| Version alignment test             | `tests/cli/versionSync.test.js` likely missing                     |
| `@wpdev/cli` still `private:true`  | **BLOCKS** `npm create @wpdev/plugin@latest` (GP-020)              |
| `docs/mcp-integration.md`          | **MISSING** (GP-021; README exists in `packages/mcp-integration/`) |
| `CHANGELOG.md` v1.0.0 section      | Needs full summary                                                 |

---

## 2. Gap Registry

| ID     | Severity     | Area        | Summary                                                                                                                                                                    |
| ------ | ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GP-001 | **high**     | config sync | `project.config.json` and `wpdev-kit.json` can drift after manual edits; no single source-of-truth validator.                                                              |
| GP-002 | **high**     | CLI errors  | Error messages use internal feature IDs; user sees `"feature jsLib requires js"` not human labels.                                                                         |
| GP-003 | **medium**   | doctor      | Doctor does not verify `project.config.json` schema (only manifest).                                                                                                       |
| GP-004 | **medium**   | build       | `npm run release` may succeed even if `assets/bundles/` is stale.                                                                                                          |
| GP-005 | **medium**   | publish     | `@wpdev/create-plugin` wrapper version may not match `@wpdev/cli` on npm.                                                                                                  |
| GP-006 | **medium**   | docs        | API docs not cross-linked from every package `README.md`.                                                                                                                  |
| GP-007 | **low**      | tests       | No E2E test for `npm create @wpdev/plugin@latest` wrapper path.                                                                                                            |
| GP-008 | **low**      | docs        | `docs/index.md` grouping inconsistent after doc additions.                                                                                                                 |
| GP-009 | **low**      | release     | `CHANGELOG.md` may be missing the full `## [1.0.0]` section.                                                                                                               |
| GP-010 | **low**      | config      | Example configs may be out of sync with defaults.                                                                                                                          |
| GP-011 | **high**     | docs        | `docs/api/cli-engine-reference.md` is MISSING — engine API not documented.                                                                                                 |
| GP-012 | **high**     | docs        | `docs/api/hooks-reference.md` is MISSING — WP hooks not documented.                                                                                                        |
| GP-013 | **high**     | docs        | `docs/troubleshooting.md` is MISSING.                                                                                                                                      |
| GP-014 | **high**     | docs        | `docs/packages-overview.md` is a 65-line stub (target ≥200).                                                                                                               |
| GP-015 | **high**     | docs        | `docs/cli-reference.md` is 154 lines (target ≥350).                                                                                                                        |
| GP-016 | **high**     | docs        | `docs/features-reference.md` is 232 lines (target ≥400).                                                                                                                   |
| GP-017 | **medium**   | publish     | `prepublishOnly` safety scripts missing on publishable packages.                                                                                                           |
| GP-018 | **medium**   | publish     | Many publishable packages missing `README.md`.                                                                                                                             |
| GP-019 | **medium**   | tests       | `tests/cli/versionSync.test.js` likely missing.                                                                                                                            |
| GP-020 | **critical** | publish     | `@wpdev/cli` is `private:true` — blocks the `npm create @wpdev/plugin@latest` flow (the wrapper `@wpdev/create-plugin` depends on `@wpdev/cli` which cannot be published). |
| GP-021 | **medium**   | docs        | `docs/mcp-integration.md` is missing (MCP integration is documented in `packages/mcp-integration/README.md` but not in `docs/`).                                           |

---

## 3. Phased Execution Plan

**Do not reorder phases.** Run each phase's exit gate before starting the next.

---

### Phase 0 — Verify the Baseline

Goal: confirm the assumed-done state is actually green before adding new work.

#### Task P0-T1: Capture post-plan.final baseline

- Type: chore
- Gap refs: —
- Depends on: none
- Files: — (read-only; record results)
- Steps:
  1. From `wp-starter-kit/`, run each command and record pass/fail:
     - `npm run check`
     - `npm run typecheck`
     - `npm run lint:js`
     - `npm test`
     - `composer test`
     - `composer validate:cs`
     - `composer validate:phpstan`
     - `composer test:architecture`
     - `npm run build`
     - `npm run release`
  2. Record test counts: Jest suites/tests, PHPUnit tests.
  3. Confirm `assets/bundles/ExampleFeature-admin.js` and `ExampleFeature-admin.asset.php`
     exist.
  4. Confirm `packages/create-wp-project/package.json` `version` is `1.0.0`.
  5. List any failures — these must be fixed before proceeding. If a failure maps to a
     task in `plan.final.md`, complete that task first.
- TDD: n/a
- Verify: the commands above.
- Acceptance: every command passes; version is `1.0.0`; bundles exist.

#### Task P0-T2: Verify version alignment across packages

- Type: chore
- Gap refs: GP-005, GP-019
- Depends on: P0-T1
- Files:
  `wp-starter-kit/package.json`,
  `wp-starter-kit/packages/cli/package.json`,
  `wp-starter-kit/packages/create-wp-project/package.json`,
  `wp-starter-kit/packages/cli/create-plugin/package.json`,
  `wp-starter-kit/composer.json`
- Steps:
  1. Read each file's `version` field.
  2. All of these must be `1.0.0`: root `package.json`, `packages/cli/package.json`,
     `packages/create-wp-project/package.json`, `packages/cli/create-plugin/package.json`.
  3. Confirm `packages/cli/package.json` `dependencies["@wpdev/create-wp-project"]` is
     `^1.0.0`.
  4. Confirm `packages/cli/create-plugin/package.json` `dependencies["@wpdev/cli"]` is
     `^1.0.0`.
  5. If any version differs, update it to `1.0.0` in that file.
  6. If `tests/cli/versionSync.test.js` does not exist, create it (see TDD).
- TDD: failing test in `tests/cli/versionSync.test.js`:
  - Import each `package.json` and assert `version === "1.0.0"`.
  - Assert `@wpdev/cli` dep on `@wpdev/create-wp-project` starts with `^1.0.0`.
  - Assert wrapper dep on `@wpdev/cli` starts with `^1.0.0`.
- Verify: `npx jest tests/cli/versionSync.test.js`.
- Acceptance: all publishable package versions are `1.0.0`; dep ranges match; test passes.

**Phase 0 Exit gate**: all baseline commands pass; version alignment confirmed.

---

### Phase 1 — Logical & Functional Consistency

Goal: close the remaining logical gaps that could confuse users or silently corrupt state.

#### Task P1-T1: Add a single-source-of-truth config validator

- Type: feature
- Gap refs: GP-001
- Depends on: P0-T1
- Files:
  `packages/create-wp-project/src/validate-config.js` (NEW or extend if exists),
  `packages/create-wp-project/src/doctor.js`
- Steps:
  1. Check if `packages/create-wp-project/src/validate-config.js` already exists. If not,
     create it exporting `validateProjectConfig(dir)`.
  2. The function reads `project.config.json` and `wpdev-kit.json` and verifies:
     - Both files exist and parse as valid JSON.
     - `project.config.json` has all required fields: `slug`, `globalName`, `localizeVar`,
       `textDomain`, `hookPrefix`, `npmScope`, `depsBundle`, `restNamespace`,
       `batchEndpoint`, `vendorPrefix`, `uiFramework`, `phpMinVersion`, `phpSourceVersion`.
     - `wpdev-kit.json` `features.phpMinVersion` (if present) equals
       `project.config.json` `phpMinVersion` (drift detection).
     - `project.config.json` `uiFramework` is consistent with
       `deriveUiFramework(manifest.features)` — i.e. the `uiFramework` field
       (`preact` or `react`) matches what `deriveUiFramework` would produce from
       `manifest.features.jsLib`. Note: `uiFramework` is NOT a key in
       `wpdev-kit.json` `features`; it lives only in `project.config.json` and is
       derived from `jsLib`. Import `deriveUiFramework` from
       `packages/create-wp-project/src/derive-ui-framework.js`.
     - Returns `{ errors: string[], warnings: string[] }`.
  3. In `doctorProject` (`packages/create-wp-project/src/doctor.js`), call
     `validateProjectConfig(dir)` after the manifest check. Push each error/warning into
     the doctor's result arrays. Label this section "Config consistency".
  4. Do NOT call `validateProjectConfig` during scaffold (files are being written).
- TDD: failing tests in `tests/packages/validateConfig.test.js` (create this file):
  - Missing required field `slug` → `errors` contains a message mentioning `slug`.
  - `wpdev-kit.json` `phpMinVersion: "8.1"` vs `project.config.json` `phpMinVersion: "7.4"`
    → `errors` contains a drift message.
  - Both files consistent → `errors: [], warnings: []`.
  - Then extend `tests/packages/doctor.test.js`: doctor on a drifted config reports the
    config error.
- Verify: `npx jest tests/packages/validateConfig.test.js tests/packages/doctor.test.js`.
- Acceptance: doctor catches config drift; new tests pass.

#### Task P1-T2: Humanize CLI error messages

- Type: refactor
- Gap refs: GP-002
- Depends on: P0-T1
- Files:
  `packages/create-wp-project/src/features.js`,
  `packages/cli/src/ui.js`,
  `packages/cli/src/commands/add.js`,
  `packages/cli/src/commands/remove.js`,
  `packages/cli/src/commands/set.js`
- Steps:
  1. Read `packages/create-wp-project/src/features.js`. Ensure every feature entry in the
     catalog has a `label` field (human-readable name, e.g. `"JavaScript"` for `js`,
     `"JavaScript Library"` for `jsLib`). Add missing labels inline.
  2. Read `packages/cli/src/ui.js`. Add a helper function
     `humanizeValidationErrors(result, catalog)` that takes the engine's
     `validateFeatureSet` result (`{ errors: { featureId: "string msg" }, warnings: {...} }`)
     and replaces raw feature IDs inside the string messages with their human `label`
     from the catalog. The engine returns **string messages keyed by feature id**, NOT
     structured objects — so the approach is token replacement, not object formatting:
     - For each `errors[featureId] = "jsLib requires js to be enabled"`:
       build a display string `"JavaScript Library requires JavaScript to be enabled."`
       by replacing each feature-id token found in the message with its catalog `label`.
     - Use a regex built from the catalog ids (longest-first to avoid partial matches,
       e.g. `jsLib` before `js`) to replace occurrences in the message string.
     - If a feature id has no `label`, fall back to the id itself.
     - Return `{ errors: string[], warnings: string[] }` (arrays of humanized strings).
  3. In `add.js`, `remove.js`, `set.js`: pipe engine validation results through
     `humanizeValidationErrors(result, getFeatureCatalog())` before printing. Print each
     humanized error on its own line. If `result.ok === false`, also print a hint:
     `"See: wpdev set --help for configurable features."` when the error is about a
     config-only feature.
  4. Keep the raw (un-humanized) error available on a second line when `--verbose` flag
     is present (the CLI already has `--verbose` in `KNOWN_FLAGS`; there is no `--debug`).
- TDD: failing tests in `tests/cli/ui.test.js` (create if not exists):
  - `humanizeValidationErrors({ errors: { jsLib: 'jsLib requires js to be enabled' }, warnings: {} }, catalog)`
    → `errors[0]` contains "JavaScript Library" and "JavaScript" (not the raw id "jsLib").
  - `humanizeValidationErrors({ errors: { faultTolerance: 'faultTolerance requires phpMinVersion >= 8.1' }, warnings: {} }, catalog)`
    → `errors[0]` contains "Fault Tolerance" and "PHP" (humanized).
  - A feature id with no `label` falls back to the raw id in the output string.
  - Verify the longest-id-first regex: a message containing both `jsLib` and `js` replaces
    `jsLib` → "JavaScript Library" and `js` → "JavaScript" without clobbering each other.
- Verify: `npx jest tests/cli/ui.test.js tests/cli/add.test.js tests/cli/remove.test.js`.
- Acceptance: CLI prints human-readable validation errors; no internal IDs shown raw.

#### Task P1-T3: Add `project.config.json` schema check to doctor

- Type: feature
- Gap refs: GP-003
- Depends on: P1-T1
- Files: `packages/create-wp-project/src/doctor.js`
- Steps:
  1. Confirm `validateProjectConfig(dir)` from P1-T1 is already wired into doctor. If so,
     this task is a verification pass only.
  2. If NOT wired, wire it: after the manifest schema check in `doctorProject`, call
     `validateProjectConfig(dir)` and push each error/warning into the doctor arrays with
     a "Config consistency" prefix.
  3. Run the doctor tests and confirm they pass.
- TDD: covered by P1-T1 tests. Add one more case: a missing required field in
  `project.config.json` → doctor output includes "Config consistency: missing field slug".
- Verify: `npx jest tests/packages/doctor.test.js`.
- Acceptance: doctor checks both manifest and project config.

#### Task P1-T4: Add build freshness check to release script

- Type: feature
- Gap refs: GP-004
- Depends on: P0-T1
- Files: `dev/release/build-dist.php`
- Steps:
  1. Read `dev/release/build-dist.php`. Find where `assets/` is copied to `dist/`.
  2. Before that copy, add a freshness check: for each file matching
     `glob('src/Modules/*/assets/entries/*.ts')` (and `*.js`), compare its `filemtime()`
     against the corresponding bundle in `assets/bundles/`. If any source is NEWER than its
     bundle, print `"Build outputs are stale. Run 'npm run build' first."` to stderr and
     `exit(1)`.
  3. Add a `--skip-freshness` flag: `if (in_array('--skip-freshness', $argv)) { goto copy; }`
     (or a simple flag check before the freshness loop) to bypass for CI environments where
     the build step already ran.
  4. Verify `npm run release` still works (it runs `npm run build` first, so outputs are
     fresh by the time the dist script runs).
- TDD: n/a (PHP release script). Add a PHPUnit test under
  `tests/phpunit/Release/FreshnessTest.php` using a temp directory:
  - Create `src/Modules/TestMod/assets/entries/admin.ts` with a future mtime.
  - Create `assets/bundles/TestMod-admin.js` with an old mtime.
  - Call the freshness check function → assert it returns false (stale).
- Verify: `composer test` and `npm run release`.
- Acceptance: stale builds cannot be released accidentally; `npm run release` still passes.

#### Task P1-T5: Sync example configs with runtime defaults

- Type: chore
- Gap refs: GP-010
- Depends on: P0-T2
- Files:
  `project.config.example.json`,
  `build.config.example.json`
- Steps:
  1. Read `project.config.json` and `project.config.example.json` side-by-side. Ensure the
     example contains every key that the runtime schema requires (see §3 of `context.md`).
     Confirm `phpFunctionPrefix` is NOT `"wpdev_"` (was fixed in plan.final.md B-022).
  2. Read `build.config.json` and `build.config.example.json`. Ensure the example has the
     same top-level keys: `globalMappings`, `assetMappings`, `styleEntryPoints`. Add any
     missing keys with explanatory placeholder values.
  3. If `npm run check` validates example files, run it and confirm they pass.
  4. If there is no test for example configs, create `tests/packages/configExamples.test.js`
     that: imports both example JSONs, asserts they are valid JSON, and asserts they have the
     required top-level keys.
- TDD: failing test in `tests/packages/configExamples.test.js`.
- Verify: `npm run check` and `npx jest tests/packages/configExamples.test.js`.
- Acceptance: example configs are consistent with runtime configs; test passes.

**Phase 1 Exit gate**: `npm test`, `composer test`, `npm run check` green; doctor catches
config drift; CLI errors are human-readable.

---

### Phase 2 — Create Missing API Reference Docs

> **Critical rule for every doc task**: update `docs/index.md` AND
> `tests/docs/docsIndex.test.js` in the SAME task. Run `npx jest tests/docs/` after each.

#### Task P2-T1: Audit existing docs for stubs and broken links

- Type: docs
- Gap refs: —
- Depends on: P0-T1
- Files: `docs/`, `tests/docs/docsIndex.test.js`
- Steps:
  1. Run `find docs/ -name "*.md" | sort` to list every doc file.
  2. Read `docs/index.md`. Confirm every doc file is linked from the index.
  3. Read `tests/docs/docsIndex.test.js`. Confirm its required-doc list matches the files
     on disk.
  4. For each doc, record its line count (`wc -l docs/*.md`). Flag any with < 50 lines as
     stubs. Record them so later tasks know what to fix.
  5. Fix any doc that is in the required-doc list but NOT in the index (add the link).
- TDD: n/a
- Verify: `npx jest tests/docs/docsIndex.test.js`.
- Acceptance: index and test are in sync; stubs are identified for later tasks.

#### Task P2-T2: Create `docs/api/cli-engine-reference.md`

- Type: docs
- Gap refs: GP-011
- Depends on: P2-T1
- Files:
  `docs/api/cli-engine-reference.md` (NEW),
  `docs/index.md`,
  `tests/docs/docsIndex.test.js`
- Steps:
  1. Read the following source files to extract the public engine API:
     - `packages/create-wp-project/src/index.js` — `scaffoldProject` (exported at
       `index.js:299`; there is no `scaffold.js` or `create.js`)
     - `packages/create-wp-project/src/addFeature.js` — `addFeature`
     - `packages/create-wp-project/src/removeFeature.js` — `removeFeature`
     - `packages/create-wp-project/src/config-set.js` (if exists) — `setConfigValue`
     - `packages/create-wp-project/src/plan-update.js` — `planUpdate`
     - `packages/create-wp-project/src/migrations/index.js` — `runMigrations`
     - `packages/create-wp-project/src/doctor.js` — `doctorProject`
     - `packages/create-wp-project/src/kit-status.js` — `getKitStatus`
     - `packages/create-wp-project/src/features.js` — `getFeatureCatalog`, `validateFeatureSet`
  2. For each exported function, document:
     - Function signature (JS with JSDoc types)
     - Parameters (name, type, description)
     - Return shape (typed object)
     - One-sentence purpose
     - Minimal usage example
  3. Add a section "Manifest shape (`wpdev-kit.json`)" documenting all fields:
     `schema`, `kitVersion`, `distMode`, `generatedAt`, `migratedAt` (optional),
     `previousKitVersion` (optional), `features` (object).
  4. Add a section "Feature descriptor shape" documenting the object from `getFeatureCatalog()`:
     `id`, `label`, `variants`, `default`, `owns`, `dependencies`, `conflicts`.
  5. Add a TOC at the top.
  6. Update `docs/index.md`: add `docs/api/cli-engine-reference.md` under an "API Reference"
     section.
  7. Update `tests/docs/docsIndex.test.js`: add `"api/cli-engine-reference.md"` to the
     required-doc list.
- TDD: n/a
- Verify: `npx jest tests/docs/docsIndex.test.js`.
- Acceptance: `cli-engine-reference.md` exists, ≥300 lines, every engine function
  documented, linked from index, in the required-doc test list.

#### Task P2-T3: Create `docs/api/hooks-reference.md`

- Type: docs
- Gap refs: GP-012
- Depends on: P2-T1
- Files:
  `docs/api/hooks-reference.md` (NEW),
  `docs/index.md`,
  `tests/docs/docsIndex.test.js`
- Steps:
  1. Read the following source files to find every action/filter the kit fires:
     - `packages/framework/src/Core/Plugin.php`
     - `packages/framework/src/Core/ModuleLoader.php`
     - `packages/framework/src/Support/Rest/RestSetup.php`
     - `packages/framework/src/Support/Assets.php`
     - `src/Modules/ExampleFeature/Module.php`
  2. For each `do_action()` and `apply_filters()` call, document:
  - **Hook name** (using template literal with `{$hook_prefix}`, e.g.
    `{hookPrefix}_modules_loaded`)
  - **Type**: action or filter
  - **When it fires**: the lifecycle moment
  - **Parameters**: each `$arg` with its type
  - **Return** (filters only): expected return type
  - **Example**: a minimal PHP callback
  3. Known hooks to document (confirmed from source — grep each file to verify and
     find any additional ones):
     - `{hookPrefix}_plugin_loaded` (action, fired by `Plugin::boot()` after the
       plugin is loaded — see `packages/framework/src/Core/Plugin.php`)
     - `{hookPrefix}_modules_loaded` (action, after `ModuleLoader::boot_all()` boots
       every module — see `packages/framework/src/Core/ModuleLoader.php`)
     - `{hookPrefix}_module_loader` (filter, allows swapping/decorating the
       `ModuleLoader` instance before boot — see `ModuleLoader.php`)
     - Any module-specific hooks in `ExampleFeature/Module.php` (grep for
       `do_action` / `apply_filters`).
     - Do NOT invent hooks. If `{hookPrefix}_rest_init` or
       `{hookPrefix}_enqueue_assets` do not appear in the source, do not document them.
  4. Add a section "How `hookPrefix` is set" (reads from `project.config.json`).
  5. Cross-link to `docs/hooks.md` for general WP hooks usage.
  6. Update `docs/index.md` under "API Reference" section.
  7. Update `tests/docs/docsIndex.test.js` required-doc list.
- TDD: n/a
- Verify: `npx jest tests/docs/docsIndex.test.js`.
- Acceptance: `hooks-reference.md` exists, ≥200 lines, every kit hook documented, linked.

**Phase 2 Exit gate**: `npx jest tests/docs/` green; both missing API docs exist.

---

### Phase 3 — Expand Under-Sized Docs

Each task below targets a doc that exists but is below its required line-count threshold.
Read the doc first to understand what's missing before writing.

#### Task P3-T1: Expand `docs/packages-overview.md` (65 lines → ≥200)

- Type: docs
- Gap refs: GP-014
- Depends on: P2-T1
- Files:
  `docs/packages-overview.md`,
  `docs/index.md`
- Steps:
  1. Read `docs/packages-overview.md`. It is currently a stub.
  2. Read `context.md` §3.3 for the full package list. Also read:
     - `packages/hooks/package.json`
     - `packages/utils/package.json`
     - `packages/rest-utils/package.json`
     - `packages/html-utils/package.json`
     - `packages/ui-components/package.json`
     - `packages/fetch/package.json`
     - `packages/translation/package.json`
     - `packages/rule-engine/package.json`
     - `packages/polaris-stack/package.json`
     - `packages/mcp-integration/composer.json`
     - `packages/framework/composer.json`
     - `packages/php-test-tools/composer.json`
     - `packages/create-wp-project/package.json`
     - `packages/cli/package.json`
  3. Rewrite the doc with:
     - **Section 1** "JavaScript packages": a table with columns `Package`, `npm name`,
       `Role`, `Publishable`, `API reference link`. One row per package.
     - **Section 2** "PHP packages (Composer)": same structure.
     - **Section 3** "CLI / scaffold packages": `@wpdev/create-wp-project` and `@wpdev/cli`.
     - **Section 4** "Dependency graph": which packages depend on which (text or ASCII tree).
     - **Section 5** "Build output locations": where each package's output lands
       (`assets/bundles/`, etc.).
  4. Cross-link to `docs/api/js-reference.md` and `docs/api/php-reference.md`.
  5. Ensure `docs/index.md` links to `packages-overview.md`.
- TDD: n/a
- Verify: `npx jest tests/docs/docsIndex.test.js` and `wc -l docs/packages-overview.md`
  (must be ≥200).
- Acceptance: doc is ≥200 lines, complete package table, linked from index.

#### Task P3-T2: Expand `docs/cli-reference.md` (154 lines → ≥350)

- Type: docs
- Gap refs: GP-015
- Depends on: P2-T1
- Files: `docs/cli-reference.md`, `docs/index.md`
- Steps:
  1. Read `docs/cli-reference.md` and `packages/cli/src/flags.js`. Identify all flags in
     `KNOWN_FLAGS` that are not yet documented.
  2. Read `packages/cli/src/commands/*.js` (all 8 commands) for undocumented behavior.
  3. Expand the doc to ≥350 lines, covering:
     - **Global flags** (`--yes`, `--verbose`, `--dir`, etc.) — one section per flag with
       description, default, and example.
     - **`wpdev create`**: all flags (`--js`, `--js-lib`, `--css`, `--php-min`, `--wp-min`,
       `--preset`, `--blocks`, `--php-framework`, `--mcp-abilities`, `--install`, `--git`);
       the interactive wizard flow (preset picker → branding → features → install/git).
     - **`wpdev add`**: usage, confirmation behavior, examples.
     - **`wpdev remove`**: usage, what files are deleted, examples.
     - **`wpdev set`**: all settable keys (`phpMinVersion`, `wpMinVersion`, `license`, `ci`),
       validation rules, examples.
     - **`wpdev update`**: dry-run vs apply, `--run`, `--yes`, `--to`, migration trail.
     - **`wpdev doctor`**: what it checks, exit codes, how to fix reported issues.
     - **`wpdev info`**: output format.
     - **`wpdev list`**: output format.
     - **Exit codes** table: 0 = success, 1 = error, 2 = cancelled.
     - **Environment variables** section.
     - **Troubleshooting** section (link to `docs/troubleshooting.md`).
  4. Keep the "Interactive wizard flow" section prominent — this is the core UX story.
  5. Ensure `docs/index.md` links to `cli-reference.md`.
- TDD: n/a
- Verify: `npx jest tests/docs/docsIndex.test.js` and `wc -l docs/cli-reference.md`
  (must be ≥350).
- Acceptance: ≥350 lines; every command and every flag documented; linked from index.

#### Task P3-T3: Expand `docs/features-reference.md` (232 lines → ≥400)

- Type: docs
- Gap refs: GP-016
- Depends on: P2-T1
- Files: `docs/features-reference.md`, `docs/index.md`
- Steps:
  1. Read `docs/features-reference.md` and `packages/create-wp-project/src/features.js`.
     Find every feature in `getFeatureCatalog()` that is not fully documented.
  2. Read `packages/create-wp-project/src/generators/index.js` to understand owned paths
     for each feature.
  3. For EACH of the ~18+ features, add or complete a section with:
     - **Feature name** + ID (e.g. `js`)
     - **Variants**: list all, mark the default
     - **What it enables**: what files are scaffolded, what the plugin gets
     - **Owned paths**: files deleted when feature is turned off
     - **Dependencies**: what other features must be on
     - **Conflicts**: what other features must be off
     - **Validation rules**: e.g. `faultTolerance` requires `phpMinVersion ≥ 8.1`
     - **Toggle command**: `wpdev add js typescript`, `wpdev remove js`, `wpdev set ci off`
  4. Add a "Feature matrix" table at the top (one row per feature, columns: ID, variants,
     default, dependencies, conflicts, toggle type: add/remove/set).
  5. Cross-link to topic docs (e.g. `blocks.md`, `fault-tolerance.md`, `react-preact.md`).
  6. Ensure `docs/index.md` links to `features-reference.md`.
- TDD: n/a
- Verify: `npx jest tests/docs/docsIndex.test.js` and `wc -l docs/features-reference.md`
  (must be ≥400).
- Acceptance: ≥400 lines; every feature fully documented; feature matrix table present.

#### Task P3-T4: Complete `docs/api/php-reference.md` (321 lines → ≥380)

- Type: docs
- Gap refs: —
- Depends on: P2-T1
- Files: `docs/api/php-reference.md`, `docs/index.md`
- Steps:
  1. Read `docs/api/php-reference.md` to identify gaps.
  2. Read all files in `packages/framework/src/`:
     - `Core/Plugin.php` — all static methods
     - `Core/ModuleLoader.php` — `register`, `boot_all`, `get`, `has`, `all`
     - `Core/ModuleInterface.php` — the contract methods
     - `Core/AbstractModule.php` (if exists) — base class
     - `Support/Rest/RestHandler.php` — abstract methods + concrete helpers
     - `Support/Rest/RestSetup.php` — `register`, `setup`, `rest_init`
     - `Support/Rest/AllowBatch.php` — `wrap` / `batch_response`
     - `Support/Queue/DeferredCall.php` — `queue`, `can_queue`, `run_queue`
     - `Support/Auth/CapabilityPolicy.php` — `can`, `rest_permission`
     - `Support/Shortcodes/Shortcode.php` — abstract methods
     - `Support/Shortcodes/ShortcodesSetup.php`
     - `Support/Assets.php` — `register`, `enqueue`, `asset_info`,
       `get_localize_data`, `enqueue_bundle_script`
     - `Adapters/WpdevModuleAdapter.php` — `attach`
  3. For every public method not yet documented, add a PHP code-fence signature, parameters,
     return type, one-line purpose, and security note where applicable.
  4. Add a "Quick-start: Creating a Module" section if not present:
     - Create `src/Modules/MyFeature/Module.php` implementing `ModuleInterface`.
     - Register in plugin bootstrap.
     - Implement `should_boot()` for admin-only.
     - Call `do_action` for the module-loaded hook.
  5. Add a "Security checklist" section if not present (nonce, cap, sanitize, escape).
- TDD: n/a
- Verify: `npx jest tests/docs/docsIndex.test.js` and `wc -l docs/api/php-reference.md`
  (must be ≥380).
- Acceptance: ≥380 lines; every public symbol documented; security checklist present.

#### Task P3-T5: Complete `docs/api/js-reference.md` (382 lines → ≥430)

- Type: docs
- Gap refs: —
- Depends on: P2-T1
- Files: `docs/api/js-reference.md`, `docs/index.md`
- Steps:
  1. Read `docs/api/js-reference.md` to identify gaps.
  2. For each `@wpdev/*` package, read its entry file and exported symbols. Add or complete:
     - **`@wpdev/hooks`**: every re-exported WP hook (`applyFilters`, `addAction`, etc.)
       with TS signature and when to use it.
     - **`@wpdev/utils`**: `localize`, form helpers — all with TS signature.
     - **`@wpdev/rest-utils`**: REST client + `createBatchRequest` — full TS signatures.
     - **`@wpdev/html-utils`**: `elementProps`, DOM helpers — all with TS signature.
     - **`@wpdev/ui-components`**: WDForm CRUD utils — all exported symbols.
     - **`@wpdev/fetch`**: deprecated notice + pointer to `@wpdev/rest-utils`.
     - **`@wpdev/translation`**: all 6 helpers (`parseMapFile`, `isTranslationValid`,
       `extractTranslation`, `updateTranslation`, `extractInternalPackages`,
       `mergeTranslationFiles`) with TS signatures.
     - **`@wpdev/rule-engine`**: signal tuples, rules — all exports.
     - **`@wpdev/polaris-stack`**: layout primitives + styled components — all exports.
  3. Add a section "Import map / WP globals": explain `importAsGlobals`, how the deps bundle
     works, why `import { applyFilters } from "@wordpress/hooks"` is mapped to `window.wp.hooks`.
  4. Add a section "Writing a module admin entry" with a minimal `admin.ts` example.
  5. Add a section "Testing JS modules" with a Jest example.
  6. Cross-link to `element-props.md`, `fetch-batch.md`, `signals.md`, `react-preact.md`,
     `translation.md`.
- TDD: n/a
- Verify: `npx jest tests/docs/docsIndex.test.js` and `wc -l docs/api/js-reference.md`
  (must be ≥430).
- Acceptance: ≥430 lines; every `@wpdev/*` export documented; cross-links present.

**Phase 3 Exit gate**: `npx jest tests/docs/` green; all expanded docs meet line targets.

---

### Phase 4 — Create Missing End-User Docs

#### Task P4-T1: Create `docs/troubleshooting.md`

- Type: docs
- Gap refs: GP-013
- Depends on: P3-T2, P3-T3
- Files:
  `docs/troubleshooting.md` (NEW),
  `docs/index.md`,
  `tests/docs/docsIndex.test.js`
- Steps:
  1. Collect all troubleshooting notes currently scattered across: `installer.md`,
     `cli-reference.md`, `updating-projects.md`, `build-system.md`, `vendor-scoping.md`.
  2. Organize by area with this structure:

     **Installation & Setup**
     - "CLI not found after install" → solution
     - "Node/PHP version mismatch" → solution

     **Scaffold**
     - "Scaffold fails: permission denied" → solution
     - "Scaffold creates wrong directory" → solution

     **Feature Toggles**
     - "Cannot remove `js`: dependents still on" → run `wpdev doctor` first
     - "Add feature fails validation" → human-readable error, link to features-reference.md

     **Build**
     - "Build fails: missing depsBundle" → `project.config.json` check
     - "TypeScript errors after scaffold" → check `tsconfig.json`

     **Update / Migrations**
     - "Migration fails halfway" → rollback with git
     - "Update shows no changes" → already at latest version
     - "Migration note: framework not found" → set `WPDEV_FRAMEWORK_SRC`

     **Tests**
     - "Jest can't resolve `@wpdev/*`" → check workspace symlinks

     **WordPress Runtime**
     - "REST endpoint 404" → check namespace in `project.config.json`
     - "Assets not loading" → check bundle was built

     **Release**
     - "Build outputs are stale" → run `npm run build` first

  3. Format each problem as: **Symptom** → **Cause** → **Fix** → related command/doc.
  4. Update `docs/index.md`: add under "Troubleshooting" section.
  5. Update `tests/docs/docsIndex.test.js`: add `"troubleshooting.md"` to required list.

- TDD: n/a
- Verify: `npx jest tests/docs/docsIndex.test.js` and `wc -l docs/troubleshooting.md`
  (must be ≥250).
- Acceptance: ≥250 lines; covers all areas; linked from index; in the required-doc test.

#### Task P4-T2: Restructure `docs/index.md` for clarity

- Type: docs
- Gap refs: GP-008
- Depends on: P4-T1, P2-T2, P2-T3
- Files: `docs/index.md`, `tests/docs/docsIndex.test.js`
- Steps:
  1. Read `docs/index.md` and list all linked docs. Identify grouping inconsistencies
     (docs out of section, unlabeled docs, missing one-line descriptions).
  2. Rewrite the index with clear sections:

     **Getting Started**
     - `installer.md` — Quick-start with the CLI wizard
     - `scaffold.md` — How scaffold internals work

     **Architecture & Modules**
     - `architecture.md`
     - `plugin-bootstrap.md`
     - `modules.md`
     - `module-guide.md`

     **Features & Configuration**
     - `features-reference.md` — Complete feature catalog
     - `features-and-manifest.md` — Manifest model + schema
     - `js-variants.md`
     - `css-variants.md`
     - `react-preact.md`
     - `react-preact-switch.md`

     **CLI & Updates**
     - `cli-reference.md` — All commands and flags
     - `updating-projects.md` — Migration + rollback guide
     - `troubleshooting.md` — Common problems and fixes

     **API Reference**
     - `api/php-reference.md` — PHP class API
     - `api/js-reference.md` — JavaScript package API
     - `api/cli-engine-reference.md` — Engine programmatic API
     - `api/hooks-reference.md` — WordPress hooks fired by the kit
     - `php-core-libs.md` — Support class signatures

     **Packages**
     - `packages-overview.md` — Package map and roles

     **Build & Release**
     - `build-system.md`
     - `build-outputs.md`
     - `asset-mappings.md`
     - `vendor-scoping.md`
     - `release-checklist.md`
     - `ci.md`

     **Integrations**
     - `wpdev-adapter.md`
     - `framework-as-dependency.md`
     - `blocks.md`
     - `blocks-blockstudio.md`
     - `fault-tolerance.md`
     - `mcp-integration.md` — **create this doc if it does not exist** (GP-021).
       Copy/adapt the content from `packages/mcp-integration/README.md` into
       `docs/mcp-integration.md` and add it to the required-doc test list. If you prefer
       not to duplicate, create a thin `docs/mcp-integration.md` that summarizes the
       feature and links to `packages/mcp-integration/README.md` for full details.

     **Topic Guides**
     - `hooks.md`
     - `js-hooks.md`
     - `element-props.md`
     - `localize-contract.md`
     - `signals.md`
     - `fetch-batch.md`
     - `translation.md`
     - `patch.md`
     - `php-test-tools.md`

     **Contributing & ADRs**
     - `contributing.md`
     - `adr/001-strauss-vs-php-scoper.md`
     - `adr/002-esbuild-over-webpack.md`
     - `adr/003-preact-default.md`

  3. Add a one-line description for every linked doc.
  4. Run `npx jest tests/docs/` and fix any required-doc list mismatch.

- TDD: n/a
- Verify: `npx jest tests/docs/`.
- Acceptance: index is well-organized; every doc linked with description; tests green.

**Phase 4 Exit gate**: `npx jest tests/docs/` green; troubleshooting.md exists; index
restructured.

---

### Phase 5 — Package Publishability & READMEs

#### Task P5-T1: Add `README.md` to every publishable package

- Type: docs
- Gap refs: GP-006, GP-018
- Depends on: P3-T1
- Files: `packages/*/README.md`
- Steps:
  1. For each publishable `@wpdev/*` npm package, check if a `README.md` exists. Create
     missing ones. Update ones with < 20 lines.
  2. Every README must contain exactly:
     - `# @wpdev/<name>` heading
     - One-line description (what it is)
     - `## Install` with the `npm install` command
     - `## Usage` with a minimal code snippet
     - `## API` with a link to the relevant section in `docs/api/js-reference.md` or
       `docs/api/php-reference.md`
     - `## Part of wp-starter-kit` with a link to the root README
  3. Packages that need a README (check by running
     `ls packages/*/README.md 2>/dev/null`; add where missing):
     `hooks`, `utils`, `rest-utils`, `html-utils`, `ui-components`, `translation`,
     `rule-engine`, `polaris-stack`, `fetch` (deprecated notice only).
  4. For deprecated `@wpdev/fetch`: add `> ⚠️ Deprecated. Use @wpdev/rest-utils instead.`
     as the first line.
  5. PHP packages `wpdev/framework` and `wpdev/mcp-integration` should already have READMEs
     (check in their directories). Ensure they link to `docs/api/php-reference.md`.
- TDD: add/extend a test in `tests/packages/publishable.test.js` that asserts each
  publishable package has a `README.md` file.
- Verify: `npx jest tests/packages/publishable.test.js`.
- Acceptance: every publishable package has a README; test passes.

#### Task P5-T2: Make `@wpdev/cli` publishable + add `prepublishOnly` safety checks

- Type: chore
- Gap refs: GP-017, GP-020
- Depends on: P0-T2
- Files:
  `packages/cli/package.json`,
  `packages/create-wp-project/package.json`,
  `packages/cli/create-plugin/package.json`
- Steps:
  1. **CRITICAL (GP-020)**: In `packages/cli/package.json`, remove the
     `"private": true` field. `@wpdev/cli` MUST be publishable because
     `@wpdev/create-plugin` (the `npm create @wpdev/plugin@latest` wrapper) depends on
     `@wpdev/cli` via `"@wpdev/cli": "^1.0.0"`. If `@wpdev/cli` is private, npm cannot
     publish it, and the wrapper's dependency will not resolve from the npm registry.
     Also add a `files` whitelist: `"files": ["bin", "src"]` and ensure `version`,
     `description`, `license` are present.
  2. In `packages/create-wp-project/package.json`, add:
     ```json
     "prepublishOnly": "npm test && npm run check"
     ```
     NOTE: this package is currently `"private": true` — `prepublishOnly` is a no-op on
     private packages (npm refuses to publish them, so the hook never fires). It is
     harmless as a forward-looking safety net. If the decision is to keep it private
     (it's the engine, consumed only as a workspace dep of `@wpdev/cli`), leave
     `private: true` in place. If the decision is to publish it, remove `private: true`
     and add `"files": ["src", "templates"]`.
  3. In `packages/cli/package.json`, add:
     ```json
     "prepublishOnly": "npm test"
     ```
  4. In `packages/cli/create-plugin/package.json`, add:
     ```json
     "prepublishOnly": "node -e \"console.log('Verify: @wpdev/cli is published first');\""
     ```
     (Lightweight — its only risk is a missing dep, not logic.)
  5. Verify `npm run check` (root) still passes.
- TDD: extend `tests/cli/versionSync.test.js` (or `tests/packages/publishable.test.js`)
  to assert `packages/cli/package.json` does NOT have `"private": true`.
- Verify: `npm run check` and `npx jest tests/cli/versionSync.test.js`.
- Acceptance: `@wpdev/cli` is publishable (no `private: true`); `prepublishOnly` scripts
  exist in all three packages; `@wpdev/cli` has a `files` whitelist.

#### Task P5-T3: Verify `files` whitelists on publishable packages

- Type: chore
- Gap refs: —
- Depends on: P5-T2
- Files: `packages/*/package.json`
- Steps:
  1.  For every publishable npm package, read `package.json` and confirm `files` array is
      set and does NOT include `tests/`, `node_modules/`, or `*.test.js` files.
  2.  `packages/cli/package.json` `files` must include `bin/` and `src/` (added in P5-T2).
  3.  `packages/cli/create-plugin/package.json` `files` must include the forwarding script.
  4.  `packages/create-wp-project/package.json` `files` must include `src/` and `templates/`
      (and any other runtime files). NOTE: this package is currently `"private": true` —
      the `files` field is a no-op on private packages but harmless as a forward-looking
      safety net. If P5-T2 decided to keep it private, the `files` field is optional here.
  5.  For packages without a `files` field, add one. Better to be explicit than to ship
      test fixtures.
  6.  Extend `tests/packages/publishable.test.js` to assert each publishable package has a
      `files` array.
- TDD: failing test in `tests/packages/publishable.test.js`.
- Verify: `npx jest tests/packages/publishable.test.js`.
- Acceptance: every publishable package has a `files` whitelist; test passes.

#### Task P5-T4: Document and expand `docs/release-checklist.md`

- Type: docs
- Gap refs: —
- Depends on: P5-T2, P5-T3
- Files: `docs/release-checklist.md`
- Steps:
  1. Read `docs/release-checklist.md`. Expand to ≥200 lines covering:
     - **Pre-release checks**: all verification commands (the full matrix from §0.3)
     - **Order of publication**: engine (`@wpdev/create-wp-project`) → CLI (`@wpdev/cli`) →
       wrapper (`@wpdev/create-plugin`) → other packages
     - **npm 2FA / automation token** guidance
     - **GitHub Release notes template**
     - **Post-publish smoke test**: `npm create @wpdev/plugin@latest -- --yes`
     - **Version bump procedure**: which files to update, in which order
     - **Common mistakes**: version mismatch, stale `package-lock.json`, forgetting `npm run build`
     - **Rollback procedure**: how to unpublish if something goes wrong
  2. Add a `docs/index.md` link if not present.
- TDD: n/a
- Verify: `npx jest tests/docs/docsIndex.test.js` and `wc -l docs/release-checklist.md`
  (must be ≥200).
- Acceptance: release checklist is a complete publish runbook; ≥200 lines.

**Phase 5 Exit gate**: `npm test`, `composer test`, `npx jest tests/packages/publishable.test.js`
all green; every publishable package has README + files whitelist + prepublishOnly;
`@wpdev/cli` is publishable (no `private: true`).

---

### Phase 6 — Testing Gaps

#### Task P6-T1: Add E2E test for npm create wrapper

- Type: test
- Gap refs: GP-007, GP-020
- Depends on: P5-T2
- Files:
  `tests/cli/createWrapper.test.js`,
  `packages/cli/create-plugin/`
- Steps:
  1. Read `packages/cli/create-plugin/create-wpdev-plugin.js`. Understand how it forwards
     to `@wpdev/cli`'s bin entry.
  2. Read `tests/cli/createWrapper.test.js` (if it exists). Check what it already covers.
  3. Add (or rewrite) the test to cover:
     - The wrapper resolves `@wpdev/cli` correctly (mock the module resolution).
     - Running the wrapper with `--help` does not throw.
     - The wrapper's `package.json` has `private` absent or `false`, and has a `bin` entry.
     - The wrapper's `package.json` `version` is `1.0.0`.
     - **`@wpdev/cli`'s `package.json` has `private` absent** (GP-020 — the wrapper
       depends on `@wpdev/cli`, so it must be publishable). If P5-T2 did not remove
       `private: true` from `@wpdev/cli`, this test will fail — fix P5-T2 first.
     - **`@wpdev/cli`'s `package.json` `version` is `1.0.0`**.
  4. Do NOT spin up a real npm install — mock the child process resolution.
- TDD: this IS the test task.
- Verify: `npx jest tests/cli/createWrapper.test.js`.
- Acceptance: wrapper is covered; package is not private; version is correct.

#### Task P6-T2: Add `@wpdev/translation` direct JS unit tests (if missing)

- Type: test
- Gap refs: —
- Depends on: none
- Files: `tests/packages/translation.test.js`
- Steps:
  1. Check if `tests/packages/translation.test.js` exists. If it does and has coverage for
     all 6 helpers, skip this task and mark it done.
  2. If missing or thin, create/extend to cover all helpers in
     `packages/translation/src/index.js`:
     - `parseMapFile(content)`: parses a `.pot` map string into an object.
     - `isTranslationValid(obj)`: returns true/false on a valid translation object.
     - `extractTranslation(source, key)`: extracts a translation by key.
     - `updateTranslation(obj, key, value)`: returns updated object.
     - `extractInternalPackages(manifest)`: extracts `internal_packages` from an asset.php
       manifest.
     - `mergeTranslationFiles(a, b)`: merges two translation objects.
  3. Use inline fixture strings — no file I/O needed for pure data helpers.
- TDD: this IS the test task.
- Verify: `npx jest tests/packages/translation.test.js`.
- Acceptance: all 6 helpers have direct unit tests; no failures.

**Phase 6 Exit gate**: `npm test` green; wrapper and translation covered by tests.

---

### Phase 7 — Final Integration & Release Verification

#### Task P7-T1: Full verification matrix

- Type: chore
- Gap refs: —
- Depends on: all prior phases
- Files: — (no edits)
- Steps:
  1. From `wp-starter-kit/`, run in order and record pass/fail for each:
     - `npm run check`
     - `npm run typecheck`
     - `npm run lint:js`
     - `npm test`
     - `composer test`
     - `composer validate:cs`
     - `composer validate:phpstan`
     - `composer test:architecture`
     - `npm run build`
     - `npm run release`
  2. Record final test counts (Jest suites/tests, PHPUnit tests). Every baseline failure
     from Phase 0 must now be resolved. Test count must be ≥ baseline.
  3. Confirm `assets/bundles/ExampleFeature-admin.js` exists.
  4. If any command fails, fix the root cause before continuing to P7-T2.
- TDD: n/a
- Verify: the commands above.
- Acceptance: zero failures across the matrix.

#### Task P7-T2: Scaffold smoke test — full-featured project

- Type: test
- Gap refs: —
- Depends on: P7-T1
- Files: — (creates and deletes `dist/smoke-test/`)
- Steps:
  1. Run the full-featured scaffold:
     ```bash
     node packages/cli/bin/wpdev.js create smoke-test \
       --js=typescript --js-lib=preact --frontend-stack=polaris \
       --blocks=on --php-min=8.2 --yes --dir=dist/smoke-test --install
     ```
  2. After scaffold, verify:
     - `dist/smoke-test/wpdev-kit.json` exists and features match the flags above.
     - `dist/smoke-test/project.config.json` is consistent with the manifest.
     - `wpdev doctor dist/smoke-test` exits with code 0, no errors.
  3. Run `wpdev add blocks` on the smoke project → succeeds (idempotent).
  4. Run `wpdev remove blocks` → succeeds and block files are gone.
  5. Run `wpdev set phpMinVersion 8.1` → succeeds.
  6. Run `wpdev update --run --yes` → idempotent (no changes on re-run).
  7. Clean up: `rm -rf dist/smoke-test`.
- TDD: n/a (manual smoke; if feasible, automate as `tests/cli/smoke.test.js`).
- Verify: each command in steps 1–7 exits without error.
- Acceptance: full-featured project scaffolds, doctors clean, toggles work, update is
  idempotent.

#### Task P7-T3: Scaffold smoke test — minimal (PHP-only) project

- Type: test
- Gap refs: —
- Depends on: P7-T1
- Files: — (creates and deletes `dist/minimal-test/`)
- Steps:
  1. Run a minimal scaffold:
     ```bash
     node packages/cli/bin/wpdev.js create minimal-test \
       --preset=minimal --yes --dir=dist/minimal-test
     ```
  2. Verify:
     - `dist/minimal-test/wpdev-kit.json` `features.js` is `"none"` (or absent for minimal).
     - No `package.json` or `node_modules/` inside `dist/minimal-test/` (PHP-only).
     - `wpdev doctor dist/minimal-test` exits with code 0.
  3. Clean up: `rm -rf dist/minimal-test`.
- TDD: n/a
- Verify: commands in steps 1–3 exit without error.
- Acceptance: minimal preset produces a valid PHP-only project; doctor is clean.

#### Task P7-T4: Update `CHANGELOG.md` with full v1.0.0 section

- Type: chore
- Gap refs: GP-009
- Depends on: P7-T1
- Files: `CHANGELOG.md`
- Steps:
  1. Read `CHANGELOG.md`. If a `## [1.0.0]` section exists but is thin, expand it.
     If it doesn't exist, create it at the top.
  2. The `## [1.0.0]` section must contain:
     - **Bug fixes**: summarize B-001..B-024 from `plan.final.md` §2 (one line each).
     - **New CLI commands**: `wpdev set` (config-only features), interactive preset picker,
       post-scaffold install/git prompts, add/update confirm gates.
     - **Migration improvements**: `depChanges` applied automatically, migration trail
       (`migratedAt`, `previousKitVersion`), schema migration mechanism, forward-compat.
     - **New documentation**: PHP API reference, JS API reference, CLI engine reference,
       hooks reference, troubleshooting guide, features reference, CLI reference.
     - **Breaking changes**: list any (if none: "No breaking changes from 0.x for generated
       projects").
     - **Upgrade notes**: steps to migrate from `0.x` to `1.0.0` (link to
       `docs/updating-projects.md`).
     - **Known limitations**: what is not covered in v1.0.0.
  3. Add `## [Unreleased]` section above `## [1.0.0]` for future changes.
- TDD: n/a
- Verify: `npm run check`.
- Acceptance: CHANGELOG has a complete `## [1.0.0]` section; `npm run check` passes.

#### Task P7-T5: Final docs audit

- Type: docs
- Gap refs: —
- Depends on: P7-T1, P4-T2
- Files: `docs/index.md`, `tests/docs/docsIndex.test.js`, `tests/docs/finalAudit.test.js`
- Steps:
  1. Run `npx jest tests/docs/`.
  2. Fix any missing link, required-doc mismatch, or failing assertion.
  3. Manually read every doc listed in `docs/index.md` and confirm:
     - None is a stub (no TODO/FIXME/placeholder blocks).
     - All cross-links (e.g. `[see architecture.md](architecture.md)`) resolve to existing files.
     - Version references say `1.0.0` where applicable.
  4. Fix any broken cross-link by updating the link or the referenced file.
- TDD: n/a
- Verify: `npx jest tests/docs/`.
- Acceptance: docs test suite is fully green; zero stubs; zero broken cross-links.

#### Task P7-T6: Update `README.md` for Open Source release

- Type: docs
- Gap refs: —
- Depends on: P7-T5
- Files: `README.md`
- Steps:
  1. Read `README.md`. Ensure it covers:
     - **What this is**: one-paragraph description of the starter kit.
     - **Quick-start**: `npm create @wpdev/plugin@latest` with a note about the interactive
       wizard (preset picker → branding → features → install/git).
     - **Features**: bullet list of all major capabilities (PHP 8.1+ source, Rector
       downgrade, TypeScript, esbuild, Preact/React, PHPUnit + Jest, CLI installer, optional
       packages).
     - **Documentation**: table linking to key docs (installer, CLI reference, features
       reference, API reference, architecture, contributing).
     - **License**: reference to `LICENSE` file.
     - **Contributing**: link to `docs/contributing.md`.
     - **Requirements**: Node ≥18, PHP ≥7.4, Composer.
  2. Remove any stale references to removed packages or old commands.
  3. Add a "Packages" section briefly listing the `@wpdev/*` packages and linking to
     `docs/packages-overview.md`.
- TDD: n/a
- Verify: `npx jest tests/docs/` (README is not in the required list but may be referenced).
- Acceptance: README is a polished, professional Open Source project page; no stale content.

**Phase 7 Exit gate**: The project is release-ready. All commands green. Smoke tests pass.
Docs complete. CHANGELOG written. README polished.

**Do NOT tag or publish until the user explicitly instructs.**

---

## 4. Documentation Complete State

After all phases, `docs/` will contain the following. Every file must be linked from
`docs/index.md` and (if required) enforced by `tests/docs/docsIndex.test.js`.

### Getting Started

| Path           | Min Lines | Status                         |
| -------------- | --------- | ------------------------------ |
| `installer.md` | 180       | Complete (plan.final.md P3-T1) |
| `scaffold.md`  | —         | Existing                       |

### Architecture & Modules

| Path                  | Min Lines | Status               |
| --------------------- | --------- | -------------------- |
| `architecture.md`     | —         | Existing             |
| `plugin-bootstrap.md` | —         | Existing             |
| `modules.md`          | —         | Existing             |
| `module-guide.md`     | 200       | Complete (229 lines) |

### Features & Configuration

| Path                       | Min Lines | Status                    |
| -------------------------- | --------- | ------------------------- |
| `features-reference.md`    | **400**   | **P3-T3 expands to ≥400** |
| `features-and-manifest.md` | —         | Existing                  |
| `js-variants.md`           | —         | Existing                  |
| `css-variants.md`          | —         | Existing                  |
| `react-preact.md`          | —         | Existing                  |
| `react-preact-switch.md`   | —         | Existing                  |

### CLI & Updates

| Path                   | Min Lines | Status                    |
| ---------------------- | --------- | ------------------------- |
| `cli-reference.md`     | **350**   | **P3-T2 expands to ≥350** |
| `updating-projects.md` | 250       | Complete (357 lines)      |
| `troubleshooting.md`   | **250**   | **P4-T1 creates**         |

### API Reference

| Path                          | Min Lines | Status               |
| ----------------------------- | --------- | -------------------- |
| `api/php-reference.md`        | **380**   | **P3-T4 expands**    |
| `api/js-reference.md`         | **430**   | **P3-T5 expands**    |
| `api/cli-engine-reference.md` | **300**   | **P2-T2 creates**    |
| `api/hooks-reference.md`      | **200**   | **P2-T3 creates**    |
| `php-core-libs.md`            | 200       | Complete (251 lines) |

### Packages

| Path                   | Min Lines | Status            |
| ---------------------- | --------- | ----------------- |
| `packages-overview.md` | **200**   | **P3-T1 expands** |

### Build & Release

| Path                   | Min Lines | Status            |
| ---------------------- | --------- | ----------------- |
| `build-system.md`      | —         | Existing          |
| `build-outputs.md`     | —         | Existing          |
| `asset-mappings.md`    | —         | Existing          |
| `vendor-scoping.md`    | —         | Existing          |
| `release-checklist.md` | **200**   | **P5-T4 expands** |
| `ci.md`                | —         | Existing          |

### Integrations

| Path                         | Min Lines | Status               |
| ---------------------------- | --------- | -------------------- |
| `wpdev-adapter.md`           | 120       | Complete (164 lines) |
| `framework-as-dependency.md` | —         | Existing             |
| `blocks.md`                  | —         | Existing             |
| `blocks-blockstudio.md`      | —         | Existing             |
| `fault-tolerance.md`         | —         | Existing             |

### Topic Guides

| Path                   | Min Lines | Status   |
| ---------------------- | --------- | -------- |
| `hooks.md`             | —         | Existing |
| `js-hooks.md`          | —         | Existing |
| `element-props.md`     | —         | Existing |
| `localize-contract.md` | —         | Existing |
| `signals.md`           | —         | Existing |
| `fetch-batch.md`       | —         | Existing |
| `translation.md`       | —         | Existing |
| `patch.md`             | —         | Existing |
| `php-test-tools.md`    | —         | Existing |

### Contributing

| Path                               | Min Lines | Status   |
| ---------------------------------- | --------- | -------- |
| `contributing.md`                  | —         | Existing |
| `adr/001-strauss-vs-php-scoper.md` | —         | Existing |
| `adr/002-esbuild-over-webpack.md`  | —         | Existing |
| `adr/003-preact-default.md`        | —         | Existing |

---

## 5. Release Checklist (Final v1.0.0)

Run in order. Every item must be checked before tagging/publishing.

- [ ] **P0-T1** — all baseline commands pass; no failures.
- [ ] **P0-T2** — all publishable packages at version `1.0.0`; dep ranges aligned.
- [ ] **P1-T1** — config drift validator added and wired to doctor.
- [ ] **P1-T2** — CLI error messages are human-readable.
- [ ] **P1-T4** — release script rejects stale build outputs.
- [ ] **P2-T2** — `docs/api/cli-engine-reference.md` created (≥300 lines).
- [ ] **P2-T3** — `docs/api/hooks-reference.md` created (≥200 lines).
- [ ] **P3-T1** — `docs/packages-overview.md` expanded (≥200 lines).
- [ ] **P3-T2** — `docs/cli-reference.md` expanded (≥350 lines).
- [ ] **P3-T3** — `docs/features-reference.md` expanded (≥400 lines).
- [ ] **P3-T4** — `docs/api/php-reference.md` complete (≥380 lines).
- [ ] **P3-T5** — `docs/api/js-reference.md` complete (≥430 lines).
- [ ] **P4-T1** — `docs/troubleshooting.md` created (≥250 lines).
- [ ] **P4-T2** — `docs/index.md` restructured with clear sections.
- [ ] **P5-T1** — every publishable package has `README.md`.
- [ ] **P5-T2** — `@wpdev/cli` is publishable (no `private: true`); `prepublishOnly` scripts on CLI packages.
- [ ] **P5-T3** — `files` whitelists on publishable packages.
- [ ] **P5-T4** — `docs/release-checklist.md` expanded (≥200 lines).
- [ ] **P6-T1** — npm create wrapper E2E test passes.
- [ ] **P6-T2** — `@wpdev/translation` JS unit tests pass.
- [ ] **P7-T1** — full verification matrix: zero failures.
- [ ] **P7-T2** — full-featured smoke test passes end-to-end.
- [ ] **P7-T3** — minimal smoke test passes.
- [ ] **P7-T4** — CHANGELOG has complete `## [1.0.0]` section.
- [ ] **P7-T5** — `npx jest tests/docs/` fully green; no stubs; no broken cross-links.
- [ ] **P7-T6** — `README.md` polished for Open Source release.
- [ ] No `TODO`/`FIXME`/placeholder stubs in shipped code or docs.

Await explicit user instruction before tagging or publishing.

---

## 6. Execution Order Summary

```
Phase 0  → verify plan.final.md baseline; confirm versions and bundles
Phase 1  → logical consistency (config validator, human errors, freshness, examples)
Phase 2  → create missing API docs (cli-engine-reference, hooks-reference)
Phase 3  → expand under-sized docs (packages-overview, cli-reference, features-reference,
            php-reference, js-reference)
Phase 4  → missing end-user docs (troubleshooting, index restructure)
Phase 5  → package publishability (READMEs, prepublishOnly, files whitelists, release checklist)
Phase 6  → testing gaps (wrapper E2E, translation unit tests)
Phase 7  → final integration (verification matrix, smoke tests, CHANGELOG, docs audit, README)
```

Work top-to-bottom. Do not skip the TDD step. Run the verify command after every task.
When all phases are green, the project is release-ready v1.0.0.
