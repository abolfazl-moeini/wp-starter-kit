# `/migrate-tdd` skill improvement plan

Status: skill-design notes from one execution. Do not edit `~/.claude/skills/migrate-tdd/SKILL.md` as part of the Go fix pass unless someone is ready to change the skill for the next migration.
Plans-only change: this document may be edited; the skill file, `packages/build-go/`, `migration/`, and Node sources must not be edited in this pass.

Skill under review: `~/.claude/skills/migrate-tdd/SKILL.md` (147 lines; `name: migrate-tdd`). Line refs below (`SKILL.md:23`, etc.) point at that file, not at repo `skills/` (which holds unrelated `wpdev-*` / `wordpress-e2e-tests` skills).

Case: Node build tooling → `packages/build-go` (`migration/`, rulebook v5, manifest U01–U32). The agent produced a careful W1 slice and a large paper trail. The skill's gates still reported success while parity was incomplete. The improvements below are the missing checks that would have failed that run closed, plus a few skill statements that are currently impossible to follow.

## 1. What the run actually did

Followed in form:

- `migration/` exists with `RULEBOOK.md`, `DIVERGENCES.md`, `manifest.tsv`, `inventory.tsv`, `dependency-graph.json`, `state.json`, `contracts/`, `fixtures/`, `evidence/`.
- W1 tests exist and encode a lot of JavaScript behavior (UTF-8 lossy MD5, `json2php` quoting, array-index key order, null `vendorPrefix`, CLI exit codes).
- Later review rounds wrote rules for bugs they found (negative zero, WHATWG UTF-8, trailing slashes, coverage-profile paths).

Not followed, and the skill still allowed a "green" wave:

- `dependency-graph.json` says it is a planning seed, not an AST SCC condensation. The manifest is the pre-written U01–U32 table from `docs/go-migration-plan.md`.
- Oracle scripts import the live tree and never run the Go code. `go test` and `node migration/fixtures/*.mjs` can both pass while outputs differ.
- Clean Red is a sentence in `migration/evidence/w1-pilot.json` (`go test panicked with unimplemented`). No `go test -json` artifact.
- Mutation is "not run" in `DIVERGENCES.md`, and the units are still `green`.
- `covercheck` is a product package marked `green`, and it is not invoked as a gate. Coverage percentages in receipts are measurements, not exits.
- Rulebook v5 says the review is not acceptance. `state.json` says `w1-parity-review-complete`.
- There is no generator. Reviews edited Go files, then appended rules. Nothing was regenerated from `RULEBOOK.md`.
- U06 is `green` while most of `dependency-extraction-esbuild-plugin` and `esbuild-styles.js` are unported.
- `inventory.tsv` columns are `path, owner, role, disposition`. The skill's inventory is `files, LOC, AST complexity, source coverage`. README files and the whole scaffolder are `migrate`, which contradicts the program plan's own boundary.
- Only `contracts/u01-config.md` exists. Its discovery paragraph describes the Go walk, not `getRootPath`.
- Receipts are wave narratives. v5 has none. The pilot receipt has no rulebook hash. Later receipts cite v2 and v4 hashes that v5 replaced.
- Unit tests in `hash_test.go` execute Node. The skill never forbids that, so the suite does not prove the target stands alone.
- R-004c (preserve `uint64` / `json.Number` exactly) and R-005d (canonical numbers are binary64) conflict. R-005b (lossless `UseNumber`) is superseded in prose only. The skill has no check that a new rule and an old rule can both be applied to one fixture.

The Cardinal Law ("fix the generator, never hand-patch") did not catch this, because the run had no generator to fix.

## 2. Skill defects

Skill map for reviewers: Cardinal Law `SKILL.md:23-28`; command interface `SKILL.md:31-45`; workspace layout `SKILL.md:48-66`; Phase 0 `SKILL.md:72-77`; Phase 1 `SKILL.md:79-83`; Phase 2 `SKILL.md:85-94`; Phase 3–4 + Clean Red `SKILL.md:96-120`; Phase 5 `SKILL.md:122-128`; self-healing `SKILL.md:137-147`.

### 2.1 Undefined "5-artifact separation"

The description requires it. The body never names the five artifacts. Agents cannot comply, and reviewers cannot score the miss. Either delete the phrase or define the five files and a presence check.

Proposed set, if it stays: source manifest, rulebook, oracle fixtures, target tests, evidence receipt. Contracts and divergences are additional, not a silent sixth inside the five.

### 2.2 The generator law does not match agent migrations (`SKILL.md:23-28`, `SKILL.md:137-147`)

The law assumes a translator that reads `RULEBOOK.md` and emits units. This migration was hand-written Go plus tests. When a bug appeared, the agent patched Go and then wrote a rule describing the patch. That satisfies the file layout and violates the law. The law's prescribed repair is `git reset --hard` to a unit checkpoint and regenerate. On a shared branch that reset is destructive, so agents will skip it. The skill then has a rule nobody can apply.

Change the law to two legal modes:

- **Generator mode.** Rules are inputs. Outputs are disposable. A rule change invalidates every receipt whose `rules_applied` contains that id. Regeneration happens in a worktree. `git reset --hard` of the user's branch is forbidden. Concrete replacement:
  ```bash
  git worktree add /tmp/migrate-regen-<unit> migrate/build-go
  # re-run generator for <unit> inside the worktree, re-run gates, then
  git worktree remove /tmp/migrate-regen-<unit>
  ```
  Checkpoints live in the worktree; the user branch is never force-reset.
- **Hand-port mode.** Declared in `state.json` (`"translator": "hand"`). The law becomes: a production change that alters observable behavior must add or supersede an `R-###` in the same change, with a fixture that fails if the rule is removed. Hand-port mode cannot be described as generated. Receipts set `"generated": false`.

Add an explicit invalid state: rulebook edited after the code, with no fixture that was red under the previous rule.

### 2.3 "Oracle green" is not parity

Phase 4 step 4 requires each case to be green on the source and to contain one assertion. It does not require the assertion to compare source output to target output. Phase 5 is the differential replay, and it is easy to defer while Phase 4 marks the unit green.

Require, per case id, one fixture file recorded before target code exists:

- input bytes or argv
- source stdout, stderr, exit code, and file-tree digest
- a command line that reproduces the source side from the freeze

The target test must load that file and compare. A Node script that only `assert`s against Node is a characterization test, not an oracle for the port. Name them differently in the skill so agents stop pasting the characterization result into `oracle: PASS`.

### 2.4 Freeze is a SHA, not a snapshot (`SKILL.md:72-77` step 2)

`state.json` records `8c1e9baf`. Oracles import whatever is on disk now. That happened to be safe here (those JS files did not change), but the skill would not have noticed if they had.

Require `migration/freeze.json` with this schema (example):

```json
{
  "sha": "8c1e9baf7359750e2a8d2efca58a316744f3e2e6",
  "status_porcelain_sha256": "<sha256 of `git status --porcelain -- <wave-sources>`>",
  "blobs": [
    {
      "path": "core/packages/utils/readProjectConfig.js",
      "blob_sha": "<git hash-object output>"
    }
  ]
}
```

The oracle command refuses to run when a blob SHA drifts, unless `DIVERGENCES.md` records a re-freeze with approver + date.

### 2.5 Clean Red is not evidence unless the log is stored (`SKILL.md:116-120`)

"go vet passed and the test panicked" is not a Clean Red record. Require `migration/evidence/<unit>/red.json` produced by `go test -json` (or the language equivalent), with this minimal schema:

```json
{
  "unit": "U01",
  "exit_code": 1,
  "static_gate": { "command": ["go", "vet", "./..."], "exit_code": 0 },
  "failures": [
    { "test": "TestRead_...", "reason": "assertion-diff | sentinel" }
  ],
  "illegal_present": false
}
```

Rules: non-zero exit; every failed test named; each failure attributed to an assertion diff or the sentinel string; no `compile`, `import`, `setup`, or timeout actions in the failure list (`illegal_present: false`).

If the log is missing, the unit cannot leave `stub`. Add a one-page example of a legal red log and an illegal one (compile error, fixture `ENOENT`, sentinel-only test with no assertion).

### 2.6 Divergences are waiving gates (`SKILL.md:122-128` Phase 5 rule 3)

`DIVERGENCES.md` currently holds source quirks, deferred scope, type-system losses, and "mutation tool not pinned". The skill says every mismatch is a defect or an approved divergence, and that masks must not widen to hide one. It does not say a skipped gate is not a divergence.

Split the file:

- `DIVERGENCES.md`: behavior A vs behavior B, fixture id, approver, date. Template per entry:
  `| behavior-A (source) | behavior-B (target) | fixture | approver | date |`. No approver means the entry is a draft and blocks `green`.
- `migration/waivers.md` or a `state.json` `blocked_gates` array: mutation, coverage, shadow traffic. Schema: `[{"gate": "mutation", "unit": "U06", "reason": "...", "expiry": "YYYY-MM-DD"}]`. A waiver cannot set manifest status to `green`. Allowed statuses become an enum: `pending`, `stub`, `red`, `draft`, `green`, `blocked`. `draft` means tests pass and at least one required gate is waived or missing. `green` means every required gate for that phase passed.

Define the enum in the skill. This run used `green`, `pending`, and `w1-parity-review-complete` interchangeably.

### 2.7 SCC and "unit" are not checked

The skill says each SCC is one unit and layers only break ties. Nothing rejects a manifest that was copied from a planning doc.

Add a mechanical Phase 1 check:

- `dependency-graph.json` includes `"scc": true` and the import edges that produced it, or `"scc": false` with status capped at `draft`.
- A unit's `source` column is a file list. Status `green` is illegal while any exported function in those files has no case id. Unported exports are rows, not a note in `notes`.
- A dependency edge that the graph does not contain is a manifest error (e.g. invalid inter-unit import edges).
- Tooling code (such as test harnesses or coverage checkers) belongs in `migration/` or marked as external tools, not counted as migrated production units.

### 2.8 Rules are written after the bugs

Phase 2 lists the right topics (null, numbers, strings, maps, regex, time, errors). It does not require each rule to cite a source vector that distinguishes it from the nearest wrong rule. Subtle semantic differences (such as UTF-8 encoding differences, negative zero, collection ordering, and numeric division) are often discovered after units are marked green, which is the expensive direction.

Add Phase 2b for semantic risk vectors:

- For rules governing subtle cross-language semantics (e.g., numeric rounding, float division, string encoding, collection iteration order), require one source input vector and expected output byte string.
- The vector is stored under `migration/fixtures/rules/R-###.*`.
- A rule amendment records supersession: `supersedes: [R-###]`. Active rules must not disagree on the same fixture.

### 2.9 Coverage and mutation can be narrated

The skill's mutation sentence is the right idea and has no artifact path. `go test -cover` printed in a receipt satisfies a careless reading.

Require:

- `migration/evidence/<unit>/cover.txt` and `mutants.json` (or an entry in `blocked_gates`).
- Thresholds are numbers in `state.json`, not adjectives.
- The checker is a command the receipt's `commands` array actually runs, and the receipt stores its exit code. A prose "PASS" without an exit code is invalid.
- Target-language unit tests must not spawn the source runtime. Differential runs live in `migration/fixtures` and are a separate command. This keeps "consumers do not need Node" honest, and it stops a unit test from becoming a second, drifting copy of the oracle.

### 2.10 Hold conditions do not fire when status is inflated

The hold is "3 consecutive blocked units" or "one rule edit breaks more than 2 green units". If the agent never marks a unit blocked, and never regenerates, the hold never runs. This run had three review rounds of semantic defects after "green" and did not stop.

Add triggers that match what happened:

- A unit is `green` with a missing receipt field (mutation, red log, rulebook hash, fixture digest).
- A rule id is amended and any receipt still cites an older rulebook hash.
- Two consecutive review passes each change observable output of a unit already marked `draft` or `green`.
- `state.json` status string is not in the enum.

The hold message should name the trigger. "Engineering Hold" with no condition is easy to skip.

### 2.11 Test seams and forbidden patterns are advice (`SKILL.md:85-94` rule list, `SKILL.md:102-112` Phase 4)

The seam hierarchy and the ban on global function pointers are correct. `cmd/wpdev-build/main.go:11-15` still uses mutable package-level `osExit` and stream variables (`osExit`, `stdout`, `stderr`, `args`). The skill needs a Phase 4 checklist item with a failing example, and a `green` blocker when the target contains the forbidden pattern. Listing it in the rulebook is not a scan. Failing example to paste into the skill:

```go
// FORBIDDEN (blocks green): package-level mutable seam
var osExit = os.Exit
```

### 2.12 Inventory and contracts schema check (`SKILL.md:48-66` workspace, `SKILL.md:79-83` Phase 1)

Phase 1 should fail when `inventory.tsv` headers or entries are undefined. Expected header: `path\towner\trole\tdisposition`.

Require explicit scope and dispositions:

- Phase 0 requires a `scope.md` include/exclude list (e.g. including target package sources, excluding documentation, test scaffolding, or external vendor code).
- In `inventory.tsv`, every in-scope row must have an explicit disposition (e.g. `migrate` vs `external`/`ignore`). Any row marked `migrate` without an assigned unit ID blocks Phase 1.
- Contracts: one contract file per unit that has left `pending`, or the unit stays `pending`. A contract that describes the target instead of the source must be diffed against the oracle fixture. If the contract and fixture disagree, Phase 4 does not start.

### 2.13 The skill is three files, not one — and the fix pass is scoped to the wrong one

**This is the highest-severity defect in this plan, because it makes §5's acceptance criteria unachievable as written.** The previous draft said to edit `~/.claude/skills/migrate-tdd/SKILL.md`. There are three files, and the one that _invokes_ the run is not that one:

| path                                    | lines | sha256 (first 16)  | role                                                            |
| :-------------------------------------- | :---- | :----------------- | :-------------------------------------------------------------- |
| `~/.claude/commands/migrate-tdd.md`     | 48    | `dc4fb5d11e527095` | the `/migrate-tdd` slash command — what the agent actually runs |
| `~/.claude/skills/migrate-tdd/SKILL.md` | 147   | `9cf75bc7cd8a0ff8` | the knowledge base the command loads                            |
| `~/.agents/skills/migrate-tdd/SKILL.md` | 147   | `9cf75bc7cd8a0ff8` | **byte-identical duplicate, not a symlink**                     |

Consequences, each verified:

1. **`git reset --hard` is not confined to the skill file.** `commands/migrate-tdd.md:40` reads: _"On rule amendment: `git reset --hard` the unit checkpoint and regenerate every unit citing the changed rule."_ §4 forbids this and §5 asserts "The skill text no longer tells agents to hard-reset the user branch" — **that criterion cannot pass** while line 40 exists. The command file also restates Phase 4 without the dual-run oracle requirement (§2.3) and mutation as a bare `≥ 70%` (§2.9), so editing only `SKILL.md` leaves a live, more-authoritative copy of every defect this plan identifies.
2. **The duplicate is a real file, not a link.** `ls -la` shows two separate inodes; both are 10156 bytes with matching hashes. Editing `~/.claude/skills/...` leaves `~/.agents/skills/...` stale, and which one loads depends on the host's skills directory — `commands/migrate-tdd.md:6` itself hedges ("e.g. `~/.gemini/config/skills/...` or `~/.claude/skills/...`, falling back to `skills/migrate-tdd/SKILL.md` in the source repository root"). Note this repo's `skills/` holds only `wpdev-*` / `wordpress-e2e-tests` — unrelated, so the fallback resolves to nothing here.

Required addition — a **"all copies" step** that must precede any §3 edit:

- Decide one canonical source and make the others non-divergent: either symlink `~/.agents/skills/migrate-tdd/SKILL.md` → the canonical file (preferred — this repo already uses that pattern for its kit skills), or add a checksum assertion that fails when the copies differ.
- Fold the command file into the change: it must drop `git reset --hard`, and its Phase 4 list must point at the skill's gate list rather than restating a shorter one. A command file that paraphrases the skill will always drift; the safer form is for `commands/migrate-tdd.md` to load `SKILL.md` and defer, with no protocol restated.
- Add to §5 an acceptance line that covers all three paths, not just the skill.

### 2.14 Deterministic Receipt Schema Validation (replacing custom binary CLI requirement)

Rather than building a project-specific external binary executable for status checks (which violates the language-agnostic nature of the engine across Go, Rust, and Python), status and completeness must be enforced through a **deterministic receipt JSON schema** (`migration/evidence/<unit>.json` and `state.json`).

The schema defines exact exit gates:

- A unit cannot be marked `green` unless its evidence file contains all required fields: non-zero Clean Red log, dual-run oracle verification, passing mutation score, and matching rulebook content hashes.
- If any required gate is waived or unverified, status is capped at `draft`. Missing files or schema violations block wave completion automatically.

## 3. Concrete skill edits

**Step 0 (prerequisite, from §2.13):** resolve the three-file problem before editing anything — pick the canonical copy, symlink or checksum-guard the duplicate at `~/.agents/skills/migrate-tdd/SKILL.md`, and bring `~/.claude/commands/migrate-tdd.md` into the same change (at minimum: delete its `git reset --hard` line and stop it restating a shorter Phase 4). **A pass that edits only `SKILL.md` will not satisfy §5.**

Then edit `SKILL.md` (`~/.claude/skills/migrate-tdd/SKILL.md`, 147 lines, sha256 `9cf75bc7cd8a0ff8…`) in this order so the next run fails closed without a new prose chapter.

1. **Verification and Receipt Schema (`SKILL.md:31-45`).** Specify deterministic schema validation for `state.json` and `migration/evidence/<unit>.json`. Status must reflect: missing receipt fields, unverified Clean Red, rulebook hash mismatches, and unported exports. Exit rules: all `green` units must satisfy the receipt schema; missing evidence or unverified gates cap unit at `draft` or `blocked`. Document that agents verify this gate before claiming a wave done.
2. **Workspace section (`SKILL.md:48-66`).** Define the five artifacts or remove the term. If kept, the five are: source manifest, rulebook, oracle fixtures, target tests, evidence receipt (contracts + divergences are additional). Add `freeze.json`, `scope.md`, `fixtures/rules/`, and `evidence/<unit>/{red.json,green.json,cover.txt}` to the tree.
3. **Phase 0 (`SKILL.md:72-77`).** Blob-SHA freeze (`freeze.json` schema §2.4). Characterization tests and parity oracles are different commands. Source coverage under 70% blocks Phase 1, and the coverage command and denominator (statements vs branches) must be written in `state.json` before the number is trusted.
4. **Phase 1 (`SKILL.md:79-83`).** SCC flag, export coverage, inventory header check, scope check, representative pilot slice (~5% canary).
5. **Phase 2 (`SKILL.md:85-94`).** Rule vectors and `supersedes`. Conflict on one fixture is a failed phase, not a new subsection.
6. **Phase 4 (`SKILL.md:96-120`).** Dual-run fixture is the oracle. Clean Red log schema (§2.5). Hand-port versus generator mode. Forbidden-pattern scan. Unit tests must not exec the source toolchain. `green` enum requirements.
7. **Phase 5 (`SKILL.md:122-128`).** Cannot be "later" for a unit already `green`. A wave receipt without fixture replay stays `draft`.
8. **Self-healing (`SKILL.md:137-147`).** Replace `git reset --hard <unit-checkpoint>` with worktree regeneration for generator mode (§2.2 snippet), and with "new fixture first" for hand-port mode. Add the hold triggers from section 2.10.
9. **Receipt schema.** Required keys with example (`migration/evidence/<unit>.json`):

```json
{
  "unit": "U01",
  "status": "green",
  "generated": false,
  "source_blobs": [{ "path": "...", "blob_sha": "..." }],
  "rulebook_sha256": "...",
  "rules_applied": ["R-001"],
  "commands": [{ "argv": ["go", "test", "./..."], "exit_code": 0 }],
  "fixture_digests": { "run-u01-oracle.mjs": "sha256:..." },
  "mutation": { "score": 0.82, "tool": "gremlins v0.x" },
  "divergences": []
}
```

Missing key ⇒ not `green`. Note `generated: false` marks hand-port mode (§2.2). 10. **Worked counterexample.** Add a short "invalid W1" box using this migration's actual misses (oracle that does not run the target, mutation waiver plus `green`, rule added after the patch, planning graph labeled as if Phase 1 were done). One box teaches more than another restatement of the phases.

## 4. What not to change

- Do not drop Clean Red, mutation, or the rulebook. They are the parts the run was right to attempt. The failure is that substitutes counted.
- Do not require a generator for every migration. Hand-port mode is the honest description of an agent writing Go. Pretending there is a generator produces ceremonial rulebook edits.
- Do not require `git reset --hard` on the user's branch. Checkpoints belong in a worktree.
- Do not raise the mutation threshold in the skill to this repo's 80%. Keep 70% as the default and let `state.json` override it. This repo's plan already sets 80%; the skill should read that number instead of burying a second default in prose.
- Do not add a Go-specific or WordPress-specific phase. The UTF-8, `json2php`, and `wpdev.json` bugs belong in this repo's rulebook. The skill only needs to demand the vector and the dual run.

## 5. Acceptance for the skill change

- A fixture migration directory copied from this repo's `migration/` at review time fails receipt schema validation for: missing red log, missing mutation, rulebook hash drift, `scc: false` presented as a finished Phase 1, U06 `green` with unported source exports, and a divergence entry with no approver used as a `green` waiver.
- A minimal toy port (one pure function, one rule, one fixture, one red log, one green log) passes receipt validation with status `green`.
- The skill text no longer says "5-artifact" (`SKILL.md:4-6` description + `SKILL.md:48-66` workspace) unless the five names appear in the workspace tree.
- **No file that can invoke the skill tells agents to hard-reset the user branch.** As previously written this criterion was unsatisfiable by the scoped change: `SKILL.md:143` (`git reset --hard <unit-checkpoint>`) is only one of two sites — `~/.claude/commands/migrate-tdd.md:40` carries the same instruction, and that file is the one the agent actually runs. Both must be clear, verified with `grep -rn "reset --hard" ~/.claude/commands/migrate-tdd.md ~/.claude/skills/migrate-tdd/ ~/.agents/skills/migrate-tdd/` returning no matches.
- All three files agree: `shasum -a 256` of `~/.claude/skills/migrate-tdd/SKILL.md` and `~/.agents/skills/migrate-tdd/SKILL.md` match (or the second is a symlink), and `commands/migrate-tdd.md` no longer restates a protocol shorter than the skill's.
- `inventory.tsv` has explicit dispositions (`migrate` vs `external`/`ignore`) for all in-scope files — no row marked `migrate` carries an undefined unit ID.
- An agent following the edited skill cannot mark a unit `green` from a source-only oracle script (`SKILL.md:107` Phase 4 step 4 must require target-vs-source comparison, not just "green against the frozen source SHA").
- Both plan docs are tracked in git before the skill change is accepted.

## 6. Suggested order of operations

0. **Collapse the three copies (§2.13).** Ensure all ecosystem installations stay in sync with the canonical skill repository.
1. Define the deterministic receipt JSON schema against the current `migration/` directory as a negative test. That locks the lessons to reproducible verification data.
2. Update `SKILL.md` phases to match the schema checks, so the doc cannot drift from the checker.
3. Add the invalid-W1 box and the hand-port mode paragraph.
4. Bring `commands/migrate-tdd.md` in line, keeping the expected failures until the Go improvement plan clears them.

## 7. Independent verification record

Skill claims were checked against the three live files on 2026-09-22 (not against a description of them).

**Confirmed correct — the previous draft's skill citations hold.** `SKILL.md:23-28` Cardinal Law; `:31-45` command interface; `:48-66` workspace; `:72-77` Phase 0; `:79-83` Phase 1; `:85-94` Phase 2; `:96-120` Phase 3–4 + Clean Red; `:122-128` Phase 5; `:137-147` self-healing. The specific anchors also hold: `:143` is `git reset --hard <unit-checkpoint>`; `:107` is Phase 4 step 4 ("green against the frozen source SHA and contains ≥ 1 assertion"); `:4-6` covers the `5-artifact` description phrase. `:59` is the `inventory.tsv` line, not `:60`.

**Corrections applied per Principal Review**

| #    | Claim as previously written                                                                               | Evidence                                                                                                                                                                                                                         | Correction applied                                                                                                   |
| :--- | :-------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| 2.13 | Fix scope = `~/.claude/skills/migrate-tdd/SKILL.md`; §5 "skill text no longer tells agents to hard-reset" | Three files exist: `~/.claude/commands/migrate-tdd.md` (48 lines, `dc4fb5d11e527095`), and two byte-identical `SKILL.md` copies (147 lines, `9cf75bc7cd8a0ff8`). `commands/migrate-tdd.md:40` still mandates `git reset --hard`. | New §2.13; §3 step 0; §5 criterion rewritten and made satisfiable.                                                   |
| 2.14 | "Add `migrate-tdd status` binary tool"                                                                    | Creating a project-specific binary CLI executable in target projects violates the universal language-agnostic nature of the engine (Go, Rust, Python).                                                                           | Replaced with deterministic JSON receipt schema validation.                                                          |
| 2.12 | Inventory check hardcodes 4 wpdev-specific dispositions across 312 rows                                   | Dispositions like `oracle-source` or `temporary-compat` are project-specific artifacts of the Go build tool run.                                                                                                                 | Replaced with universal requirement: explicit disposition (`migrate` vs `external`/`ignore`) and mandatory unit IDs. |
| 2.7  | "record `wave_loc / inventory_loc`"                                                                       | Calculating exact LOC denominators creates unnecessary micro-dependencies between tools.                                                                                                                                         | Streamlined to require SCC condensation flag and complete symbol export mapping.                                     |

**Verified-correct items in the run's own record** (the plan's §1 description matches the repo): `dependency-graph.json` self-describes as `"a planning SCC seed, not a full AST condensation"` and has no `scc` field; both oracle scripts contain zero references to `go run|wpdev-build|build-go|go test`; `covercheck` has no non-test reference; rulebook v5 says the review "does not constitute migration acceptance" while `state.json` says `w1-parity-review-complete`; only `contracts/u01-config.md` exists.

**One structural finding neither plan records.** `dependency-graph.json` and `manifest.tsv` use **different unit identifiers**: the graph's `levels` and `edges` reference `U06-hash`, `U06-phpencode`, and `U06-sidecar`, none of which exist as rows in `manifest.tsv` (which has a single `U06`). The two artifacts therefore cannot be cross-validated at all — a checker implementing §2.7's "a dependency edge that the graph does not contain is a manifest error" would need a mapping that does not exist. Either the manifest splits U06 into the three sub-units the graph already names, or the graph is regenerated against manifest ids. Recorded here because it blocks the §2.7 check; the fix belongs in the Go plan's status-correction step.

**Unverified / limits.** The skill's own load path is host-dependent (`commands/migrate-tdd.md:6` hedges between `~/.gemini/...`, `~/.claude/...`, and a repo fallback), so which copy wins was not determined — only that all three exist and two are identical. No run of `/migrate-tdd` was attempted; nothing here was validated by executing the skill.
