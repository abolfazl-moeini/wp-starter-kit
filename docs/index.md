# Documentation index

> Every doc in `docs/`, what it covers, and when to read it.
> `tests/docs/docsIndex.test.js` enforces the required-doc list.

## Getting started

| Doc                          | One-line description                                 | Read when…                            |
| ---------------------------- | ---------------------------------------------------- | ------------------------------------- |
| [installer.md](installer.md) | Quick-start with the `wpdev` CLI wizard              | You're scaffolding your first project |
| [scaffold.md](scaffold.md)   | How `@wpdev/create-wp-project` engine internals work | You need the engine, not the CLI UX   |

## Architecture and modules

| Doc                                        | One-line description                           | Read when…                               |
| ------------------------------------------ | ---------------------------------------------- | ---------------------------------------- |
| [architecture.md](architecture.md)         | Bird's-eye view of the starter kit layout      | You just joined and want the big picture |
| [plugin-bootstrap.md](plugin-bootstrap.md) | The main `{slug}.php` plugin bootstrap file    | You're wiring lifecycle hooks            |
| [modules.md](modules.md)                   | `ModuleInterface` and `ModuleLoader` contracts | You're adding a feature module           |
| [module-guide.md](module-guide.md)         | Step-by-step guide to shipping a new module    | You're building a module from scratch    |

## Features and configuration

| Doc                                                  | One-line description                                      | Read when…                                  |
| ---------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------- |
| [features-reference.md](features-reference.md)       | Complete feature catalog with matrix and validation rules | You need variants, deps, or toggle commands |
| [features-and-manifest.md](features-and-manifest.md) | `wpdev-kit.json` manifest model and ownership             | You're reading or editing kit state         |
| [js-variants.md](js-variants.md)                     | TypeScript vs pure vs Flow vs none                        | You're picking a JS toolchain               |
| [css-variants.md](css-variants.md)                   | Sass, Tailwind, PostCSS, or none                          | You're picking a CSS toolchain              |
| [react-preact.md](react-preact.md)                   | Legacy pragma and UI library notes                        | You're reading older `@jsx h` code          |
| [react-preact-switch.md](react-preact-switch.md)     | `uiFramework` / `jsLib` switch behavior                   | You're choosing Preact vs React             |

## CLI and updates

| Doc                                          | One-line description                                 | Read when…                          |
| -------------------------------------------- | ---------------------------------------------------- | ----------------------------------- |
| [cli-reference.md](cli-reference.md)         | All `wpdev` commands, flags, presets, and exit codes | You need the full CLI surface       |
| [updating-projects.md](updating-projects.md) | Kit migrations, rollback, and update planning        | You're upgrading a consumer project |
| [troubleshooting.md](troubleshooting.md)     | Symptom → cause → fix for common problems            | Something failed and you need a fix |

## API reference

| Doc                                                        | One-line description                           | Read when…                                   |
| ---------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| [api/php-reference.md](api/php-reference.md)               | `WPDev\` namespace class and method signatures | You need PHP API surface                     |
| [api/js-reference.md](api/js-reference.md)                 | `@wpdev/*` npm package exports                 | You need JS/TS API surface                   |
| [api/cli-engine-reference.md](api/cli-engine-reference.md) | `@wpdev/create-wp-project` programmatic API    | You're driving scaffold/migrations from code |
| [api/hooks-reference.md](api/hooks-reference.md)           | WordPress hooks fired by `wpdev/framework`     | You're hooking plugin/module lifecycle       |
| [php-core-libs.md](php-core-libs.md)                       | Support library usage with examples            | You're extending REST, queue, or assets      |

## Packages

| Doc                                          | One-line description                                        | Read when…                             |
| -------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| [packages-overview.md](packages-overview.md) | npm + Composer package map, dependency graph, build outputs | You need to know where a package lives |

## Build and release

| Doc                                          | One-line description                        | Read when…                                     |
| -------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| [build-system.md](build-system.md)           | Four-stage esbuild pipeline                 | You're debugging a build failure               |
| [build-outputs.md](build-outputs.md)         | What's in `dist/` and `assets/bundles/`     | You need to know which file the browser loads  |
| [asset-mappings.md](asset-mappings.md)       | How `import` paths become WordPress globals | You're debugging "X is undefined"              |
| [translation.md](translation.md)             | JS + PHP translation pipeline               | You're adding translatable strings             |
| [vendor-scoping.md](vendor-scoping.md)       | Strauss vendor prefix on release            | You're shipping Composer deps in a zip         |
| [release-checklist.md](release-checklist.md) | Pre-release steps and npm publish           | You're cutting a new kit version               |
| [ci.md](ci.md)                               | Generated GitHub Actions workflow           | You're configuring CI for a scaffolded project |

## Integrations

| Doc                                                      | One-line description                          | Read when…                                |
| -------------------------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| [wpdev-adapter.md](wpdev-adapter.md)                     | WPDev Admin Framework companion plugin bridge | You're integrating `phpFramework:wpdev`   |
| [framework-as-dependency.md](framework-as-dependency.md) | Composer `wpdev/framework` and `distMode`     | You're shipping framework as a dependency |
| [blocks.md](blocks.md)                                   | Blockstudio blocks feature overview           | You're adding Gutenberg blocks            |
| [blocks-blockstudio.md](blocks-blockstudio.md)           | Blockstudio layout, fields, and authoring     | You're writing block definitions          |
| [fault-tolerance.md](fault-tolerance.md)                 | PHP circuit breaker and resilience package    | You need fault-tolerance helpers          |
| [mcp-integration.md](mcp-integration.md)                 | WordPress Abilities API for MCP tool exposure | You're using `mcpAbilities:on`            |

## Topic guides

| Doc                                          | One-line description                       | Read when…                               |
| -------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| [hooks.md](hooks.md)                         | Hook prefix convention (PHP + JS overview) | You're registering a prefixed hook       |
| [js-hooks.md](js-hooks.md)                   | JavaScript hook inventory                  | You're subscribing to REST/WDForm events |
| [element-props.md](element-props.md)         | `elementProps()` and `data-*` hydration    | You're mounting a widget from markup     |
| [localize-contract.md](localize-contract.md) | JS ↔ PHP localize data contract            | You're adding localize fields            |
| [signals.md](signals.md)                     | Rule engine signal tuples                  | You're authoring declarative rules       |
| [fetch-batch.md](fetch-batch.md)             | REST batch client                          | You're batching admin API lookups        |
| [patch.md](patch.md)                         | Legacy patches and upgrade notes           | You need historical upgrade context      |
| [php-test-tools.md](php-test-tools.md)       | PHPUnit, PHPCS, and PHPStan setup          | You're writing tests or fixing lint      |

## Contributing and ADRs

| Doc                                                                  | One-line description                   | Read when…                              |
| -------------------------------------------------------------------- | -------------------------------------- | --------------------------------------- |
| [contributing.md](contributing.md)                                   | Branching, commits, and review process | You're opening a PR                     |
| [adr/001-strauss-vs-php-scoper.md](adr/001-strauss-vs-php-scoper.md) | ADR: Strauss for vendor prefixing      | You want the scoping decision record    |
| [adr/002-esbuild-over-webpack.md](adr/002-esbuild-over-webpack.md)   | ADR: esbuild for the build pipeline    | You want the bundler decision record    |
| [adr/003-preact-default.md](adr/003-preact-default.md)               | ADR: Preact as default `jsLib`         | You want the UI default decision record |

## How docs are organized

1. **architecture.md** — read first for orientation.
2. **Per-concern docs** — deep dives by topic.
3. **API reference** — signatures for PHP, JS, engine, and framework hooks.
4. **troubleshooting.md** — when something breaks.
5. **contributing.md / release-checklist.md** — process for contributors and releases.

Update this index when you add a new doc. Keep `tests/docs/docsIndex.test.js` in sync.
