/**
 * @wpdev/create-wp-project — blocks generator.
 *
 * Gutenberg blocks via Blockstudio 7 (PHP-first). Emits blockstudio.json,
 * example block files, and the kit bridge module when blocks=on.
 */

import { renderTemplate } from "./_templates.js";
import {
  blockstudioConfig,
  blocksBridgeModule,
  blocksRegisterBootstrap,
  exampleHeroFiles,
} from "./_blocks-template.js";

const BRIDGE_DIR = "src/Modules/Blocks";
const REGISTER_FILE = "src/blocks-register.php";

export function run(ctx) {
  if (ctx.features.blocks !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

  const slug =
    ctx.vars?.slug || ctx.answers?.slug || ctx.cfg?.slug || "my-plugin";
  const tpl = {
    ...(ctx.answers || {}),
    ...(ctx.cfg || {}),
    ...(ctx.vars || {}),
    vendor: ctx.vars?.vendor || ctx.answers?.globalName || "WPDev",
    frameworkNamespace: ctx.vars?.frameworkNamespace || "WPDev",
    slug,
    slug_underscore: String(slug).replace(/-/g, "_"),
    textDomain: ctx.vars?.textDomain || ctx.answers?.textDomain || slug,
  };

  const files = {
    "blockstudio.json": blockstudioConfig(ctx) + "\n",
    [`${BRIDGE_DIR}/Module.php`]: renderTemplate(blocksBridgeModule(ctx), tpl),
    [REGISTER_FILE]: renderTemplate(blocksRegisterBootstrap(ctx), tpl),
  };

  for (const [rel, body] of Object.entries(exampleHeroFiles(ctx))) {
    files[`blockstudio/${rel}`] = renderTemplate(body, tpl);
  }

  return {
    files,
    dirs: ["blockstudio", BRIDGE_DIR],
    deps: {},
    devDeps: {},
    composerPatches: {
      require: {
        "blockstudio/blockstudio": "^7.3",
      },
      autoload: {
        files: [REGISTER_FILE],
      },
    },
  };
}

export const descriptor = {
  id: "blocks",
  feature: "blocks",
  owns: [
    "blockstudio.json",
    "blockstudio/**",
    "src/Modules/Blocks/**",
    REGISTER_FILE,
  ],
  run,
};
