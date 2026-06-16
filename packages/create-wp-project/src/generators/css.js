/**
 * @wpsk/create-wp-project — css generator (Phase 21 + 25.H).
 *
 * CSS framework config. Three real variants (`sass`, `tailwind`,
 * `postcss`) and one no-op (`css: none` — the registry filter
 * drops it). Each variant emits its own config file(s):
 *
 *   sass       → .sassrc                 (dart-sass config)
 *   tailwind   → tailwind.config.js
 *               + postcss.config.js      (Tailwind is a PostCSS
 *                                          plugin, the pipeline
 *                                          config is required)
 *   postcss    → postcss.config.js       (autoprefixer plugin)
 *
 * Phase 25.H2 expands the tailwind variant to include the PostCSS
 * config (Tailwind compiles through PostCSS — the consumer needs
 * BOTH the Tailwind config AND the PostCSS config to get a working
 * `npm run build` that produces Tailwind-styled CSS). The devDeps
 * for the tailwind variant gain `postcss` alongside `tailwindcss`
 * and `autoprefixer`.
 *
 * The full per-variant templates live here (the kit's own config
 * files are the reference). The esbuild PostCSS / sass plugin is
 * configured via core's `build.config.json` (Phase 25.A area,
 * out of scope for css.js).
 *
 * Gate: js !== "none" (the registry filter applies; the
 * early-return here is defence in depth).
 */

const TEMPLATE_SASSRC = `{
  "includePaths": ["node_modules", "src"],
  "outputStyle": "compressed"
}
`;

const TEMPLATE_TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./assets/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;

/**
 * PostCSS config for the tailwind variant. Tailwind is a PostCSS
 * plugin (https://tailwindcss.com/docs/installation/using-postcss),
 * so the consumer needs `tailwindcss` and `autoprefixer` listed
 * here for the build pipeline to actually compile Tailwind output.
 * Plain `css:postcss` consumers use TEMPLATE_POSTCSS_CONFIG
 * (autoprefixer only) — the tailwind variant needs the Tailwind
 * plugin in addition.
 */
const TEMPLATE_TAILWIND_POSTCSS_CONFIG = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

const TEMPLATE_POSTCSS_CONFIG = `export default {
  plugins: {
    autoprefixer: {},
  },
};
`;

export function run(ctx) {
  const variant = ctx.features.css;
  if (!variant || variant === "none") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  if (ctx.features.js === "none") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  const files = {};
  const devDeps = {};
  if (variant === "sass") {
    files[".sassrc"] = TEMPLATE_SASSRC;
    devDeps["sass"] = "^1.77.0";
  } else if (variant === "tailwind") {
    // Phase 25.H2: tailwind consumers get BOTH the Tailwind config
    // AND the PostCSS config (Tailwind is a PostCSS plugin, the
    // pipeline config is required for the build to work). They
    // also get the postcss devDep — without it, the postcss.config.js
    // is dead code.
    files["tailwind.config.js"] = TEMPLATE_TAILWIND_CONFIG;
    files["postcss.config.js"] = TEMPLATE_TAILWIND_POSTCSS_CONFIG;
    devDeps["tailwindcss"] = "^3.4.0";
    devDeps["postcss"] = "^8.4.0";
    devDeps["autoprefixer"] = "^10.4.0";
  } else if (variant === "postcss") {
    files["postcss.config.js"] = TEMPLATE_POSTCSS_CONFIG;
    devDeps["postcss"] = "^8.4.0";
    devDeps["autoprefixer"] = "^10.4.0";
  }
  return {
    files,
    dirs: [],
    deps: {},
    devDeps,
  };
}

export const descriptor = {
  id: "css",
  feature: "css",
  owns: [".sassrc", "tailwind.config.js", "postcss.config.js"],
  run,
};
