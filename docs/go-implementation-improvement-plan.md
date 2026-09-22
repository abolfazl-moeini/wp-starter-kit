# Go build-tooling improvement plan

Status: review only. Do not treat this document as permission to edit `packages/build-go` until the gates below are scheduled.
Plans-only change: this document may be edited; `packages/build-go/`, `migration/`, and Node sources must not be edited in this pass.

Reviewed: `packages/build-go` on branch `migrate/build-go` (HEAD `8a93278`), migration record under `migration/`, source counterparts `core/packages/utils/readProjectConfig.js`, `core/packages/utils/path.js`, `core/packages/dependency-extraction-esbuild-plugin/index.js`, `core/packages/dependency-extraction-esbuild-plugin/utils.js`, `core/packages/build/esbuild-styles.js`, `packages/standalone-build/build-plan.mjs`, and `json2php@0.0.12`.

Source freeze SHA `8c1e9baf` is an ancestor of HEAD. The JS files above did not change in between. The Go module and `migration/` did. `migration/state.json` still says `w1-parity-review-complete`. `migration/RULEBOOK.md` v5 says the same review does not constitute acceptance. `migration/manifest.tsv` marks U01, U06, U30, and `covercheck` green. Those three statements cannot all be operational.

W1 is a config reader, an MD5/canonical-JSON helper, a PHP sidecar encoder, a style-sidecar writer, a small CLI, and a coverage parser. It is not a build system. `npm run build` still runs the Node pipeline. Nothing in this plan should be described as a cutover.

## 0. How to apply fixes

1. Demote manifest status from `green` to `draft` (skill enum: `pending`, `stub`, `red`, `draft`, `green`, `blocked` — there is no `w1-draft` status) until the acceptance list in section 7 is true. `blocked` is reserved for budget-exceeded units; use `draft` for "tests pass, gates missing".
2. Fix rules before code when a defect is a wrong contract (R-004c, map key order, CLI walk inside `config.Read`). Add the source vector to `migration/fixtures/` first, watch the current Go test fail for the right reason, then change production code.
3. Do not "correct" behaviors that already match JavaScript. `AssetPath` and `StyleAssetPath` are different functions on purpose. `StyleAssetPath("file.css/")` staying `file.css/.asset.php` matches `buildStyleAssetFile`. Leave that split alone.
4. Keep WordPress asset bytes on `phpencode.Object` insertion order. Do not switch sidecar construction to Go maps to make tests shorter.
5. Do not wire `wpdev-build` into `npm run build`, scaffold, or deploy in this pass.
6. Parity direction is one-way: Go is fixed to match Node. Never edit Node sources (`core/packages/`, `packages/standalone-build/`) to match Go output. If Node looks wrong, record a source quirk in `DIVERGENCES.md` with fixture output — do not "fix" the source.
7. Commit hygiene: this plan and `docs/migrate-tdd-skill-improvement-plan.md` are currently untracked (`git status: ??`). Track both before W1 close-out so receipts can cite their hashes.

Severity: §1 items are P0 (wrong bytes / wrong contract) unless marked otherwise. §2 table is P1 (error text, modes, seams). §3 is P1 (gates that let P0s land). Of the added §1.7–§1.10: §1.8 and §1.9 are P1, §1.10 is P2, and **§1.7 is informational — its divergence claim was refuted by measurement and its fix should not be applied** (see §1.7).

Verification status (this revision): claims marked **measured** were reproduced by executing the Go module (`go1.26.5`), the CLI binary, or the Node sources on this machine. Claims marked **read** are source-verified but not executed. Nothing in this plan was validated on Windows; §1.10's fixture is macOS-only evidence.

## 1. Contract bugs to fix first

Priority: all §1 items are P0 — they change emitted bytes or the documented contract.

### 1.1 PHP numbers must follow `phpFileContent`, not uint64 preservation (P0)

Source: `core/packages/dependency-extraction-esbuild-plugin/index.js:148-150` (`phpFileContent` = `json2php(JSON.parse(JSON.stringify(value)))`).
Go: `packages/build-go/internal/phpencode/phpencode.go:61-71` (`Int64` → `ParseUint` → `Float64` chain).

`phpFileContent` is `json2php(JSON.parse(JSON.stringify(value)))`. `json2php@0.0.12` prints numbers with JavaScript `Number.prototype.toString()`. `JSON.stringify` has already rounded them to binary64.

R-004c and `TestFileContent_MatchesJson2PHPOracle` / `uint64 json.Number preserved` lock the opposite behavior: `json.Number("18446744073709551615")` is emitted in full, and `json.Number` values that fit in `int64` skip the float rounding that `JSON.parse` applies (`9007199254740993` stays exact in Go and becomes `9007199254740992` in JavaScript).

`hash.CanonicalJSON` already rounds that literal to `9007199254740992` (R-005d). The same process now has two numeric models.

Fix:

- Replace R-004c with a float64 rule: `phpencode` of a JSON number matches `phpFileContent` for that literal, including values above `2^53` and the `uint64` max.
- Parse `json.Number` through `float64` / `jsNumber` after the non-finite `null` normalization. Keep the `int64` fast path only for values that binary64 can represent exactly, and add a test that a non-exact `int64` is not a sidecar input.
- Add those literals to `migration/fixtures/run-u06-sidecar-oracle.mjs` and assert the Go encoder against that output, not against a hand-written want string alone.

`NaN` / `Infinity` → PHP `null` is correct for `phpFileContent` and should stay.

### 1.2 Go maps must not be a sidecar encoder (P0)

Source: `json2php` walks `Object.entries` (`core/packages/dependency-extraction-esbuild-plugin/index.js:148` via `json2php@0.0.12`).
Go: `packages/build-go/internal/phpencode/phpencode.go:141-155` (`encodeMap`: `sort.Strings`, then array-index reorder).

`json2php` walks `Object.entries`. For ordinary objects, JavaScript enumerates canonical array indexes `0 .. 2^32-2` in numeric order, then every other string key in insertion order. `phpencode.Object` reproduces that, and the U06 oracle covers it.

`encodeMap` does not. It `sort.Strings` first (UTF-8 byte order), then reorders only array indexes. Non-index keys become alphabetical. A future asset object built as `map[string]any` with `dependencies`, `internal_packages`, and `hash` would emit alphabetical keys. Node emits declaration order. WordPress reads keys by name, so the plugin can still boot while the `.asset.php` bytes and any digest of those bytes differ.

The test `map encodes with sorted keys` freezes that drift.

Fix:

- Make `encode` return an error for `map[string]any` and `map[string]string`, or keep the methods unexported and unused by sidecar writers.
- Delete the sorted-map tests, or move them behind an explicitly non-parity helper that cannot be used for file bytes.
- State in the rulebook: sidecar objects are `phpencode.Object` only. Canonical JSON key sorting (R-005d) does not apply to PHP output (R-002).

### 1.3 Nullable and non-string config values are dropped on the floor (P0)

Source: `core/packages/utils/readProjectConfig.js:121-126` (merged object keeps raw values; derived `depsBundle` uses template coercion).
Go: `packages/build-go/internal/config/config.go:144` (`jsString` for derivation, correct) vs `:173-188` (`asString` type-asserts to `string`, else `""`).

`readProjectConfig` returns the merged JSON object. `config.Config` stores required and optional strings with `asString`, which type-asserts to `string` and otherwise yields `""`.

Documented for `slug: 1`: `DepsBundle` is `1-deps.js`, `Config.Slug` is `""`. The same loss applies to `globalName`, `localizeVar`, `textDomain`, `hookPrefix`, `npmScope`, `phpFunctionPrefix`, and an explicit `depsBundle` that is not a string. The Node build injects those fields with `JSON.stringify`. A numeric `globalName` stays a number in JavaScript and becomes an empty string in Go.

Explicit `null` on optional fields is recorded only in `NullFields` (and `VendorPrefixNull`). The string field is still `""`, which is also the result for a non-string. A later Rector or prefix caller that reads `PHPMinVersion` or `PHPFunctionPrefix` without checking the side map will treat "explicitly null, default overwritten" as "empty string". In JavaScript the property is `null`, not `""` and not the default.

Fix:

- Represent every JSON string field as a small type that distinguishes absent (default applied), string, null, and non-string. Non-string identity fields must remain available to the same coercion `JSON.stringify` / template literals use, or the read must fail with the JavaScript error. Do not pick a third behavior.
- Extend `DIVERGENCES.md` only if product owners accept "non-string identity fields become empty". Until that approval exists, this is a defect, not a typed-Go convenience. The current note covers `slug` only.
- Add oracle cases for non-string `globalName`, `phpFunctionPrefix: null`, and `depsBundle: null`. Compare the full merged object, not a single derived filename.

### 1.4 `config.Read` discovery is not `getRootPath` (P0)

Source: `core/packages/utils/path.js:45-62` (module-anchored walk, `existsSync` accepts a directory named `wpdev.json`, 4-level `dirname` fallback) + `core/packages/utils/readProjectConfig.js:88` (`options.path || join(getRootPath(), "wpdev.json")`).
Go: `packages/build-go/internal/config/config.go:71-87` (`Read` walks from `StartDir`/cwd) + `:236-253` (`findWPDevJSON` skips directories via `!st.IsDir()`).

Correction to the previous draft of this plan: the explicit-path case already matches. `Read` with an explicit `Path` calls `os.ReadFile(path)` (`config.go:89`), which fails on a directory with "Failed to read" — same trigger as Node (`readProjectConfig.js:91-98`). Only the discovery walk diverges (skip-vs-read on directory `wpdev.json`, no module anchor, no 4-level fallback, error path `filepath.Join(start, ...)` even after searching parents).

`readProjectConfig()` with no `path` starts at `core/packages/utils/path.js` and walks at most 12 parents. `existsSync` accepts a directory named `wpdev.json`. If the walk misses, it falls back to `dirname(module, 4)` and then the read fails on that path.

`config.Read` with an empty `Path` walks from `StartDir` or the process cwd, skips directories, and errors with `filepath.Join(start, "wpdev.json")` even after searching parents. There is no module anchor and no 4-level fallback.

`DIVERGENCES.md` calls the cwd walk a CLI contract. It is implemented in the library. `TestRead_EmptyOptionsWalksFromCwd` locks it. `run-u01-oracle.mjs` always passes `path`, so discovery has no source oracle.

A directory named `wpdev.json` is a real behavior split: Node tries to read it and throws "Failed to read"; Go skips it and may load a parent file.

Fix:

- Split `config.ReadFile(path)` from CLI discovery.
- CLI discovery may stay cwd-anchored, and the rulebook should say the library default is not `getRootPath`.
- `ReadFile` must treat a directory `wpdev.json` as a read failure, not as "keep walking", when the caller passed that path. Walking may skip a directory only under an explicitly tested discovery policy.
- Add a fixture that runs `readProjectConfig()` with no path from a temp module layout, and a fixture with a directory named `wpdev.json`. Record both outputs before changing Go.

### 1.5 CLI `config` JSON is not JSON.stringify of the merged object (P0)

Source: no Node `config` print command exists (Go-only contract); closest analogue is `JSON.stringify(merged)` in `readProjectConfig.js:126`.
Go: `packages/build-go/internal/cli/cli.go:65` (`json.MarshalIndent`, i.e. sorted keys + `&`/`<`/`>` → `\u0026`/`\u003c`/`\u003e`).

`cli.runConfig` uses `encoding/json`. That encoder sorts map keys (already noted) and escapes `&`, `<`, and `>` as `\u0026`, `\u003c`, `\u003e`. `JSON.stringify` does not. `hash.CanonicalJSON` was written specifically to avoid that escaping, then the only user-facing JSON command bypassed it.

A slug or extra field containing `<` or U+2028 will not match a Node serialization of the same config. Nested `features` objects are reordered by the same encoder.

Fix:

- Define one config JSON contract: either "canonical JSON of the merged object, insertion rules written down" or "Go sorted keys, HTML escaping on, listed in `DIVERGENCES.md` with an approver".
- If the contract is source parity, marshal through the canonical writer (or `SetEscapeHTML(false)` plus an explicit key-order test) and add a `<` / U+2028 case to the U01 oracle and the CLI test.
- Defaults that JavaScript includes must stay. Do not omit them to look more like the raw file.

### 1.6 `canonicalJson` is a value function; `hash.CanonicalJSON` is a JSON rewriter (P0)

Source (`packages/standalone-build/build-plan.mjs:102-114`):

- `undefined` becomes the string `null` (including object values).
- A sparse array such as `[1,,2]` becomes the text `[1,,2]`, which is not valid JSON, because `Array.prototype.map` preserves holes and `join` turns them into empty slots.
- `JSON.stringify` on numbers, keys, and strings supplies escaping and numeric spelling.
- `computePlanFingerprint` pre-sorts several preservation arrays before calling `canonicalJson` (`build-plan.mjs:133-134`: `[...(planData.preservationPolicy?.frozenClasses || [])].sort()` and the `frozenFunctions` twin). **Precision correction to the previous draft, which said flatly "sorting is not inside `canonicalJson`" — that is wrong for object keys and right only for arrays.** `canonicalJson` _does_ sort object keys internally (`build-plan.mjs:111`: `const keys = Object.keys(value).sort();`); it does **not** normalise array order (`build-plan.mjs:108-110` maps in place, preserving index order). So the correct rule for a Go port is: sort object keys in the canonicaliser, but require the caller to pre-sort every array whose order is semantically irrelevant. Getting this backwards in either direction changes fingerprints.

The Go function re-parses JSON text with a private scanner, then reprints it. The pinned cases in `TestCanonicalJSON_SourceRegressions` do call Node, which is the right check for those inputs. They do not cover the value-level function, and they do not cover `computePlanFingerprint`.

U06 being green does not mean BuildPlan fingerprints are portable. U02 must not call `CanonicalJSON` on a `json.Marshal` of a Go struct and expect the Node fingerprint.

Fix, before any U02 production code:

- Record fixture pairs `(plan input, canonicalJson text, sha256)` from `computePlanFingerprint`, including a missing optional field, an empty preservation list, a non-ASCII key, and a number at the `1e20` / `1e21` / `1e-6` / `1e-7` boundaries.
- Either port the pre-sort and the value rules, or stop claiming `hash.CanonicalJSON` implements `canonicalJson`. Name the Go function for what it is: a JSON-text canonicalizer.
- Harden the hand-rolled scanner's unchecked indexing (`p.raw[p.pos]` at `hash.go:65,72,78,90,93,125,126,128,150`; `p.pos += 4` at `:101,104,134`; `p.pos += 5` at `:107`; the 4-byte slice `p.raw[p.pos:p.pos+4]` at `:132`). **Measured: this is a latent-fragility item, not a live bug.** `CanonicalJSON` calls `json.Valid` first (`hash.go:41`), and Go's own JSON scanner caps nesting at 10000, so every path the parser reaches is bounds-safe. Probed 20 adversarial inputs (lone surrogate `"\ud800"`, surrogate pair, `"\u2028"`, `1e999`, trailing whitespace, empty key, truncated `"\u00"`, bare `[`/`{`/`nul`/`tru`/`-`, `{"a":}`, `[1,]`) — zero panics, all malformed inputs rejected with `canonical json: invalid JSON`. Treat the rewrite as defensive hardening (own bounds check + explicit EOF error) and price it accordingly; do not describe it as fixing an exploitable crash.
- **Correction to the previous draft of this plan:** the earlier claim that "deep nesting can stack-overflow the recursive decoder" is **false and was tested**. `CanonicalJSON` on `[`×N + `]`×N returns `nil` error at N=9999 and `canonical json: invalid JSON` at N=10001/50000/200000 — `json.Valid` rejects above Go's `maxNestingDepth = 10000` before the recursive `value()` ever runs. No cap needs adding and no depth test needs writing; adding one would assert behaviour `encoding/json` already guarantees.
- Keep one JavaScript number formatter. `config.jsFloat`, `phpencode.jsNumber`, and `hash.writeCanonical` are three copies. A boundary fix in one will not reach the others.

Float parity stays bounded until a differential corpus exists. Do not describe the current tests as exhaustive. The rulebook already says that; the manifest status should too.

### 1.7 `AssetPath` trailing-separator trim — **VERIFIED EQUIVALENT, not a divergence** (downgraded from P1 to informational)

Source: `core/packages/dependency-extraction-esbuild-plugin/utils.js:254-259` (`assetFilePath` = `path.dirname` + `path.basename(...).match(/(.+)\.(?:js|css)$/)` + `basenameInfo[1]`, no trim).
Go: `packages/build-go/internal/sidecar/sidecar.go:18` (`strings.TrimRight(bundle, "/\\")`).

**This item was raised as a P1 in the previous draft and is refuted by execution.** The draft claimed `basenameInfo[1]` on `style.css/` throws TypeError and that the Go trim "silently accepts" it. It does not: Node's `path.basename` strips the trailing separator, so the regex matches and no throw occurs. Measured side-by-side:

| input                  | Node `assetFilePath`                                             | Go `AssetPath`                            | agree? |
| :--------------------- | :--------------------------------------------------------------- | :---------------------------------------- | :----- |
| `"style.css/"`         | `"style.asset.php"`                                              | `"style.asset.php"`                       | ✅     |
| `"dir/bundle.js/"`     | `"dir/bundle.asset.php"`                                         | `"dir/bundle.asset.php"`                  | ✅     |
| `"assets/b/style.css"` | `"assets/b/style.asset.php"`                                     | `"assets/b/style.asset.php"`              | ✅     |
| `"/"`                  | throws `TypeError: Cannot read properties of null (reading '1')` | error `unsupported extension for "/"`     | ✅     |
| `"noext"`              | throws `TypeError`                                               | error `unsupported extension for "noext"` | ✅     |

`path.basename("style.css/") === "style.css"` and `path.dirname("style.css/") === "."` confirm the mechanism.

Action: **delete the proposed fix.** Do not remove the trim — removing it would _introduce_ a divergence for `style.css/`, the exact input the draft misread. Keep the existing `TestRun_InvalidSidecarDoesNotWrite` coverage; if a vector is wanted for the record, add `"/"` and `"noext"` (both already agree) rather than the two trailing-slash cases. The `C:\a\b.css` Windows vector is still worth adding, but as a _new_ vector, not as a bug fix.

### 1.8 Exponent-zero stripping is unchecked and single-zero only (P1)

Go: `packages/build-go/internal/hash/hash.go:181` (`s[i+2] == '0'` strips one zero) and `packages/build-go/internal/config/config.go:385-396` / `phpencode.go:121-135` (loop variants).
Gaps: (a) `s[i+2]` indexes without a length check — safe today only because `strconv.FormatFloat(_, 'e', -1, 64)` never emits a truncated exponent, but a refactor to `'f'`-then-`'e'` or a hand-built string would panic; (b) single-strip turns `1e+00` into `1e+0` if such an input ever reaches the writer, while JS `Number.toString` never emits `e+00`; (c) three copies of the formatter can drift.
Fix: bounds-check the exponent rewrite, strip all leading exponent zeros in one place, and collapse to a single shared `jsNumber` helper after the §1.1 fixtures exist. Test vectors: `1e21`, `1e-7`, `1e-6` (stays decimal), `-0.0` → `0`.

### 1.9 CLI dash-leading values and `Extra` number round-trip are uncontracted (P1)

Go: `packages/build-go/internal/cli/cli.go:123` (any `-`-prefixed next arg → "missing value") and `config.go:207-234` (`MarshalJSON` re-emits `Extra` via `encoding/json`).
Gaps: (a) `--file -foo.css` is reported missing, but no source or CLI contract says dash-leading paths are illegal — decide and document before a wrapper script passes such a path; (b) `Extra` numbers decode as `float64` and re-encode via Go defaults, so `9007199254740993` in an unknown `features`-adjacent field will not survive a `config` → `config` round-trip the way `JSON.stringify` preserves it (as `9007199254740992` — still lossy, but deterministically JS-lossy). JS keeps the raw `Number`; Go must keep the JS-lossy spelling, not a Go-formatted one.
Fix: document dash-leading policy in `--help` + test, and add an oracle case with a numeric unknown field (`{"slug":...,"features":{"limit":9007199254740993}}`) comparing `JSON.stringify(merged)` bytes to CLI stdout.

### 1.10 `covercheck` package grouping keeps drive letters — **currently locked by a test** (P2, contract change)

Go: `packages/build-go/internal/covercheck/covercheck.go:56` (`path.Dir(strings.ReplaceAll(file, "\\", "/"))`).
`C:\a\b\pkg\file.go` becomes `C:/a/b/pkg/file.go`, grouped under `C:/a/b/pkg` — the drive letter stays in the package key.

**This is not an unnoticed defect; it is the asserted contract.** `TestEvaluate_WindowsDrivePath` (`covercheck_test.go:107-124`) builds a profile with `C:/Users/dev/project/file.go:1.1,2.2 10 1` and asserts `rep.Packages["C:/Users/dev/project"] == 1.0`, failing with `expected package key C:/Users/dev/project`. `TestEvaluate_WindowsBackslashPath` (`:126-140`) asserts the same key from a backslash input.

Consequence for the fix pass: applying the proposed strip-the-drive-letter change **will break two existing tests**, and the plan as previously drafted did not say so — an implementer would hit a red suite and have no instruction. Under §0.2 ("fix rules before code when a defect is a wrong contract") this needs a rulebook entry, not just a code edit.

Fix, pick one and state it explicitly:

- **Keep the behavior** (recommended, unless a real cross-artifact collision is demonstrated): record it in `DIVERGENCES.md` as an accepted, tested contract, and delete the proposal. The stated risk — "per-package thresholds compare `C:/...` keys against posix keys from CI artifacts" — only materialises if the same package is emitted under two path forms, which is a CI configuration problem, not a grouping bug. No such collision is demonstrated in this repo.
- **Change the behavior**: then the change must (a) add a rulebook rule, (b) update `TestEvaluate_WindowsDrivePath` and `TestEvaluate_WindowsBackslashPath` in the same commit, and (c) add the two-line fixture (one Windows profile line + one posix line for the same package, asserting a single package key) that the draft proposed.

## 2. Smaller behavior gaps

| Gap                                         | Source                                                               | Go                                                  | Action                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Whitespace-only CSS path                    | `buildStyleAssetFile("   ")` is a non-empty string, then "not found" | `TrimSpace` rejects it as empty                     | Match the source error, or record a divergence                                        |
| Sidecar file mode                           | Node `writeFile` uses `0o666` masked by umask                        | `0o644`                                             | Set the mode from the source contract before any ZIP stores permissions               |
| `FileContent` error ignored in `WriteStyle` | n/a                                                                  | `body, _ := phpencode.FileContent(...)`             | Return the error                                                                      |
| Hash/sidecar I/O errors                     | Node messages                                                        | raw `os` errors, exit 1                             | Stable fragments, asserted in full against a fixture                                  |
| No-args CLI                                 | no Node equivalent                                                   | help text, exit 0                                   | Decide exit 0 vs 2 before any wrapper script calls the binary                         |
| Sidecar path confinement                    | later U03                                                            | `sidecar` writes next to any path the caller passes | Refuse paths outside an explicit root before this binary is installed for general use |
| `main` test seam                            | skill forbids global function pointers                               | package-level `osExit`, `stdout`, `stderr`, `args`  | Pass dependencies into `cli.Run` only; `main` stays a three-line call                 |

Do not expand `generateChecksum(algorithm, encoding)` until U06's real caller (the esbuild plugin) is in the manifest as still pending. Today only MD5-of-lossy-UTF-8 and SHA-256 exist. Marking U06 green hides the unported exports in `dependency-extraction-esbuild-plugin` (`assetFileInfo`, `saveAssetFile`, request-to-handle, internal package filter) and `buildStyles` / watch in `esbuild-styles.js`.

## 3. Verification gaps that let the bugs land

- `run-u01-oracle.mjs` and `run-u06-sidecar-oracle.mjs` never execute Go. A green oracle only means Node still matches itself. Each oracle needs a dual-run form: `node <oracle> --emit-json <dir>` + `go run ./cmd/wpdev-build <same-input>` diffed byte-for-byte; exit 0 only when both agree.
- Many Go assertions use `strings.Contains` on error text. A rewritten sentence that keeps one word still passes. Replace with exact-match on the stable fragment plus a full-golden assertion against the U01/U06 oracle stderr for at least one vector per error class.
- `hash_test.go` shells out to `node` and imports `build-plan.mjs` via a relative path. That is a useful differential check and a broken unit boundary: `go test` requires Node and the monorepo layout. Move it to `migration/fixtures/` as a parity command. Leave `go test ./...` runnable without Node.
- `covercheck.Evaluate` is not called by any test runner, CI job, or `wpdev-build` subcommand. `state.json` already says the 98.6% figure is not a gate. Plan section 8 also requires per-package, changed-statement, and zero-untested-function gates. None of those exist. `gremlins` is unpinned; the plan's kill threshold is 80%, stricter than the skill default of 70%.
- Receipts stop at rulebook v4 (`w1-boost-review-r2.json`). v5 has no receipt. Clean Red output was never saved. `w1-pilot.json` describes the red run in one sentence.
- `go.mod` says `go 1.22` and does not pin a toolchain. The receipt used `go1.26.5`. Add a `toolchain` line when the module is next touched, and record it in `state.json`.
- Module path `github.com/abolfazl-moeini/wp-starter-kit/packages/build-go` is not a workspace module (`go.work` is absent) and no npm script builds the binary.

## 4. Suggested implementation order

1. Status correction in `migration/manifest.tsv` and `migration/state.json`: W1 is `draft` (not `green`, not `w1-draft`); U02–U32 stay pending; U06's unported exports (`assetFileInfo`, `saveAssetFile`, `bundleFilePath`, `internalRequestToHandle`, `filterInternalRootPackages`, `generateChecksum` algorithm/encoding params, `fileCheckSum`, `buildStyles`/watch) get their own rows instead of inheriting `green`.
   - **Also reconcile unit identifiers between `manifest.tsv` and `dependency-graph.json` — they currently disagree.** The graph's `levels` and `edges` name `U06-hash`, `U06-phpencode`, and `U06-sidecar`; `manifest.tsv` has a single `U06` row and no such ids. The two artifacts cannot be cross-checked, so the skill plan's "a dependency edge the graph does not contain is a manifest error" check is unimplementable until one side changes. Either split `U06` in the manifest into the three sub-units the graph already names (matching the three unported-export groups above), or regenerate the graph against manifest ids. Related: the graph carries no `scc` field and self-describes as a planning seed, so `scc: false` should be recorded explicitly rather than left absent.
2. Fixture pack for the section 1 bugs (PHP big integers, object key order, null and non-string config, directory `wpdev.json`, CLI escaping, one `computePlanFingerprint` vector, plus new §1.7 trailing-slash paths, §1.8 exponent vectors, §1.9 numeric `Extra`, §1.10 Windows profile line). Run Node first. Commit fixtures before Go edits. Verify with: `node migration/fixtures/run-u01-oracle.mjs && node migration/fixtures/run-u06-sidecar-oracle.mjs`.
3. Rulebook edit that supersedes R-004c and splits R-002 (PHP order) from R-005d (canonical JSON sort). One paragraph each, plus the fixture path.`
4. Production changes in `phpencode`, `config`, `cli`, `hash` parser bounds, and `WriteStyle` error handling. Collapse number formatting after the fixtures exist so the shared helper has something to fail against.
5. Wire `covercheck` only after its missing gates exist: inventory reconciliation, changed statements, and a non-zero exit. Running today's `Evaluate` in CI would bless a checker the plan already says is incomplete.
6. Pin `gremlins` (or record a blocker) and run it on `config`, `phpencode`, `hash`, and `sidecar`. Do not average the score across untested packages.
7. Only then revisit U02. First deliverable is fingerprint fixtures, not a BuildPlan struct.

## 5. Out of scope for the fix pass

- Rewriting esbuild, Composer, Rector, Strauss, or the Profile S transformer.
- Scaffold / `wpdev update` rewiring (U31).
- Choosing a Go PHP parser (U19). The plan's W0 evaluation has not been done; do not start U19 by importing a parser.
- Deploy, WAL, and ZIP (U14, U28, U29).
- Deleting the Node build.

## 6. Acceptance for calling W1 done

- Every section 1 fixture matches Node, or `DIVERGENCES.md` has an approver, date, and a test that locks the approved difference. A divergence with no approver keeps the unit at `draft`.
- `go test ./...` passes with no Node, no network, and no repo-root import. Verify with: `cd packages/build-go && go vet ./... && go test -count=1 ./... && go test -race -count=1 ./...` on the pinned toolchain (`go.mod` `toolchain` line matches `migration/state.json`).
- A separate `migration` parity command runs the oracles and the Go binary or library on the same fixtures (dual-run, byte diff), independent of `go test`.
- `gofmt -l` is empty.
- `covercheck` fails the process when a production package is under 95% statements, when a new statement is uncovered, or when a production function has no coverage. The command is what CI runs.
- Mutation kill rate for each W1 package is recorded (`migration/evidence/<unit>/mutants.json` or `blocked_gates` entry), or the unit stays `draft`. Threshold default 70% unless `state.json` overrides to 80% — one number, one place.
- Manifest does not say `green` for a source file that still has unported exports.
- `npm run build` is unchanged.
- Both plan docs are tracked in git (`git status --porcelain -- docs/` is clean).

## 7. Independent verification record

Every §1 claim was re-tested against the working tree on 2026-09-22 (`go1.26.5 darwin/arm64`, Node `v22.22.2`, `json2php@0.0.12`). Method: read the cited source, then execute both sides. Two §1 items did not survive.

### 7.1 Refuted — do not action

| #   | Claim as previously written                                                                               | Evidence                                                                                                                                                                                                                                   | Correction applied                                                                                                           |
| :-- | :-------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| 1.7 | `basenameInfo[1]` on `style.css/` throws TypeError; Go's `TrimRight` "silently accepts" it — a divergence | Node `assetFilePath("style.css/")` → `"style.asset.php"` (no throw; `path.basename` strips the separator). Go `AssetPath("style.css/")` → `"style.asset.php"`. Identical, as are `dir/bundle.js/`, `/` (both error), `noext` (both error). | Rewrote §1.7 as **verified equivalent**; the proposed fix would have _created_ the divergence it claimed to fix.             |
| 1.6 | "Deep nesting can also stack-overflow the recursive decoder; cap depth and test the error"                | `CanonicalJSON` on `[`×N+`]`×N: N=9999 → `nil` error; N=10001/50000/200000 → `canonical json: invalid JSON`, no panic. `json.Valid` rejects above Go's `maxNestingDepth = 10000` before `value()` recurses.                                | Replaced with an explicit correction; the hardening item is retained as fragility only, and the depth-cap task is withdrawn. |

### 7.2 Confirmed by execution

| #    | Claim                                                                 | Evidence                                                                                                                                                                                                                                                                                     |
| :--- | :-------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------- | ------------------------------------------------------------------- |
| 1.1  | R-004c contradicts `phpFileContent`                                   | `index.js:148-150` = `json2php(JSON.parse(JSON.stringify(v)))`. Measured: `phpFileContent(18446744073709551615)` → `18446744073709552000`; `phpFileContent(9007199254740993)` → `9007199254740992`. Go's `json.Number` path (`phpencode.go:61-71`) emits both exactly. Confirmed divergence. |
| 1.3  | Non-string identity fields collapse to `""`                           | Same fixture through both readers: Go CLI `"slug": ""` vs JS `slug: 1`; `depsBundle` agrees (`"1-deps.js"`), exactly as documented.                                                                                                                                                          |
| 1.5  | CLI `config` is not `JSON.stringify(merged)`                          | Go CLI emitted `"custom": "a\u003cb\u0026c"` and keys in alphabetical order; JS emitted `"a<b&c"` in insertion order. Both differences reproduced.                                                                                                                                           |
| 1.4  | Explicit-path directory case already matches; only discovery diverges | Directory named `wpdev.json`: Node → `Failed to read wpdev.json: EISDIR...`; Go → `Failed to read wpdev.json: read ...: is a directory`, exit 1. The draft's own correction is correct.                                                                                                      |
| 1.9  | Dash-leading values rejected as "missing value"                       | `wpdev-build hash --file -foo.css` → `missing value for --file`, exit 2.                                                                                                                                                                                                                     |
| 1.10 | Drive letter retained in package key                                  | `covercheck.go:56`; and `TestEvaluate_WindowsDrivePath:107-124` asserts `rep.Packages["C:/Users/dev/project"] == 1.0`, i.e. the behavior is locked.                                                                                                                                          |
| 3    | `go test ./...` requires Node                                         | With `node` absent from `PATH`: `internal/hash` FAILs — `hash_test.go:220: source oracle: exec: "node": executable file not found in $PATH`; other 6 packages pass. §6's "no Node" criterion is currently false.                                                                             |
| 3    | Oracles never execute Go                                              | `run-u01-oracle.mjs` and `run-u06-sidecar-oracle.mjs`: 0 matches for `go run                                                                                                                                                                                                                 | wpdev-build | build-go | go test`. Both are pure Node-asserts-Node characterization scripts. |
| 3    | `covercheck.Evaluate` is unwired                                      | No non-test reference anywhere in the repo.                                                                                                                                                                                                                                                  |
| —    | `state.json` / `manifest.tsv` / rulebook v5 / HEAD / freeze SHA       | `w1-parity-review-complete`; U01/U06/U30/covercheck `green`, U02–U32 `pending`; rulebook `Version: 5`; HEAD `8a93278e` on `migrate/build-go`; `8c1e9baf` resolves and is an ancestor. All as stated.                                                                                         |
| —    | **New:** manifest and graph disagree on unit ids                      | `dependency-graph.json` `levels`/`edges` reference `U06-hash`, `U06-phpencode`, `U06-sidecar`; `manifest.tsv` has one `U06` row and no such ids. No `scc` field in the graph. Fix moved into §4 step 1.                                                                                      |

### 7.3 Verified correct (do not re-litigate)

- `AssetPath` vs `StyleAssetPath` are intentionally different functions (§0.3). `StyleAssetPath("file.css/")` → `file.css/.asset.php` matches `buildStyleAssetFile`.
- `phpencode.Object` array-index ordering (`phpencode.go:194-197`) correctly implements `0 .. 2^32-2` with canonical-decimal rejection of `01`/`+1`, and duplicate keys keep first position with last value. The U06 oracle's three ordering vectors (`run-u06-sidecar-oracle.mjs:65-86`) are correct JS-spec expectations.
- `NaN`/`Infinity` → PHP `null` is correct for `phpFileContent` and must stay.
- `hash.writeCanonical` implements R-005d as written: literal U+2028/U+2029 emitted raw, lone surrogates escaped, surrogate pairs decoded, `1e999` → `null`, `1e20` decimal, `1e-7` exponent.
- Cited test names all exist: `TestFileContent_MatchesJson2PHPOracle`, `uint64 json.Number preserved`, `map encodes with sorted keys`, `TestCanonicalJSON_SourceRegressions`, and `TestRead_EmptyOptionsWalksFromCwd` (`config_test.go:473` — confirmed with the Grep tool after a shell `grep` returned a false negative).
- `go.mod` is `go 1.22` with no `toolchain` line, while the toolchain in use is `go1.26.5` — as stated.

### 7.4 Unverified / environment limits

- **No Windows execution.** §1.10's fixture and any `C:\` path claim are reasoned from source, not measured.
- **`go` is not on `PATH` in the agent shell** (`/opt/homebrew/bin/go` exists; `go` does not resolve). Any gate script that calls bare `go` will fail the same way it fails for `php` in this repo. Add the path or use an absolute binary in §6's commands.
- **Float parity remains bounded**, as the rulebook already says. No differential float corpus was run; §1.1's fix should not be described as achieving exhaustive numeric parity.
- The two plan docs are untracked (`?? docs/...`), so no revision hash can be cited in receipts yet — §0.7 is a prerequisite for §6, not a nicety.

### 7.5 Changes made in this revision

1. §1.7 rewritten from P1 defect → verified-equivalent, with the side-by-side measurement table and an explicit "delete the proposed fix".
2. §1.6 stack-overflow claim replaced with the measured `json.Valid` nesting bound and an explicit withdrawal.
3. §1.6's `canonicalJson` sorting sentence corrected: object keys _are_ sorted inside `canonicalJson` (`build-plan.mjs:111`); only arrays are caller-normalised.
4. §1.10 reframed from silent bug → test-locked contract, with the two tests that must change named.
5. §0 severity line updated to match, plus a verification-status legend.
6. This section added. No section was renumbered and no design decision was reversed beyond the two refutations above.

## 8. Implementation status (2026-09-22, post-implementation review)

A second agent implemented §1–§4. Every item was re-verified by execution, not by reading the diff. Receipt: `migration/evidence/w1-fix-pass-review.json`.

### 8.1 Landed and verified

| Item                     | Evidence                                                                                                                                         |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| §1.1 R-004c → R-004e     | `json.Number` now decodes via `Float64` → `jsnum`; old "uint64 preserved" test replaced by two rounding tests (`phpencode_test.go:252-259`).     |
| §1.2 R-002d              | `map[string]any` / `map[string]string` now return errors; `encodeMap` deleted.                                                                   |
| §1.3 non-string config   | Same fixture through both readers: Go now emits `"slug": 1`, `"globalName": 1`, `"phpFunctionPrefix": null`, `"depsBundle": null` — matching JS. |
| §1.4 `config.ReadFile`   | `config.go:97`; directory path fails with "Failed to read" on both sides.                                                                        |
| §1.5 CLI escaping        | `SetEscapeHTML(false)`; `"custom": "a<b&c"` now matches JS. Key order documented as an approved divergence (R-007c).                             |
| §1.6 scanner + formatter | Bounds-checked `eof`/`peek`/`next` returning errors; `writeCanonical` delegates to `jsnum.JSONNumber`.                                           |
| §1.7                     | **Correctly NOT applied** — `strings.TrimRight` retained, as §7.1 required.                                                                      |
| §1.8                     | Single `jsnum` package replaces three formatter copies (R-005e).                                                                                 |
| §1.9                     | Dash-leading values rejected + documented (R-015b); `Extra` numerics keep JS-lossy spelling.                                                     |
| §1.10                    | Drive-letter behaviour kept and recorded as an approved divergence, with both locking tests named.                                               |
| §3 toolchain             | `go.mod` gained `toolchain go1.26.5`; `state.json` records it.                                                                                   |
| §4 step 1                | Manifest demoted `green` → `draft`; `U06-rem` row added for unported exports; `blocked_gates` array added.                                       |

Measured after the pass: `gofmt -l` empty, `go vet ./...` clean, `go test -count=1 ./...` **passes with and without `node` on `PATH`** — the §6 criterion that failed before this pass.

### 8.2 Gaps found in the implementation, and what was done

| #   | Finding                                                                                                                                                                                                                                                                                                                                                 | Action                                                                                                                                                                                                                                                                                                                                                                             |
| :-- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **§6's dual-run parity command did not exist.** The oracles stayed Node-asserts-Node and the Go side was locked only by hand-written `want` strings — the exact drift §1.1's fix text forbids.                                                                                                                                                          | Built `migration/fixtures/emit-parity-vectors.mjs` (vectors derived from the frozen Node sources → committed `testdata/parity-vectors.json` per package) and `migration/parity/run-parity.mjs` (regenerate → drift check → dual-run). Non-vacuity proven by reverting the R-004e fix and confirming 3 vector failures, then by tampering a committed vector and confirming exit 1. |
| F2  | `plan-fingerprint-vectors.mjs` was registered in `state.json.oracles` but **consumed by nothing**, and tested `[1,undefined,2]` while omitting the sparse array `[1,,2]` — §1.6's actual headline case.                                                                                                                                                 | Both value-only cases are now recorded and asserted by `hash/parity_vectors_test.go`, which fails if either divergence disappears.                                                                                                                                                                                                                                                 |
| F3  | No receipt existed for the fix pass; `migration/evidence/` had nothing newer than 2026-09-17 while RULEBOOK v6 cited the pass as done.                                                                                                                                                                                                                  | Added `migration/evidence/w1-fix-pass-review.json`.                                                                                                                                                                                                                                                                                                                                |
| F4  | `DIVERGENCES.md` records the approver as `"migration review"` — the implementing agent approving its own divergence, on a user-facing CLI contract.                                                                                                                                                                                                     | **Open.** Needs a named approver; not resolvable by the implementer.                                                                                                                                                                                                                                                                                                               |
| F5  | New: `canonicalJson` is a VALUE function. `JSON.stringify({a:undefined})` → `"{}"` but `canonicalJson({a:undefined})` → `{"a":null}`. `computePlanFingerprint` passes `planData.consumer` through unguarded, so a U02 port canonicalizing `json.Marshal` output would **omit** the key instead of emitting `"consumer":null` — a different fingerprint. | Recorded as a value-only finding; needs a U02 rule.                                                                                                                                                                                                                                                                                                                                |
| F6  | `manifest.tsv` and `dependency-graph.json` still use different unit ids (`U06` vs `U06-hash`/`U06-phpencode`/`U06-sidecar`), so the skill plan's edge-existence check stays unimplementable.                                                                                                                                                            | **Open**; §4 step 1 was only half-applied.                                                                                                                                                                                                                                                                                                                                         |

### 8.3 Still not `green`

W1 stays `draft`. Mutation is waived (`blocked_gates`), `covercheck` is unwired, F4 has no named approver, F6 leaves the manifest and graph inconsistent, and the `config` path — the one CLI-reachable surface — has no automated dual-run yet (it was diffed by hand during review). The phpencode and hash dual-runs are library-level, because no Go subcommand exposes those encoders.

### 8.4 Reusable environment notes

- **`go` is not on `PATH`** in the agent shell even though `/opt/homebrew/bin/go` exists — same pattern as `php` in this repo. `run-parity.mjs` resolves an absolute binary or honours `WPDEV_GO_BIN`.
- **Shell `grep` returned false negatives three times** in this review (notably on `hash_test.go` and on `phpencode_test.go`'s new numeric assertions). Confirm any surprising absence with the Grep tool before writing it up.
