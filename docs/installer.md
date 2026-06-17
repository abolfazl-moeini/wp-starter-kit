# `wpsk` CLI — Project Installer

> The `wpsk` command-line installer scaffolds new wp-starter-kit
> plugins, adds/removes features from existing projects, and upgrades
> projects to a newer kit version. Built on `@clack/prompts` +
> `commander` + `execa` and powered by the
> `@wpsk/create-wp-project` engine (which owns all templates, the
> feature catalog, the manifest, and the migration runner).

The CLI is a thin front-end. **All file generation is delegated to
the engine.** The CLI's only jobs are:

1. Ask the user a small set of questions (or accept flags).
2. Build a `{ answers, features, runOptions }` triple.
3. Call into the engine (`scaffoldProject`, `addFeature`,
   `removeFeature`, `planUpdate`, `runMigrations`, `doctorProject`,
   `getKitStatus`).
4. Optionally run `npm install`, `composer install`, `git init`.
5. Print the next steps.

## Install / first run

You do not need a global install for the common case — `npm create`
fetches the wrapper and runs `wpsk` for you:

```bash
npm create @wpsk/plugin@latest my-plugin
# equivalent (after global install):
npm i -g @wpsk/cli
wpsk create my-plugin
```

The wrapper is `@wpsk/create-plugin`; the binary it forwards to is
`@wpsk/cli` (the `wpsk` command). The engine is
`@wpsk/create-wp-project` — it is **not** renamed.

During kit development, you can also run the CLI directly out of the
workspace:

```bash
node packages/cli/bin/wpsk.js create my-plugin --yes
```

## Commands

| Command                        | What it does                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `wpsk create [slug]`           | Scaffold a new wp-starter-kit plugin (interactive by default; `--yes` for CI). |
| `wpsk add [opts] <feature>`    | Add a feature to an existing project (e.g. `wpsk add husky`).                  |
| `wpsk remove [opts] <feature>` | Remove a feature from an existing project.                                     |
| `wpsk list`                    | Print the features + ON/OFF state from the project's `wpdev-kit.json`.          |
| `wpsk update [dir]`            | Plan a kit upgrade (default). Apply with `--run`.                              |
| `wpsk doctor [dir]`            | Report system prerequisites and project drift.                                 |
| `wpsk info [dir]`              | Show kit version, feature states, and available updates.                       |

## `wpsk create` — flags

The full flag map mirrors `plan.installer.md` §1.2. Every interactive
prompt has a matching flag so the command runs in CI with `--yes`.

| Flag                          | Target                      | Notes                                                                                        |
| ----------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| `[slug]` (positional)         | `answers.slug`              | Sanitized to a valid slug; also the default directory name.                                  |
| `--dir=<path>`                | `runOptions.targetDir`      | Output directory (absolute or relative); overrides `[slug]` as the path when both are given. |
| `--slug=<slug>`               | `answers.slug`              | Branding slug only; does not change `--dir` unless `--dir` is omitted.                       |
| `--scope=<scope>`             | `answers.npmScope`          | npm scope, no leading `@`.                                                                   |
| `--global=<Name>`             | `answers.globalName`        | JavaScript global identifier (PascalCase).                                                   |
| `--domain=<slug>`             | `answers.textDomain`        | WordPress text domain.                                                                       |
| `--hook=<prefix>`             | `answers.hookPrefix`        | WordPress hook prefix.                                                                       |
| `--php-fn=<pfx_>`             | `answers.phpFunctionPrefix` | PHP function prefix; ends with `_`.                                                          |
| `--js=<variant>`              | `features.js`               | `typescript` / `pure` / `flow` / `none`.                                                     |
| `--js-lib=<lib>`              | `features.jsLib`            | `none` / `preact` / `react`.                                                                 |
| `--js-test=<runner>`          | `features.jsTest`           | `jest` / `vitest` / `none`.                                                                  |
| `--css=<flavor>`              | `features.css`              | `none` / `sass` / `tailwind` / `postcss` (requires `js != none`).                            |
| `--blocks=<on\|off>`          | `features.blocks`           | Gutenberg blocks via Blockstudio 7 (PHP-first; PHP 8.2+ runtime).                            |
| `--php-min=<ver>`             | `features.phpMinVersion`    | `7.4` … `8.3`.                                                                               |
| `--php-source=<ver>`          | `features.phpSourceVersion` | `8.1` / `8.2` / `8.3`.                                                                       |
| `--php-framework=<opt>`       | `features.phpFramework`     | `none` / `wpdev-framework`.                                                                  |
| `--php-test=<opt>`            | `features.phpTest`          | `phpunit` / `none`.                                                                          |
| `--license=<id>`              | `features.license`          | `gpl2` / `gpl3` / `mit`.                                                                     |
| `--wp-min=<ver>`              | `features.wpMinVersion`     | `5.8` / `6.0` / `6.2` / `6.4` / `6.6`.                                                       |
| `--rest-batch=<on\|off>`      | `features.restBatch`        | `@wpsk/fetch` REST batch client.                                                             |
| `--fault-tolerance=<on\|off>` | `features.faultTolerance`   | PHP 8.1+ resilience package.                                                                 |
| `--vendor-scoping=<on\|off>`  | `features.vendorScoping`    | Strauss on release.                                                                          |
| `--husky=<on\|off>`           | `features.husky`            | Git pre-commit hooks.                                                                        |
| `--example=<on\|off>`         | `features.exampleFeature`   | Include the `ExampleFeature` demo module.                                                    |
| `--i18n=<on\|off>`            | `features.i18n`             | Translation pipeline.                                                                        |
| `--preset=<name>`             | `runOptions.preset`         | `minimal` / `full` / `woocommerce` (pre-fills feature values; flags win).                    |
| `--install`                   | `runOptions.install`        | Run `npm install` and `composer install` after scaffolding.                                  |
| `--git`                       | `runOptions.gitInit`        | Run `git init` after scaffolding.                                                            |
| `--yes` / `-y`                | `runOptions.nonInteractive` | Skip all prompts; use flag values, then defaults.                                            |
| `--verbose` / `-v`            | `runOptions.verbose`        | Stream child-process output to the terminal.                                                 |
| `--kit-version=<ver>`         | (override)                  | Override the engine version (testing only).                                                  |

## `wpsk add` / `wpsk remove` / `wpsk list`

Operate on the `wpdev-kit.json` manifest in the current directory (or
the directory given by `[dir]` for `update`/`doctor`/`info`).

```bash
wpsk add husky --yes              # add a feature non-interactively
wpsk add js-test --variant=vitest # add a feature with a specific variant
wpsk remove example-feature       # remove a feature
wpsk list                         # show features + ON/OFF state
```

`add` flags:

| Flag                  | Meaning                                               |
| --------------------- | ----------------------------------------------------- |
| `--variant <variant>` | Feature variant to add (e.g. `vitest` for `js-test`). |
| `-y`, `--yes`         | Skip confirmation prompts.                            |
| `--install`           | Run `npm install` / `composer install` after adding.  |
| `-f`, `--force`       | Force overwrite of existing files.                    |
| `-v`, `--verbose`     | Verbose runner output.                                |

`add` and `remove` only touch feature-owned files; the engine
emits the list of files to create/delete from the feature
descriptor, not from the CLI.

## `wpsk update` / `wpsk doctor` / `wpsk info`

```bash
wpsk update            # dry-run: print the migration plan, then exit
wpsk update --run      # apply migrations + bump deps
wpsk doctor            # report system environment + project drift
wpsk info              # kit version, feature states, available updates
```

- `wpsk update` is **dry-run by default**. Use `--run` to apply.
- `wpsk doctor` exits non-zero on hard errors (missing Node/Composer,
  uncommitted manifest drift). Missing `composer`/`git`/`wp` are
  warnings, not errors — the run never crashes on a missing optional
  tool.
- `wpsk info` is a read-only status dump; safe to run in CI.

## Non-interactive / CI usage

The non-interactive form mirrors the interactive flow 1:1. Pass
every flag, or pass `--yes` to accept defaults for anything left
out.

```bash
wpsk create my-plugin \
  --scope=myorg --global=MyPlugin --domain=my-plugin --hook=my-plugin --php-fn=myprj_ \
  --js=typescript --js-lib=preact --js-test=jest \
  --css=tailwind --blocks=on \
  --php-min=7.4 --php-source=8.1 --php-framework=none --php-test=phpunit \
  --license=gpl2 --wp-min=6.0 \
  --rest-batch=on --fault-tolerance=off --vendor-scoping=on \
  --husky=on --example=on --i18n=on \
  --preset=full \
  --install --git --yes --verbose
```

For the "I just want a default project" path:

```bash
npm create @wpsk/plugin@latest my-plugin -- --yes
# or
wpsk create my-plugin --yes
```

Invalid feature combos are rejected **before** any prompt is shown
(fail-fast). `--yes` never prompts.

## Feature presets

Presets are named feature combinations defined in the engine
(`packages/create-wp-project/src/presets.js`). The CLI reads
`getPresets()` from the engine at startup, so adding a preset does
not require a CLI release.

| Preset        | What it sets                                                                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`     | `js:none`, `jsLib:none`, `jsTest:none`, `css:none`, `blocks:off`, `phpTest:phpunit`, `husky:off`, `exampleFeature:off`, `i18n:off`, `restBatch:off`, `faultTolerance:off`, `license:gpl2`, `wpMinVersion:6.0`. |
| `full`        | All features ON with their defaults (see `plan.v3.md` §1).                                                                                                                                                     |
| `woocommerce` | Same as `full` but `blocks:on`, `wpMinVersion:6.0`, `exampleFeature:off`.                                                                                                                                      |

Use a preset:

```bash
wpsk create my-plugin --preset=minimal
wpsk create my-plugin --preset=full
wpsk create my-plugin --preset=woocommerce
```

Flags win over preset values — you can pre-fill with a preset and
override any individual feature with its flag.

## Troubleshooting

### "command not found: wpsk"

The CLI is not on `PATH`. Either use `npm create @wpsk/plugin@latest`
(no install needed), `npm i -g @wpsk/cli`, or invoke it directly out
of the workspace: `node packages/cli/bin/wpsk.js ...`.

### "PHP 7.4 is below the minimum for fault-tolerance"

The `fault-tolerance` feature requires PHP 8.1+. Either drop the
feature, raise `--php-min=8.1`, or set `--fault-tolerance=off`.

### Blockstudio PHP 8.2 runtime

`blocks:on` adds `blockstudio/blockstudio` via Composer. Blockstudio requires **PHP 8.2+** on the server. If `phpMinVersion < 8.2`, the installer warns that Rector downlevels your plugin source only — not Blockstudio vendor code. Run `composer install` after scaffold.

### "Cannot resolve @wpsk/create-wp-project"

Inside the `wp-starter-kit` workspace, run `npm install` to hoist
the engine into the root `node_modules/`. The CLI resolves the
engine through the workspace's `node_modules` symlinks.

### `npm install` / `composer install` failed inside `--install`

Network failures during `npm install` or `composer install` are
caught, reported as warnings, and the run **continues** — the
project is fully generated; the user can install deps later. Use
`wpsk doctor` afterward to see which install steps are still
pending.

### `git init` failed (or `git` not installed)

`git` is optional. The CLI prints a warning and continues without
initializing the repo. Use `git init` manually later.

### How do I see what was generated?

`wpsk list` shows the features. `wpsk info` adds the kit version and
available updates. `cat wpdev-kit.json` shows the raw manifest.

### I want to undo an `add` / `remove`

`wpsk add X` is undone by `wpsk remove X`, and vice versa. The
engine tracks the inverse operations on the feature descriptor, so
the manifest and the file set round-trip cleanly.

## See also

- `docs/scaffold.md` — the underlying engine (`@wpsk/create-wp-project`).
- `docs/features-and-manifest.md` — the feature model and the
  `wpdev-kit.json` manifest format.
- `plan.installer.md` — the design plan and the full flag map.
