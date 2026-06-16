# JavaScript Variants

> How the kit's `js` feature picks a JavaScript authoring toolchain —
> TypeScript, plain JavaScript, Flow, or no JavaScript at all — and how
> to switch between them later without rewriting your plugin.

The `js` feature in `project.config.json` (or `--js=` on the scaffold
CLI) controls which JS toolchain the consumer project ships. Four
variants:

| Variant         | What you write                                   | Build / type-check          | Output              |
| --------------- | ------------------------------------------------ | --------------------------- | ------------------- |
| `js:typescript` | `.ts` / `.tsx` files with TS type annotations    | esbuild + `tsc --noEmit`    | Compiled ESM bundle |
| `js:pure`       | `.js` / `.jsx` files (plain ESM, no annotations) | esbuild                     | Compiled ESM bundle |
| `js:flow`       | `.js` / `.jsx` files with `// @flow` + types     | esbuild + Flow type-checker | Compiled ESM bundle |
| `js:none`       | No JS source (PHP-only plugin)                   | Nothing — no JS toolchain   | No JS bundle        |

The default is `js:typescript` — the kit's preferred authoring
experience, with full IntelliSense and compile-time error checking.
The other three are opt-in.

## When to choose each

### `js:typescript` — TypeScript (default)

**Pick this when** you're building a new plugin with any non-trivial
JavaScript (admin UIs, REST clients, block editors, etc.) and want
the safety of static types and the IDE support that comes with them.

**What you get:**

- `tsconfig.json` (strict mode, ES2022 target, ESM modules)
- `assets/dependencies.ts` (the deps bundle entry — TS-typed)
- `package.json` scripts:
  - `build:dependencies` → esbuild bundles the deps
  - `typecheck: "tsc --noEmit"` — non-emitting type check
  - `lint:js` includes `.ts,.tsx` extensions
- `@types/wordpress__hooks`, `@types/wordpress__dom-ready` devDeps

**What you give up:** TS adds a build step (esbuild strips types
slightly differently than Flow or pure JS, and `tsc` adds a
non-emitting type-check pass). If your plugin is PHP-only or the
JS layer is a few dozen lines, the overhead isn't worth it.

**When to switch away from it:** if you find yourself fighting the
type system more than the type system is helping — e.g. heavy use
of untyped third-party WordPress globals, or you want to share JS
code with a non-TS project.

### `js:pure` — plain JavaScript

**Pick this when** you want the smallest possible JS toolchain and
your JS layer is small / self-contained. The output is plain ESM
JavaScript; no type checker, no annotations, no transpiler beyond
esbuild's JSX/JS handling.

**What you get:**

- `assets/dependencies.js` (plain ESM, no `: type` annotations, no
  `// @flow` pragma)
- NO `tsconfig.json` (TypeScript is not in play)
- `package.json` scripts:
  - `build:dependencies` → esbuild bundles the deps
  - **No** `typecheck` script (nothing to type-check)
  - `lint:js` targets `.js,.jsx` only
- Same React/Preact + WP hooks runtime deps as the TS variant

**What you give up:** no compile-time type safety. JSDoc can
partially compensate, but it's a different authoring model — the
editor is your type-checker, not the compiler.

**When to switch away from it:** when the JS layer grows past a few
hundred lines and you want IntelliSense-driven autocomplete, or
when you need to share types between modules.

### `js:flow` — Flow

**Pick this when** you want Gradual Typing on a JavaScript-first
codebase — i.e. you don't want to commit fully to TypeScript, but
you do want optional type annotations on functions, objects, and
module boundaries. Flow is Meta's answer to TypeScript; the
annotation syntax is similar but the toolchain is more permissive
(untyped code can coexist with typed code).

**What you get:**

- `assets/dependencies.js` (with the `// @flow` pragma as the
  first non-comment line)
- `.flowconfig` with `[ignore]`, `[include]`, `[libs]`, `[lints]`,
  `[options]`, and `[strict]` blocks — a sensible default Flow
  check out of the box
- `package.json` scripts:
  - `build:dependencies` → esbuild bundles the deps (Flow types
    are stripped at bundle time by the build pipeline)
  - `typecheck: "flow"` — Flow's incremental type-checker
  - `lint:js` targets `.js,.jsx` only
- `flow-bin` devDep

**What you give up:** Flow's tooling is less actively maintained
than TypeScript's. New features in JS land in TS first. Community
type-definition packages (e.g. for React) are typically TS-first;
Flow's [flow-typed](https://github.com/flow-typed/flow-typed)
counterpart covers the major libraries but is less comprehensive.

**When to switch away from it:** if you find that a critical
dependency doesn't ship Flow types and writing your own
`libdef` is more friction than the type-checker is worth. For
greenfield React/Preact + WordPress projects, both TS and Flow
are reasonable choices; for greenfield projects in 2026+,
TypeScript is the more conservative bet.

### `js:none` — PHP-only

**Pick this when** your plugin is pure PHP — no admin JS, no
Gutenberg blocks, no REST client. The kit still scaffolds a
WordPress plugin skeleton, but with no JS toolchain at all.

**What you get:**

- No `package.json`, no `tsconfig.json`, no `assets/dependencies.js`
- No esbuild deps, no husky prepare step
- The kit's PHP framework (PSR-4 + ModuleLoader + Plugin) still
  works; you just don't get the JS half of the kit

**What you give up:** anything that needs the kit's React/Preact
admin UI, blocks, or REST client. The kit's PHP side is still
fully functional — the JS layer is purely additive.

**When to switch away from it:** the moment you need to add a
React admin screen, a Gutenberg block, or any client-side
interactivity. The phase 25.A work makes the `js:none` →
`js:typescript` switch safe (no PHP file conflicts), but the
reverse (adding JS to an existing PHP-only plugin) requires
running the scaffold with the new variant and merging.

## How to switch later

The variant is set at scaffold time. To switch a variant on an
existing project:

1. **Edit `project.config.json`** — change the `js` field to the
   new variant.
2. **Run `npx wpsk doctor`** — the doctor command (Phase 24.x)
   checks that the new variant's required files are present and
   reports any missing pieces.
3. **Run the new variant's install step** — for `js:flow`, this
   is `npm install` (to pull in `flow-bin`); for `js:typescript`,
   this is `npm install` plus writing a `tsconfig.json` if
   missing. The `addFeature` / `removeFeature` commands in
   `update-projects.md` automate the file merge.
4. **Run the build** — `npm run build` to verify the new toolchain
   is wired correctly.

The `js` variant switching is one of the simplest feature
transitions in the kit: it only touches `package.json`,
`tsconfig.json` (or `.flowconfig`), and the deps entry. The PHP
half of the plugin is unaffected. The reverse — switching from
`js:none` to a JS variant — does require writing the initial
`package.json` and the deps entry from scratch; `addFeature js`
handles this in the update flow.

## Build pipeline notes

The build pipeline (esbuild + jest transforms) lives in
`core/packages/build/` and the root `jest.config.*`. It is shared
across all JS variants; the variant-specific difference is:

- `js:typescript` — esbuild's `loader: { ".ts": "ts" }` strips
  types directly. No babel needed.
- `js:pure` — esbuild's `loader: { ".js": "jsx" }` handles
  `.js`/`.jsx` files. No babel needed.
- `js:flow` — esbuild's default `.js` loader does NOT understand
  Flow's type syntax. The build pipeline is expected to run
  `flow-remove-types` (or `@babel/preset-flow` in the jest
  transform) before esbuild sees the source. The `.flowconfig` +
  `// @flow` pragma are the source-side contract; the build
  pipeline's Flow-strip step is the bundle-side contract.

The `// @flow` pragma is the load-bearing marker: it tells the
Flow checker that a `.js` file should be treated as Flow-typed.
Without it, Flow treats the file as untyped JavaScript.
