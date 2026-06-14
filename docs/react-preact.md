# React ↔ Preact — switching the UI framework

> Phase 5 deliverable. Default framework is **Preact** (10.x). This document
> explains how the switch works, why the `/** @jsx h */` pragma matters, and
> the `project.config.json → uiFramework` field semantics.

## TL;DR

- **Default:** Preact 10 + `h` pragma (`/** @jsx h */`).
- **Switch to React:** drop the `react` / `react-dom` aliases, remove the
  `/** @jsx h */` pragma, and use `<MyComp />` directly. Bundle size grows;
  behaviour is unchanged.
- **Switch back to Preact:** restore the aliases, restore the `/** @jsx h */`
  pragma, replace `React.createElement` calls with `h(...)` (or rely on the
  pragma).

The `uiFramework` config field is documentation, not a build switch —
changing it does **not** swap the framework. It is a hint for tooling and
humans about which framework the project is currently targeting.

## 1. Why this is even possible

Preact and React share the same `createElement` call signature
(`h(type, props, ...children)`). Preact exports a 1:1-compatible function as
`h`. React 17+ also lets you use a JSX pragma to point at a different
`createElement` — that's how the alias works.

[Preact's getting-started guide](https://preactjs.com/guide/v10/getting-started/#aliasing-react-to-preact)
walks through the alias pattern. The summary is:

> "If you want to use a build-tool-based alias, change your `react` and
> `react-dom` aliases to point to `preact/compat`. Existing React code will
> resolve to Preact at install time, with no source changes."

We do this in the root `package.json`:

```jsonc
"dependencies": {
  // Aliases: any `import "react"` or `import "react-dom"` in the
  // dependency graph (including third-party libraries) resolves to
  // @preact/compat, which re-exports the preact runtime under the
  // standard react/react-dom names. No source changes needed.
  "react":     "npm:@preact/compat@^18.3.2",
  "react-dom": "npm:@preact/compat@^18.3.2"
}
```

Verification (run from the repo root):

```bash
node -e "console.log(require.resolve('react'))"     # → node_modules/react/index.js
node -e "console.log(require.resolve('react-dom'))" # → node_modules/react-dom/index.js
ls -la node_modules/react     # symlink → @preact/compat
ls -la node_modules/react-dom # symlink → @preact/compat
```

## 2. The `/** @jsx h */` pragma — why it matters

JSX is **not** JavaScript — Babel / esbuild transform `<Foo />` into
`createElement(Foo, ...)` calls. By default the factory is
`React.createElement`, which is why every classic React file starts with
`import React from 'react'`.

The `/** @jsx h */` pragma (a docblock-style comment at the top of a file)
tells the JSX transformer to use a different factory. With Preact we point
it at `h` from `preact`:

```js
/** @jsx h */
import { h } from 'preact';

export function Greeting(props) {
  return <p>hello {props.name}</p>;
}
```

is transformed to:

```js
import { h } from 'preact';
export function Greeting(props) {
  return h('p', null, 'hello ', props.name);
}
```

Without the pragma, the same file would be transformed to
`React.createElement('p', null, 'hello ', props.name)` — and since `React` is
**not imported**, the file will throw `ReferenceError: React is not defined`
at runtime. The pragma is what flips the call site to `h(...)`.

Preact's `render(vnode, container)` accepts whatever factory's output you
hand it, so this works seamlessly.

**Where to put it:** the pragma is a per-file directive. You do NOT need it
on every file — only on files that use JSX and don't otherwise call `h(...)`
explicitly. Most Preact codebases put it once on a small number of files
that own the JSX surface.

## 3. The `uiFramework` config field

`project.config.json` carries a `uiFramework` field. It is **informational**
right now (Phase 5.1); no build script reads it as a switch.

| Value     | Meaning                                                                              |
|-----------|--------------------------------------------------------------------------------------|
| `preact`  | Project uses Preact 10 directly, with the `h` pragma and `preact/compat` alias.      |
| `react`   | Project uses React 17/18 directly. No pragma, no alias, no `@preact/compat` shim.    |

Default when omitted: `"preact"` (set by `readProjectConfig` →
`OPTIONAL_DEFAULTS`). This matches the seeded `project.config.json` shipped
with the starter kit.

Why include it if no code reads it? Three reasons:

1. **Discoverability.** A new contributor running `cat project.config.json`
   immediately sees "this is a Preact project." Saves grepping.
2. **Future tooling.** Linters, scaffold generators, and Rector rules can
   read it. Plop (Phase 7) will validate the field when generating new
   components.
3. **Doc self-consistency.** `examples/preact-counter/Counter.js` lives
   next to a `uiFramework: "preact"` config — the relationship is explicit.

A follow-up phase can wire the field to the build (e.g. conditionally
emitting the `/** @jsx h */` directive or swapping the `react` alias on a
per-config basis). For now, treat it as a *contract* — change it when you
change the framework, not as a switch.

## 4. Switching to React (full walkthrough)

If a downstream project wants React instead of Preact:

### 4.1 Remove the aliases

In root `package.json`, delete the `dependencies` block:

```diff
- "dependencies": {
-   "react":     "npm:@preact/compat@^18.3.2",
-   "react-dom": "npm:@preact/compat@^18.3.2"
- },
```

Then `npm install`. `node_modules/react` and `node_modules/react-dom` will
disappear.

### 4.2 Add real React

```bash
npm install react react-dom
```

### 4.3 Remove the JSX pragma

Search for `/** @jsx h */` in the codebase. Either delete the line outright
or change it to `/** @jsx React.createElement */` (the latter is the
default — most React codebases don't need a pragma at all).

Also delete the `import { h } from 'preact'` lines if any component files
import `h` directly.

### 4.4 Update `project.config.json`

```diff
- "uiFramework": "preact",
+ "uiFramework": "react",
```

### 4.5 Update mount calls

`packages/html-utils/index.js → mountComponent` uses Preact's `render` under
the hood. For React you'll need a thin shim:

```js
// React variant
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';

export function mountComponent(elementId, Component, extraProps = {}) {
  const element = document.getElementById(elementId);
  if (!element) return null;
  const root = createRoot(element);
  root.render(h(Component, { ...elementProps(element), ...extraProps }));
  return root;
}
```

(`elementProps` stays the same — it's framework-agnostic.)

### 4.6 Verify

```bash
npm install
npm test
```

`tests/jsdom.smoke.test.js` will fail on the `import { h } from 'preact'`
lines — that's intentional. Rewrite the test imports for React or scope
those tests under a Preact-only file with a skip in the React config.

## 5. Switching back to Preact

Reverse of §4. The two important pieces are:

1. Restore the alias block in `package.json` and `npm install`.
2. Restore `/** @jsx h */` on JSX files (or add a babel/esbuild config
   default — see the Preact guide cited above).

`uiFramework` in `project.config.json` should go back to `"preact"`.

## 6. References

- [Preact — Getting started: Aliasing React to Preact](https://preactjs.com/guide/v10/getting-started/#aliasing-react-to-preact)
- Plan §5.1, §5.2, §5.3 — internal sections on Preact default, switch
  documentation, and the mount test.
- `examples/preact-counter/` — runnable example.
- `packages/html-utils/index.js` — the `mountComponent` /
  `elementProps` helpers exercised by `tests/jsdom.smoke.test.js`.
