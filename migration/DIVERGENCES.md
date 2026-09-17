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

- Typed config: a truthy non-string `slug` (e.g. number `1`, object) is
  accepted for presence checks and `depsBundle` derivation (`1-deps.js`,
  matching JS coercion) but the typed `Config.Slug` field keeps `""`.
  JS keeps the raw value; Go cannot without `any` fields. No oracle covers
  non-string slugs; behavior documented, not hidden.
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
- `CanonicalJSON` numeric fidelity: Decodes via `json.NewDecoder` with `UseNumber()` to prevent
  loss of precision for large 64-bit integers and high-precision floats.
- `AssetPath` basename check: Restricts matches to non-empty basenames, correctly erroring on
  `.js`, `.css`, `dir/.js`, `dir/.css`.
- Cross-platform `covercheck`: Handles Windows drive paths (e.g. `C:\...`) by splitting on whitespace
  before looking for range separator colons.
- Extended `phpencode`: Added native support for `json.Number`, `float32`, signed/unsigned integers,
  and `map[string]string`.

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
