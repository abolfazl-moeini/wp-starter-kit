# Comprehensive Plan: Migrating the Plugin Build Tooling to Go with Real TDD

> **Status: implementation plan only. No Go code, dependency changes, installs, builds, or deploys are performed in this stage.**
> **Source reviewed:** `docs/go-migration-plan.fa.md` (397 lines, Persian, untracked, 2026-09-17).
> This document is the corrected, improved, English rewrite. The Persian draft is preserved as-is; this file is the canonical plan going forward.
> **Method:** `/migrate-tdd` — autonomous cross-language migration with strict per-unit TDD (7-phase protocol, SCC units, Oracle → Clean Red → Green, mutation, differential replay, receipts).
> **Repo:** `wp-starter-kit`, branch `codex/protection-pilot`, `wpdev.json` is source of truth (`wpdev-starter`, Preact, PHP source 8.1 → min 7.4 via Rector, vendor prefix `WpdevVendor`).

## 0. Review log — what was fixed vs. the Persian draft

The Persian draft was already strong (explicit non-goals, disk-value gate, per-unit TDD, 95%+ coverage definition, WAL/crash coverage). The following defects and gaps were fixed in this rewrite; no behavior was silently dropped:

1. **Wrong filename in request:** the request cited `docs/go-build-migration-assessment.fa.md`, which does not exist. The actual draft is `docs/go-migration-plan.fa.md`. This file (`docs/go-migration-plan.md`) is the English canonical plan.
2. **Wrong path `src/release/php-ast-transform.php` (§3, U22):** no such file. The source of truth is `packages/create-wp-project/src/release/php-ast-transform.php`, vendored into consumers as `dev/release/php-ast-transform.php` via `packages/create-wp-project/src/generators/core.js` (`loadReleaseScript`). Fixed everywhere.
3. **Wrong path `src/generators/core.js` (§3):** actual path is `packages/create-wp-project/src/generators/core.js`. Fixed.
4. **Dangling `private-runtime-assembler.js` (U22):** unqualified. Actual source is `packages/create-wp-project/src/release/private-runtime-assembler.js` (with fixture at `tests/fixtures/private-runtime-fixture/assembler.js` and tests at `tests/packages/privateRuntimeAssembler.test.js`, `tests/packages/phpAstTransform.test.js`). Fixed; U22 now names both files explicitly.
5. **Wrong path `tests-docker/` (§3):** there is no root `tests-docker/`. The Docker smoke suite lives at `packages/standalone-build/tests-docker/`. Fixed.
6. **Incomplete standalone-build inventory (§3):** the draft listed ~15 files but the package has 71 entries, including gates and inventories that carry preservation semantics (Profile S zero-regression). Added: `assemble-profile-a-candidate.mjs`, `class-completeness-gate.mjs`, `composer-dependency-inventory.mjs`, `framework-closure-inventory.mjs`, `framework-template-inventory.mjs`, `hook-contract-inventory.mjs`, `module-loader-coexistence-gate.mjs`, `protection-inventory.mjs`, `serialized-callback-inventory.mjs`, `settings-field-inventory.mjs`, `target-registry.mjs`, `profile-s-fail-closed.mjs`, `run-protection-gates.mjs`, all `validate-*.mjs` / `generate-*-manifest.mjs`, `resolve-content-root.mjs`. Inventory is now marked "seed, not exhaustive" with an explicit Phase-0 rule to close it via reachable-import + spawned-process + generator-emitted-file tracing.
7. **Incomplete create-wp-project inventory:** added `src/release/` (assembler, php-ast-transform, composer/rector helpers), `src/generators/` (core, templates, dep-versions, resolvers), `src/migrations/`, `project-config-io.js`, `validate-config.js`, `refresh-glue.js`. Added root `dev/release/build-dist.php`, `dev/fix-autoloader.php`, `dev/rector-*.php`.
8. **Missing `/migrate-tdd` workspace contract:** added `migration/` layout (`RULEBOOK.md`, `DIVERGENCES.md`, `manifest.tsv`, `inventory.tsv`, `dependency-graph.json`, `state.json`, `contracts/`, `fixtures/`, `evidence/`), SCC-as-unit rule, leaf-first topological order, layer tie-break, Cardinal Law (fix RULEBOOK/generator, never hand-patch outputs), Engineering Hold triggers, budgets, and per-unit receipt schema. The Persian draft had the spirit; this version makes it executable.
9. **Missing executable gates:** pinned Clean Red invariant (`go vet` + `go test -json`, assertion/sentinel-only failures; import/syntax/fixture/tooling failures = Broken Red, halt), mutation tool pinning in W0 (Go: `gremlins`; threshold §8), coverage checker must be versioned and test-first (raw `go test -cover` does not enforce thresholds).
10. **Ambiguous pilot:** concretized to config → hash/sidecar → minimal CLI, ~5% LOC, no deploy, with explicit pilot gate.
11. **esbuild Go binding left vague:** pinned to `github.com/evanw/esbuild/pkg/api` at a locked version; same-version-first rule for byte comparisons; version change is not a migration and needs separate approval.
12. **PHP parser assumption:** made explicit — no assumed compatible Go PHP parser. W0 evaluates license, syntax coverage (PHP 8.1 source + 7.4 target), and token/literal fidelity on a corpus before selection. If none qualifies, the PHP frontend itself becomes a test-first sub-project; a PHP-subprocess wrapper is a transition adapter, not completion of U19–U21.

## 1. Problem, goal, and commitment boundary

User goal: reduce disk waste from duplicated `node_modules` across plugin projects. Language change is a means, not the success metric. The program migrates the kit's **proprietary build/release/deploy logic** to Go while preserving observable behavior, writing tests before implementation, and holding **independent unit-test coverage above 95%**.

Two independent exit conditions:

1. **Correctness:** behavior parity within registered contracts, all test gates green, no unintended output or failure-behavior change.
2. **Practical value:** consumers no longer need a local install of the kit's Node build tooling, and measured physical disk across projects + shared stores is reduced.

High coverage is not proof of bug absence. Unit tests do not replace real ZIP, target-PHP, browser, filesystem, or post-crash recovery testing.

### 1.1 What "everything to Go" means in this program

- All **proprietary build logic** — orchestration, asset dependency extraction, bundling, caching, validation, framework merging, deploy management, and proprietary PHP transform logic — must reach an explicit disposition in the migration inventory.
- Proprietary PHP logic is not "migrated" by hiding it behind a subprocess. An adapter is a transition stage; moving its proprietary core is a mandatory independent wave (W5).
- Third-party tools — Composer, Rector, Strauss, WP-CLI, the esbuild engine — are **not rewritten**; their locked versions are invoked from Go. Remaining dependencies are declared explicitly in the final list.
- WordPress plugin runtime, PHP framework, frontend libraries, and Jest/PHPUnit/TypeScript themselves are **not** rewritten in Go.
- `scaffold`/`update` change only as much as needed to call the Go tool and drop copies of build tooling; a full scaffolder rewrite is a separate project.
- Legacy or unreachable tools are not implicitly dropped: every file gets one disposition — `migrate`, `external-dependency`, `temporary-compat`, or `retire-with-approval`.
- Nothing containing `eval`, runtime decryption, runtime PHP generation, or behavior forbidden by `AGENTS.md` enters the target. Static artifact generation at build time is distinct from runtime code generation inside the plugin.

## 2. First decision: pnpm, build, and project-dependency boundary

Record this **before** writing any Go logic; a language migration must not accidentally become an unplanned package-manager implementation.

| Category                    | Examples                                              | Target decision                                                           |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Kit-proprietary build tools | `@wpdev/build`, extraction plugin, orchestration, ZIP | Move to Go binary; no local install of kit Node build tooling in consumer |
| Frontend inputs             | Preact/React, Polaris, real plugin imports            | Keep versioned graph; evaluate pnpm for physical package sharing          |
| Optional dev tools          | Jest, Vitest, Playwright, ESLint, TypeScript          | Keep where needed; share via package store, do not delete tests           |
| PHP tools                   | Composer, Rector, Strauss, PHP interpreter, WP-CLI    | Shared versioned toolchain; project PHP deps stay separate                |
| JS/CSS engine               | esbuild                                               | Use locked-version Go API; move proprietary plugins to Go                 |

### 2.1 Dependency-decision experiment

After execution approval, pick three sample consumers: PHP-only, Preact/Polaris, browser-test project. Compare for each:

1. Current npm state with current build tools.
2. Current tools with pnpm, no Go — separates package-store gain from language-change gain.
3. Go tool with shared package store, same dependency graph and capabilities.

Metrics: total physical space (projects + store + cache + binary + toolchain), marginal space of 2nd/3rd consumer, peak build space, cold/warm install, offline build after warm-up.

- Versions, source sizes, and capabilities stay fixed across comparisons; deleting fixtures/tests/features to improve numbers is forbidden.
- On filesystems with hard links or clones, naive folder-size sums are not valid physical-space metrics; record method and limits.
- Alias, workspace, `file:src/polaris`, peer-dep, and resolution compatibility must be tested first. pnpm is **not** assumed compatible in this plan.
- Do not symlink all project `node_modules` to one mutable global folder. Each project's version and graph stay independent.
- If pnpm is incompatible, record the evidence-backed alternative; do not hide it by dropping a required dependency.
- The savings target (%) is fixed with the user after baselining, before implementation; no fabricated number is announced now.

**Realistic expectation:** a frontend-less consumer can work without build-related `node_modules`; a frontend consumer may still have a light link-based `node_modules` for its inputs. Go does not guarantee elimination of all JS packages.

## 3. Reference inventory and current boundaries

Seed inventory from read-only code review; the real SCC graph and coverage are **not yet computed** (Phase 0/1). Corrected paths only — see §0 for fixes.

| Family                          | Canonical paths                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client build                    | `core/packages/build/`, `build/`, `core/packages/utils/readProjectConfig.js`                                                                                                                                                                                                                                                                                                                                      |
| WordPress dependency extraction | `core/packages/dependency-extraction-esbuild-plugin/`                                                                                                                                                                                                                                                                                                                                                             |
| Consumer release                | `packages/create-wp-project/src/release/` (`private-runtime-assembler.js`, `php-ast-transform.php`, composer/rector helpers)                                                                                                                                                                                                                                                                                      |
| Orchestration & pipeline        | `packages/standalone-build/build-all-standalone-plugins.mjs`, `assemble-profile-s-candidate.mjs`, `assemble-profile-a-candidate.mjs`, `build-plan.mjs`                                                                                                                                                                                                                                                            |
| DAG, cache, evidence            | `packages/standalone-build/build-dag-runner.mjs`, `build-cache-engine.mjs`, `test-dependency-registry.mjs`, `test-impact-map.mjs`, `target-registry.mjs`                                                                                                                                                                                                                                                          |
| Closure & inlining              | `packages/standalone-build/inline-wpdev-closure.mjs` + closure/template inventories and gates (`framework-closure-inventory.mjs`, `framework-template-inventory.mjs`, `module-loader-coexistence-gate.mjs`, `hook-contract-inventory.mjs`, `serialized-callback-inventory.mjs`, `settings-field-inventory.mjs`, `protection-inventory.mjs`, `composer-dependency-inventory.mjs`, `artifact-prefix-inventory.mjs`) |
| Proprietary PHP transform       | `packages/standalone-build/plan3/symbol-analyzer.php`, `plan3/transformer.php`, `safe-ast-obfuscator.php` (legacy, not invoked — disposition required), `packages/create-wp-project/src/release/php-ast-transform.php`                                                                                                                                                                                            |
| Artifact & verification         | `packages/standalone-build/canonical-artifact-manifest.mjs`, `verify-profile-s-artifact.mjs`, `class-completeness-gate.mjs`, `profile-s-fail-closed.mjs`, `run-protection-gates.mjs`, `dev-purge-policy.mjs`, all `validate-*.mjs` / `generate-*-manifest.mjs`                                                                                                                                                    |
| Deploy & recovery               | `packages/standalone-build/deploy-standalone-plugin.mjs`, transactional logic in orchestrator and cache engine                                                                                                                                                                                                                                                                                                    |
| Root standalone release         | `dev/release/build-dist.php`, `dev/fix-autoloader.php`, `dev/rector-build.php`, `dev/rector-upgrade.php`, `dev/rector-prefix.php`                                                                                                                                                                                                                                                                                 |
| Translation                     | `dev/translation/`, `packages/translation/src/index.js`                                                                                                                                                                                                                                                                                                                                                           |
| Consumer wiring                 | `packages/create-wp-project/src/generators/core.js`, `_templates.js`, `dep-versions.js`, resolvers, `project-config-io.js`, `validate-config.js`, `src/migrations/`, `refresh-glue.js`                                                                                                                                                                                                                            |

At execution start, add to this inventory: every reachable file, imported helper, inline PHP inside JS, executable config, CLI entrypoint, and generator-emitted file (`dev/release/php-ast-transform.php` in consumer trees). Root `npm run release`, `composer release`, and standalone release contracts are **not** assumed identical.

Current reference tests: `tests/build/`, `tests/packages/` (incl. `phpAstTransform.test.js`, `privateRuntimeAssembler.test.js`, `generators.release.test.js`), `tests/phpunit/`, `tests/fixtures/private-runtime-fixture/`, `packages/standalone-build/tests/`, `packages/standalone-build/tests-docker/`. A prior review noted 81 standalone test files; the final count must be extracted from the frozen checkout and synced with the registry — never hardcoded to 81 forever.

## 4. Target architecture (proposed)

Proposed Go source: `packages/build-go/`, one Go module, temporary binary name `wpdev-build`. Final name and module path are frozen at start; nothing is created now.

| Proposed layer                                              | Responsibility                                         |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| `cmd/wpdev-build`                                           | Composition, exit codes, dispatch; no business logic   |
| `internal/config`, `internal/plan`                          | Schema, precedence, capabilities, BuildPlan            |
| `internal/fsops`, `internal/process`                        | Boundary operations with testable contracts            |
| `internal/toolchain`                                        | External tool resolution and verification              |
| `internal/assets`                                           | esbuild, extraction, sidecars, copy, watch             |
| `internal/php`                                              | PHP analysis frontend, transform, third-party adapters |
| `internal/closure`                                          | Framework discovery, transfer, bootstrap               |
| `internal/artifact`                                         | Purge, manifest, ZIP, verification                     |
| `internal/cache`, `internal/scheduler`, `internal/evidence` | Fingerprinting, DAG, evidence-gated authorization      |
| `internal/deploy`                                           | Locking, WAL, recovery, promotion                      |
| `internal/release`, `internal/cli`                          | Use cases and compatible interface                     |
| `internal/translation`                                      | Proprietary translation logic + WP-CLI adapter         |

Design principles:

- `wpdev.json` is the identity source; each project's config is immutable and isolated from other projects.
- Clock, seed, cancellation, and runner are injected explicitly; monkey-patching, global function pointers, and cwd-dependent shared state are forbidden.
- Small interfaces at the boundary where needed; do not manufacture one interface per struct.
- Fakes for unit tests, real adapters for integration; fakes must not reimplement product logic.
- Subprocess execution uses explicit argv, allowlisted env, secrets redacted from logs; never build shell-string commands.
- Build goes source → staging; an active plugin directory is never edited and never a ZIP extraction target.
- Toolchain downloads happen only in an explicit preparation stage; a normal build never silently fetches new tools.

## 5. Phase 0 — freeze source, build Oracle (per `/migrate-tdd`)

Before any translation:

1. Record commit SHA, working-tree status, submodules, lockfiles, runtimes, OS, toolchain. SHA alone does not represent local changes; an approved-change snapshot with digests is required.
2. Work in an isolated environment with the smallest viable copy; respect disk limits when choosing worktree, cache, and evidence retention. No destructive reset or cleanup of the user's workspace.
3. Run the full relevant source baseline, record exit codes and reports. A pre-existing failure is neither attributed to Go nor ignored.
4. For behavior without tests, write source-language characterization tests first and turn them green on the frozen snapshot. Unknown coverage ≠ sufficient coverage; below 70% is a hard alarm, but any observable behavior without an Oracle is a blocker at any coverage.
5. Isolate flakes with clock/seed/order. Quarantine is diagnostic only; a critical contract with a quarantined test is not accepted.
6. Record I/O fixtures before translation: stdout/stderr, exit codes, before/after trees, manifests, digests, subprocess requests, error categories, recovery states.
7. Separate existing bugs from desired contracts; do not blindly reproduce forbidden or unsafe behavior. Intentional changes go in `DIVERGENCES.md` with tests and user approval.

### 5.1 Governance artifacts — created at future execution time only

```text
packages/build-go/            # target Go module (created at execution, not now)
migration/
  RULEBOOK.md                 # translation rules, stable R-### IDs + version
  DIVERGENCES.md              # approved divergences; default: none accepted
  manifest.tsv                # unit, dependencies, case IDs, gate states (SCC leaf-first)
  inventory.tsv               # file, owner, role, disposition
  dependency-graph.json       # imports/calls/execs/includes + SCCs + levels
  state.json                  # effort/time/disk budgets, stop conditions
  contracts/                  # CLI, JSON, file, error, side-effect, schema contracts
  fixtures/                   # small inputs + source outputs with digests
  evidence/                   # per-unit and per-wave receipts
```

None of these files are created now; this plan document is the only deliverable of this stage.

## 6. Mandatory TDD loop per unit (Cardinal Law enforced)

The real execution unit is one SCC of the frozen graph; the table in §7 is planning families, not a computed SCC claim. Do not split a large SCC without a contractual seam. Graph order outranks apparent layer order.

**Cardinal Law:** fix the generator loop and `RULEBOOK.md`, never hand-patch individual outputs. If a translated file fails or is unidiomatic, diagnose the uncodified mapping, amend `RULEBOOK.md` (`R-###`), regenerate every unit whose receipt cites that rule, and re-run its gates.

For each behavior `Uxx-Cyy`:

1. **Contract before code:** inputs, outputs, errors, side effects, boundary cases written first.
2. **Oracle:** test carries a real assertion and is green against the frozen source SHA; for genuinely new behavior only an approved spec substitutes for an Oracle, tagged separately.
3. **Logic-less skeleton:** types, signatures, sentinel stubs only (`panic("unimplemented")` / `todo`-equivalent). Even defaulting, validation, or parsing in the skeleton counts as implementation and must not precede Red.
4. **Clean Red:** Go compiles, `go vet ./...` passes; the behavior's test fails only via assertion mismatch or sentinel. Import, fixture-setup, syntax, missing-tool, or environment-timeout failures are Broken Red and do not authorize writing logic.
5. **Red witness:** store `go test -json`, exit code, case IDs, skeleton hash. One stub's panic must not block independent Red proof of sibling cases; run cases separately when needed.
6. **Minimal Green:** write only enough logic to turn that behavior green; full implementation before Red is forbidden.
7. **Refactor:** only on a green suite; any behavior change requires a new Red loop.
8. **Coverage + mutation:** pass §8 thresholds; tests that only assert "no panic" or "mock was called" are insufficient for real logic.
9. **Parity + receipt:** related reference tests and fixture replay pass; receipt recorded.

The cycle repeats per case — never "write all implementation, add tests at the end." Declarative types without statements still need round-trip/schema tests. Shells, adapters, generators, and coverage-control tools are **not** exempt from test-first.

### 6.1 Required receipt

Source snapshot digest, target tree digest, toolchain/OS, rulebook hash + rule IDs, case IDs, Oracle/Red/Green evidence, coverage numerator/denominator, mutation result, commands + exit codes, fixture digests, allowed divergences. A target digest is not permission to auto-commit.

## 7. Migration units and contract tests before code

Order within each row: **valid behavior → boundaries → errors and no-side-effect → determinism/concurrency**. Every case binds to Oracle + Clean Red before its logic.

| Unit + source                                                                                                                     | Input → output                                                              | Tests to write before the Go implementation                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U01 — config; `core/packages/utils/readProjectConfig.js`, `packages/create-wp-project/src/{project-config-io,validate-config}.js` | JSON, cwd, allowed overrides → typed config or precise error                | Real precedence; absent vs null/false/empty; malformed JSON; two projects with no state leak; slug/domain/prefix preserved; Unicode names                                                                                                                                                                |
| U02 — BuildPlan + target registry; `build-plan.mjs`, `target-registry.mjs`                                                        | Config, profile, capability, target → plan + fingerprint                    | Per-entrypoint defaults; incompatible combos; unknown target; `--build-only` with deploy; capability change changes fingerprint; identical input → stable output                                                                                                                                         |
| U03 — paths, inventory, copy                                                                                                      | Root, policy, file tree → sorted inventory + staging                        | Empty file/dir; paths with spaces; symlink per policy; escape-from-root blocked; permission + I/O errors; source never deleted; order reproducible                                                                                                                                                       |
| U04 — process runner                                                                                                              | Executable, argv, env, stdin, context → output + exit                       | Spaces in argv without shell; non-zero exit; stdout/stderr separated; timeout; cancel; child reaped; output drained; no secret leak; no writer left behind after return                                                                                                                                  |
| U05 — shared toolchain                                                                                                            | Version, platform, store, manifest → valid executable                       | Locked lookup; wrong version/arch; truncated file or bad digest; concurrent installs; offline hit/miss; cancelled download never promoted; in-use version never deleted                                                                                                                                  |
| U06 — canonicalization + hash                                                                                                     | Bytes, JSON, inventory → digest + canonical bytes                           | Map/array order per contract; absent/null; newline + Unicode; one-byte change; numeric JSON without precision loss; asset MD5 separate from artifact SHA-256                                                                                                                                             |
| U07 — JSX, aliases, resolver                                                                                                      | UI framework, imports, mapping → resolution + options                       | React/Preact; JSX runtime; custom globals; package subpath; local Polaris; invalid import; two projects with different frameworks; no wrong externalization                                                                                                                                              |
| U08 — dependency extraction                                                                                                       | Imports + esbuild metafile → handles, globals, internal packages            | WordPress mapping; dedup + order; dynamic imports per source behavior; shared dep; unknown package; PHP value escaping; stable sidecar order                                                                                                                                                             |
| U09 — dependencies/vendor bundle                                                                                                  | Entry + config → bundle + metadata                                          | Shared Preact; Polaris present/absent; config-derived globalName; artifact hash; engine failure yields no accepted output; run sample JS to check global API                                                                                                                                             |
| U10 — components                                                                                                                  | Module tree + TS/TSX/script entries → named bundles                         | Real discovery; same-name entries in different modules; aliases; syntax error; missing entry; naming + sidecar; never overwrite unrelated asset                                                                                                                                                          |
| U11 — styles + assets                                                                                                             | Existing CSS + assetMappings → copies + sidecars                            | Current styles behavior = metadata/hash, not adding a new bundler; missing file; overwrite policy; preserve existing `.min` + siblings; copy failure + cleanup                                                                                                                                           |
| U12 — watch                                                                                                                       | Events, clock, context → rebuilds + shutdown                                | Fake events not sleeps; bursts + debounce; create/change/delete; failed rebuild then recovery; stop; no loop over own output; two projects' watchers isolated                                                                                                                                            |
| U13 — purge + Composer policy                                                                                                     | Staging, profile, composer metadata → allowed tree + config                 | Dev/intermediate removal; LICENSE/NOTICE + runtime-necessary files kept; rerun stable; scoped deps; policy error before promotion; generic vs standalone difference                                                                                                                                      |
| U14 — ZIP + manifest                                                                                                              | Tree + metadata → ZIP + manifest                                            | Generic stored-writer vs standalone writer kept distinct; ordering, permissions, timestamps; single root; payload digests; duplicate entries; small-fixture illicit path; size cap; CRC failure; never extract over active                                                                               |
| U15 — translation                                                                                                                 | Catalog, domain, source/bundle map, JSON → merged metadata + WP-CLI request | Plurals/context; UTF-8 Persian; main-wins; malformed file; source→bundle mapping; payload round-trip; external-tool error without partial catalog                                                                                                                                                        |
| U16 — framework/template inventory                                                                                                | Source/provider + symbols → closure plan                                    | Direct/transitive closure; incomplete provider; unresolved include; template order; class/function collision; public entrypoints; templates + assets outside closure excluded                                                                                                                            |
| U17 — inliner + bootstrap                                                                                                         | Closure plan + staging → framework closure + loader                         | Autoload order; exact includes; namespace isolation; ancestry preserved; `register(object)`; multi-plugin coexistence; template paths; minified+unminified preserved; no PHP execution from source merely for discovery                                                                                  |
| U18 — PHP adapters                                                                                                                | Stage, target, toolchain → stage output + report                            | Rector mandatory/optional per profile; missing target interpreter; Composer no-dev + dump-autoload ordering; malformed transformer JSON; non-zero exit; no intermediate reuse; unsupported target fails closed                                                                                           |
| U19 — PHP analysis frontend in Go                                                                                                 | PHP bytes + syntax version → tokens/AST + diagnostics                       | Corpus before parser choice; mixed namespaces; anonymous classes; traits/interfaces/enums per source version; PHP/HTML templates; heredoc/nowdoc; error positions; byte-exact literal preservation; unsupported syntax explicitly rejected                                                               |
| U20 — symbol/scope analyzer in Go                                                                                                 | AST/tokens + preserve policy → symbol graph + rename plan                   | Inheritance; trait resolution; private shadowing; closure by-ref captures; globals/superglobals; string callbacks; reflection/serialization; public WC/WP API; deterministic seed; unresolved dynamic scope fails closed                                                                                 |
| U21 — main transformer in Go                                                                                                      | Rename plan + tokens + seed → static PHP + report                           | Declaration+reference together; short callables + namespace blocks; SQL/HTML/gettext literals exact; placeholders; plugin header kept, internal comments removed; collisions; target lint + fixture-run differential; no eval/runtime decryption                                                         |
| U22 — private runtime + sub-utilities                                                                                             | Registry/policy + PHP source → private runtime or utility output            | Parity with `packages/create-wp-project/src/release/private-runtime-assembler.js` + `packages/create-wp-project/src/release/php-ast-transform.php`; unresolved dynamic calls rejected; unique prefixes; safe-utility behavior; every legacy utility either independently tested or retired with approval |
| U23 — gates + artifact verifier                                                                                                   | Artifact, plan, policy → accept/reject report                               | Class completeness; no internal DocBlocks; header; per-file syntax; target autoload; hook + settings ownership; bad digest; intermediate leak; cold-artifact check without source tree                                                                                                                   |
| U24 — cache + evidence                                                                                                            | Source/toolchain/plan + test receipts → hit/miss + stage authorization      | Any-component fingerprint change; old schema; corrupt cache; swapped artifact; stale receipt; hit without sufficient evidence never authorizes deploy; two writers; atomic-write failure                                                                                                                 |
| U25 — test planner + registry                                                                                                     | Diff, suite, profile, test inventory → required test set                    | Unknown file → conservative fallback; never drop a critical gate; real count equals registry; skipZip incompatible with artifact tests; baseline cases cover every mapped source file                                                                                                                    |
| U26 — DAG scheduler                                                                                                               | Graph, jobs, context → results + trace                                      | Dependency order; cycles; jobs=1 and parallel; first failure; pending cancellation; running drain; bounded concurrency; timeout; no goroutine leak; result independent of completion order                                                                                                               |
| U27 — assembler + release                                                                                                         | BuildPlan + adapters → candidate or failure                                 | Generic/canonical/root paths separated; inline → downgrade → transform → autoload → verify order; directory-only/ZIP; per-stage failure; bounded cleanup; no partial artifact accepted                                                                                                                   |
| U28 — lock + WAL                                                                                                                  | Filesystem state, owner, event → journal transitions                        | PID/host/token; foreign lock; stale detection per contract; unknown schema; partial journal; fsync failure; atomic write; illegal transition; full state machine                                                                                                                                         |
| U29 — deploy + recovery                                                                                                           | Valid ZIP, journal, target staging → install or rollback                    | Snapshot of same ZIP; crash at every write/fsync/rename/receipt boundary; idempotent recovery; explicit rollback failure; previous target intact; single transaction owner; receipt bound to installed bytes                                                                                             |
| U30 — CLI + compatibility                                                                                                         | argv/env/stdin → stdout/stderr/exit + dispatch                              | Help/version; unknown flags; precedence; `--candidate` truly review-only; no accidental deploy by default; signals; compat wrapper; machine-readable output per schema                                                                                                                                   |
| U31 — generator/update wiring                                                                                                     | Old consumer + tool version → Go-buildable project                          | Pre-change generated fixture; idempotent update; user files preserved; rollback; version pin; no Node build-tooling added; no library/test dep removed; real build of fresh sample                                                                                                                       |
| U32 — distribution + quality gates                                                                                                | Binary, manifest, evidence → installable release                            | Checksum + version mismatch; partial install; unsupported platform; offline; shared-store GC safety; coverage checker with zero/partial/boundary profiles; CI failures recorded, never falsely green                                                                                                     |

### 7.1 Table-specific notes

- Process/FS adapter unit tests must cover the Go adapter's own branches and error mapping; integration separately covers real OS behavior.
- ZIP tests use small bounded fixtures in a temp root only; volume-limit tests do not require building genuinely huge archives.
- Proposed package names alone create no dependency; the real graph decides U ordering.
- Go parser has no assumed available-and-compatible candidate: measure license, syntax coverage, and token/literal fidelity on a corpus before choosing. If unsuitable, the proprietary frontend is itself a test-first sub-project; a PHP wrapper is not accepted as U19 completion.
- For external engines, unit tests on invocation/response are insufficient; a real engine contract test must also be green, but its coverage is not added to Go unit coverage.

## 8. Precise meaning of "above 95% coverage"

### 8.1 Independent, non-substitutable gates

1. **Whole proprietary Go code unit statement coverage: >95%, operational target ≥96%.**
2. **Every production package independently: >95% statements.** A strong average cannot hide a weak package.
3. **All new/changed statements in every unit: 100% under unit test.** No untested added path rides on the total minimum.
4. **Every production function with behavior:** at least one mapped behavioral test, zero zero-coverage functions; wrappers and CLI are in scope.
5. **Sensitive paths:** every WAL transition, deploy authorization, cache authorization, containment, rollback, and fail-closed branch has an explicit case; statement coverage alone is insufficient here.
6. **Integration and E2E coverage reported separately**, never merged to inflate the unit number.
7. **Mutation:** kill ≥80% of valid non-equivalent mutants per unit (stricter than the skill default of 70%); any surviving mutant affecting public contract or safety blocks the receipt even if the total passes.

Go reports statement coverage, not branch coverage, by default. Branches and state tables are controlled via contract matrices, case IDs, and mutation; a statement percentage is never reported as a branch percentage.

### 8.2 Denominator and anti-gaming rules

- All production packages in the module — adapters, CLI, installer, proprietary checkers — are in the denominator.
- A package missing from the profile, hidden zero-coverage statements, or a test-less package is a failure; reconcile `go list` with source inventory and coverage.
- Untouched third-party code is not proprietary coverage; project-owned generated code is not automatically excluded.
- Testdata, test doubles, tests themselves, and statement-less declarations are not in the statement denominator; no production file is excluded merely for being hard to test.
- Build tags must not hide production code from the test binary. Only integration/e2e tests are tag-separated; each platform's production set is compared against the final binary.
- Unit tests must not depend on PHP, Node, WordPress, network, or Docker; those belong to contract/integration layers.
- Compute from exact integers `covered statements / total statements` without rounding. Displaying `95.0%` is not acceptance. Target ≥96% raw removes the +95% ambiguity.

### 8.3 Planned Go commands

Run in `packages/build-go/` after the module and tests exist at execution time — not now. Output paths must be created and verified in the isolated environment first.

```bash
go vet ./...
go test -json -count=1 ./...
go test -count=1 -race -shuffle=on ./...
go test -count=1 -cover -covermode=atomic -coverpkg=./... -coverprofile=unit.cover.out ./...
go tool cover -func=unit.cover.out
go test -count=1 -tags=integration ./...
go test -count=1 -tags=e2e ./...
```

- `go test -cover` does not enforce thresholds. A versioned, **test-first** checker reads the profile, reconciles with inventory, and exits non-zero for the total, each package, and changed statements. Its command name is frozen at implementation; its existence is not claimed now.
- Unit vs integration vs e2e are separated from the start by file/tag and CI checks; units must not secretly inflate via external subprocesses.
- Coverage is checked per platform separately; a Linux+macOS union must not hide a missing OS-branch test.
- Format via `gofmt` in check mode without auto-mutate plus a versioned supplemental analyzer (e.g. Staticcheck) after toolchain selection.
- In Clean Red only the behavior-under-implementation may fail; coverage and mutation are end-of-Green gates, not stub-green conditions.

## 9. `RULEBOOK.md` — JavaScript/PHP → Go translation rules

Minimum rule set before implementation:

| ID    | Subject + required test                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------- |
| R-001 | absent/null/false/empty + defaulting; config round-trip without meaning change                             |
| R-002 | Object/Map order vs Go maps; sort only where the contract permits                                          |
| R-003 | JavaScript UTF-16 vs Go bytes/runes; multilingual string length + slicing                                  |
| R-004 | Escapes + newlines; PHP/SQL/HTML/gettext literals byte-exact                                               |
| R-005 | JSON numbers; no precision loss or representation drift in digests                                         |
| R-006 | JS/PHP regex vs RE2; lookaround/backrefs via parser/algorithm or explicit rejection, never raw translation |
| R-007 | Exceptions/exit codes → error taxonomy; stdout/stderr + error category preserved                           |
| R-008 | Paths, symlinks, case sensitivity, separators; per-platform contract                                       |
| R-009 | Seed/time/randomness; injection + deterministic replay                                                     |
| R-010 | Promises/cancellation → goroutines/context; cancel plus drain                                              |
| R-011 | Modes, timestamps, fsync, atomic writes, renames; crash behavior, not just happy path                      |
| R-012 | Divergent ZIP writers; metadata, ordering, byte-equality policy                                            |
| R-013 | PHP AST/tokens; scope, inheritance, aliases, literal preservation                                          |
| R-014 | Cache/evidence/WAL schemas; unknown versions fail closed, compatibility explicit                           |
| R-015 | Process env + resolution; no hidden reliance on home-checkout or cwd                                       |
| R-016 | esbuild version/options + sidecars; asset hashes never conflated with artifact hashes                      |

If a mismatch traces to an incomplete rule, fix `RULEBOOK.md` and the translation generator/pattern first, then regenerate/revalidate every unit whose receipt cites that rule. Scattered output patching without recording the shared cause is forbidden.

## 10. Execution waves and per-wave exit gates

Proposed order; corrected by the real SCC in Phase 1. No layer may violate dependency order.

| Wave | Work                                                                      | Exit condition                                                                                           |
| ---- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| W0   | pnpm/build decision, baseline, inventory, contracts, fixtures             | Valid baseline; no undetermined file; disk metric approved                                               |
| W1   | Foundations + ~5% representative pilot: config → hash/sidecar → small CLI | Oracle/Clean Red/Green/mutation/coverage; fixture replay; no deploy                                      |
| W2   | Client build, extraction, aliases, copy, watch                            | Frontend fixtures bundle correctly; no Node build wrapper needed                                         |
| W3   | Purge, ZIP, manifest, Composer policy, translation orchestration          | Reproducible; legacy verifier accepts Go artifact; bounded side effects                                  |
| W4   | Closure + PHP adapters; stabilize behavior before engine move             | Inliner parity; target syntax; coexistence; no intermediate leaks                                        |
| W5   | Proprietary analysis frontend + PHP engine moved to Go                    | Full corpus under contract; target-PHP execution; no proprietary PHP left as these units' implementation |
| W6   | Cache, evidence, test planning, DAG, comprehensive assembler              | Correct cache authorization; cancel/drain; all release paths covered                                     |
| W7   | WAL, deploy, recovery in sandbox                                          | Real crash + fault injection on every boundary; compatible recovery; no live deploy                      |
| W8   | Compatible CLI, generator/update, shared toolchain, distribution          | New and old consumers buildable; no Node build-tooling copies; idempotent update                         |
| W9   | Final validation, canary, controlled retirement                           | All gates; measured savings; rollout under separate approval                                             |

If W5 hits an unsolved parser/semantics problem, the project is **not** declared "complete migration." A temporary Go+PHP output may be kept labeled partial-transition; closing scope on it requires explicit scope-change approval.

## 11. Differential testing and artifact contract

For each fixture on source snapshot and Go, compare this observation:

`N_contract(source observation) == N_contract(go observation)`

Observation covers: exit, error category, JSON responses, contractual stdout/stderr, created/deleted files, required bytes, required permissions/metadata, external-tool requests, transaction state.

### 11.1 Normalization rules

- Only timestamps, temp paths, or IDs declared non-semantic in the contract may be masked.
- Masking whole logs, dropping errors, or sorting all arrays to force green is forbidden.
- Ordinary JSON may compare canonically; JSON inside hashes/signatures must follow the exact serialization contract.
- PHP/JS/sidecars compare byte-exact wherever a consumer or hash depends on bytes.
- Compiler output may differ across esbuild versions; use the identical version first. A version change is not a migration and needs separate approval.
- ZIP has two existing contractual paths. Where a hash/signature depends on ZIP bytes, byte equality is required. Where the contract covers only extracted content, compare entries, payloads, modes, root, and manifest. Changing this boundary needs an explicit divergence.
- Run PHP fixtures on source and target interpreters and in isolated WordPress/WooCommerce — in addition to lint. Lint alone is not runtime equivalence.

### 11.2 Minimum corpus

PHP-only, Preact, React, Polaris, same-name multi-module, Persian translation, mixed namespaces, string callbacks, traits + inheritance, template scope, serialized callbacks, multi-plugin inlining, Profile S, private runtime, directory-only, cold/warm cache, tool errors, recovery.

Parser/ZIP/config adversarial inputs stay local, small, sandboxed. In-process fuzzing for parsers/schemas runs under time/memory caps — never against a live service or active install.

## 12. Concurrency and deploy special tests

For every WAL transition, cover at minimum these crash points: before/after journal write, file sync, directory sync, snapshot, extraction, first rename, second rename, verification, receipt.

Recovery acceptance requires:

- Repeated recovery yields a stable result and never destroys a healthy install.
- Unknown data or incompatible journals fail closed; no speculative repair.
- Another run's lock is never removed; ownership token checked before release.
- Snapshot, verified artifact, and receipt bound to identical bytes.
- Two concurrent runs cannot promote the same target.
- Rollback failure is never hidden; healthy fallback path and blocked state reported.
- Fault injection uses fakes **plus** real process-crash tests on a temp filesystem. Fakes alone do not prove durability.
- Kill-tests have known limits as stand-ins for real power loss; state limits in the report.
- Two sequential renames are not zero-downtime. PHP CLI + CLI OPcache health is not a web-service health check.

Through W7 all such tests run in disposable environments only. Real deploy and production-output sync need separate approval and do not follow from "tests ran automatically."

## 13. CI, quality, and evidence independence

### 13.1 Per unit/change

Oracle receipt → compile/vet → Clean Red receipt → Green unit → total/package/diff coverage → mutation → contract subset → independent review.

### 13.2 Per wave

All units with recorded seed, race detector, wave fixture replay + dependents, real integration, inventory/registry consistency, disk-budget report.

### 13.3 Before cutover

- Full source + target suites on locked versions.
- All canonical standalone tests + Docker smoke separately; a skipped test never counts as passed.
- Artifact runtime on target PHP 7.4 and frozen source version; WordPress/WooCommerce matrix matched to fixtures.
- macOS + Linux for build; deploy only on platforms whose durability/recovery is verified. Windows is not declared supported until its dedicated suite exists.
- Build reproducibility, checksums, cold/warm + offline installs.
- No assertion deletion or coverage-narrowing across the migration.
- Independent reviewer checks source-case → target-case mapping and normalization mismatches.

Current root quality commands preserved at baseline and after relevant changes: `npm test`, `composer test`, `npm run typecheck`, `npm run lint:js`, `composer validate:phpstan`, `composer validate:cs`. Standalone suites via `npm test` in that package's working directory, smoke via its dedicated `test:docker-smoke` script. Existence and exact configuration are re-verified in the start snapshot; this plan claims no green result for them.

## 14. Stops, budgets, and failure remediation

- Max three local attempts per failure with distinct hypotheses and evidence; repetition without new information is forbidden.
- Shared mismatch → RULEBOOK fix → dependent-unit receipt invalidation → replay.
- Three consecutively blocked units, inadequate parser, ambiguous schema, unverified savings, or a rule change breaking more than two green units → Engineering Hold + decision report.
- Disk, time, and fixture-volume limits recorded in state. Temp files removed only inside the run's owned scope; source, active installs, and other projects' caches untouched.
- Retention keeps one reproducible baseline plus the latest accepted run's evidence; not every unit's duplicate ZIPs.
- Mutation tool pinned in W0 for the Go version. Equivalent mutants removed only with reviewable reason; infra timeouts/crashes never count as kills.
- Threshold changes, unit-test deletion, skipped tests, or accepted diffs are never automatic exits from failure.

`state.json` budgets (frozen at W0): per-unit wall time, token/spend cap, fix attempts (default 3), disk quota for fixtures/evidence, flake-quarantine policy, hold triggers above.

## 15. Planned rollout and rollback

1. Go runs build-only beside the reference; no dual writes to an active target.
2. One low-risk consumer with real profiles selected; outputs compared.
3. After approval, the new generator pins the Go version; the prior version stays reproducible for rollback.
4. Existing projects migrate via idempotent migration with a small settings backup; frontend/test deps are never auto-deleted.
5. Deploy only after approval and WAL gates; one owning engine per transaction.
6. Go must either recover a supported old journal or block upgrade while an unfinished transaction exists. Running an old binary on an unknown new journal is forbidden.
7. Rollback covers toolchain, config, and artifact versions; swapping the binary alone without schema review is insufficient.
8. The old tool retires only after the agreed canary period with a rollback path; period + targets frozen before cutover.

## 16. Final acceptance checklist

- [ ] Every proprietary build file has an explicit inventory disposition; no helper or inline PHP missed.
- [ ] Proprietary Go logic is complete; a temporary PHP adapter is not reported as complete migration.
- [ ] Third-party deps and remaining runtimes listed exactly.
- [ ] Every behavior has Oracle → Clean Red → Green receipts; no logic written before tests.
- [ ] Total + per-package unit coverage >95% raw, target ≥96% raw.
- [ ] New/changed statements 100% unit-tested; zero zero-coverage behavioral functions.
- [ ] Mutation ≥80%, no surviving mutant on public contract/safety accepted.
- [ ] Unit, integration, E2E reported separately; no skip recorded as success.
- [ ] Fixture replay + PHP/WordPress/WooCommerce runtime in contract scope green.
- [ ] ZIP, manifest, hashes, schemas per contract or approved divergence.
- [ ] Test registry synced with real inventory.
- [ ] Cache hits alone never authorize deploy; cancellation, WAL, recovery really tested.
- [ ] Consumers need no local install of kit-proprietary Node build tooling.
- [ ] Frontend graph + essential test tooling preserved; disk savings measured without capability loss.
- [ ] Shared toolchain pinnable, offline-capable, rollback-safe; GC never harms another project.
- [ ] W0 savings metric met and reported.
- [ ] Cutover/deploy under separate approval; no active directory edited or unzipped over.

**Definition of done:** not a Go binary or a coverage number alone, but a set of test-first units with reproducible evidence, compatible behavior inside a stated contract, and real disk-cost reduction for plugin projects.
