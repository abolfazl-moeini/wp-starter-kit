# Changelog

All notable changes to wp-starter-kit are documented here. The project
follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

_No changes yet._

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
