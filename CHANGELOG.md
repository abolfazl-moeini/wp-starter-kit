# Changelog

All notable changes to wp-starter-kit are documented here. The project
follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-06-18

### Added

- `wpdev set` command for config-only features (`phpMinVersion`, `wpMinVersion`,
  `license`, `ci`)
- Migration trail fields (`migratedAt`, `previousKitVersion`) on `wpdev-kit.json`
- Schema migration registry (runs before version migrations)
- Dependency bump application during `wpdev update --run`
- Enhanced `wpdev doctor` with variant checks, owned-file drift, forward-compat
  warnings
- `ci` feature for conditional GitHub Actions workflow generation
- Complete documentation: API references, CLI reference, features reference,
  module guide, packages overview
- Direct Jest tests for `@wpdev/translation` helpers

### Changed

- `@wpdev/fetch` is now a deprecated re-export of `@wpdev/rest-utils/fetch`
- `@wpdev/rule-engine` and `@wpdev/ui-components` are publishable npm packages
- `@wpdev/create-plugin` is publishable for `npm create @wpdev/plugin`
- PHPStan now analyses `mcp-integration` and `php-fault-tolerance` packages
- `installer.md` slimmed; canonical CLI docs moved to `cli-reference.md`
- `features-and-manifest.md` slimmed; catalog moved to `features-reference.md`

### Fixed

- `wpdev remove` command wiring in CLI `main.js`
- esbuild `depsBundle` guard when no module entries exist
- Translation pipeline glob for `src/Modules/*/assets/entries/*.{ts,js}`
- Rector `phpMinVersion` alignment with `project.config.json`
- PHP fault-tolerance no-op guard on PHP < 8.1
- PHPStan issues in `HttpClient`, `CircuitBreaker`, `AbilityInterface`
