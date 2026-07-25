---
name: wpdev-js-modules
description: >
  Modular JS/TS architecture for wp-starter-kit plugins: module entry globs
  src/Modules/*/assets/entries/*.{ts,tsx}, esbuild bundles, package imports
  (@wpdev/polaris-stack, @wpdev/hooks, @wpdev/utils, rest-utils, ui-components),
  Polaris layout/style separation, Preact/compat, no deep relative paths.
  Use when adding frontend/admin UI, Polaris demos, JS entries, package aliases,
  or splitting TS/TSX code. Slash: /wpdev-js-modules
---

# WPDev JS modular architecture

Use this skill for **scaffolded / generated** plugins. Frontend and admin JS are
**owned by PHP feature modules**, not a single global `app.js`.

## Mental model

```
src/Modules/{Feature}/assets/entries/*.ts(x)   # entrypoints (auto-discovered)
assets/bundles/{Feature}-{entry}.js            # esbuild output + .asset.php
assets/dependencies.ts                         # shared deps bundle (hooks bridge)
packages/*  or  src/polaris/                   # local packages (name imports)
tsconfig paths: @/*  and  @wpdev/polaris-stack
```

Build stages (parallel):

1. **dependencies** → `{slug}-deps.js` (shared globals / hooks surface)
2. **components** → one bundle per module entry
3. **styles** → CSS pipeline
4. **assets** → library copies per mappings

PHP enqueues via `WPDev\Support\Assets` using handle + relative path under
`assets/bundles/…`.

## STOP rules

- **NEVER** use deep relative imports to reach packages:
  `import "../../../../polaris"` — **forbidden**.
- **ALWAYS** import by package name:
  - `@wpdev/polaris-stack` / `@wpdev/polaris-stack/styles.css`
  - `@wpdev/hooks`, `@wpdev/utils`, `@wpdev/rest-utils`, …
  - Optional root alias: `@/…` → `src/…` (tsconfig + tooling)
- **NEVER** invent entry paths outside `src/Modules/*/assets/entries/*.{ts,tsx}`
  if you want auto-discovery (legacy `**/script.js` still works).
- **NEVER** mix layout props on styled Polaris components (or style props on layout).
- **NEVER** import React APIs that Preact compat does not support without checking
  (project often aliases `react` → `@preact/compat`).
- **ALWAYS** match PHP enqueue path to esbuild name: `MyFeature-admin.js`.
- **ALWAYS** gate admin mounts on DOM roots; gate shortcode UI on `[data-*]` nodes.

## Where JS lives (modular split)

```
src/Modules/{Name}/
└── assets/
    └── entries/
        ├── admin.ts(x)     # wp-admin screens
        └── view.ts(x)      # frontend shortcode / public UI
```

Optional co-located UI (same module, **not** global):

```
src/Modules/{Name}/
└── assets/
    ├── components/         # module-private Preact/React components
    ├── hooks/              # module-private hooks
    └── styles/             # module-private CSS if not using Polaris tokens
```

**Split rule:** one entry = one boot context (admin screen **or** frontend shortcode).
Share code via local package imports or a small shared module under `src/` imported as
`@/…` — not by reaching up with `../../../../`.

### Bundle naming (contract)

| Entry file                                           | Output                                                   |
| ---------------------------------------------------- | -------------------------------------------------------- |
| `src/Modules/ExampleFeature/assets/entries/admin.ts` | `assets/bundles/ExampleFeature-admin.js`                 |
| `src/Modules/PolarisDemo/assets/entries/view.tsx`    | `assets/bundles/PolarisDemo-view.js` (+ css if imported) |

PHP:

```php
Assets::register_bundle_script( 'example-feature-admin', 'assets/bundles/ExampleFeature-admin.js' );
Assets::enqueue_bundle_script( 'example-feature-admin' );
```

## packages map (JS)

Generated / monorepo packages commonly available (npm workspaces or path deps):

| Import                            | Package dir                                        | Use for                                                                     |
| --------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| `@wpdev/polaris-stack`            | `packages/polaris-stack` or consumer `src/polaris` | Design system UI                                                            |
| `@wpdev/polaris-stack/styles.css` | same                                               | Global Polaris CSS (once)                                                   |
| `@wpdev/hooks`                    | `packages/hooks`                                   | doAction / applyFilters bridge to deps bundle                               |
| `@wpdev/utils`                    | `packages/utils`                                   | `localize.api()` REST url/nonce helpers                                     |
| `@wpdev/rest-utils` / fetch       | `packages/rest-utils`                              | Batch REST client, cache (`@wpdev/fetch` is a deprecated shim → rest-utils) |
| `@wpdev/ui-components` / WDForm   | `packages/ui-components`                           | Form store / WDForm patterns                                                |
| `@wpdev/html-utils`               | `packages/html-utils`                              | Safe DOM helpers                                                            |
| `@wpdev/translation`              | `packages/translation`                             | i18n helpers when feature on                                                |
| `@wpdev/rule-engine`              | `packages/rule-engine`                             | Client-side rule evaluation                                                 |
| `@wordpress/*`                    | WP scripts / deps                                  | Official WP packages (dom-ready, i18n, …)                                   |

### Polaris in generated projects

Present when `frontendStack:polaris` (scaffold copies runtime into **`src/polaris/`**
and emits `src/Modules/PolarisDemo/`). Not present in the kit tree unless that
feature is on.

Local `package.json` name:

```json
{
  "name": "@wpdev/polaris-stack",
  "exports": { ".": "./index.ts", "./styles.css": "./styles.css" }
}
```

Consumer `package.json` dependency:

```json
"@wpdev/polaris-stack": "file:src/polaris"
```

esbuild resolves via **package name aliases** (`getProjectAliases`) when `src/polaris` exists.
tsconfig paths also map `@wpdev/polaris-stack` → `src/polaris/index.ts`.

**Correct demo entry** (matches generator `polarisDemoViewEntry`):

```tsx
import { render } from "preact"; // or createRoot from react-dom/client when jsLib=react
import "@wpdev/polaris-stack/styles.css";
import {
  Button,
  Card,
  Heading,
  Stack,
  Text,
  Badge,
  setPolarisTheme,
} from "@wpdev/polaris-stack";

setPolarisTheme("system");

function PolarisDemoApp() {
  return (
    <Stack gap="4">
      <Card>
        <Heading>Demo</Heading>
        <Text tone="muted">Shortcode mount</Text>
        <Stack gap="2">
          <Button onClick={() => setPolarisTheme("dark")}>Dark</Button>
        </Stack>
      </Card>
    </Stack>
  );
}

function mountAll() {
  document.querySelectorAll("[data-polaris-demo]").forEach((el) => {
    render(<PolarisDemoApp />, el);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountAll);
} else {
  mountAll();
}
```

PHP side: `ShortcodesSetup` + shortcode `render` calls `Module::request_enqueue()`
so the view bundle loads only when the shortcode is present.

**Also enqueue the shared deps bundle** (`wpdev.json` → `depsBundle`, e.g.
`core-deps.js`). Component `.asset.php` lists that handle as a dependency;
register + enqueue it before the feature script or WP will skip the missing dep.

## Polaris rules (layout ≠ style)

From `packages/polaris-stack/context.md` — non-negotiable:

1. **Layout primitives** (`Stack`, `Grid`, `Box`, `Cluster`, …): spacing, alignment, flow only.
2. **Styled components** (`Button`, `Card`, `Badge`, …): colors, type, variants — **no** layout props.
3. Spacing around a Button → wrap in `Stack` / `Box`, do not add `mt` to Button.
4. Tokens are CSS variables `--ps-*`; theme via `setPolarisTheme` / `data-theme` — no ThemeProvider.
   Built-in themes: `light`, `dark`, `system`, `brand`, `hc`.
5. Import CSS **once** per page load path (`styles.css`).
6. No CSS-in-JS libraries; no layout `px` for structure (prefer rem / logical props).
7. Wrap admin/frontend mounts in `.ps-scope` so base typography does not clobber WP admin.

## Entry authoring patterns

### Admin (TypeScript)

```ts
import domReady from "@wordpress/dom-ready";
import getHooks from "@wpdev/hooks"; // named { getHooks } also works

domReady(() => {
  const root = document.getElementById("my-plugin-my-feature-admin");
  if (!root) return;
  root.textContent = "Admin ready";
  getHooks()?.doAction(`${__WPDEV_HOOK_PREFIX__}.my-feature.init`, root);
});
```

Compile-time defines available in bundles (from project config):

- `__WPDEV_GLOBAL_NAME__`, `__WPDEV_HOOK_PREFIX__`, `__WPDEV_LOCALIZE_VAR__`, `__WPDEV_SLUG__`

### Frontend shortcode (TSX + Polaris)

1. PHP `Shortcode` prints a mount node (`data-polaris-demo` / stable id).
2. PHP enqueues `PolarisDemo-view` only when shortcode present.
3. Entry queries mount nodes and renders once.

### Hooks across bundles

- Deps bundle exposes hooks; feature bundles **subscribe/publish** via `@wpdev/hooks`.
- Namespace actions with hook prefix + feature slug to avoid collisions.

### REST from browser

```ts
import { localize } from "@wpdev/utils";
// url + nonce from localized script data (Assets::get_localize_data contract)
const { url, nonce } = localize.api();
```

Prefer `@wpdev/rest-utils` batch helpers when `restBatch:on`.

## Splitting large UI

| Signal                         | Action                                                 |
| ------------------------------ | ------------------------------------------------------ |
| Entry file > ~150 lines        | Extract `assets/components/*` under the same module    |
| Two screens, different enqueue | Two entries: `admin.ts` + `settings.ts`                |
| Shared design system           | Polaris package only — do not fork tokens per module   |
| Shared non-UI logic            | Small pure TS under `src/lib/` imported as `@/lib/...` |
| Form-heavy admin               | WDForm / ui-components patterns, not ad-hoc state soup |
| Separate shortcodes / surfaces | **Separate modules** (or entries) → separate bundles   |

### Multiple modules = multiple lazy bundles

Each feature that mounts only on its own shortcode/admin screen should own:

```
src/Modules/{Name}/
├── Module.php                         # ShortcodesSetup + register/enqueue
├── Shortcodes/*.php                   # request_enqueue() in render
└── assets/entries/view.tsx            # → assets/bundles/{Name}-view.js
```

PHP enqueues **only when the shortcode is present** (register early, enqueue
conditionally). Do not load Module B’s JS because Module A rendered.

Example shortcodes (demo plugins; prefix = `{slug_underscore}`):

| Shortcode                            | Bundle                  |
| ------------------------------------ | ----------------------- |
| `[{slug_underscore}_demo]`           | `PolarisDemo-view.js`   |
| `[{slug_underscore}_layout_gallery]` | `LayoutGallery-view.js` |
| `[{slug_underscore}_theme_lab]`      | `ThemeLab-view.js`      |
| `[{slug_underscore}_status_widget]`  | `StatusWidget-view.js`  |

With slug `nik-core` → `[nik_core_layout_gallery]`, etc. Lab modules are
**consumer demos** (not auto-scaffolded); see `docs/polaris-js-modules-demo.md`.

**Module PHP slugs** (not shortcode tags) must also be unique across co-installed
kit plugins. Scaffold uses `{slug}-polaris-demo` / `{slug}-mcp-abilities` because
`WPDev\Core\Plugin` and `WPDev\MCP\Core\Plugin` share process-wide static loaders.

**Script handles + enqueue:** use `{slug}-…-view` handles and register view JS via
`plugins_url` + local `wpdev.json` for `depsBundle`. Shared `Assets` /
`Plugin::config()` across two active kit plugins caused
`src="https://site/?id=…"` (console `Unexpected token '<'`) and missing deps
so WP omitted the script entirely. See `docs/php-core-libs.md` (Assets) and
`docs/polaris-js-modules-demo.md`.

Keep **feature isolation**: Module A should not import Module B's private components.
Cross-feature communication → hooks / REST / shared package.

## Tooling contracts

### tsconfig (generated)

```json
"baseUrl": ".",
"paths": {
  "@/*": ["src/*"]
}
```

When `frontendStack:polaris`, also:

```json
"@wpdev/polaris-stack": ["src/polaris/index.ts"],
"@wpdev/polaris-stack/*": ["src/polaris/*"],
"react": ["src/polaris/react.d.ts"],
"react/jsx-runtime": ["src/polaris/react.d.ts"]
```

(`react.d.ts` is the Preact compat type bridge copied into `src/polaris/`.)

`"include": ["assets/**/*", "src/**/*", "packages/**/*"]`

### esbuild aliases

- Preact: esbuild still aliases `react` / `react-dom` → `preact/compat` for
  resolve-time paths, but **dependency-extraction** is authoritative: when
  `uiFramework=preact`, bare `react` / `react-dom` / `react/jsx-runtime` map to
  `preactCompat` / `preactJsxRuntime` and WP handle `preact` (importAsGlobals
  runs before aliases).
- Polaris: `@wpdev/polaris-stack` → `src/polaris/index.ts` when building the
  **deps** bundle; component builds map it to `${globalName}.polaris` (loaded once)
- JSX: automatic runtime + `jsxImportSource` preact|react

### Shared vendors (do not duplicate in every view bundle)

WordPress already registers `react`, `react-dom`, `react-jsx-runtime`, and
`@wordpress/*`. In **`uiFramework: react`** those MUST stay external
(dependency-extraction → `.asset.php`). In **`uiFramework: preact`**, bare
`react` imports are rewritten to the shared Preact vendor instead of WP React.

Libraries WP does **not** ship (Preact) are built once and registered under a
stable handle:

| Import                                     | WP handle     | Bundle                                |
| ------------------------------------------ | ------------- | ------------------------------------- |
| `preact`, `preact/hooks`, `react` (preact) | `preact`      | `assets/bundles/preact.js`            |
| `@wordpress/*`, `react` (react mode only)  | WP core       | (none — use WP scripts)               |
| `@wpdev/polaris-stack`                     | `{slug}-deps` | inside `{slug}-deps.js` as `.polaris` |

- Handle `preact` is **unprefixed** so two kit plugins share one registration
  (first registrant wins).
- Call `Assets::register_vendor_scripts()` early (`init`) after `set_plugin_dir()`.
- View `.asset.php` lists `preact` + `{slug}-deps`; never inline Preact/Polaris
  into each module bundle.

### Commands

```bash
npm run dev              # watch JS
npm run build            # production bundles
npm run typecheck        # tsc --noEmit (requires direct devDependency: typescript ~5.x)
```

Scaffolded `package.json` must list `typescript` under `devDependencies` when
`js=typescript`. Do not rely on transitive tsc (commitlint may pull TS 7 which
breaks generated `baseUrl` / `paths`).

## Decision tree

| Goal                          | Do this                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| New admin UI for a feature    | `src/Modules/{Name}/assets/entries/admin.tsx` + PHP Assets enqueue |
| Frontend Polaris demo         | `view.tsx` + ShortcodesSetup (PHP skill) + package imports         |
| Shared hooks between features | `@wpdev/hooks` + prefixed action names                             |
| REST from UI                  | `@wpdev/utils` localize + rest-utils if batch                      |
| New design primitive          | Extend polaris package / `src/polaris` — not one-off CSS in entry  |
| Avoid relative hell           | Package name or `@/` only                                          |

## Quality checklist

- [ ] Entry under `src/Modules/*/assets/entries/*.{ts,tsx}`
- [ ] No `../..` climbs to polaris or packages
- [ ] Bundle name matches PHP `assets/bundles/{Module}-{entry}.js`
- [ ] Polaris: layout/style separation respected
- [ ] Mount only when DOM root exists; shortcode assets lazy
- [ ] Each shortcode/surface enqueues **only its own** bundle
- [ ] Shared `depsBundle` is registered/enqueued with feature scripts
- [ ] Preact is **not** inlined in view bundles (`assets/bundles/preact.js` + handle `preact`)
- [ ] Polaris JS comes from deps global (`${globalName}.polaris`), not copied into every view
- [ ] `uiFramework` / Preact compat respected
- [ ] `npm run build` prints `build:src/Modules/...` for every entry (if silent, CLI symlink / glob bug)
- [ ] typecheck + build clean (`typescript` direct devDep, not transitive-only)

## Related

- Package path map: [references/packages-map.md](references/packages-map.md)
- PHP modules / RestSetup / ShortcodesSetup: skill **`wpdev-php-modules`**
- Polaris agent rules: `packages/polaris-stack/context.md`
- Docs: `docs/module-guide.md`, `docs/polaris/starter.md`, `docs/build-outputs.md`
- Example entries: `src/Modules/ExampleFeature/assets/entries/admin.ts`
- Scaffolded Polaris demo template: `packages/create-wp-project/src/generators/_polaris-template.js`
- Multi-module Polaris labs (layouts + themes + widgets): consumer demos / `docs/polaris-js-modules-demo.md`
