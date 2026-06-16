# CSS Variants

> How the kit's `css` feature picks a CSS build pipeline — Sass,
> Tailwind, plain PostCSS, or no pipeline at all — and how to switch
> between them later without rewriting your styles.

The `css` feature in `project.config.json` (or `--css=` on the
scaffold CLI) controls which CSS toolchain the consumer project
ships. Four variants:

| Variant        | What you write              | What runs at build                | Output           |
| -------------- | --------------------------- | --------------------------------- | ---------------- |
| `css:none`     | Hand-authored CSS           | Nothing — no CSS build step       | Plain CSS file   |
| `css:sass`     | `.scss` / `.sass`           | dart-sass                         | Compressed CSS   |
| `css:tailwind` | Tailwind utility classes    | PostCSS + Tailwind + autoprefixer | Compiled CSS     |
| `css:postcss`  | Hand-authored CSS + plugins | PostCSS + autoprefixer            | Autoprefixed CSS |

The default is `css:none` — the consumer gets a plain
`assets/stylesheets/style.css` (always emitted by core) and writes
hand-authored CSS. The other three are opt-in.

## When to choose each

### `css:none` — plain CSS

**Pick this when** your plugin's admin UI is small (a few hundred
lines of CSS), you don't need a build step, and you want the
smallest possible toolchain.

**What you get:**

- `assets/stylesheets/style.css` (hand-authored)
- No npm CSS deps
- No build step — the file is shipped as-is
- No esbuild CSS plugin in the pipeline

**What you give up:** no variables / mixins / nesting beyond
[what modern CSS supports natively](https://caniuse.com/css-nesting).
No autoprefixer — you're responsible for vendor prefixes.

**When to switch away from it:** as soon as you find yourself
copy-pasting color values across files, or you want to use a
design-token system. Sass or Tailwind will pay for themselves
within a day.

### `css:sass` — dart-sass

**Pick this when** you're writing custom CSS and want variables,
nesting, mixins, and `@use` / `@forward` modules. Sass is the
mature choice for traditional stylesheets.

**What you get:**

- `.sassrc` config (include paths + `outputStyle: "compressed"`)
- `sass` (dart-sass) npm devDependency
- The esbuild sass plugin is wired in core's `build.config.json`
  (esbuild compiles `.scss` files referenced from `import "./foo.scss"`)
- `assets/stylesheets/style.css` is the entry point (rename to
  `style.scss` if you want the entry itself to be Sass)

**What you give up:** Sass only processes `.scss`/`.sass` files.
If you want utility classes (a `class="flex p-4 text-red-500"`
workflow), you want Tailwind instead.

**When to switch away from it:** when your team is doing rapid
prototyping and would benefit from utility classes; or when you
want to standardise on a design system that's already encoded in
Tailwind config form.

### `css:tailwind` — utility-first CSS

**Pick this when** you want a utility-first workflow
(`class="flex items-center gap-2"`), or you're building a UI
that follows an existing Tailwind design system.

**What you get:**

- `tailwind.config.js` (content globs: `./assets/**/*.{js,ts,jsx,tsx}`,
  theme extends, plugins)
- `postcss.config.js` (Tailwind is a PostCSS plugin, so the
  PostCSS pipeline is required to actually run it)
- `tailwindcss`, `postcss`, `autoprefixer` npm devDependencies
- The esbuild PostCSS plugin is wired in core's `build.config.json`
- Tailwind classes are purged in production (only the classes you
  actually use are shipped)

**What you give up:** readability of the rendered HTML (long
class strings), and a learning curve for the utility class names.
Bundle size depends on how disciplined your `@apply` usage is.

**When to switch away from it:** when the project grows beyond
~50 components and you'd rather have semantic class names
(`class="card-header"` rather than `class="rounded-lg shadow-md
p-4 bg-white"`). At that point, plain CSS with Sass variables is
often more maintainable.

### `css:postcss` — plain CSS with plugins

**Pick this when** you want the smallest possible build pipeline
that still gives you autoprefixer and any custom PostCSS plugin
(PostCSS Nesting, `postcss-preset-env`, custom in-house plugins).

**What you get:**

- `postcss.config.js` (autoprefixer plugin)
- `postcss`, `autoprefixer` npm devDependencies
- The esbuild PostCSS plugin is wired in core's `build.config.json`
- Your existing hand-authored CSS gains autoprefixer and any
  PostCSS transforms you add to the config

**What you give up:** variables / mixins (use plain CSS custom
properties + PostCSS Preset Env's `:root { --color: ... }` if
you need them). No utility-class workflow.

**When to switch away from it:** when you want either Sass-style
authoring (`css:sass`) or utility classes (`css:tailwind`).

## How to switch later

All four variants emit configuration files but **none of them
own your actual stylesheet files**. The CSS source you write lives
in `assets/stylesheets/` regardless of variant. So switching is a
matter of:

1. **Update `project.config.json`** — flip `"css"` to the new
   variant (e.g. `"css": "tailwind"`).
2. **Re-run the scaffold** — `npx @wpsk/create-wp-project update`
   in the consumer project. The CSS generator's `run()` runs
   again with the new variant and overwrites the config files
   (the generator's `owns` list: `.sassrc`, `tailwind.config.js`,
   `postcss.config.js`).
3. **Migrate your styles** — this is the only manual step:
   - `none` → `sass`: rename `style.css` to `style.scss`, add
     variables / nesting as you convert.
   - `none` → `tailwind`: leave the source CSS alone (Tailwind
     will purge it; only utility classes in your JSX/TSX survive).
   - `sass` → `tailwind`: keep the `.scss` for legacy styles,
     add Tailwind classes to new components.
   - `tailwind` → `postcss`: move utility classes from JSX into
     `.css` (you lose the purge-driven size win).
4. **Re-install deps** — `npm install` to pick up the new CSS
   toolchain's devDependencies.

The CSS generator's gate is `js !== "none"` — if you flip to a
JS-driven project later, the CSS generator will start emitting
config files automatically (it's gated by both the registry
filter and the generator's own defence-in-depth early return).

## References

- `packages/create-wp-project/src/generators/css.js` — the
  generator implementation. Three branches (`sass`, `tailwind`,
  `postcss`) and one no-op for `none`.
- `tests/packages/generators.css.test.js` — 7 test cases
  (4 variant + 3 js:none defence-in-depth).
- `docs/build-system.md` — how the generated CSS is consumed
  by the esbuild pipeline and what `build.config.json` looks
  like for each variant.
- `docs/scaffold.md` — the `scaffold` command, including
  `--css=` flag for the CLI.
