# Build System

> The `npm run build` pipeline that turns `core/packages/`, `core/components/`,
> and `core/styles/` into deployable assets in `assets/` and `dist/`. Source
> files are TypeScript (`.ts`); the build emits ES2020 JavaScript.

## The four build stages (parallel by default)

```text
npm run build
└── npm-run-all --parallel
    ├── build:dependencies   (esbuild-dependencies-cli.js)
    ├── build:components     (esbuild-components-cli.js)
    ├── build:styles         (esbuild-styles-cli.js)
    └── build:assets         (build-assets.js)
```

| Stage                | Input                                                 | Output                                     | Why separate?                                               |
| -------------------- | ----------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `build:dependencies` | `core/packages/*/src/index.js`                        | `dist/<globalName>-deps.js` + sourcemap    | One bundle of all shared JS packages → small, cacheable.    |
| `build:components`   | `core/components/*/script.js`                         | `dist/components/<slug>.js` per component  | One bundle per component for tree-shaking and lazy loading. |
| `build:styles`       | `core/styles/*.scss` + `core/components/*/style.scss` | `dist/components/<slug>.css` per component | SCSS transpilation, CSS-modules later.                      |
| `build:assets`       | `core/assets/**/*` (static)                           | `assets/**/*` (verbatim copy)              | Images, fonts, etc. — no transform, just `fs.cp`.           |

> **Note:** the deps entry point is now **`assets/dependencies.ts`**
> (renamed from `assets/dependencies.js` in Phase 12). The rest of
> the bundle inputs in `core/` are still `.js` on disk; converting
> them to `.ts` is on the Phase 18 roadmap, in line with widening
> the component glob to `script.{js,ts}`. See the "TypeScript"
> section below for the full pipeline picture.

The `release` script runs all four **sequentially**
(build:dependencies → build:components → build:styles → build:assets)
so the resulting `dist/` is deterministic. The `build` script runs
them **in parallel** for fast incremental work in dev — esbuild's
cache makes that safe.

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

The build CLIs (`* -cli.js`) read this once and pass it as esbuild
options. See `build-outputs.md` for the full file map.

## Why esbuild (and not webpack/rollup/vite)?

The mrlogistic starter benchmarked all four. esbuild won on three axes:

1. **Speed** — 10× faster than webpack, 5× faster than rollup for cold
   builds. Incremental rebuilds are sub-second.
2. **Native ESM** — no babel needed for ES module transpilation. The
   starter is `type: module` and uses real ES modules everywhere.
3. **Plugin surface is small enough** —
   `dependency-extraction-esbuild-plugin` does the WP-style
   `wp.element` → `React` aliasing in 60 LOC.

`dependency-extraction-esbuild-plugin` lives in
`core/packages/dependency-extraction-esbuild-plugin/` and is the only
custom esbuild plugin in the project. It reads
`core/wordPress.dependency-extraction-webpack-plugin.json` (the
[official map](https://github.com/WordPress/gutenberg/tree/trunk/packages/dependency-extraction-webpack-plugin))
and rewrites bare imports to the corresponding `wp.*` global.

## TypeScript

Phase 12 wired the build pipeline (and the Jest runner) to **TypeScript
source** end-to-end. The build still emits plain JavaScript (esbuild
transpiles `.ts` in the same pass as it bundles), but the source files
you author are `.ts`/`.tsx`, the test runner type-checks them, and the
component glob will pick them up in Phase 18.

There are four touch points. They are independent — each can be
inspected, debugged, and replaced without touching the others.

### `tsconfig.json` (project root)

The project ships a single `tsconfig.json` at the root. The non-default
flags and what they buy you:

```jsonc
{
  "compilerOptions": {
    "target": "ES2020", // matches the esbuild output target
    "module": "ESNext", // ESM source; esbuild handles the actual emit
    "moduleResolution": "Bundler", // allows .ts / .tsx extensionless and .js
    // imports — matches esbuild's resolver
    "jsx": "react-jsx", // automatic JSX runtime, no `import { h }`
    "jsxImportSource": "preact", // routes the JSX runtime to preact/jsx-runtime
    "strict": true, // all strict family flags (noImplicitAny,
    // strictNullChecks, etc.)
    "isolatedModules": true, // each file is transpiled in isolation;
    // required because esbuild and
    // babel-jest both compile file-by-file
    "noEmit": true, // tsc only type-checks; esbuild owns emit
    "allowJs": true, // let tsc walk the .js glue files in core/
    "resolveJsonModule": true, // for build.config.json / package.json reads
    "esModuleInterop": true, // import-as-default ergonomics
    "skipLibCheck": true, // faster, no impact on project types
    "forceConsistentCasingInFileNames": true,
    "types": ["node", "jest"],
  },
  "include": [
    "assets/**/*.ts",
    "packages/**/*.ts",
    "tests/**/*.ts",
    "core/**/*.ts",
  ],
}
```

Three rules to remember:

- **Do not set `"emitDeclarationOnly"` or remove `"noEmit": true`.**
  tsc is a **type checker only**. esbuild owns the JavaScript output,
  and the two compilers would otherwise race to write `.d.ts` and
  `.js` files into the source tree.
- **The `include` array is the source-of-truth for what gets
  type-checked.** If a `.ts` file is not under one of those four
  roots, tsc will not see it, and the editor will complain about
  "file not under rootDir". Add a glob when you add a new `.ts` tree
  (e.g. a future `src/**/*.ts`).
- **`isolatedModules: true` constrains the code you can write.** In
  particular, you cannot re-export a type without using `export type`
  (esbuild strips the `type` keyword). It also forbids
  `const enum`s and a handful of other cross-file idioms. These are
  deliberate — they make per-file transpilation safe.

### `npm run typecheck` (`tsc --noEmit`)

```bash
npm run typecheck
```

Runs the TypeScript compiler in **type-check-only mode**. No files
are written; the command exits non-zero on the first type error.
This is the gate CI uses to enforce "no unchecked `.ts` lands on
`main`".

The script is wired in `package.json`:

```jsonc
{
  "scripts": {
    "typecheck": "tsc --noEmit",
  },
}
```

A typical editor flow is to leave tsc's language service running in
the background and only run `npm run typecheck` in CI or before
opening a PR.

### Jest transform (`babel-jest` + `@babel/preset-typescript`)

Jest itself does not type-check. It runs the test files through
**the same Babel transform as the build's source files**, which
strips TypeScript syntax. The transform is configured in
`jest.config.mjs`:

```js
export default {
  // ...
  transform: {
    "^.+\\.[jt]sx?$": [
      "babel-jest",
      { presets: ["@babel/preset-env", "@babel/preset-typescript"] },
    ],
  },
  moduleFileExtensions: ["js", "json", "ts", "tsx"],
  // ...
};
```

And in `babel.config.js`:

```js
export default {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    "@babel/preset-typescript",
  ],
};
```

Two consequences:

1. **Jest does not catch type errors.** It strips them along with the
   rest of the TS syntax. If you need type errors caught in tests,
   run `npm run typecheck` in addition to `npm test`.
2. **The regex `'^.+\\.[jt]sx?$'` covers `.js`, `.jsx`, `.ts`,
   and `.tsx`.** A test file is allowed to be `.test.ts` /
   `.test.tsx`; the test glob itself (`**/tests/**/*.test.js`) is
   pre-Phase-12 and will be widened to `*.test.{js,ts,tsx}` when
   the kit starts shipping typed tests in Phase 18.

### esbuild source map: `loader: { '.ts': 'ts' }`

esbuild understands TypeScript out of the box. The build CLIs only
need to **map the `.ts` extension to esbuild's `ts` loader** so the
resolver doesn't fall back to treating it as JavaScript:

```js
// core/packages/build/esbuild-dependencies.js (and esbuild-components.js)
return {
  // ...
  loader: { ".js": "jsx", ".ts": "ts" },
  // ...
};
```

Three things to know about how esbuild handles `.ts`:

- **esbuild transpiles and bundles in one pass.** It does not
  call out to `tsc`; the build output is whatever esbuild decides
  the `target` field says (ES2020 today, configured by the
  dependencies config).
- **esbuild does not enforce types.** It strips annotations and
  compiles happily on broken types. The strictness gate is
  `npm run typecheck` (above), not esbuild.
- **The deps entry point is `assets/dependencies.ts`.** The
  `esbuild-dependencies.js` config defaults
  `entryPoint: 'assets/dependencies.ts'`; the scaffold emits the
  file at `.ts` and the previous `.js` is removed on rename. See
  [asset-mappings.md](asset-mappings.md#the-two-bundles) for the
  rest of the bundle strategy.

### Component glob: `src/Modules/*/assets/entries/*.ts` (Phase 12)

The components stage discovers **two** kinds of entry files:

```js
// core/packages/build/esbuild-components.js
const MODULE_ENTRY_GLOB = 'src/Modules/*/assets/entries/*.ts';
const LEGACY_SCRIPT_GLOB = '**/script.js';

async function discoverComponentEntries(cwd) {
  const [moduleEntries, legacyScripts] = await Promise.all([
    glob(MODULE_ENTRY_GLOB, {
      cwd,
      ignore: ['node_modules/**', 'assets/**', 'examples/**', 'tests/**'],
    }),
    glob(LEGACY_SCRIPT_GLOB, {
      cwd,
      ignore: ['node_modules/**', 'assets/**', 'examples/**', 'tests/**'],
    }),
  ]);
  // de-duplicate by path, module entries win on conflict
  ...
}
```

The new glob (`src/Modules/*/assets/entries/*.ts`) is the **canonical
shape** for new feature modules — every module ships its own
TypeScript entry, and the builder names the resulting bundle after
`<Module>-<entry>.ts` (for example
`src/Modules/ExampleFeature/assets/entries/admin.ts` becomes
`assets/bundles/ExampleFeature-admin.js`). The legacy `**/script.js`
glob stays in place for projects that have not migrated yet; the
two lists are merged with a `Set` so a path can never be built
twice.

If you are starting a fresh feature module, write your entry at
`src/Modules/<MyModule>/assets/entries/<myEntry>.ts` and skip the
legacy `script.js` form entirely. The starter repo's
`src/Modules/ExampleFeature/assets/entries/admin.ts` is the working
example.

## Test surface

`core/packages/build/__tests__/` holds the esbuild pipeline tests:

- `esbuild-dependencies.test.js` — verifies `dist/<slug>-deps.js`
  exists, has the IIFE wrapper, and contains every workspace
  package.
- `esbuild-components.test.js` — verifies each component is a
  separate file.
- `esbuild-styles.test.js` — verifies SCSS compiles to CSS and
  per-component output is created.
- `dependenciesEntry.test.js` (Phase 12) — locks the contract that
  the deps entry is `assets/dependencies.ts` (renamed from `.js`)
  and that `esbuild-dependencies.js` reads the new extension.
- `typescriptConfig.test.js` (Phase 12) — locks the TypeScript
  configuration contract: `tsconfig.json` exists with `strict:
true` and `target: ES2020`, `package.json` declares
  `typescript` / `@types/node` / `@types/jest`, exposes
  `scripts.typecheck`, and `jest.config.mjs` configures a
  babel-jest transform with `@babel/preset-typescript`.

A failing build does **not** break `npm test` (tests run against
sources in `core/`, not against `dist/`), so you can iterate on
tests without waiting for a full rebuild.

## Local dev loop

```bash
# Watch mode (esbuild --watch on all four stages):
npm run dev

# Rebuild after a config change in project.config.json:
npm run build

# Type-check the .ts source tree (no emit):
npm run typecheck

# Force a full clean rebuild:
rm -rf dist assets
npm run build
```

## Release / CI

`npm run release` is what CI runs. The `composer.json` `release`
script in the project also calls `npm run release` from
`core/packages/build/`. See `release-checklist.md` for the
pre-release steps (version bump, Rector namespace rename, vendor
prefix, …).
