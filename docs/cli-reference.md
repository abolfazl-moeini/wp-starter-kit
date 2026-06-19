# CLI reference (`wpdev`)

> Canonical reference for every `wpdev` command, flag, preset, exit code, and
> environment variable. For getting started, see [installer.md](installer.md).
> For programmatic access, see
> [api/cli-engine-reference.md](api/cli-engine-reference.md).

## Table of contents

- [Commands overview](#commands-overview)
- [Global concepts](#global-concepts)
- [Flag reference (`wpdev create`)](#flag-reference-wpdev-create)
- [Command: `wpdev create`](#command-wpdev-create)
- [Command: `wpdev add`](#command-wpdev-add)
- [Command: `wpdev remove`](#command-wpdev-remove)
- [Command: `wpdev set`](#command-wpdev-set)
- [Command: `wpdev update`](#command-wpdev-update)
- [Command: `wpdev doctor`](#command-wpdev-doctor)
- [Command: `wpdev info`](#command-wpdev-info)
- [Command: `wpdev list`](#command-wpdev-list)
- [Presets](#presets)
- [Interactive wizard flow](#interactive-wizard-flow)
- [Exit codes](#exit-codes)
- [Environment variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [See also](#see-also)

---

## Commands overview

| Command  | Syntax                          | Purpose                                         |
| -------- | ------------------------------- | ----------------------------------------------- |
| `create` | `wpdev create [slug] [flags]`   | Scaffold a new project (interactive by default) |
| `add`    | `wpdev add [opts] <feature>`    | Add a toggle feature to an existing project     |
| `remove` | `wpdev remove [opts] <feature>` | Remove a toggle feature                         |
| `set`    | `wpdev set <key> <value> [dir]` | Set a config-only feature variant               |
| `update` | `wpdev update [dir] [flags]`    | Plan or apply kit migrations                    |
| `doctor` | `wpdev doctor [dir] [flags]`    | Report drift and prerequisites                  |
| `info`   | `wpdev info [dir]`              | Show kit version and feature states             |
| `list`   | `wpdev list [dir]`              | Print features from `wpdev-kit.json`            |

Source: `packages/cli/src/commands/*.js`. Flag registry:
`packages/cli/src/flags.js` (`KNOWN_FLAGS`).

---

## Global concepts

### Positional slug

The first non-flag argument is the project slug. It is sanitized to lowercase
kebab-case and used as the default directory name when `--dir` is omitted.

```bash
wpdev create my-plugin          # slug=my-plugin, dir=my-plugin
wpdev create /tmp/my-plugin     # slug=my-plugin, dir=/tmp/my-plugin
wpdev create --slug=other --dir=/tmp/x   # slug wins over positional
```

### Flag forms

All value flags use `--key=value` (no space-separated form). Boolean flags are
presence-based: `--install`, `--git`, `--force`, `--verbose`, `--yes` / `-y`.

Unknown flags throw `WPDEV_UNKNOWN_FLAG` with a sorted list of every valid flag.

### Project directory resolution

Commands that accept `[dir]` default to the current working directory. The
sentinel file for "is this a kit project?" is `wpdev-kit.json`.

---

## Flag reference (`wpdev create`)

Source of truth: `KNOWN_FLAGS` in `packages/cli/src/flags.js`.

### Branding flags (`answers.*`)

| Flag                  | Maps to                     | Values / notes                                 |
| --------------------- | --------------------------- | ---------------------------------------------- |
| `[slug]` (positional) | `answers.slug`              | Sanitized; default directory name              |
| `--slug=<slug>`       | `answers.slug`              | Explicit slug; wins over positional            |
| `--dir=<path>`        | `runOptions.targetDir`      | Output directory                               |
| `--scope=<scope>`     | `answers.npmScope`          | npm scope without `@`                          |
| `--global=<Name>`     | `answers.globalName`        | JS global (valid identifier, PascalCase)       |
| `--domain=<slug>`     | `answers.textDomain`        | WordPress text domain                          |
| `--hook=<prefix>`     | `answers.hookPrefix`        | Hook prefix; must not be `wpdev` with wpdev FW |
| `--php-fn=<pfx_>`     | `answers.phpFunctionPrefix` | PHP function prefix ending with `_`            |
| `--php-source=<ver>`  | `answers.phpSourceVersion`  | Authoring PHP version (`8.1`, `8.2`, `8.3`)    |

### Feature flags (`features.*`)

| Flag                          | Maps to                   | Values                                               |
| ----------------------------- | ------------------------- | ---------------------------------------------------- |
| `--js=<variant>`              | `features.js`             | `typescript` / `pure` / `flow` / `none`              |
| `--js-lib=<lib>`              | `features.jsLib`          | `none` / `preact` / `react`                          |
| `--js-test=<runner>`          | `features.jsTest`         | `jest` / `vitest` / `none`                           |
| `--css=<flavor>`              | `features.css`            | `none` / `sass` / `tailwind` / `postcss`             |
| `--blocks=<on\|off>`          | `features.blocks`         | Blockstudio blocks                                   |
| `--php-min=<ver>`             | `features.phpMinVersion`  | `7.4` … `8.3`                                        |
| `--php-framework=<opt>`       | `features.phpFramework`   | `none` / `wpdev` (alias `wpdev-framework` → `wpdev`) |
| `--php-test=<opt>`            | `features.phpTest`        | `phpunit` / `none`                                   |
| `--license=<id>`              | `features.license`        | `gpl2` / `gpl3` / `mit`                              |
| `--wp-min=<ver>`              | `features.wpMinVersion`   | `5.8` / `6.0` / `6.2` / `6.4` / `6.6`                |
| `--rest-batch=<on\|off>`      | `features.restBatch`      | REST batch endpoint + client                         |
| `--fault-tolerance=<on\|off>` | `features.faultTolerance` | PHP 8.1+ resilience package                          |
| `--vendor-scoping=<on\|off>`  | `features.vendorScoping`  | Strauss vendor prefix on release                     |
| `--husky=<on\|off>`           | `features.husky`          | Git pre-commit hooks                                 |
| `--example=<on\|off>`         | `features.exampleFeature` | ExampleFeature demo module                           |
| `--i18n=<on\|off>`            | `features.i18n`           | Translation pipeline                                 |
| `--frontend-stack=<opt>`      | `features.frontendStack`  | `none` / `polaris`                                   |
| `--mcp-abilities=<on\|off>`   | `features.mcpAbilities`   | WordPress Abilities API (WP 6.9+)                    |

### Run option flags (`runOptions.*`)

| Flag                  | Maps to                        | Default              | Description                                     |
| --------------------- | ------------------------------ | -------------------- | ----------------------------------------------- |
| `--preset=<name>`     | `runOptions.preset`            | —                    | `minimal` / `standard` / `full` / `woocommerce` |
| `--install`           | `runOptions.install`           | `false`              | Run `npm install` + `composer install`          |
| `--git`               | `runOptions.git`               | `false`              | Run `git init`                                  |
| `--force`             | `runOptions.force`             | `false`              | Overwrite existing project files                |
| `--yes` / `-y`        | `runOptions.interactive=false` | `true` (interactive) | Skip all prompts                                |
| `--verbose`           | `runOptions.verbose`           | `false`              | Stream child-process output                     |
| `--kit-version=<ver>` | `runOptions.kitVersion`        | engine version       | Override stamped kit version (testing)          |

---

## Command: `wpdev create`

Scaffold a new consumer plugin project.

### Examples

```bash
# Interactive (default)
wpdev create my-plugin

# Non-interactive standard preset
wpdev create my-plugin --yes --preset=standard

# PHP-only minimal project
wpdev create my-plugin --yes --preset=minimal --install

# Full stack with explicit flags overriding preset
wpdev create my-plugin --yes --preset=standard \
  --js-lib=react --blocks=on --frontend-stack=polaris

# Force overwrite in CI
wpdev create my-plugin --yes --force --dir=/tmp/my-plugin
```

### Behavior

1. Parse flags via `parseFlags(argv)`.
2. Merge preset (if `--preset`) then CLI feature flags.
3. Run `normalizeFeatureSet` and `validateFeatureSet`.
4. Interactive prompts when `interactive !== false`.
5. Call `scaffoldProject(targetDir, answers, { features, force, frameworkPath })`.
6. Optionally run npm/composer install and `git init`.

### Validation failures

Invalid branding or feature sets exit `1` with a reason string. Common cases:

- `js=none` with `js-lib=preact` → dependency error
- `fault-tolerance=on` with `php-min=7.4` → requires PHP 8.1+
- `frontend-stack=polaris` without TypeScript + React/Preact

See [features-reference.md](features-reference.md) for the full rule matrix.

### Output

On success, prints the list of written relative paths and creates
`wpdev-kit.json` + `project.config.json`.

---

## Command: `wpdev add`

Add or switch a toggle feature in an existing project.

### Syntax

```bash
wpdev add <feature> [--variant <value>] [options] [dir]
```

### Flags

| Flag                  | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `--variant <variant>` | Variant for multi-value features (e.g. `vitest` for `jsTest`) |
| `-y`, `--yes`         | Skip confirmation prompt                                      |
| `--install`           | Run `npm install` / `composer install` after add              |
| `-f`, `--force`       | Force overwrite of owned paths                                |
| `-v`, `--verbose`     | Verbose child-process output                                  |

### Examples

```bash
wpdev add blocks --yes
wpdev add jsTest --variant vitest --install
wpdev add phpFramework --variant wpdev --yes
wpdev add frontendStack --variant polaris
```

### Confirmation behavior

Without `--yes`, the CLI shows the planned file writes and dependency changes,
then asks for confirmation. Cancelling exits `0` with a message (not an error).

### What gets written

Only paths owned by the feature's generator (`owns` globs) are created or
overwritten. The manifest and `project.config.json` are always updated. Shared
paths owned by multiple features are preserved when another feature remains on.

---

## Command: `wpdev remove`

Turn a feature off and delete its owned files.

### Syntax

```bash
wpdev remove <feature> [options] [dir]
```

### Flags

Same as `add`: `--yes`, `--install`, `--force`, `--verbose`.

### Examples

```bash
wpdev remove husky --yes
wpdev remove exampleFeature
wpdev remove js --yes    # also normalizes jsLib, jsTest, css to off/none
```

### Config-only features

`phpMinVersion`, `wpMinVersion`, `license`, and `ci` cannot be removed. The CLI
exits `0` with guidance to use `wpdev set` instead.

### What gets deleted

Files matching the feature's `owns` globs are deleted unless another **on**
feature also owns the path. Glue files (`package.json`, `composer.json`, CI
workflow) may be refreshed via `refreshGlue` without deleting user code outside
`owns`.

---

## Command: `wpdev set`

Set config-only feature variants without add/remove generators.

### Syntax

```bash
wpdev set <key> <value> [dir]
```

### Settable keys

| Key             | Allowed values                    | Effect                                       |
| --------------- | --------------------------------- | -------------------------------------------- |
| `phpMinVersion` | `7.4`, `8.0`, `8.1`, `8.2`, `8.3` | Rector target, composer PHP constraint       |
| `wpMinVersion`  | `5.8`, `6.0`, `6.2`, `6.4`, `6.6` | Plugin header `Requires at least`            |
| `license`       | `gpl2`, `gpl3`, `mit`             | Regenerates `LICENSE` file                   |
| `ci`            | `auto`, `off`                     | Controls `.github/workflows/ci.yml` emission |

### Examples

```bash
wpdev set phpMinVersion 8.2
wpdev set wpMinVersion 6.4
wpdev set license mit
wpdev set ci off
wpdev set phpMinVersion 8.1 /path/to/my-plugin
```

### Validation

`setConfigValue` runs `validateFeatureSet` before writing. Setting
`phpMinVersion` to `7.4` while `faultTolerance:on` fails with a dependency
error.

Toggle features (`js`, `blocks`, `husky`, …) must use `wpdev add` / `wpdev remove`.

---

## Command: `wpdev update`

Plan or apply kit version migrations.

### Syntax

```bash
wpdev update [dir] [flags]
```

### Flags

| Flag              | Purpose                               |
| ----------------- | ------------------------------------- |
| `--run`           | Apply migrations (default is dry-run) |
| `--to <version>`  | Target kit version                    |
| `--install`       | Run dep installs after migration      |
| `-v`, `--verbose` | Verbose output                        |

### Dry-run (default)

Calls `planUpdate(dir, toVersion)` and prints JSON plan:

- `migrations` — version steps that would run
- `depChanges` — npm and Composer add/remove/bump diffs
- `noop: true` when already at or past target version

### Apply (`--run`)

Calls `runMigrations(dir, { toVersion })` sequentially. On failure, partial
migration state may remain — use git to roll back. See
[updating-projects.md](updating-projects.md).

### Examples

```bash
wpdev update                    # dry-run to latest known migration
wpdev update --to=1.0.0         # dry-run to specific version
wpdev update --run --install    # apply + install deps
```

### Migration trail

Successful runs may set `migratedAt` and `previousKitVersion` on `wpdev-kit.json`.

---

## Command: `wpdev doctor`

Report project health, drift, and prerequisite mismatches.

### Syntax

```bash
wpdev doctor [dir] [flags]
```

### Flags

| Flag       | Purpose                           |
| ---------- | --------------------------------- |
| `--strict` | Treat warnings as errors (exit 2) |

### What it checks

- `wpdev-kit.json` readable and schema current
- `features` sync between manifest and `project.config.json`
- Owned-path drift (missing or unexpected files per feature)
- `distMode` vs actual framework layout (`deps` vs legacy `vendored`)
- Dependency range drift vs kit registry
- `project.config.json` schema validation

### Exit behavior

| Outcome                    | Exit code |
| -------------------------- | --------- |
| No errors                  | `0`       |
| Errors present             | `1`       |
| Warnings only + `--strict` | `2`       |

Warnings alone (without `--strict`) exit `0`.

### Fixing issues

Follow printed messages. Common fixes:

- Run `wpdev update --run` when kit version is behind
- Run `wpdev add <feature>` when owned files are missing
- Run `wpdev remove <feature>` when orphan owned files exist
- See [troubleshooting.md](troubleshooting.md)

---

## Command: `wpdev info`

Show kit version, distribution mode, and feature summary.

### Syntax

```bash
wpdev info [dir]
```

### Output format

Prints structured summary from `getKitStatus()`:

- `kitVersion` — from `wpdev-kit.json`
- `distMode` — `deps` or `vendored`
- `features` — object of id → variant
- `path` — absolute project path
- `updateAvailable` / `latestKitVersion` — when registry lookup succeeds

### Example

```bash
wpdev info
# kitVersion: 1.0.0
# distMode: deps
# features: js=typescript, jsLib=preact, ...
```

Exits `1` when `wpdev-kit.json` is missing or unreadable.

---

## Command: `wpdev list`

Print feature rows from the manifest (compact table).

### Syntax

```bash
wpdev list [dir]
```

### Output format

One line per catalog feature (or manifest entry): `id=variant`. Useful in shell
scripts:

```bash
wpdev list | grep '^js='
```

---

## Presets

| Preset        | Summary                                                         |
| ------------- | --------------------------------------------------------------- |
| `minimal`     | PHP-only (`js:none`), no example, no i18n, husky off            |
| `standard`    | TypeScript + PHPUnit + Jest (catalog defaults; `--yes` default) |
| `full`        | All optional features on (blocks, polaris, fault tolerance, …)  |
| `woocommerce` | `standard` + blocks + Preact, example feature off               |

Flags override preset values after merge. `--preset` skips interactive feature
prompts (branding may still prompt unless `--yes`).

Preset definitions: `packages/create-wp-project/src/presets.js`.

---

## Interactive wizard flow

When `--yes` is omitted, `wpdev create` runs:

1. **Preset picker** — choose `minimal`, `standard`, `full`, `woocommerce`, or
   custom (skip with `--preset`)
2. **Branding** — slug, npm scope, global name, text domain, hook prefix, PHP
   function prefix (sensible defaults from slug)
3. **Feature prompts** — conditional branching:
   - `js` variant → if not `none`, prompt `jsLib`, `jsTest`, `css`
   - `frontendStack` only when TS + React/Preact
   - `blocks`, `phpFramework`, `faultTolerance`, `mcpAbilities` as toggles
   - `phpMinVersion`, `wpMinVersion`, `license` as selects
4. **Install confirmation** — npm/composer install and optional `git init`

`CI=true` in the environment may default some confirmations to "yes".

---

## Exit codes

| Code | When                                                                 |
| ---- | -------------------------------------------------------------------- |
| `0`  | Success; doctor with warnings only; cancelled remove/add             |
| `1`  | Validation error, migration failure, doctor errors, missing manifest |
| `2`  | Doctor `--strict` with warnings only; usage errors in some paths     |

---

## Environment variables

| Variable              | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `WPDEV_FRAMEWORK_SRC` | Override framework source path during 1.0.0 migration       |
| `CI`                  | Detected by install runners; affects prompt defaults        |
| `WPDEV_ANSWERS_JSON`  | Engine-only: JSON answers for `create-wp-project` CLI entry |
| `WPDEV_TARGET`        | Engine-only: target directory override                      |

---

## Troubleshooting

| Symptom                              | Quick fix                               | Doc                                            |
| ------------------------------------ | --------------------------------------- | ---------------------------------------------- |
| `Unknown flag`                       | Check flag spelling against table above | this doc                                       |
| `invalid feature set`                | Read error key; see features-reference  | [features-reference.md](features-reference.md) |
| `project.config.json already exists` | Use `--force` or pick new `--dir`       | [troubleshooting.md](troubleshooting.md)       |
| Doctor reports drift                 | `wpdev update --run` or re-add feature  | [troubleshooting.md](troubleshooting.md)       |
| Migration framework not found        | Set `WPDEV_FRAMEWORK_SRC`               | [troubleshooting.md](troubleshooting.md)       |

Full symptom/cause/fix catalog: [troubleshooting.md](troubleshooting.md).

---

## See also

- [installer.md](installer.md) — getting started narrative
- [features-reference.md](features-reference.md) — full feature catalog
- [api/cli-engine-reference.md](api/cli-engine-reference.md) — engine API
- [updating-projects.md](updating-projects.md) — migration mechanism
- [troubleshooting.md](troubleshooting.md) — common problems and fixes
