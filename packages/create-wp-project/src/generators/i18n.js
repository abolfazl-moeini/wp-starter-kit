/**
 * @wpsk/create-wp-project — i18n generator (Phase 21).
 *
 * Translation pipeline (text domain is already declared in
 * project.config.json / {slug}.php by core; this generator
 * emits the .pot/.po scaffolding under `languages/` and the
 * wp_set_script_translations / load_plugin_textdomain calls
 * are already in {slug}.php).
 *
 * Phase 21 emits the `languages/` directory marker + a minimal
 * `.gitkeep` so the directory is created at scaffold time. The
 * full .pot / wp-cli i18n config lands in Phase 25.
 */

export function run(ctx) {
  if (ctx.features.i18n !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  return {
    files: {
      "languages/.gitkeep":
        "# Translation source files (.pot, .po, .mo) live here.\n",
    },
    dirs: ["languages"],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "i18n",
  feature: "i18n",
  owns: ["languages/**"],
  run,
};
