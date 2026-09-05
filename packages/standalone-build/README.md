# @wpdev/standalone-build

Standalone plugin assemble/deploy pipeline for wp-starter-kit consumers.

- Default build is **clean** (no AST mangling, no spaghetti inlining beyond the normal release packager).
- Profile S obfuscation is **opt-in**: `--obfuscate` or `--profile=s`. Closed profile values are `s` and `clean`; unknown or conflicting flags fail.
- `--obfuscate` fails closed if `plan3/transformer.php` cannot be resolved, Rector is missing, or transformer `--batch` JSON is invalid.
- Release CLI requires `WPDEV_CONTENT_ROOT` or a `wp-content`-shaped cwd. There is no silent `process.cwd()` fallback outside `node --test`.
- The orchestrator calls `assembleProfileSCandidate()` in-process (library API). Plugin-local `prepare-release.js` remains a thin packager that reuses the same Profile S fail-closed gates when `--obfuscate` is set; it is not a second assembler.

## Commands

From a WordPress `wp-content` directory (or with `WPDEV_CONTENT_ROOT` set):

```bash
# Clean standalone assemble (no obfuscation)
node packages/standalone-build/build-all-standalone-plugins.mjs --build-only

# Profile S obfuscation + deploy
node packages/standalone-build/build-all-standalone-plugins.mjs --obfuscate --deploy --jobs=4
```

Per-plugin (from a `*-dev` plugin root):

```bash
npm run release              # clean dist/{slug}
npm run release:obfuscate    # same + Profile S transformer
```

Canonical package tests (from this directory):

```bash
WPDEV_CONTENT_ROOT=/path/to/wordpress/wp-content npm test
```

`npm test` is the single canonical runner (`tests/*.test.mjs` plus `tests-docker/*.test.mjs`). Artifact and protection-gate tests need `WPDEV_CONTENT_ROOT` (or a `wp-content`-shaped cwd) so they do not look at the kit package directory.
