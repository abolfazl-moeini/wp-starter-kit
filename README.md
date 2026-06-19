# wp-starter-kit

> A WordPress plugin starter with a module system, an esbuild-based
> build pipeline, and an updatable feature model. Ships a CLI
> installer (`wpdev`) that scaffolds new projects, adds/removes
> features, and upgrades existing projects to a newer kit version.

## Quick start

Generate a new wp-starter-kit plugin in one command:

```bash
npm create @wpdev/plugin@latest my-plugin
cd my-plugin
npm install
npm run dev
```

That uses the `wpdev` CLI under the hood. The wrapper
(`@wpdev/create-plugin`) just forwards to `wpdev create`.

**Interactive by default** — `wpdev create` shows a preset picker,
then branding questions, then feature prompts. Use `--yes` to skip:

```bash
npm create @wpdev/plugin@latest my-plugin -- --yes
# or, after `npm i -g @wpdev/cli`:
wpdev create my-plugin --yes
```

Config-only features use `wpdev set` (not add/remove):

```bash
wpdev set phpMinVersion 8.2
wpdev set license mit
```

For the full flag table, presets, and every command, see
[docs/cli-reference.md](docs/cli-reference.md). Getting started:
[docs/installer.md](docs/installer.md).

## What's in the box

- **Module system** — `ModuleInterface` + `ModuleLoader` for
  composing features without one giant `functions.php`. See
  [docs/modules.md](docs/modules.md).
- **Build pipeline** — four-stage esbuild pipeline producing the
  JS bundles, stylesheets, source maps, and translation files that
  ship in `dist/`. See [docs/build-system.md](docs/build-system.md).
- **Feature model + manifest** — every generated project carries a
  `wpdev-kit.json` manifest recording its features and variants. The
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
│   ├── cli/              # the `wpdev` installer (front-end)
│   ├── create-wp-project/# the engine (templates + manifest + migrations)
│   ├── framework/        # the PHP framework (modules, hooks, REST)
│   └── create-plugin/    # the `npm create @wpdev/plugin` wrapper
├── core/packages/        # JS packages (hooks, signals, fetch, ...)
├── docs/                 # everything you'd want to read
└── .github/workflows/    # CI (tests, lint, build, installer job)
```

The CLI is a thin front-end; **all file generation lives in
`@wpdev/create-wp-project`**. The CLI asks questions, builds a
feature set, and hands it to the engine.

## Requirements

- Node.js ≥ 18
- PHP ≥ 7.4 (PHP 8.1+ recommended for development)
- Composer (for PHP dependencies and release builds)

## Features

- Modular PHP architecture (`ModuleInterface`, REST, assets, shortcodes)
- TypeScript + esbuild build pipeline with optional Preact/React UI
- PHP version downleveling via Rector (target PHP 7.4+)
- Feature manifest (`wpdev-kit.json`) with add/remove/set/update CLI
- Optional Blockstudio blocks, fault tolerance, MCP Abilities API
- PHPUnit + Jest test infrastructure, Strauss vendor scoping
- Publishable `@wpdev/*` npm packages and `wpdev/framework` Composer package

## Packages

The kit ships scoped npm and Composer packages. See
[docs/packages-overview.md](docs/packages-overview.md) for the full map:

| Package                                                | Role                                    |
| ------------------------------------------------------ | --------------------------------------- |
| `@wpdev/cli`                                           | `wpdev` command-line installer          |
| `@wpdev/create-wp-project`                             | Scaffold engine (templates, migrations) |
| `@wpdev/create-plugin`                                 | `npm create @wpdev/plugin` wrapper      |
| `@wpdev/hooks`, `@wpdev/utils`, `@wpdev/rest-utils`, … | JS libraries for admin UI               |
| `wpdev/framework`                                      | PHP module system and support classes   |

## Documentation

Every doc has a one-line summary in [docs/index.md](docs/index.md).
Pick by what you're trying to do:

| If you want to…             | Read                                                                 |
| --------------------------- | -------------------------------------------------------------------- |
| Understand the architecture | [docs/architecture.md](docs/architecture.md)                         |
| Scaffold a new project      | [docs/installer.md](docs/installer.md)                               |
| CLI commands and flags      | [docs/cli-reference.md](docs/cli-reference.md)                       |
| Feature catalog             | [docs/features-reference.md](docs/features-reference.md)             |
| Engine programmatic API     | [docs/api/cli-engine-reference.md](docs/api/cli-engine-reference.md) |
| Build a new module          | [docs/module-guide.md](docs/module-guide.md)                         |
| PHP API signatures          | [docs/api/php-reference.md](docs/api/php-reference.md)               |
| JS package APIs             | [docs/api/js-reference.md](docs/api/js-reference.md)                 |
| Package map                 | [docs/packages-overview.md](docs/packages-overview.md)               |
| Upgrade an existing project | [docs/updating-projects.md](docs/updating-projects.md)               |
| Troubleshooting             | [docs/troubleshooting.md](docs/troubleshooting.md)                   |
| Ship with Composer deps     | [docs/vendor-scoping.md](docs/vendor-scoping.md)                     |
| Release checklist           | [docs/release-checklist.md](docs/release-checklist.md)               |
| Open a PR                   | [docs/contributing.md](docs/contributing.md)                         |

## Contributing

See [docs/contributing.md](docs/contributing.md) for branching,
commit style, and review process.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE) (the repo is dual-licensed
in practice; pick whichever your downstream prefers).
