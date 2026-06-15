# React ↔ Preact Switch

> How the same JSX source compiles to either React (default) or Preact
> (lighter bundle) at build time, controlled by a single
> `project.config.json` key.

## The config

`project.config.json`:

```json
{
  "uiFramework": "preact" // or "react"
}
```

This single key:

1. **Aliases `react` → `preact/compat`** in esbuild (Phase 1,
   `dependency-extraction-esbuild-plugin`).
2. **Conditionally adds the `@preact/compat` dependency** in
   `package.json` (only when `preact`, not when `react`).
3. **Picks the right `window.wp.element` shim** in
   `dependency-extraction.esbuild.js` so the bundle works against
   WP's React global _or_ a Preact shim.

## What's the same

- **All your component code is identical.** You write JSX, hooks, refs,
  context, suspense — the same in either mode.
- **All `@wordpress/*` packages work** — they detect `wp.element` at
  runtime; `@preact/compat` exports the same `createElement` /
  `useState` / etc. surface.
- **All tests pass in both modes** — `core/packages/ui-components/`
  tests run against whichever alias is in effect. The CI matrix
  runs `uiFramework: react` _and_ `uiFramework: preact` and verifies
  both pass.

## What's different

| Axis              | `react`                   | `preact`                                     |
| ----------------- | ------------------------- | -------------------------------------------- |
| Bundle size (gz)  | ~45 KB (React + ReactDOM) | ~10 KB (Preact)                              |
| Startup           | Slower (larger parse)     | Faster                                       |
| `React.memo`      | Reference equality        | Same (works via `preact/compat`)             |
| `Suspense`        | Full                      | Limited (`lazy()` works, `Suspense` partial) |
| Concurrent mode   | Yes                       | Limited                                      |
| Server components | No (yet)                  | No                                           |

For most WordPress admin pages, the perf delta is dramatic enough to
make `preact` the default for non-editorial pages.

## The alias is set in esbuild config

`core/packages/build/esbuild-dependencies-cli.js` (or the `preact`
detection in `dependency-extraction-esbuild-plugin`):

```js
const alias =
  config.uiFramework === "preact"
    ? { react: "preact/compat", "react-dom": "preact/compat" }
    : {};

esbuild.build({
  // ...
  alias,
  define: {
    "process.env.WPSK_UI_FRAMEWORK": JSON.stringify(config.uiFramework),
  },
});
```

## Adding a new component

A new component in `core/components/<slug>/` is framework-agnostic by
default:

```jsx
// core/components/hello-world/script.js
import { useState } from "react";

export default function HelloWorld() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount((c) => c + 1)}>Clicked {count}</button>
  );
}
```

`useState` resolves to React's hook (or Preact's, via `preact/compat`).
No other code changes are needed to support both frameworks.

## When to use which

- **`preact`** — public-facing site, blog, marketing pages, anything
  with a small bundle and limited interactivity.
- **`react`** — anything inside the WP block editor (`@wordpress/block-editor`),
  anything that needs concurrent features, anything that depends on a
  React-only library.

The scaffold defaults to `preact` because most starter projects don't
need the full React. The WordPress admin still ships with React, so
the editor experience is unaffected.

## Common pitfalls

- **Library does `import { useId } from 'react'`** — works in both
  modes after `react@18`. If you're on a much older Preact, `useId`
  is missing; pin to Preact 10.11+.
- **Library uses `React.cloneElement` with non-standard props** —
  Preact's `cloneElement` only copies the `key` and `ref`. Most
  popular libraries handle this, but exotic ones might not.
- **`window.wp.element` global is React** in WP core. If you want
  Preact everywhere, the bundle's `React` import is aliased but the
  WP global stays React. The starter handles this with
  `wp-element` (a thin wrapper that re-exports whatever `react`
  resolves to in the consumer's bundle).

## Test surface (Phase 5)

`tests/integration/react-preact.test.js` runs the same component
harness under both `uiFramework: react` and `uiFramework: preact`
config and asserts the rendered output is identical. Plus a
unit test (`@wpsk/ui-components`) that verifies the alias is set
in the esbuild config when the key is `preact`.

See `react-preact.md` for the pre-existing notes from the initial
import (the doc you're reading supersedes those, with the canonical
"the alias is `preact/compat`, not `preact`" rule).
