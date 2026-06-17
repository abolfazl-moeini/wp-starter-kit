# Asset Mappings & Bundle Strategy

> How the build turns `core/components/<slug>/script.js` and
> `core/packages/<name>/src/index.js` into `dist/components/<slug>.js`
> and `dist/<slug>-deps.js`, and how `import` paths get rewritten to
> the right global at runtime.

## The two bundles

### `<slug>-deps.js` (one per project)

Source entry: `assets/dependencies.ts` (created by the scaffold;
renamed from `assets/dependencies.js` in Phase 12).
Modules bundled in: **all** of `core/packages/*/src/index.js`.

Why one bundle?

1. The packages are designed to be a single import graph (e.g.
   `@wpdev/hooks` is used by `@wpdev/ui-components`, which is used by
   every component). Splitting them into multiple bundles means
   duplicating shared code in the browser.
2. The bundle is small enough (< 50 KB gzipped with Preact) to
   cache aggressively.
3. One HTTP request is faster than five for the same total bytes.

### `dist/components/<slug>.js` (one per component)

Source entry: `core/components/<slug>/script.js`.

Why one bundle per component?

1. **Lazy loading** — `wp-element`-style apps can `import('./lazy.js')`
   for code that's not on the initial paint.
2. **Cache-busting per component** — a fix to `hello-world` doesn't
   invalidate the cache for `goodbye-world`.
3. **Smaller initial payload** — the home page only ships
   `hello-world.js`, not every component.

## The `importAsGlobals` esbuild plugin

`core/packages/dependency-extraction-esbuild-plugin/index.js` exports
an esbuild plugin that rewrites bare imports:

```js
import { useState } from "react";
// ↓ at build time ↓
const { useState } = window.wp.element;
```

The plugin reads `core/wordPress.dependency-extraction-webpack-plugin.json`
(the official map) and resolves every bare import against it. The
default `core/build/dependency-extraction.esbuild.js` (or
`core/packages/build/index.js`) configures the plugin with:

```js
{
  globalMappings: {
    'react':         'wp.element',
    'react-dom':     'wp.element',
    '@wordpress/hooks': 'wp.hooks',
    '@wordpress/i18n':  'wp.i18n',
    // ... 30+ entries ...
  },
  // Additional: each <scope>/<name> gets a <globalName>.<name> mapping.
}
```

## The `<scope>/<name>` → `<globalName>.<name>` rewrite

This is the project-specific part. From `esbuild-dependencies.js`:

```js
const globalMappings = {
  ...(buildConfig.globalMappings ?? {}),
  [`${projectConfig.npmScope}/utils`]: `${projectConfig.globalName}.utils`,
};
```

So when `@wpdev/utils` ships in the deps bundle as
`window.<globalName>.utils`, every component can use it as:

```js
import { deepClone } from "@wpdev/utils";
// → compiled to: window.MyProject.utils.deepClone(...)
```

The `<scope>/<name>` namespaces (`@wpdev/hooks`, `@wpdev/ui-components`,
…) all get the same treatment, so the public surface is uniform.

## Worked example: tabulator-tables

Use this pattern when a third-party library should be available as a
project global without duplicating it in every module bundle.

### 1. Install the package

```bash
npm i tabulator-tables
```

### 2. Map the bare import to a global namespace

In `build.config.json`, add a `globalMappings` entry (use your project's
`globalName` from `project.config.json`):

```json
{
  "globalMappings": {
    "tabulator-tables": "WPDev.table"
  }
}
```

At build time, `import { Tabulator } from "tabulator-tables"` in any
module entry rewrites to `window.WPDev.table.Tabulator`.

### 3. Export the global from the deps bundle

In `assets/dependencies.ts`:

```ts
export const table = { Tabulator: window.Tabulator };
```

The deps bundle exposes `window.WPDev.table.Tabulator` for module code that
imports from the mapped namespace.

### 4. Copy static dist files into `assets/`

Tabulator ships pre-built CSS/JS that should not pass through esbuild.
Add an `assetMappings` entry (equivalent to the legacy `link-assets.js`
`from`/`to` pair):

```json
{
  "assetMappings": [
    {
      "from": "node_modules/tabulator-tables/dist",
      "to": "assets/libraries/tabulator"
    }
  ]
}
```

Run `npm run build:assets` (or `prepare`, which calls it) to copy files.

### 5. Enqueue in PHP before the module bundle

Register the library script on `admin_init`, enqueue it on the page that
renders the table, then enqueue your module bundle (see
[modules.md](modules.md#asset-registration-best-practices)):

```php
Assets::register_bundle_script(
    'tabulator',
    'assets/libraries/tabulator/tabulator.min.js'
);
Assets::register_bundle_style(
    'tabulator',
    'assets/libraries/tabulator/tabulator.min.css'
);

// On the relevant admin screen:
wp_enqueue_script('tabulator');
wp_enqueue_style('tabulator');
Assets::enqueue_bundle_script('my-module-admin');
```

## Legacy `link-assets.js` equivalence

Older wp-starter-kit checkouts used `dev/link-assets.js` with hand-written
`from`/`to` copy pairs. Consumer projects now declare the same mappings in
`build.config.json → assetMappings` and run:

```bash
npm run build:assets
```

That script (`core/packages/build/build-assets.js`) copies matched paths
into `assets/` without transforms — same outcome as the legacy link script,
but driven by config and wired into `prepare` / CI.

## SCSS / CSS

`build:styles` runs `sass` (or `esbuild-sass-plugin`) on:

- `core/styles/*.scss` → `assets/styles/<name>.css`
- `core/components/<slug>/style.scss` → `dist/components/<slug>.css`

The components CSS is enqueued **only** when the component is rendered
on the page. The styles CSS is enqueued **once** (admin or front-end
depending on the slug config).

## Static assets (`build:assets`)

`core/assets/**/*` is copied verbatim to `assets/`. No transform.
This is for:

- Images (`assets/images/`)
- Fonts (`assets/fonts/`)
- Pre-built JS libraries that you don't want esbuild to touch
  (`assets/vendor/`, optional)

The scaffold's `prepare` script runs `build:assets` so the `assets/`
folder is ready right after `composer install`.

## The full output tree

```
dist/
├── <slug>-deps.js
├── <slug>-deps.js.map
├── components/
│   ├── <slug1>.js
│   ├── <slug1>.js.map
│   ├── <slug1>.css        (if it has style.scss)
│   ├── <slug2>.js
│   └── ...
└── (future) chunks/        (if/when code splitting is added)

assets/
├── styles/
│   ├── editor.css
│   ├── front.css
│   └── ...
├── images/
├── fonts/
├── translations/           (generated by `composer translation:build`)
│   ├── <slug1>-<hash>.json
│   ├── <slug2>-<hash>.json
│   └── <slug>-map.json
└── bundles/
    └── <depsBundle>        (intermediate; copied to dist/ on release)
```

See `build-outputs.md` for the canonical list with sizes.

## Test surface

`core/packages/build/__tests__/asset-mappings.test.js` (Phase 1, 6 tests):

- Every component source ends up as a `dist/components/<slug>.js` file.
- The deps bundle exports `window.<globalName>` as an object.
- `import { X } from '@wpdev/<pkg>'` is rewritten to
  `window.<globalName>.<pkg>.X` (verified by inspecting the bundle).
- `core/assets/**` ends up in `assets/` byte-for-byte.
- The deps bundle and components bundle do **not** duplicate shared
  package code (verified by tree-shaking assertions).
- Each `dist/*.js` has a matching `*.js.map` (sourcemap, dev only).

## Anti-patterns

- **Don't** import from `core/packages/*/src/...` directly. Use the
  workspace alias `@wpdev/<name>`. The direct-import path bypasses
  the esbuild alias and ships the source twice.
- **Don't** add a `vendor.js` to `core/assets/` if it has imports.
  esbuild needs to rewrite them, so it has to be in `core/packages/`
  or `core/components/`.
- **Don't** rely on `dist/` being committed. It's gitignored. The
  build is reproducible.