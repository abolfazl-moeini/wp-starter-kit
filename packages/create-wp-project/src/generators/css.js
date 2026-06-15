/**
 * @wpsk/create-wp-project — css generator (Phase 21).
 *
 * CSS framework config. Three real variants (`sass`, `tailwind`,
 * `postcss`) and one no-op (`css: none` — the registry filter
 * drops it). Each variant emits its own config file:
 *
 *   sass       → .sassrc         (dart-sass config)
 *   tailwind   → tailwind.config.js
 *   postcss    → postcss.config.js
 *
 * The full per-variant templates land in Phase 25 (the kit's
 * own config files are the reference). Phase 21 emits minimal
 * valid stubs that the test suite asserts and that the build
 * tools can parse without erroring.
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
    files["tailwind.config.js"] = TEMPLATE_TAILWIND_CONFIG;
    devDeps["tailwindcss"] = "^3.4.0";
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
