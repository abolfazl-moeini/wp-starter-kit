/**
 * @wpdev/create-wp-project — mcpAbilities generator.
 *
 * When mcpAbilities=on, copies the self-contained wp-mcp-integration
 * library into src/Mcp/ and emits a kit bridge module plus an early
 * plugins_loaded registration bootstrap.
 */

import { renderTemplate } from "./_templates.js";
import {
  mcpLibraryFiles,
  mcpBridgeModule,
  mcpRegisterBootstrap,
} from "./_mcp-template.js";

const LIB_DIR = "src/Mcp";
const BRIDGE_DIR = "src/Modules/McpAbilities";
const REGISTER_FILE = "src/mcp-abilities-register.php";

export function run(ctx) {
  if (ctx.features.mcpAbilities !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  const tpl = ctx.vars || { ...ctx.answers, ...(ctx.cfg || {}) };

  const files = {};
  for (const [rel, body] of Object.entries(mcpLibraryFiles(ctx))) {
    files[`${LIB_DIR}/${rel}`] = body;
  }
  files[`${BRIDGE_DIR}/Module.php`] = renderTemplate(mcpBridgeModule(ctx), tpl);
  files[REGISTER_FILE] = renderTemplate(mcpRegisterBootstrap(ctx), tpl);

  return {
    files,
    dirs: [LIB_DIR, BRIDGE_DIR],
    deps: {},
    devDeps: {},
    composerPatches: {
      autoload: {
        "psr-4": {
          "WPDev\\MCP\\": "src/Mcp/",
        },
        files: [REGISTER_FILE],
      },
    },
  };
}

export const descriptor = {
  id: "mcpAbilities",
  feature: "mcpAbilities",
  owns: ["src/Mcp/**", "src/Modules/McpAbilities/**", REGISTER_FILE],
  run,
};
