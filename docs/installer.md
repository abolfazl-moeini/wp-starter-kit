# `wpdev` CLI — Project Installer

> The `wpdev` command-line installer scaffolds new wp-starter-kit
> plugins, adds/removes features from existing projects, and upgrades
> projects to a newer kit version. Built on `@clack/prompts` +
> `commander` + `execa` and powered by the
> `@wpdev/create-wp-project` engine (which owns all templates, the
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
fetches the wrapper and runs `wpdev` for you:

```bash
npm create @wpdev/plugin@latest my-plugin
# equivalent (after global install):
npm i -g @wpdev/cli
wpdev create my-plugin
```

The wrapper is `@wpdev/create-plugin`; the binary it forwards to is
`@wpdev/cli` (the `wpdev` command). The engine is
`@wpdev/create-wp-project`.

During kit development, you can also run the CLI directly out of the
workspace:

```bash
node packages/cli/bin/wpdev.js create my-plugin --yes
```

## Commands

| Command                   | What it does                                                    |
| ------------------------- | --------------------------------------------------------------- |
| `wpdev create [slug]`     | Scaffold a new plugin (interactive by default; `--yes` for CI)  |
| `wpdev add <feature>`     | Add a toggle feature                                            |
| `wpdev remove <feature>`  | Remove a toggle feature                                         |
| `wpdev set <key> <value>` | Set a config-only feature (`phpMinVersion`, `license`, `ci`, …) |
| `wpdev list`              | Print features from `wpdev-kit.json`                            |
| `wpdev update [dir]`      | Plan kit upgrade (apply with `--run`)                           |
| `wpdev doctor [dir]`      | Report drift and prerequisites                                  |
| `wpdev info [dir]`        | Show kit version and feature states                             |

**Full flag table, presets, exit codes:** [cli-reference.md](cli-reference.md)

**Feature catalog:** [features-reference.md](features-reference.md)

## Quick examples

```bash
wpdev create my-plugin                    # interactive
npm create @wpdev/plugin@latest my-plugin -- --yes
wpdev set phpMinVersion 8.2
wpdev update --run --install
```

## Troubleshooting

### "command not found: wpdev"

The CLI is not on `PATH`. Either use `npm create @wpdev/plugin@latest`
(no install needed), `npm i -g @wpdev/cli`, or invoke it directly out
of the workspace: `node packages/cli/bin/wpdev.js ...`.

### "PHP 7.4 is below the minimum for fault-tolerance"

The `fault-tolerance` feature requires PHP 8.1+. Either drop the
feature, raise `--php-min=8.1`, or set `--fault-tolerance=off`.

### Blockstudio PHP 8.2 runtime

`blocks:on` adds `blockstudio/blockstudio` via Composer. Blockstudio requires **PHP 8.2+** on the server. If `phpMinVersion < 8.2`, the installer warns that Rector downlevels your plugin source only — not Blockstudio vendor code. Run `composer install` after scaffold.

### "Cannot resolve @wpdev/create-wp-project"

Inside the `wp-starter-kit` workspace, run `npm install` to hoist
the engine into the root `node_modules/`. The CLI resolves the
engine through the workspace's `node_modules` symlinks.

### `npm install` / `composer install` failed inside `--install`

Network failures during `npm install` or `composer install` are
caught, reported as warnings, and the run **continues** — the
project is fully generated; the user can install deps later. Use
`wpdev doctor` afterward to see which install steps are still
pending.

### `git init` failed (or `git` not installed)

`git` is optional. The CLI prints a warning and continues without
initializing the repo. Use `git init` manually later.

### How do I see what was generated?

`wpdev list` shows the features. `wpdev info` adds the kit version and
available updates. `cat wpdev-kit.json` shows the raw manifest.

### I want to undo an `add` / `remove`

`wpdev add X` is undone by `wpdev remove X`, and vice versa. The
engine tracks the inverse operations on the feature descriptor, so
the manifest and the file set round-trip cleanly.

## See also

- [cli-reference.md](cli-reference.md) — canonical CLI reference
- [scaffold.md](scaffold.md) — `@wpdev/create-wp-project` engine
- [features-and-manifest.md](features-and-manifest.md) — manifest model
- [updating-projects.md](updating-projects.md) — migration-based updates
