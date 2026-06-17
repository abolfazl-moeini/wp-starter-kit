# Index

> Every doc in `docs/`, what it covers, and when to read it.

## Quick reference

| Doc                                                      | One-line summary                           | Read it when…                                                                                |
| -------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [architecture.md](architecture.md)                       | Bird's-eye view of the starter             | You just joined the project and want the 30,000-ft view.                                     |
| [plugin-bootstrap.md](plugin-bootstrap.md)               | The `{slug}.php` plugin file               | You're scaffolding a new project, migrating from `functions.php`, or wiring lifecycle hooks. |
| [modules.md](modules.md)                                 | `ModuleInterface` + `ModuleLoader`         | You're adding a new feature module or extending the plugin from a third-party plugin.        |
| [build-system.md](build-system.md)                       | The four-stage esbuild pipeline            | You're adding a new build step or debugging a build failure.                                 |
| [build-outputs.md](build-outputs.md)                     | What's in `dist/` and `assets/`            | You need to know which file the browser will request.                                        |
| [hooks.md](hooks.md)                                     | WordPress hook prefix convention           | You're registering a hook or filter and need the right namespace.                            |
| [js-hooks.md](js-hooks.md)                               | JS hook inventory (`@wpdev/hooks`)         | You're subscribing to REST/WDForm events or adding a new JS hook.                              |
| [element-props.md](element-props.md)                     | `elementProps()` DOM → props helper        | You're hydrating a Preact/React widget from `data-*` attributes.                           |
| [localize-contract.md](localize-contract.md)             | JS↔PHP localize contract                   | You're adding a new field to `wp_localize_script`.                                           |
| [react-preact.md](react-preact.md)                       | The original Phase 5 notes (pragma-based)  | You're reading the old code that uses `/** @jsx h */`.                                       |
| [react-preact-switch.md](react-preact-switch.md)         | The new `uiFramework` switch (alias-based) | You're picking the framework for a new project.                                              |
| [js-variants.md](js-variants.md)                         | TS vs pure vs Flow vs none (`js` feature)  | You're picking the JavaScript authoring toolchain or switching between variants.             |
| [css-variants.md](css-variants.md)                       | Sass / Tailwind / PostCSS / plain CSS      | You're picking a CSS build toolchain or switching later.                                     |
| [blocks.md](blocks.md)                                   | Blockstudio blocks feature (`blocks:on`)   | You're adding block editor support to a generated plugin.                                    |
| [blocks-blockstudio.md](blocks-blockstudio.md)           | Blockstudio layout, fields, and bridge     | You're authoring blocks or debugging Blockstudio registration.                               |
| [features-and-manifest.md](features-and-manifest.md)     | Feature model + `wpdev-kit.json` manifest   | You're wiring the installer, add/update flows, or reading feature state.                     |
| [framework-as-dependency.md](framework-as-dependency.md) | Composer/npm framework deps + `distMode`   | You're shipping or updating framework code as dependencies instead of copies.                |
| [updating-projects.md](updating-projects.md)             | Migrations, doctor, update plan            | You're upgrading a consumer project to a newer kit version.                                  |
| [wpdev-adapter.md](wpdev-adapter.md)                     | Optional wpdev-framework bridge            | You're integrating wpdev-framework alongside WPDev modules.                                  |
| [scaffold.md](scaffold.md)                               | `@wpdev/create-wp-project` usage            | You're generating a new project from the starter.                                            |
| [translation.md](translation.md)                         | The JS+PHP translation pipeline            | You're adding translatable strings or running the pipeline.                                  |
| [patch.md](patch.md)                                     | Patches and upgrades                       | You need to upgrade a consumer project to a newer starter.                                   |
| [asset-mappings.md](asset-mappings.md)                   | How `import` paths become globals          | You're debugging "X is undefined" in a built bundle.                                         |
| [signals.md](signals.md)                                 | The rule engine                            | You need to author a declarative rule that runs on every load.                               |
| [php-test-tools.md](php-test-tools.md)                   | PHPUnit + PHPCS + PHPStan configs          | You're writing a test, fixing a lint error, or running coverage.                             |
| [release-checklist.md](release-checklist.md)             | Pre-release steps                          | You're cutting a new version.                                                                |
| [vendor-scoping.md](vendor-scoping.md)                   | Strauss vendor prefix pipeline             | You're shipping a plugin with Composer deps.                                                 |
| [fetch-batch.md](fetch-batch.md)                         | `@wpdev/rest-utils` batch client           | You're batching high-churn admin lookups.                                                    |
| [fault-tolerance.md](fault-tolerance.md)                 | Optional PHP 8.1 resilience package        | You need circuit breaker / HTTP batch helpers.                                               |
| [php-core-libs.md](php-core-libs.md)                     | Reimplemented PHP support libraries        | You're extending REST, queue, or shortcode helpers.                                          |
| [installer.md](installer.md)                             | `wpdev` CLI installer guide                | You're scaffolding a new project, adding/removing features, or upgrading to a newer kit.     |
| [contributing.md](contributing.md)                       | Branching, commits, review                 | You want to open a PR.                                                                       |

## v3 / installer

Phases 20–27 added the feature model, manifest (`wpdev-kit.json`),
per-feature generators, framework-as-dependency distribution, and
update/migration tooling. The `wpdev` CLI (`docs/installer.md`) consumes
these engine APIs.

Start with [features-and-manifest.md](features-and-manifest.md), then
[framework-as-dependency.md](framework-as-dependency.md) and
[updating-projects.md](updating-projects.md) when you need update flows.

## How docs are organized

The docs are **layered**:

1. **architecture.md** — the big picture. Read first.
2. **Per-concern docs** (build-system, hooks, scaffold, …) — the
   detail. Read when you're working on that concern.
3. **release-checklist.md / contributing.md** — process. Read
   when you're shipping or contributing.

If a doc is missing for something you wanted to know, please open
a PR. See [contributing.md](contributing.md#questions).

## Doc style guide

- One topic per file.
- Lead with a one-paragraph summary, then the detail.
- Use code blocks liberally — the docs are the source of truth
  for examples, so they should be runnable.
- Cross-link with relative paths so the docs work on the
  GitHub mirror, the local checkout, and the `docs/` zip.
- No emoji, no marketing-speak, no "we" (use "you" or "the
  starter").
- Update the index (this file) when you add a new doc.

## Doc generation

Some sections are auto-generated from source:

- The "What's in the box" list in [php-test-tools.md](php-test-tools.md#whats-in-the-box)
  is generated by `composer docs:php-test-tools`.
- The test counts in [build-system.md](build-system.md) and
  [hooks.md](hooks.md) are generated by
  `composer docs:test-counts`.

The generated sections are wrapped in
`<!-- GENERATED: ... -->` comments so `composer docs:lint` can
verify they haven't been hand-edited (since hand-edits will be
overwritten on the next run).
