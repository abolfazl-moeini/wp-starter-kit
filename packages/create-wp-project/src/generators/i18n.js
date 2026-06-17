/**
 * @wpdev/create-wp-project — i18n generator (Phase 21).
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
      "languages/README.md": `# Translation pipeline

The i18n feature is ON for this project.

## Requirements

- **WP-CLI** with the \`wp i18n\` commands (from \`wp-cli/i18n-command\`
  or a full WP-CLI bundle). The kit's translation scripts call
  \`wp i18n make-pot\` and related commands.

Install WP-CLI globally or add it as a dev tool before running
\`composer translation\` / the kit's i18n npm scripts.

## Output

Generated \`.pot\` / \`.po\` / \`.mo\` files are written under
\`languages/\` and loaded from \`{slug}.php\` via
\`load_plugin_textdomain()\`.
`,
    },
    dirs: ["languages"],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "i18n",
  feature: "i18n",
  owns: ["languages/**", "languages/README.md"],
  run,
};
