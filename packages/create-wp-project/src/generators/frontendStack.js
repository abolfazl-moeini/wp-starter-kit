/**
 * @wpdev/create-wp-project — frontendStack generator.
 *
 * Copies self-contained Polaris Stack source into generated projects.
 */

import { polarisDemoEntry, polarisFiles } from "./_polaris-template.js";

const POLARIS_DIR = "src/polaris";
const DEMO_DIR = "src/Modules/PolarisDemo";

/**
 * @param {import("./index.js").GeneratorContext} ctx
 */
export function run(ctx) {
  if (ctx.features["frontendStack"] !== "polaris") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

  /** @type {Record<string, string>} */
  const files = {};
  for (const [rel, body] of Object.entries(polarisFiles(ctx))) {
    files[`${POLARIS_DIR}/${rel}`] = body;
  }
  files[`${DEMO_DIR}/assets/entries/admin.ts`] = polarisDemoEntry(ctx);

  return {
    files,
    dirs: [POLARIS_DIR, `${DEMO_DIR}/assets/entries`],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "frontendStack",
  feature: "frontendStack",
  owns: ["src/polaris/**", "src/Modules/PolarisDemo/**"],
  run,
};
