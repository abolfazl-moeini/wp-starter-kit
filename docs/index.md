# Index

> Every doc in `docs/`, what it covers, and when to read it.

## Getting started

| Doc                                  | One-line summary                  | Read it when…                                          |
| ------------------------------------ | --------------------------------- | ------------------------------------------------------ |
| [installer.md](installer.md)         | `wpdev` CLI getting started       | You're scaffolding a new project or installing the CLI |
| [scaffold.md](scaffold.md)           | `@wpdev/create-wp-project` engine | You need the engine API, not the CLI                   |
| [cli-reference.md](cli-reference.md) | Full CLI commands, flags, presets | You need every flag or exit code                       |

## Architecture

| Doc                                        | One-line summary                   | Read it when…                               |
| ------------------------------------------ | ---------------------------------- | ------------------------------------------- |
| [architecture.md](architecture.md)         | Bird's-eye view of the starter     | You just joined and want the 30,000-ft view |
| [plugin-bootstrap.md](plugin-bootstrap.md) | The `{slug}.php` plugin file       | You're wiring lifecycle hooks               |
| [modules.md](modules.md)                   | `ModuleInterface` + `ModuleLoader` | You're adding a feature module              |
| [module-guide.md](module-guide.md)         | Step-by-step module build guide    | You're shipping a new module from scratch   |

## Features

| Doc                                                      | One-line summary                   | Read it when…                             |
| -------------------------------------------------------- | ---------------------------------- | ----------------------------------------- |
| [features-reference.md](features-reference.md)           | Full feature catalog (19 features) | You need variants, commands, or conflicts |
| [features-and-manifest.md](features-and-manifest.md)     | Manifest model + ownership         | You're reading `wpdev-kit.json`           |
| [updating-projects.md](updating-projects.md)             | Migrations, doctor, update plan    | You're upgrading a consumer project       |
| [framework-as-dependency.md](framework-as-dependency.md) | Composer/npm framework deps        | You're shipping framework as dependencies |
| [wpdev-adapter.md](wpdev-adapter.md)                     | wpdev-framework bridge             | You're integrating the companion plugin   |

## CLI

| Doc                                  | One-line summary                 | Read it when…                |
| ------------------------------------ | -------------------------------- | ---------------------------- |
| [installer.md](installer.md)         | Getting started with `wpdev`     | First-time CLI use           |
| [cli-reference.md](cli-reference.md) | Canonical command/flag reference | You need the full flag table |

## API reference

| Doc                                          | One-line summary                | Read it when…                           |
| -------------------------------------------- | ------------------------------- | --------------------------------------- |
| [api/php-reference.md](api/php-reference.md) | `WPDev\` namespace surface      | You need PHP class/method signatures    |
| [api/js-reference.md](api/js-reference.md)   | `@wpdev/*` JS package exports   | You need JS/TS API signatures           |
| [php-core-libs.md](php-core-libs.md)         | Support libraries with examples | You're extending REST, queue, or assets |

## Packages

| Doc                                          | One-line summary           | Read it when…                  |
| -------------------------------------------- | -------------------------- | ------------------------------ |
| [packages-overview.md](packages-overview.md) | npm + Composer package map | You need to know where X lives |

## Build

| Doc                                              | One-line summary                  | Read it when…                                    |
| ------------------------------------------------ | --------------------------------- | ------------------------------------------------ |
| [build-system.md](build-system.md)               | Four-stage esbuild pipeline       | You're debugging a build failure                 |
| [build-outputs.md](build-outputs.md)             | What's in `dist/` and `assets/`   | You need to know which file the browser requests |
| [asset-mappings.md](asset-mappings.md)           | How `import` paths become globals | You're debugging "X is undefined"                |
| [js-variants.md](js-variants.md)                 | TS vs pure vs Flow vs none        | You're picking a JS toolchain                    |
| [css-variants.md](css-variants.md)               | Sass / Tailwind / PostCSS         | You're picking a CSS toolchain                   |
| [react-preact-switch.md](react-preact-switch.md) | `uiFramework` switch              | You're picking Preact vs React                   |
| [translation.md](translation.md)                 | JS+PHP translation pipeline       | You're adding translatable strings               |

## Per-topic

| Doc                                            | One-line summary                 | Read it when…                            |
| ---------------------------------------------- | -------------------------------- | ---------------------------------------- |
| [hooks.md](hooks.md)                           | WordPress hook prefix convention | You're registering a PHP hook            |
| [js-hooks.md](js-hooks.md)                     | JS hook inventory                | You're subscribing to REST/WDForm events |
| [element-props.md](element-props.md)           | `elementProps()` helper          | You're hydrating a widget from `data-*`  |
| [localize-contract.md](localize-contract.md)   | JS↔PHP localize contract         | You're adding localize fields            |
| [signals.md](signals.md)                       | Rule engine                      | You're authoring declarative rules       |
| [fetch-batch.md](fetch-batch.md)               | REST batch client                | You're batching admin lookups            |
| [fault-tolerance.md](fault-tolerance.md)       | PHP 8.1 resilience package       | You need circuit breaker helpers         |
| [blocks.md](blocks.md)                         | Blockstudio blocks feature       | You're adding block editor support       |
| [blocks-blockstudio.md](blocks-blockstudio.md) | Blockstudio layout and fields    | You're authoring blocks                  |
| [vendor-scoping.md](vendor-scoping.md)         | Strauss vendor prefix            | You're shipping Composer deps            |
| [php-test-tools.md](php-test-tools.md)         | PHPUnit + PHPCS + PHPStan        | You're writing tests or fixing lint      |
| [patch.md](patch.md)                           | Patches and upgrades             | You need legacy upgrade notes            |
| [react-preact.md](react-preact.md)             | Legacy pragma-based notes        | You're reading old `@jsx h` code         |

## Contributing & release

| Doc                                          | One-line summary                | Read it when…                |
| -------------------------------------------- | ------------------------------- | ---------------------------- |
| [contributing.md](contributing.md)           | Branching, commits, review      | You want to open a PR        |
| [release-checklist.md](release-checklist.md) | Pre-release steps + npm publish | You're cutting a new version |

## Architecture decision records (ADRs)

| ADR                                                              | Decision                       |
| ---------------------------------------------------------------- | ------------------------------ |
| [001-strauss-vs-php-scoper.md](adr/001-strauss-vs-php-scoper.md) | Strauss for vendor prefixing   |
| [002-esbuild-over-webpack.md](adr/002-esbuild-over-webpack.md)   | esbuild for the build pipeline |
| [003-preact-default.md](adr/003-preact-default.md)               | Preact as default `jsLib`      |

## How docs are organized

1. **architecture.md** — the big picture. Read first.
2. **Per-concern docs** — detail for each area.
3. **API reference** — signatures for PHP and JS surfaces.
4. **release-checklist.md / contributing.md** — process docs.

Update this index when you add a new doc. `tests/docs/docsIndex.test.js`
enforces the required-doc list.
