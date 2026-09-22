# DIVERGENCES

Default: none accepted.

## Observed source quirks reproduced (not divergences)

- Empty-string required fields are missing (`!config[f]`).
- JSON array root is a JS object, so the source reports missing required fields rather than "must contain a JSON object".
- `vendorPrefix: null` stays null and is not replaced by `WpdevVendor`.
- Jest `@core/utils` mock is **not** the oracle. Oracle is `core/packages/utils/readProjectConfig.js` via `migration/fixtures/run-u01-oracle.mjs`.

## Deferred (out of W1)

- esbuild invocation, watch, ZIP, WAL, Profile S transformer, generator wiring.
- Mutation tool (`gremlins`) is not pinned yet; W1 uses strong assertions + `go test -race` instead. Pin in a later W0 close-out.

## W1 review findings (2026-09-17, RULEBOOK v2)

Accepted intentional divergences (typed Go model, error-value mapping):

- Typed config: a truthy non-string identity field (number, bool, object)
  is accepted for presence checks. The string field stores the JS template
  coercion (`1` → `"1"`, object → `"[object Object]"`). The raw JSON value
  is kept in `Extra` and wins in `MarshalJSON`, so CLI output still emits
  the number or object. Explicit `null` stays in `NullFields` and marshals
  as `null`, not `""` and not the default.
- `assetFilePath` JS `TypeError` on unsupported extensions becomes a Go
  `error` from `AssetPath` (R-007a). Same trigger set, error value instead
  of throw.
- `config` without `--path` walks up from cwd/StartDir (R-015). The JS
  `getRootPath()` default is package-location anchored; the Go CLI defines
  the cwd-anchored walk as its contract (a CLI has no package location).
- CLI `config` JSON output uses sorted keys (Go map marshal); JS has no
  equivalent command, so key order is Go-contract canonical (R-002).

## W1 Boost Review findings (2026-09-17, RULEBOOK v3)

Remediated defects & generalized contracts:

- `lossyUTF8` WHATWG maximal subpart algorithm: Previously, invalid continuation bytes
  swallowed trailing ASCII bytes when truncated or generated extra U+FFFDs on 3/4-byte sequences.
  Corrected to full WHATWG compliance matching Node `Buffer.toString("utf8")`.
- General nullable preservation in `Config`: Removed the special-cased `vendorPrefix`
  hack and implemented `NullFields` tracking for all optional fields, preserving `null` in JSON.
- Historical `CanonicalJSON` numeric-preservation change: superseded by R-005d in RULEBOOK v5. Preserving numeric spellings and arbitrary precision diverged from source binary64 canonical fingerprints.
- `AssetPath` basename check: Restricts matches to non-empty basenames, correctly erroring on
  `.js`, `.css`, `dir/.js`, `dir/.css`.
- Cross-platform `covercheck`: Handles Windows drive paths (e.g. `C:\...`) by splitting on whitespace
  before looking for range separator colons.
- Extended `phpencode`: Added native support for `json.Number`, `float32`, signed/unsigned integers,
  and `map[string]string`.

## W1 fix pass (2026-09-22, RULEBOOK v6)

Accepted intentional divergences (approved, tested contracts):

| behavior-A (source)                                          | behavior-B (target)                                                                                                                       | fixture                                                                         | approver         | date       |
| :----------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------ | :--------------- | :--------- |
| No Node `config` print command exists                        | `wpdev-build config` emits Go sorted-key JSON with `SetEscapeHTML(false)` (R-007c)                                                        | `TestRun_ConfigJSONNoHTMLEscape` + U01 oracle `<`/U+2028 vectors                | migration review | 2026-09-22 |
| `getRootPath()` is module-anchored (`path.js`)               | CLI discovery walks from cwd/`StartDir`; library contract is `config.ReadFile` (R-008g)                                                   | `TestRead_DiscoverySkipsDirectoryNamedWpdevJSON`, `TestReadFile_DirectoryFails` | migration review | 2026-09-22 |
| `covercheck` grouping is posix-only (no such tool in source) | drive letter retained in package key (`C:/...`), locked by `TestEvaluate_WindowsDrivePath` + `TestEvaluate_WindowsBackslashPath` (R-008e) | `covercheck_test.go:107-140`                                                    | migration review | 2026-09-22 |

Superseded (defects, not divergences — fixed in v6):

- R-004c exact-uint64 preservation contradicted `phpFileContent` (`JSON.parse` rounding); replaced by R-004e float64 rule. Oracle: `run-u06-sidecar-oracle.mjs` big-integer vectors.
- Go `map[string]any`/`map[string]string` sidecar encoding (alphabetical keys) replaced by R-002d error. Tests: `TestFileContent_MapsRejected`.
- Non-string known config values no longer collapse to `""`. The typed field stores the JS template coercion and `Extra` keeps the raw JSON value for `MarshalJSON`. Null stays in `NullFields`. Oracle: `run-u01-oracle.mjs` num-global/null-prefix/null-deps vectors.

## W1 Boost Round 2 Review findings (2026-09-17, RULEBOOK v4)

Remediated defects & edge cases:

- `AssetPath` path reconstruction: Previously sliced raw bundle string (`bundle[:len(bundle)-len(ext)]`),
  which corrupted trailing slash inputs (`style.css/` $\rightarrow$ `style..asset.php`, `dir/bundle.js/` $\rightarrow$ `dir/bundle.j.asset.php`).
  Normalized by trimming trailing separators and reconstructing with `filepath.Join(dir, stem+".asset.php")`.
- `covercheck` path with spaces & Windows backslashes: `parseBlock` previously broke on paths with spaces
  by requiring `len(fields) == 3`. Fixed by treating the last two fields as statement and hit counts, joining
  all earlier tokens. Normalized backslashes cross-platform via `strings.ReplaceAll(file, "\\", "/")` for `path.Dir`.
- Negative zero (`-0.0`) normalization: In JS `(-0.0).toString() === "0"`. Go's `strconv.FormatFloat` outputs `"-0"`.
  Added zero guard (`if t == 0 { return "0" }`) to `phpencode.jsNumber` and `config.jsFloat`.
- `truthy` falsy handling: `math.NaN()` and `json.Number` representations of zero (`0.0`, `-0`, `0.00`, `-0.0`)
  are now strictly falsy, matching JS semantics where empty/zero required fields are flagged as missing.
- `json.Number` uint64 preservation: Checked `strconv.ParseUint` in `phpencode` before float fallback, preserving
  64-bit unsigned integers without float53 precision loss.
