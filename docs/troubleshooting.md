# Troubleshooting

> Symptom → Cause → Fix catalog for `wpdev` CLI, scaffold, builds, migrations,
> and WordPress runtime. Organized by area. Related:
> [cli-reference.md](cli-reference.md), [features-reference.md](features-reference.md).

## Table of contents

- [Installation and setup](#installation-and-setup)
- [Scaffold](#scaffold)
- [Feature toggles](#feature-toggles)
- [Build](#build)
- [Update and migrations](#update-and-migrations)
- [Tests](#tests)
- [WordPress runtime](#wordpress-runtime)
- [Release](#release)
- [Doctor workflow](#doctor-workflow)
- [See also](#see-also)

---

## Installation and setup

### CLI not found after install

**Symptom:** `wpdev: command not found` after `npm install -g @wpdev/cli`.

**Cause:** npm global bin directory is not on `PATH`.

**Fix:**

```bash
npm config get prefix
# Add <prefix>/bin to PATH in your shell profile
npm install -g @wpdev/cli
which wpdev
```

**Related:** [installer.md](installer.md)

---

### `npm create @wpdev/plugin` fails

**Symptom:** `npm create @wpdev/plugin@latest` cannot resolve `@wpdev/cli`.

**Cause:** `@wpdev/cli` or `@wpdev/create-plugin` not published or registry misconfigured.

**Fix:** Install from the kit monorepo during development:

```bash
cd wp-starter-kit/packages/cli && npm link
wpdev create my-plugin --yes
```

For production, ensure all three CLI packages are on npm per
[release-checklist.md](release-checklist.md).

---

### Node / PHP version mismatch

**Symptom:** `composer install` or `npm install` fails with engine requirement errors.

**Cause:** Host Node or PHP version below project constraints.

**Fix:**

1. Check `package.json` `engines` and `composer.json` `require.php`.
2. Align local versions or adjust via `wpdev set phpMinVersion <ver>`.

**Related:** [features-reference.md](features-reference.md#phpminversion--php)

---

## Scaffold

### Scaffold fails: permission denied

**Symptom:** `EACCES` or `permission denied` writing to target directory.

**Cause:** Insufficient filesystem permissions on `--dir` target.

**Fix:**

```bash
wpdev create my-plugin --dir=$HOME/projects/my-plugin --yes
# Or fix ownership: chown/chmod on parent directory
```

---

### Scaffold creates wrong directory

**Symptom:** Files appear in unexpected folder.

**Cause:** Positional slug vs `--dir` confusion; path-like positional sets both slug
(basename) and `targetDir` (full path).

**Fix:**

```bash
wpdev create --slug=my-plugin --dir=./plugins/my-plugin --yes
```

**Related:** [cli-reference.md](cli-reference.md#positional-slug)

---

### `project.config.json already exists`

**Symptom:** Scaffold returns `reason` mentioning existing `project.config.json`.

**Cause:** Target directory already contains a kit project.

**Fix:** Use a new directory, or pass `--force` to overwrite owned scaffold files:

```bash
wpdev create my-plugin --force --yes
```

---

### Invalid answers / feature set errors

**Symptom:** Exit code `1` with `invalid answers` or `invalid feature set`.

**Cause:** Branding regex failure or cross-feature dependency violation.

**Fix:** Read the error key. Examples:

- `hookPrefix=wpdev` with `phpFramework:wpdev` → pick a project-unique prefix
- Stale feature combos after an old kit → `wpdev doctor` / `wpdev update`

**Related:** [features-reference.md](features-reference.md#validation-rules)

---

## Feature toggles

### Cannot remove `js`: dependents still on

**Symptom:** `wpdev remove js` fails or doctor reports dependent features active.

**Cause:** `jsLib`, `jsTest`, `css`, or `restBatch` still set to on/non-none values.

**Fix:**

```bash
wpdev doctor
wpdev remove jsTest --yes
wpdev remove jsLib --yes
wpdev remove css --yes
wpdev remove js --yes
```

Or rely on `normalizeFeatureSet` by removing `js` last — engine coerces dependents.

---

### Add feature fails validation

**Symptom:** `invalid feature set` after `wpdev add`.

**Cause:** New state violates dependency rules (e.g. `restBatch` with `js:none`).

**Fix:** Enable prerequisites first:

```bash
wpdev add js --variant typescript --yes
wpdev add restBatch --yes
```

**Related:** [features-reference.md](features-reference.md)

---

### `set` rejected for toggle feature

**Symptom:** `setConfigValue: "<id>" is not config-only; use wpdev add/remove`.

**Cause:** Feature is not in the settable list (`phpMinVersion`, `wpMinVersion`,
`license`, `ci` only).

**Fix:**

```bash
wpdev add husky --yes      # not: wpdev set husky on
wpdev set phpMinVersion 8.2
```

---

### Shared owned paths not deleted

**Symptom:** Files remain after `wpdev remove` when another feature still owns them.

**Cause:** Shared ownership protection — by design.

**Fix:** Remove the other feature first, or delete user code outside `owns` manually.
Run `wpdev doctor` to see drift.

---

## Build

### `npm run build:components` exits 0 but no bundles

**Symptom:** `assets/bundles/` missing `{Module}-{entry}.js` files. No
`build:src/Modules/...` lines in the log. Exit code is still `0`.

**Cause (either or both):**

1. **CLI symlink guard** — older CLIs compared `process.argv[1]` to
   `fileURLToPath(import.meta.url)` without resolving npm bin symlinks, so
   the CLI never ran.
2. **Wrong project root** — `getRootPath()` used a fixed parent depth that
   missed `wpdev.json` in generated plugins (`packages/core-utils` is one
   level shallower than the kit’s `core/packages/utils`).
3. **glob@7 hoist** — `glob()` without a callback returns a Glob object;
   entry discovery then finds zero files.

**Fix:**

1. Upgrade `@wpdev/build` / `@core/utils` so CLIs use `isCliMain()`
   (realpath compare) and `getRootPath()` walks up until it finds
   `wpdev.json`.
2. Confirm `npm run build:components` prints one `build:src/Modules/...`
   line per entry.
3. Prefer `glob@10+` (declared by `@wpdev/build`); if the root tree hoists
   glob@7, the build now falls back to `glob.sync`.

**Related:** [build-outputs.md](build-outputs.md), skill `wpdev-js-modules`

---

### Build fails: missing depsBundle

**Symptom:** esbuild or PHP enqueue cannot find `{slug}-deps.js`.

**Cause:** `project.config.json` `depsBundle` mismatch or deps bundle not built.

**Fix:**

1. Confirm `depsBundle` in `project.config.json` matches actual filename.
2. Run `npm run build`.
3. Verify `assets/bundles/{slug}-deps.js` exists.

**Related:** [build-outputs.md](build-outputs.md)

---

### TypeScript errors after scaffold

**Symptom:** `npm run typecheck` fails on fresh project.

**Cause:** Missing `npm install`, wrong `js` variant, or IDE using wrong `tsconfig`.

**Fix:**

```bash
npm install
npm run typecheck
```

Ensure `js=typescript` if using `.ts` entries. See [js-variants.md](js-variants.md).

---

### `X is not defined` in browser console

**Symptom:** `wp is not defined` or `@wordpress/hooks` equivalent at runtime.

**Cause:** Module bundle loaded without deps bundle dependency.

**Fix:** Enqueue deps bundle first via `Assets::enqueue_bundle_script()`. Check
`.asset.php` dependency list. See [asset-mappings.md](asset-mappings.md).

---

### Tailwind + Polaris conflict

**Symptom:** Validation error when enabling both `frontendStack:polaris` and `css:tailwind`.

**Cause:** v1 incompatibility — Polaris uses global BEM tokens.

**Fix:** Pick one stack, or use `css:sass` with Polaris.

---

## Update and migrations

### Migration fails halfway

**Symptom:** `wpdev update --run` exits `1`; project in partial state.

**Cause:** Migration step I/O or dependency failure mid-chain.

**Fix:**

1. `git status` — revert with `git checkout .` if uncommitted.
2. Fix reported error (disk space, composer auth, etc.).
3. Re-run `wpdev update` (dry-run first).

**Related:** [updating-projects.md](updating-projects.md)

---

### Update shows no changes

**Symptom:** Plan prints `noop: true`.

**Cause:** `kitVersion` already at or past target version.

**Fix:** No action required. Use `wpdev info` to confirm version. To force review,
check `wpdev-kit.json` `kitVersion` manually.

---

### Migration note: framework not found

**Symptom:** 1.0.0 migration cannot locate framework source.

**Cause:** `WPDEV_FRAMEWORK_SRC` unset in non-monorepo layout.

**Fix:**

```bash
export WPDEV_FRAMEWORK_SRC=/path/to/wp-starter-kit/packages/framework
wpdev update --run
```

---

### Manifest unreadable

**Symptom:** Doctor or `wpdev info` reports malformed JSON.

**Cause:** Hand-edited `wpdev-kit.json` syntax error.

**Fix:** Open file; fix JSON (trailing commas, quotes). Message includes absolute path.

---

### Feature / config drift

**Symptom:** Doctor warning: features out of sync between manifest and config.

**Cause:** Manual edit of only one file.

**Fix:**

```bash
wpdev doctor
# Re-sync by toggling a feature or copying features object between files
wpdev set ci auto   # triggers manifest + config write
```

---

## Tests

### Jest can't resolve `@wpdev/*`

**Symptom:** `Cannot find module '@wpdev/utils'` in tests.

**Cause:** Missing `npm install` or broken workspace links in monorepo dev.

**Fix:**

```bash
npm install
# Consumer project: ensure package.json lists @wpdev/* deps
```

Check `jest.config` / `moduleNameMapper` in scaffold output.

---

### PHPUnit class not found

**Symptom:** `Class WPDev\Core\Plugin not found`.

**Cause:** Composer autoload not dumped or `vendor/` missing.

**Fix:**

```bash
composer install
composer dump-autoload
```

---

## WordPress runtime

### `php-fault-tolerance` bootstrap fatal in Docker

**Symptom:**

```
Failed opening required '.../vendor/wpdev/php-fault-tolerance/src/bootstrap.php'
```

**Cause:** Composer installed the package as a **host-absolute symlink** into the
kit checkout (`/Users/.../wp-starter-kit/packages/php-fault-tolerance`). That
path does not exist inside the container.

**Fix:**

```bash
# From the plugin root
cp -R "$KIT/packages/php-fault-tolerance" packages/
rm -rf vendor/wpdev/php-fault-tolerance
# ensure composer.json path repo: packages/* with options.symlink = false
composer update wpdev/php-fault-tolerance
wpdev doctor   # should flag host-absolute FT symlinks
```

New scaffolds / `wpdev add faultTolerance` already mirror under `packages/` with
`symlink: false`.

---

### REST endpoint 404

**Symptom:** `{restNamespace}/...` returns 404.

**Cause:** Permalink flush needed, wrong `restNamespace`, or module not booted.

**Fix:**

1. Confirm `restNamespace` in `project.config.json`.
2. Visit Settings → Permalinks → Save (flush rewrite rules).
3. Ensure module registered on loader and `RestSetup::setup()` ran.

---

### REST 401 / 403

**Symptom:** Authenticated requests rejected.

**Cause:** Missing nonce, wrong cap in `rest_permission()`, or logged-out user.

**Fix:** Use `localize.api()` nonces from `@wpdev/utils`. Verify
`CapabilityPolicy::rest_permission()` cap matches user role.

---

### Assets not loading

**Symptom:** Admin screen blank; 404 on bundle URL.

**Cause:** Bundle not built or wrong enqueue path.

**Fix:**

```bash
npm run build
```

Verify `Assets::set_plugin_dir()` called before enqueue in Composer installs.

---

### Hooks not firing

**Symptom:** Module `boot()` never runs.

**Cause:** Module not registered, `should_boot()` returned false, or boot order issue.

**Fix:** Register on loader before `Plugin::boot()`. Listen on
`{hookPrefix}_modules_loaded`. See [api/hooks-reference.md](api/hooks-reference.md).

---

### MCP abilities not registered

**Symptom:** No abilities in WordPress 6.8 or earlier.

**Cause:** Abilities API requires WordPress 6.9+.

**Fix:** Upgrade WordPress or set `mcpAbilities:off`. Admin notice is shown when API
missing. See [mcp-integration.md](mcp-integration.md).

---

## Release

### Build outputs are stale

**Symptom:** Released zip contains old JS; CI passes but UI unchanged.

**Cause:** `npm run release` without fresh `npm run build`.

**Fix:**

```bash
npm run build
npm run release
```

Doctor in strict mode may warn on hash drift in some setups.

---

### Strauss / vendor prefix failures

**Symptom:** `composer strauss` errors or wrong class prefixes.

**Cause:** `vendorScoping:off` or malformed `strauss.json`.

**Fix:** See [vendor-scoping.md](vendor-scoping.md). Re-run after `composer install`.

---

## Doctor workflow

Recommended sequence when anything feels "off":

```bash
wpdev doctor
wpdev list
wpdev info
```

| Doctor output            | Next step                                        |
| ------------------------ | ------------------------------------------------ |
| Errors about kit version | `wpdev update` then `--run`                      |
| Missing owned files      | `wpdev add <feature> --yes`                      |
| Unexpected owned files   | `wpdev remove <feature> --yes`                   |
| Config schema errors     | Fix `project.config.json` per example            |
| Warnings only            | Safe to proceed; use `--strict` in CI if desired |

---

## See also

- [cli-reference.md](cli-reference.md) — commands, flags, exit codes
- [updating-projects.md](updating-projects.md) — migration rollback
- [build-system.md](build-system.md) — esbuild pipeline debugging
- [features-reference.md](features-reference.md) — validation matrix
- [installer.md](installer.md) — first-time setup
