# ADR 002: esbuild over webpack and Vite

**Status:** Accepted  
**Date:** 2026-06-17

## Context

The starter kit builds JavaScript in four parallel stages (dependencies,
components, styles, static assets). The **dependencies** bundle must ship as an
**IIFE** that attaches shared modules to `window.<GlobalName>` so per-component
bundles can import from globals at runtime (WordPress-style dependency
extraction). Components and styles are separate esbuild entry points.

Webpack, Vite, and esbuild all support multi-entry builds. The choice affects
dev iteration speed, plugin complexity, and how easily the kit can implement
`importAsGlobals` (rewriting `@wpdev/*` imports to `window.MyProject.*`).

## Decision

Use **esbuild** for all JS/TS bundling in `@wpdev/build`.

Reasons:

1. **Speed** — esbuild is typically 10–100× faster than webpack for the
   multi-entry pattern used here (one deps bundle + N component entries).
   Pre-commit and CI run related Jest tests; fast rebuilds keep the TDD loop
   tight.
2. **IIFE deps bundle** — WordPress plugins enqueue a single
   `<slug>-deps.js` script that initializes `window.<GlobalName>`. esbuild's
   `format: 'iife'` and `globalName` options are first-class. Vite targets
   ES modules and dev-server workflows; adapting it to a global IIFE deps
   bundle adds friction without improving the WordPress enqueue model.
3. **Simple plugin API** — The `importAsGlobals` behavior lives in
   `@wpdev/dependency-extraction-esbuild-plugin` and stays under ~100 lines
   of esbuild plugin code. A webpack equivalent would need resolver +
   `externals` + custom runtime glue for the same global map.
4. **Aligned with `@wordpress/scripts` direction** — Modern WP tooling also
   moved to faster bundlers; esbuild matches the kit's "small framework, fast
   feedback" goal.

Webpack remains a valid choice for large SPAs. Vite remains a valid choice for
ESM-first apps with a dev server. Neither matches the kit's **global deps +
per-component IIFE** contract as directly as esbuild.

## Consequences

- Build CLIs live in `core/packages/build/` (`wpdev-build-dependencies`, etc.).
- `project.config.json` drives `globalName`, `hookPrefix`, and `uiFramework`
  defines injected at compile time.
- Adding a new build stage means another esbuild CLI, not a webpack config
  fork.
- Migrating away from esbuild would require reimplementing
  `dependency-extraction-esbuild-plugin` and re-validating bundle sizes and
  WordPress enqueue handles.

## References

- [build-system.md](../build-system.md)
- [asset-mappings.md](../asset-mappings.md)
