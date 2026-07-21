/**
 * @wpdev/create-wp-project — frontendStack generator.
 *
 * Copies self-contained Polaris Stack source into generated projects and
 * scaffolds a frontend shortcode demo via framework ShortcodesSetup.
 */

import { renderTemplate } from "./_templates.js";
import {
  polarisDemoViewEntry,
  polarisFiles,
  POLARIS_DEMO_MODULE_PHP,
  POLARIS_DEMO_REGISTER_PHP,
  POLARIS_DEMO_SHORTCODE_PHP,
} from "./_polaris-template.js";

const POLARIS_DIR = "src/polaris";
const DEMO_DIR = "src/Modules/PolarisDemo";
const REGISTER_FILE = "src/polaris-demo-register.php";

/**
 * @param {import("./index.js").GeneratorContext} ctx
 */
export function run(ctx) {
  if (ctx.features["frontendStack"] !== "polaris") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

  const answers = ctx.answers || {};
  const cfg = ctx.cfg || {};
  const slug = answers.slug || cfg.slug || "my-plugin";
  const slug_underscore = String(slug).replace(/-/g, "_");
  const slug_constant = slug_underscore.toUpperCase();
  const vendor =
    ctx.vars?.vendor || answers.globalName || cfg.globalName || "WPDev";
  const frameworkNamespace =
    ctx.vars?.frameworkNamespace || "WPDev";
  const textDomain = answers.textDomain || cfg.textDomain || slug;

  const tpl = {
    ...answers,
    ...cfg,
    ...(ctx.vars || {}),
    slug,
    slug_underscore,
    slug_constant,
    vendor,
    frameworkNamespace,
    textDomain,
  };

  /** @type {Record<string, string>} */
  const files = {};
  for (const [rel, body] of Object.entries(polarisFiles(ctx))) {
    files[`${POLARIS_DIR}/${rel}`] = body;
  }

  files[`${DEMO_DIR}/Module.php`] = renderTemplate(POLARIS_DEMO_MODULE_PHP, tpl);
  files[`${DEMO_DIR}/Shortcodes/DemoShortcode.php`] = renderTemplate(
    POLARIS_DEMO_SHORTCODE_PHP,
    tpl,
  );
  files[`${DEMO_DIR}/assets/entries/view.ts`] = polarisDemoViewEntry(ctx);
  files[REGISTER_FILE] = renderTemplate(POLARIS_DEMO_REGISTER_PHP, tpl);

  return {
    files,
    dirs: [
      POLARIS_DIR,
      DEMO_DIR,
      `${DEMO_DIR}/Shortcodes`,
      `${DEMO_DIR}/assets/entries`,
    ],
    deps: {},
    devDeps: {},
    composerPatches: {
      autoload: {
        files: [REGISTER_FILE],
      },
    },
  };
}

export const descriptor = {
  id: "frontendStack",
  feature: "frontendStack",
  owns: [
    "src/polaris/**",
    "src/Modules/PolarisDemo/**",
    REGISTER_FILE,
  ],
  run,
};
