# wp-starter-kit

> A WordPress plugin starter with a module system, an esbuild-based
> build pipeline, and an updatable feature model. Ships a CLI
> installer (`wpsk`) that scaffolds new projects, adds/removes
> features, and upgrades existing projects to a newer kit version.

## Quick start

Generate a new wp-starter-kit plugin in one command:

```bash
npm create @wpsk/plugin@latest my-plugin
cd my-plugin
npm install
npm run dev
```

That uses the `wpsk` CLI under the hood. The wrapper
(`@wpsk/create-plugin`) just forwards to `wpsk create`.

Non-interactive form (for CI / scripts):

```bash
npm create @wpsk/plugin@latest my-plugin -- --yes
# or, after `npm i -g @wpsk/cli`:
wpsk create my-plugin --yes
```

For the full flag table, presets, troubleshooting, and the
`add` / `remove` / `update` / `doctor` / `info` commands, see
[docs/installer.md](docs/installer.md).

## What's in the box

- **Module system** — `ModuleInterface` + `ModuleLoader` for
  composing features without one giant `functions.php`. See
  [docs/modules.md](docs/modules.md).
- **Build pipeline** — four-stage esbuild pipeline producing the
  JS bundles, stylesheets, source maps, and translation files that
  ship in `dist/`. See [docs/build-system.md](docs/build-system.md).
- **Feature model + manifest** — every generated project carries a
  `wpsk-kit.json` manifest recording its features and variants. The
  CLI reads/writes that manifest for `add` / `remove` / `update`.
  See [docs/features-and-manifest.md](docs/features-and-manifest.md).
- **Test infra** — PHPUnit (with PHPCS + PHPStan) and Jest. See
  [docs/php-test-tools.md](docs/php-test-tools.md).
- **Vendor scoping** — Strauss pipeline for shipping Composer deps
  with your plugin. See [docs/vendor-scoping.md](docs/vendor-scoping.md).

## Architecture at a glance

See [docs/architecture.md](docs/architecture.md) for the 30,000-ft
view. The short version:

```
wp-starter-kit/
├── packages/
│   ├── cli/              # the `wpsk` installer (front-end)
│   ├── create-wp-project/# the engine (templates + manifest + migrations)
│   ├── framework/        # the PHP framework (modules, hooks, REST)
│   └── create-plugin/    # the `npm create @wpsk/plugin` wrapper
├── core/packages/        # JS packages (hooks, signals, fetch, ...)
├── docs/                 # everything you'd want to read
└── .github/workflows/    # CI (tests, lint, build, installer job)
```

The CLI is a thin front-end; **all file generation lives in
`@wpsk/create-wp-project`**. The CLI asks questions, builds a
feature set, and hands it to the engine.

## Documentation

Every doc has a one-line summary in [docs/index.md](docs/index.md).
Pick by what you're trying to do:

| If you want to…                  | Read                                                                  |
| -------------------------------- | --------------------------------------------------------------------- |
| Understand the architecture      | [docs/architecture.md](docs/architecture.md)                          |
| Scaffold a new project           | [docs/installer.md](docs/installer.md)                                |
| Add a feature module             | [docs/modules.md](docs/modules.md)                                    |
| Wire a build step                | [docs/build-system.md](docs/build-system.md)                          |
| Upgrade an existing project      | [docs/installer.md](installer.md#wpsk-update--wpsk-doctor--wpsk-info) |
| Ship a plugin with Composer deps | [docs/vendor-scoping.md](docs/vendor-scoping.md)                      |
| Open a PR                        | [docs/contributing.md](docs/contributing.md)                          |

## Contributing

See [docs/contributing.md](docs/contributing.md) for branching,
commit style, and review process.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE) (the repo is dual-licensed
in practice; pick whichever your downstream prefers).
