/**
 * @wpdev/create-wp-project — phpFramework generator (Phase 25.E).
 *
 * When `phpFramework:wpdev`, documents the integration seam and
 * adds a composer `suggest` entry for wpdev-framework-core.
 * The adapter class ships in `wpdev/framework`
 * (`WPDev\Adapters\WpdevModuleAdapter`).
 */

export function run(ctx) {
  if (ctx.features.phpFramework !== "wpdev") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

  return {
    files: {
      "docs/wpdev-integration.md": `# wpdev-framework integration

This project opted into \`phpFramework: wpdev\`.

## Adapter

Use \`WPDev\\Adapters\\WpdevModuleAdapter\` from \`wpdev/framework\` to
bridge kit \`ModuleInterface\` modules into wpdev's
\`Module_Loader::load_all()\` lifecycle.

## Install wpdev-framework

Install [wpdev-framework-core](https://github.com/wpdev-framework/wpdev-framework-core)
as a separate plugin on the site. See \`docs/wpdev-adapter.md\` in the
kit for the full seam map (setup.php convention, boot sequence, filters).
`,
    },
    dirs: ["docs"],
    deps: {},
    devDeps: {},
    composerSuggest: {
      "wpdev/framework-core":
        "Optional wpdev-framework core (phpFramework:wpdev). Install separately.",
    },
  };
}

export const descriptor = {
  id: "phpFramework",
  feature: "phpFramework",
  owns: ["docs/wpdev-integration.md"],
  run,
};
