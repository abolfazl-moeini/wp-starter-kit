# Changelog

All notable changes to wp-starter-kit are documented here. The project
follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- **Release**: require `wpdev/framework` into `vendor/` (migration `2.4.0`) so
  stripping `packages/` no longer drops `WPDev\\Core\\ModuleInterface`

### Added

- **Scaffold / migration `2.3.0`**: refresh release packager — strip root
  `composer.json` / `composer.lock` after install; write `dist/{slug}.zip`
  (`--skip-zip` to opt out)
- **Scaffold / migration `2.2.0`**: emit `dev/rector-*.php` + composer
  `rector:build` / `rector:prefix` / `rector:upgrade` (+ `require-dev.rector/rector`)
- **Release**: `prepare-release.js` runs Rector downgrade on `dist/{slug}/`
  before stripping `dev/` (`--skip-rector` to opt out)
- **Doctor**: warns when Rector tooling / scripts are missing
- **Config**: single `wpdev.json` replaces `project.config.json`,
  `build.config.json`, and `wpdev-kit.json` (migration `2.0.0`)
- **Scaffold**: production release packager
  (`dev/release/prepare-release.js` + `prepareComposer.js`) on every
  generated project (migration `2.1.0`)
- **Polaris Stack v2**: `frontendStack: polaris` copies design system
  primitives/components into scaffolds; kit docs under `docs/polaris/`
- **PHPUnit templates**: generated tests align with
  `plugin-core-test` conventions

### Fixed

- **Rector config**: skip `vendor-prefixed/` and
  `packages/php-fault-tolerance/src/Real/` (intentional PHP 8.1+ dual-load)
- **Outside-kit create**: `resolveEngineSrcDir` uses `realpath` and
  package-graph resolution so global/nvm-linked `wpdev` bins find the
  engine (no more phantom `./packages/create-wp-project/src/release/...`)
- **mcp-integration**: sibling kit package resolution when cwd is
  outside the monorepo
- **CLI UX**: create prompts, minimal-preset PHPUnit ask, clack-styled
  post-scaffold summary and next steps
- **Framework boot**: `Plugin::config()` prefers `wpdev.json`, falls
  back to legacy `project.config.json`
- **CI**: nightly scaffold smoke and release archive copy `wpdev.json`
  (no longer require removed config files)
- **Publishability**: `@wpdev/create-wp-project` is no longer
  `private: true` (required for ordered CLI-chain publish)

### Changed

- `@wpdev/create-wp-project` version **2.2.0** (unlocks migrations `2.0.0`–`2.2.0` on `wpdev update`)
- Release checklist and `dev/release/build-dist.php` read `wpdev.json`
- PHPStan excludes `packages/plugin-core-test` (WP-stub harness)

## [1.0.0] - 2026-06-18

Open-source v1.0.0 release. Completes `plan.final.md` (Phases 0–9) and
`plan.final.v2.md` (pre-release hardening, documentation, publishability).

### Added

- **CLI**: `wpdev set` for config-only features (`phpMinVersion`, `wpMinVersion`,
  `license`, `ci`); interactive preset picker; post-scaffold install/git prompts;
  confirm gates on `add`, `remove`, and `update --run`
- **Engine**: `validateProjectConfig()` for `wpdev.json` / `wpdev.json`
  drift detection; wired into `wpdev doctor` as "Config consistency" checks
- **CLI UX**: `humanizeValidationErrors()` — feature IDs in validation messages
  are replaced with human labels from the feature catalog
- **Release**: build freshness check in `dev/release/build-dist.php` (rejects stale
  `assets/bundles/` unless `--skip-freshness`)
- **Publishability**: `@wpdev/cli` is publishable (removed `private: true`);
  `prepublishOnly` safety scripts on CLI packages; `files` whitelists and READMEs
  on all publishable `@wpdev/*` packages
- **Migrations**: `depChanges` applied automatically on `wpdev update --run`;
  migration trail (`migratedAt`, `previousKitVersion`); schema migration registry
- **Doctor**: variant validation, owned-file drift, forward-compat warnings for
  unknown feature ids, config consistency checks
- **Features**: `ci` feature for conditional GitHub Actions workflow generation
- **Documentation**:
  - `docs/api/cli-engine-reference.md` — programmatic engine API
  - `docs/api/hooks-reference.md` — kit WordPress hooks
  - `docs/troubleshooting.md` — common problems and fixes
  - `docs/mcp-integration.md` — MCP / Abilities API integration
  - Expanded: `cli-reference.md`, `features-reference.md`, `packages-overview.md`,
    `api/php-reference.md`, `api/js-reference.md`, `release-checklist.md`
- **Tests**: `validateConfig`, `configExamples`, `ui` humanization, build
  freshness (PHPUnit), wrapper E2E, version alignment across packages

### Changed

- `@wpdev/fetch` is a deprecated re-export of `@wpdev/rest-utils/fetch`
- `@wpdev/rule-engine` and `@wpdev/ui-components` are publishable npm packages
- `@wpdev/create-plugin` wrapper is publishable for `npm create @wpdev/plugin`
- PHPStan analyses `mcp-integration` and `php-fault-tolerance` packages
- `installer.md` slimmed; canonical CLI docs in `cli-reference.md`
- `features-and-manifest.md` slimmed; full catalog in `features-reference.md`
- `docs/index.md` restructured with clear sections and one-line descriptions
- PHP-only scaffolds omit `uiFramework` from `wpdev.json` (no stale
  `preact` when `jsLib` is `none`)
- `project.config.example.json` synced with runtime schema (all required keys)

### Fixed

- `wpdev remove` command wiring in CLI `main.js`
- `wpdev add` error handling and humanized validation output in `main.js`
- esbuild `depsBundle` guard when no module entries exist
- Translation pipeline glob for `src/Modules/*/assets/entries/*.{ts,js}`
- Rector `phpMinVersion` alignment with `wpdev.json`
- PHP fault-tolerance no-op guard on PHP < 8.1
- PHPStan issues in `HttpClient`, `CircuitBreaker`, `AbilityInterface`
- `restBatch:on` on `js:none` silently nooped — pre-validation before normalize
- `collectOtherOwns` dead code removed from `removeFeature.js`
- Config drift between manifest `phpMinVersion` and `wpdev.json` surfaced
  by doctor
- Release build could succeed with stale bundle outputs

### Breaking changes

No breaking changes from 0.x for generated projects. Existing consumer projects
should run `wpdev update --run` after upgrading the kit CLI.

### Upgrade notes

1. Install the latest kit CLI: `npm i -g @wpdev/cli@1.0.0` (or use the workspace
   bin during development).
2. In each consumer project, run `wpdev doctor` and fix any reported errors.
3. Run `wpdev update --run` to apply migrations and dependency bumps.
4. See [docs/updating-projects.md](docs/updating-projects.md) for rollback guidance.

### Known limitations

- Blockstudio (`blocks:on`) requires PHP 8.2+ at runtime regardless of Rector
  downlevel settings.
- `mcpAbilities:on` requires WordPress 6.9+ (Abilities API).
- Polaris Stack v1 conflicts with Tailwind CSS.
- `wpdev update` does not support `--yes`; use `--force` to apply on a dirty git
  tree. The `--yes` flag is not a global update flag — passing it as a positional
  argument is interpreted as a directory path.
- Kit version in consumer `wpdev.json` may warn as "newer than installed"
  when using the workspace CLI before publish; run `wpdev update` after publishing.
