# ADR 003: Preact as the default UI library

**Status:** Accepted  
**Date:** 2026-06-17

## Context

Generated plugins ship interactive admin (and sometimes front-end) UI as JSX/TSX
bundles. The installer offers `jsLib: none | preact | react`. WordPress core
also exposes React via `window.wp.element` on block editor screens.

Bundling a full React runtime in the plugin's deps bundle increases payload size
and risks version skew with core's React copy. The kit must default to a
library that keeps bundles small while staying API-compatible with existing
`@wordpress/*` React-oriented packages.

## Decision

Default to **Preact** with **`@preact/compat`** npm aliases so source code can
use `react` / `react-dom` import paths. Switching to real React is one installer
flag: `jsLib: react` or `--js-lib=react`.

Reasons:

1. **Bundle size** — Preact is ~3 KB gzipped; React + ReactDOM is ~40 KB
   gzipped on top of WordPress packages. Admin screens that only need forms and
   small widgets benefit from the smaller deps bundle.
2. **API compatibility** — `@preact/compat` implements the React API surface
   used by WDForm, hooks, and `@wordpress/components`-style patterns in this
   kit. The same TSX compiles under either `uiFramework` (see
   [react-preact-switch.md](../react-preact-switch.md)).
3. **Explicit opt-in to React** — Teams that want canonical React (or need
   libraries that assume React internals) set `jsLib: react`. The scaffold
   stops aliasing `react` to `@preact/compat` and pins real `react` /
   `react-dom` dependencies.
4. **WordPress coexistence** — On block editor pages, core may already load
   React. Preact in the plugin bundle reduces the chance of shipping a second
   full React copy on every admin request; modules that only run on custom
   admin pages still get a complete UI runtime from the deps bundle.

## Consequences

- `project.config.json → uiFramework` defaults to `preact` in standard presets.
- `package.json` uses `react: "npm:@preact/compat"` aliases when Preact is
  selected; esbuild and Jest resolve those aliases consistently.
- CI and docs treat **both** frameworks as supported; Preact is the default, not
  the only option.
- Libraries that require true React (not compat) must document `jsLib: react` in
  their feature notes.

## References

- [react-preact-switch.md](../react-preact-switch.md)
- [installer.md](../installer.md) — `jsLib` prompt
