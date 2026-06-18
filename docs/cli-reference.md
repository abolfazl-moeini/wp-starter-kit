# CLI reference (`wpdev`)

> Canonical reference for every `wpdev` command, flag, preset, exit code,
> and environment variable. For getting started, see
> [installer.md](installer.md).

## Commands

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

## `wpdev create` flags

Source of truth: `packages/cli/src/flags.js` (`KNOWN_FLAGS`).

| Flag                          | Target                         | Values / notes                                  |
| ----------------------------- | ------------------------------ | ----------------------------------------------- |
| `[slug]` (positional)         | `answers.slug`                 | Sanitized slug; default directory name          |
| `--dir=<path>`                | `runOptions.targetDir`         | Output directory                                |
| `--slug=<slug>`               | `answers.slug`                 | Branding slug only                              |
| `--scope=<scope>`             | `answers.npmScope`             | npm scope without `@`                           |
| `--global=<Name>`             | `answers.globalName`           | JS global (PascalCase)                          |
| `--domain=<slug>`             | `answers.textDomain`           | WordPress text domain                           |
| `--hook=<prefix>`             | `answers.hookPrefix`           | Hook prefix (not `wpdev`)                       |
| `--php-fn=<pfx_>`             | `answers.phpFunctionPrefix`    | PHP function prefix (not `wpdev_`)              |
| `--php-source=<ver>`          | `answers.phpSourceVersion`     | `8.1` / `8.2` / `8.3`                           |
| `--js=<variant>`              | `features.js`                  | `typescript` / `pure` / `flow` / `none`         |
| `--js-lib=<lib>`              | `features.jsLib`               | `none` / `preact` / `react`                     |
| `--js-test=<runner>`          | `features.jsTest`              | `jest` / `vitest` / `none`                      |
| `--css=<flavor>`              | `features.css`                 | `none` / `sass` / `tailwind` / `postcss`        |
| `--blocks=<on\|off>`          | `features.blocks`              | Blockstudio blocks                              |
| `--php-min=<ver>`             | `features.phpMinVersion`       | `7.4` … `8.3`                                   |
| `--php-framework=<opt>`       | `features.phpFramework`        | `none` / `wpdev`                                |
| `--php-test=<opt>`            | `features.phpTest`             | `phpunit` / `none`                              |
| `--license=<id>`              | `features.license`             | `gpl2` / `gpl3` / `mit`                         |
| `--wp-min=<ver>`              | `features.wpMinVersion`        | `5.8` / `6.0` / `6.2` / `6.4` / `6.6`           |
| `--rest-batch=<on\|off>`      | `features.restBatch`           | REST batch endpoint                             |
| `--fault-tolerance=<on\|off>` | `features.faultTolerance`      | PHP 8.1+ resilience                             |
| `--vendor-scoping=<on\|off>`  | `features.vendorScoping`       | Strauss on release                              |
| `--husky=<on\|off>`           | `features.husky`               | Git hooks                                       |
| `--example=<on\|off>`         | `features.exampleFeature`      | Demo module                                     |
| `--i18n=<on\|off>`            | `features.i18n`                | Translation pipeline                            |
| `--frontend-stack=<opt>`      | `features.frontendStack`       | `none` / `polaris`                              |
| `--mcp-abilities=<on\|off>`   | `features.mcpAbilities`        | WordPress Abilities API                         |
| `--preset=<name>`             | `runOptions.preset`            | `minimal` / `standard` / `full` / `woocommerce` |
| `--install`                   | `runOptions.install`           | Run `npm install` + `composer install`          |
| `--git`                       | `runOptions.git`               | Run `git init`                                  |
| `--force`                     | `runOptions.force`             | Overwrite existing files                        |
| `--yes` / `-y`                | `runOptions.interactive=false` | Skip prompts                                    |
| `--verbose`                   | `runOptions.verbose`           | Stream child-process output                     |
| `--kit-version=<ver>`         | `runOptions.kitVersion`        | Override kit version (testing)                  |

Unknown flags throw `WPDEV_UNKNOWN_FLAG` with a list of valid flags.

## `wpdev add` flags

| Flag                  | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `--variant <variant>` | Variant to add (e.g. `vitest` for `js-test`) |
| `-y`, `--yes`         | Skip confirmation                            |
| `--install`           | Run dep installs after add                   |
| `-f`, `--force`       | Force overwrite                              |
| `-v`, `--verbose`     | Verbose output                               |

## `wpdev remove` flags

Same as `add` (`--yes`, `--install`, `--force`, `--verbose`).

Config-only features (`phpMinVersion`, `wpMinVersion`, `license`, `ci`) cannot
be removed — use `wpdev set` instead. The CLI exits 0 with guidance.

## `wpdev set`

Set config-only feature variants without add/remove generators.

```bash
wpdev set phpMinVersion 8.2
wpdev set wpMinVersion 6.4
wpdev set license mit
wpdev set ci off
wpdev set phpMinVersion 8.1 dist/my-plugin   # optional dir argument
```

**Settable keys:** `phpMinVersion`, `wpMinVersion`, `license`, `ci`

Toggle features (e.g. `js`, `blocks`, `husky`) must use `wpdev add` /
`wpdev remove`.

## `wpdev update` flags

| Flag              | Purpose                               |
| ----------------- | ------------------------------------- |
| `--run`           | Apply migrations (default is dry-run) |
| `--to <version>`  | Target kit version                    |
| `--install`       | Run dep installs after migration      |
| `-v`, `--verbose` | Verbose output                        |

Dry-run prints a plan with `migrations` and `depChanges`. See
[updating-projects.md](updating-projects.md).

## `wpdev doctor` flags

| Flag       | Purpose                           |
| ---------- | --------------------------------- |
| `--strict` | Treat warnings as errors (exit 1) |

## Presets

| Preset        | Summary                                                  |
| ------------- | -------------------------------------------------------- |
| `minimal`     | PHP-only (`js:none`), no example, no i18n                |
| `standard`    | TypeScript + PHPUnit + Jest (default for `--yes`)        |
| `full`        | `standard` + Preact + Polaris + blocks + fault tolerance |
| `woocommerce` | `standard` + blocks + Preact, no example feature         |

Flags override preset values. `--preset` skips interactive feature prompts.

## Interactive flow

When `--yes` is omitted:

1. Preset picker (or skip with `--preset`)
2. Branding (slug, scope, global, domain, hook prefix, PHP prefix)
3. Feature prompts with conditional branching (`js` → `jsLib` → `frontendStack` → …)
4. Install/git confirmation

## Exit codes

| Code | When                                                 |
| ---- | ---------------------------------------------------- |
| `0`  | Success; doctor with warnings only; cancelled remove |
| `1`  | Error (validation, migration failure, doctor errors) |
| `2`  | Doctor strict mode with warnings only                |

## Environment variables

| Variable              | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `WPDEV_FRAMEWORK_SRC` | Override framework source path during 1.0.0 migration |
| `CI`                  | Detected by install runners; affects prompt defaults  |

## See also

- [installer.md](installer.md) — getting started narrative
- [features-reference.md](features-reference.md) — full feature catalog
- [updating-projects.md](updating-projects.md) — migration mechanism
