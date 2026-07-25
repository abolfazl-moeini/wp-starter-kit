# Polaris multi-module JS demo

How to validate **layout ≠ style**, **per-module esbuild bundles**, and **lazy shortcode enqueue** in a scaffolded plugin with `frontendStack: polaris`.

## Goal

| Concern                     | What to prove                                                                |
| --------------------------- | ---------------------------------------------------------------------------- |
| Layout / theme separation   | Layout primitives own spacing; themes only swap `--ps-*` tokens              |
| Modular JS                  | Each feature owns `src/Modules/{Name}/assets/entries/*.{ts,tsx}`             |
| Lazy bundles                | `assets/bundles/{Name}-{entry}.js` loads only when that shortcode is present |
| Cross-module Polaris usage  | Modules import `@wpdev/polaris-stack` by package name — never deep relatives |
| Shared vendors              | Preact once as handle `preact`; Polaris once on `{slug}-deps` (`.polaris`)   |
| Preact-mode `react` imports | Extraction maps `react` → `preactCompat` (not WP `react` handle)             |

## Shared vendors (bundle size)

After `npm run build` you should see roughly:

| File                            | Role                                         |
| ------------------------------- | -------------------------------------------- |
| `assets/bundles/preact.js`      | Shared Preact (handle `preact`)              |
| `assets/bundles/{slug}-deps.js` | Hooks bridge + Polaris (`{Global}.polaris`)  |
| `assets/bundles/*-view.js`      | Thin mounts only (depend on `preact` + deps) |

View `.asset.php` should list `preact` and `{slug}-deps`, not ship a second Preact copy.

## Reference modules (consumer labs)

Scaffold ships `PolarisDemo`. Add sibling lab modules the same way (or copy from a consumer that already did):

| Shortcode                            | Module          | Bundle                  | Focus                                           |
| ------------------------------------ | --------------- | ----------------------- | ----------------------------------------------- |
| `[{slug_underscore}_demo]`           | `PolarisDemo`   | `PolarisDemo-view.js`   | Baseline Card / Button / theme buttons          |
| `[{slug_underscore}_layout_gallery]` | `LayoutGallery` | `LayoutGallery-view.js` | Stack, Grid, Sidebar, Switcher, Cluster…        |
| `[{slug_underscore}_theme_lab]`      | `ThemeLab`      | `ThemeLab-view.js`      | light / dark / system / brand / hc              |
| `[{slug_underscore}_status_widget]`  | `StatusWidget`  | `StatusWidget-view.js`  | Isolated third module (Badge / Alert / Spinner) |

Example with slug `nik-core` → `nik_core_layout_gallery`, etc.

## File layout per lab module

```
src/Modules/{Name}/
├── Module.php                         # ShortcodesSetup + register/enqueue
├── Shortcodes/{Name}Shortcode.php     # Module::request_enqueue() in render
└── assets/entries/view.tsx            # → assets/bundles/{Name}-view.js
```

Register via a Composer `autoload.files` bootstrap (same pattern as `polaris-demo-register.php`):

```php
add_action('plugins_loaded', 'my_plugin_register_polaris_labs', 5);
```

## Build contract

```bash
npm run build
# must print:
# build:src/Modules/LayoutGallery/assets/entries/view.tsx
# Done: …/assets/bundles/LayoutGallery-view.js
# (and the same for ThemeLab, StatusWidget, PolarisDemo)
```

Naming: entry `src/Modules/Foo/assets/entries/view.tsx` → `assets/bundles/Foo-view.js` (+ `.css` if CSS imported, + `.asset.php`).

Also build/register the shared deps bundle (`wpdev.json` → `depsBundle`) before feature scripts.

## Polaris usage rules inside lab UIs

1. Import by package name only:
   ```ts
   import { Stack, Card, setPolarisTheme } from "@wpdev/polaris-stack";
   import "@wpdev/polaris-stack/styles.css";
   ```
2. Wrap mounts in `.ps-scope`.
3. Spacing around styled components → wrap in `Stack` / `Box` / `Cluster` — never `gap`/`mt` on `Button`/`Card`.
4. Themes via `setPolarisTheme("light"|"dark"|"system"|"brand"|"hc")` — no `ThemeProvider`.
5. Feature isolation: Module A must not import Module B’s private `assets/components`.

## Multi-plugin caveat

`WPDev\Core\Plugin`, `WPDev\MCP\Core\Plugin`, and `WPDev\Support\Assets` hold
**process-wide** static state. If two kit-based plugins are active:

| Collision                                              | Scaffold mitigation                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Module slug `polaris-demo`                             | Use `{{slug}}-polaris-demo`                                                                                         |
| MCP `example-abilities`                                | Idempotent `has()` before `register()`                                                                              |
| Script handle `polaris-demo-view`                      | Use `{{slug}}-polaris-demo-view`                                                                                    |
| Empty JS URL → site home HTML → `Unexpected token '<'` | Register via `plugins_url( $rel, $plugin_file )`; Assets refuses empty URLs; `content_url` fallback                 |
| Wrong `depsBundle` from sibling `Plugin::config()`     | Read **this** plugin's `wpdev.json` for deps / localizeVar; register `.asset.php` deps from local `assets/bundles/` |

## Manual test plan (WordPress)

1. Create a page with **only** `[nik_core_layout_gallery]` (adjust slug).
2. View source / Network: expect `LayoutGallery-view.js` (+ css + deps). Expect **no** `ThemeLab-view.js` / `StatusWidget-view.js`.
3. Repeat for each shortcode alone.
4. Combine two shortcodes on one page → both bundles load; deps once.
5. Theme lab: click Light / Dark / Brand / HC — layout structure unchanged; colors flip via `[data-theme]`.
6. Layout gallery: confirm Grid / Sidebar / Switcher respond to viewport without custom CSS.

## CSS note

Each view entry that imports `@wpdev/polaris-stack/styles.css` produces its own `{Name}-view.css` with the full Polaris sheet. That is correct for single-shortcode pages. When multiple labs share a page, the CSS is duplicated in the network panel — acceptable for demos; production apps usually enqueue Polaris CSS once from PHP and drop the import from secondary entries.

## TypeScript pin

Scaffolded `package.json` should list a direct `typescript` **~5.x** (not `"*"`). Commitlint / cosmiconfig may otherwise pull TypeScript 7, which rejects generated `baseUrl` / `paths` and breaks `npm run typecheck`.

## Related

- Skill: `skills/wpdev-js-modules`
- Polaris agent rules: `packages/polaris-stack/context.md`
- Starter snippets: [polaris/starter.md](polaris/starter.md)
- Build outputs: [build-outputs.md](build-outputs.md)
