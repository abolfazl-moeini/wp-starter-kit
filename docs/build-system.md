# Build System

> The `npm run build` pipeline that turns `core/packages/`, `core/components/`,
> and `core/styles/` into deployable assets in `assets/` and `dist/`.

## The four build stages (parallel by default)

```text
npm run build
└── npm-run-all --parallel
    ├── build:dependencies   (esbuild-dependencies-cli.js)
    ├── build:components     (esbuild-components-cli.js)
    ├── build:styles         (esbuild-styles-cli.js)
    └── build:assets         (build-assets.js)
```

| Stage              | Input                              | Output                            | Why separate?                                                  |
|--------------------|------------------------------------|-----------------------------------|----------------------------------------------------------------|
| `build:dependencies` | `core/packages/*/src/index.js`     | `dist/<globalName>-deps.js` + sourcemap | One bundle of all shared JS packages → small, cacheable. |
| `build:components`   | `core/components/*/script.js`      | `dist/components/<slug>.js` per component | One bundle per component for tree-shaking and lazy loading. |
| `build:styles`       | `core/styles/*.scss` + `core/components/*/style.scss` | `dist/components/<slug>.css` per component | SCSS transpilation, CSS-modules later.               |
| `build:assets`       | `core/assets/**/*` (static)        | `assets/**/*` (verbatim copy)     | Images, fonts, etc. — no transform, just `fs.cp`.              |

The `release` script runs all four **sequentially** (build:dependencies →
build:components → build:styles → build:assets) so the resulting `dist/` is
deterministic. The `build` script runs them **in parallel** for fast
incremental work in dev — esbuild's cache makes that safe.

## Configuration source

`core/packages/build/config.js` (or the equivalent in the project's
`project.config.json`) drives everything:

```js
{
  slug: 'my-project',          // → dist/my-project-deps.js
  globalName: 'MyProject',      // → IIFE name + window.MyProject
  localizeVar: 'MyProjectLoc',  // → window.MyProjectLoc
  uiFramework: 'preact',        // → react alias in esbuild config
  // ...
}
```

The build CLIs (`* -cli.js`) read this once and pass it as esbuild options.
See `build-outputs.md` for the full file map.

## Why esbuild (and not webpack/rollup/vite)?

The mrlogistic starter benchmarked all four. esbuild won on three axes:

1. **Speed** — 10× faster than webpack, 5× faster than rollup for cold builds.
   Incremental rebuilds are sub-second.
2. **Native ESM** — no babel needed. The starter is `type: module` and uses
   real ES modules everywhere.
3. **Plugin surface is small enough** — `dependency-extraction-esbuild-plugin`
   does the WP-style `wp.element` → `React` aliasing in 60 LOC.

`dependency-extraction-esbuild-plugin` lives in
`core/packages/dependency-extraction-esbuild-plugin/` and is the only
custom esbuild plugin in the project. It reads
`core/wordPress.dependency-extraction-webpack-plugin.json` (the
[official map](https://github.com/WordPress/gutenberg/tree/trunk/packages/dependency-extraction-webpack-plugin)) and rewrites
bare imports to the corresponding `wp.*` global.

## Test surface

`core/packages/build/__tests__/` holds the esbuild pipeline tests:

- `esbuild-dependencies.test.js` — verifies `dist/<slug>-deps.js` exists, has
  the IIFE wrapper, and contains every workspace package.
- `esbuild-components.test.js` — verifies each component is a separate file.
- `esbuild-styles.test.js` — verifies SCSS compiles to CSS and per-component
  output is created.

A failing build does **not** break `npm test` (tests run against sources in
`core/`, not against `dist/`), so you can iterate on tests without waiting
for a full rebuild.

## Local dev loop

```bash
# Watch mode (esbuild --watch on all four stages):
npm run dev

# Rebuild after a config change in project.config.json:
npm run build

# Force a full clean rebuild:
rm -rf dist assets
npm run build
```

## Release / CI

`npm run release` is what CI runs. The `composer.json` `release` script in
the project also calls `npm run release` from `core/packages/build/`. See
`release-checklist.md` for the pre-release steps (version bump, Rector
namespace rename, vendor prefix, …).
