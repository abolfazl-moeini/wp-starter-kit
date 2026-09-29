# RULEBOOK — JS/PHP → Go (wpdev-build)

Version: 6
Source freeze: `8c1e9baf7359750e2a8d2efca58a316744f3e2e6`

Cardinal Law: fix this file and regenerate dependent units. Do not hand-patch one-off outputs.

## v6 amendments (go-implementation-improvement-plan §1, 2026-09-22)

- R-002d: sidecar objects are `phpencode.Object` only. Go `map[string]any` / `map[string]string` must return an error and never be used for file bytes. Canonical JSON key sorting (R-005d) does not apply to PHP output (R-002). Fixture: `migration/fixtures/run-u06-sidecar-oracle.mjs` (big-integer vectors); Go: `TestFileContent_MapsRejected`.
- R-004e: `phpencode` of a JSON number matches `phpFileContent` for that literal: decode `json.Number` via binary64 `Float64` then `jsNumber`, including values above `2^53` and the `uint64` max (`18446744073709551615` → `18446744073709552000`, `9007199254740993` → `9007199254740992`). Overflow (`1e400`) is `null`, matching `JSON.parse` → `Infinity`. A Go `int64`/`uint64` that binary64 cannot represent exactly is rejected; it is not printed in full. This supersedes R-004c. Fixture: `migration/fixtures/run-u06-sidecar-oracle.mjs`.
- R-005e: single shared JS number formatter. `config.jsFloat`, `phpencode.jsNumber`, and `hash.writeCanonical` exponent handling must use one helper with bounds-checked exponent rewrite (strip all leading exponent zeros). Vectors: `1e21` → `1e+21`, `1e-7` → `1e-7`, `1e-6` stays decimal, `-0.0` → `0`.
- R-007c: CLI `config` JSON contract. `wpdev-build config` output uses `SetEscapeHTML(false)` (no `\u0026`/`\u003c`/`\u003e`) with Go sorted-key order documented as the CLI contract; JS `JSON.stringify` insertion order is recorded in `DIVERGENCES.md` as the approved difference (no Node print command exists). Vectors: slug/extra containing `<`, `&`, U+2028.
- R-008g: library vs CLI config discovery. `config.ReadFile(path)` is the library contract (explicit path; a directory path fails with "Failed to read"). Cwd-anchored walk lives in CLI discovery only and is not `getRootPath` (`core/packages/utils/path.js`). Directory `wpdev.json` under discovery follows the tested discovery policy; explicit-path directories always fail.
- R-015b: dash-leading CLI values (`--file -foo.css`) are rejected as "missing value" (exit 2) and documented in `--help`. Unknown `Extra` numeric fields round-trip with JS-lossy spelling (`9007199254740993` → `9007199254740992`), not Go formatting.

## v5 amendments (W1 source-parity review, 2026-09-17)

These amendments supersede conflicting earlier rules. Existing source units were revised and re-tested; no reproducible generator or historical Clean Red artifacts were available, so this review does not constitute migration acceptance.

- R-002c: Ordered PHP objects enumerate canonical array-index keys from `0` through `4294967294` numerically before other keys. Duplicate keys retain their original position and final value. Encoding a Go map as a sidecar is rejected (R-002d); maps are not a fallback order.
- R-004d: `phpFileContent` includes `JSON.parse(JSON.stringify(value))` normalization: nonfinite floating-point values become `null`, including nested values. Emitting PHP `NaN` or `Infinity` is not source parity.
- R-005d: `CanonicalJSON` follows the source canonical serializer, not a lossless JSON-number format. Parse numbers as binary64, normalize negative zero and numeric notation, serialize overflow as `null`, sort keys by UTF-16 code units, emit literal U+2028/U+2029, and preserve escaped lone surrogates. This replaces R-005b for canonical fingerprints. Numeric tests provide bounded evidence, not exhaustive float parity.
- R-007b: CLI commands validate the entire argument list before file IO. Unknown flags/positionals, duplicate flags, empty values, and flags in place of values return usage exit code 2. Absent `--path` retains config discovery.
- R-008f: Coverage parsing fails closed on scanner errors, unknown modes, malformed or reversed source ranges, and negative counts. Parser validation alone does not enforce inventory, changed-statement, function, or CI coverage gates.

## v4 amendments (W1 boost adversarial review & remediation, 2026-09-17)

Defects, gaps, and uncodified mappings caught during independent adversarial code review,
formalized here per the Cardinal Law:

- R-001c: Falsy coercion for `math.NaN()` and `json.Number` in `config.truthy`: `NaN` and numeric zero variants (`0.0`, `-0`, `0.00`, `-0.0`) are strictly falsy, matching JS `Boolean(0) === false` and `Boolean(NaN) === false`. Required fields in `wpdev.json` with these values are correctly flagged as missing.
- R-004c (SUPERSEDED by R-004e in v6): Unsigned 64-bit integer preservation in `phpencode`: `json.Number` values exceeding `math.MaxInt64` are parsed via `strconv.ParseUint` before float fallback, preventing precision loss for large unsigned integers.
- R-005c: Negative zero (`-0.0`) numeric normalization: Both `phpencode.jsNumber` and `config.jsFloat` normalize `-0.0` (and `float32(-0.0)`) to `"0"`, matching JavaScript `(-0).toString() === "0"` and `json2php(-0.0) === "0"`.
- R-008d: `AssetPath` path reconstruction and trailing slash handling: In `sidecar.AssetPath`, trailing slashes are trimmed before deriving `filepath.Dir` and `filepath.Base`, and paths are reconstructed using `filepath.Join(dir, stem+".asset.php")` (or `stem+".asset.php"` if `dir == "."`). Slicing the raw bundle path string is forbidden because trailing slashes or path separators cause incorrect byte offsets.
- R-008e: Coverage profile path parsing with spaces and backslashes: `covercheck.parseBlock` splits by whitespace and treats the last two tokens as statement count and hit count, joining all preceding tokens to preserve directory paths containing spaces. Paths are normalized cross-platform (`strings.ReplaceAll(file, "\\", "/")`) before passing to `path.Dir`.

## v3 amendments (W1 boost code-review & audit, 2026-09-17)

Defects, gaps, and uncodified mappings caught during independent adversarial code review,
formalized here per the Cardinal Law:

- R-001b: Nullable fields in `wpdev.json`: Optional fields set to `null`
  (`vendorPrefix`, `restNamespace`, `batchEndpoint`, `phpMinVersion`,
  `phpSourceVersion`, `phpFunctionPrefix`) must be preserved as `null` in
  memory and when serialized, not corrupted to empty strings `""`.
- R-003b: WHATWG UTF-8 maximal subpart decoding in `lossyUTF8`: Replaces flawed
  v2 rule. When an invalid continuation byte is encountered in a multi-byte
  sequence, the maximal subpart (starter plus any preceding valid continuation
  bytes) is consumed as one U+FFFD, and the invalid byte begins the next
  sequence. If a sequence is truncated with valid continuation bytes so far,
  all remaining bytes are consumed as one U+FFFD. Verified against Node on
  vectors `[0xe0, 0x28]`, `[0xe2, 0x82, 0x28, 0x61]`, `[0xf0, 0x90, 0x80, 0x28]`.
- R-004b: Extended type coverage in `phpencode`: Supports `json.Number`
  (int/float dispatch), `float32`, `int8`, `int16`, `uint`, `uint8`, `uint16`,
  `uint32`, `uint64`, `map[string]string` (sorted keys), and primitive slices
  (`[]int`).
- R-005b: Lossless numeric preservation in `CanonicalJSON`: Decodes via
  `dec.UseNumber()` to prevent precision loss on 64-bit integers and high-precision
  decimals. Trailing data is strictly rejected with `io.EOF` verification.
- R-008b: Basename non-empty constraint in `AssetPath`: Matches JS
  `path.basename(assetFilePath).match(/(.+)\.(?:js|css)$/)` which requires at
  least one character in the basename before `.js` or `.css`. Inputs such as
  `".js"`, `".css"`, `"dir/.js"`, `"dir/.css"` are rejected as unsupported extensions.
- R-008c: Cross-platform coverage profile parsing: `covercheck.parseBlock` splits
  by whitespace first and finds the line range separator via `LastIndex(fields[0], ":")`,
  ensuring Windows drive letters (e.g. `C:\...`) do not break block parsing.

## v2 amendments (W1 review, 2026-09-17)

Uncodified mappings found during review of U01/U06/U30 and pinned here
per the Cardinal Law; affected units re-verified under these rules:

- R-001a: JS template-literal coercion `${v}` for derived strings and error
  text: `null` → `"null"`, numbers via JS `Number.prototype.toString`,
  booleans literally, arrays joined with `","`, plain objects →
  `"[object Object]"`. Applies to `depsBundle` derivation
  (numeric slug `1` → `"1-deps.js"`) and `uiFramework` error text.
- R-003a: file hashing uses the LOSSY `Buffer.toString("utf8")` decode:
  invalid starter byte → one U+FFFD consuming one byte; valid starter
  truncated by end of input → one U+FFFD consuming the rest; valid starter
  with out-of-bounds continuation → one U+FFFD consuming the starter only
  (bounds: E0/A0, ED/9F, F0/90, F4/8F). Verified against Node on 16 vectors.
- R-005a: non-integral numbers render with JS `Number.prototype.toString`:
  `|v| >= 1e21` or `0 < |v| < 1e-6` → unpadded exponent (`1e+21`, `1e-7`);
  `1e-6` itself stays decimal; all other magnitudes use shortest
  round-trip decimal. Integral magnitudes below `1e21` print as digits.
- R-007a: validation errors report JS `typeof` names (`number`,
  `boolean`, `object`), never Go type names (`float64`, …). A JS `throw`
  on programmer error (e.g. `assetFilePath` null regex match) becomes a
  Go `error` value with a descriptive message.
- R-008a: `buildStyleAssetFile` path rule (strip `/\.css$/i`, else append
  `.asset.php`) and bundle `assetFilePath` rule (strip case-sensitive
  `.js`/`.css`, else error) are DISTINCT functions. Never conflate them.

| ID    | Subject                                                                                                                                                                                                                 | Required test                            |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| R-001 | absent/null/false/empty vs defaulting. JS `!value` treats `""`, `0`, `false`, `null` as missing for required `wpdev.json` fields. Present `null` on optional v2 fields overwrites defaults and skips format validation. | U01 null vendorPrefix; empty slug        |
| R-002 | Object/Map insertion order vs Go maps. Canonical JSON sorts keys. PHP sidecar objects preserve explicit `phpencode.Object` order, matching json2php `Object.entries`.                                                   | U06 CanonicalJSON; U06 sidecar key order |
| R-003 | JS UTF-16 vs Go bytes/runes. Config strings and MD5 input use UTF-8 bytes of the decoded string (Node `Buffer.toString()` + `update(str,'utf8')`).                                                                      | U01 Unicode slug; U06 MD5 `سلام`         |
| R-004 | json2php string escapes: `\\` then `\'` only. PHP `array(...)` long form, `=>`, comma-space, no short `[]`. Wrap `<?php return ...;\n`.                                                                                 | U06 phpencode oracle                     |
| R-005 | JSON numbers stay IEEE float64. Integer-valued floats encode as integers in PHP (`2` not `2.0`).                                                                                                                        | U06 numbers case                         |
| R-006 | Do not translate JS/PHP regex lookaround into RE2. Port known-safe patterns only (`vendorPrefix`, `restNamespace`, PHP version).                                                                                        | U01 v2 validation                        |
| R-007 | Errors are values. Preserve stderr/stdout split and message fragments (`not found`, `malformed`, `missing required fields`). Exit 0 help/version, 1 runtime, 2 usage.                                                   | U30 CLI                                  |
| R-008 | Paths: walk up from StartDir/cwd for `wpdev.json` (max 12). Sidecar sits next to source (`file.css` → `file.asset.php`).                                                                                                | U01 walk; U06 AssetPath                  |
| R-009 | No hidden clocks/RNG in W1 units.                                                                                                                                                                                       | W1 tests are deterministic               |
| R-010 | Cancellation/goroutines not used in W1.                                                                                                                                                                                 | n/a                                      |
| R-011 | W1 writes only sidecar files beside sources; never touches active plugin dirs.                                                                                                                                          | U06 WriteStyle                           |
| R-012 | ZIP writers deferred to W3.                                                                                                                                                                                             | n/a                                      |
| R-013 | PHP AST deferred to W5.                                                                                                                                                                                                 | n/a                                      |
| R-014 | Cache/WAL deferred to W6–W7.                                                                                                                                                                                            | n/a                                      |
| R-015 | Process env: config path is explicit or walked; tests must not depend on home. Walking from package test cwd to repo `wpdev.json` is allowed.                                                                           | U01/U30 walk tests                       |
| R-016 | Asset MD5 is distinct from artifact SHA-256. File MD5 hashes `string(fileBytes)` (UTF-8 lossy, matching Node).                                                                                                          | U06 MD5 vs SHA256                        |

Forbidden: `eval`, runtime decryption, editing `/wordpress/wp-content/plugins/{slug}/`, unzip onto active plugins, shell-string process construction.
