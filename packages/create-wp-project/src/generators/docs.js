/**
 * @wpdev/create-wp-project — docs generator.
 *
 * Scaffolds In-Repo Docs-as-Code architecture:
 *   - docs/user-guide/01-introduction.md
 *   - docs/user-guide/02-settings-overview.md
 *   - docs/technical/architecture.md
 *   - docs/assets/.gitkeep
 *   - docs/templates/feature-manual.md
 *   - tools/build-docs.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { renderTemplate } from "./_templates.js";
import { resolveEngineSrcDir } from "../resolve-kit-paths.js";

function loadDocsTemplate(relPath) {
  const full = path.join(resolveEngineSrcDir(), "templates", "docs", relPath);
  if (!existsSync(full)) {
    throw new Error(`Docs template missing at ${full}`);
  }
  return readFileSync(full, "utf8");
}

export function run(ctx) {
  if (ctx.features.docs === "off") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

  const tpl = ctx.vars || { ...ctx.answers, ...(ctx.cfg || {}) };
  const files = {
    "docs/user-guide/01-introduction.md": renderTemplate(
      loadDocsTemplate("user-guide/01-introduction.md.tpl"),
      tpl,
    ),
    "docs/user-guide/02-settings-overview.md": renderTemplate(
      loadDocsTemplate("user-guide/02-settings-overview.md.tpl"),
      tpl,
    ),
    "docs/technical/architecture.md": renderTemplate(
      loadDocsTemplate("technical/architecture.md.tpl"),
      tpl,
    ),
    "docs/templates/feature-manual.md": renderTemplate(
      loadDocsTemplate("templates/feature-manual.md.tpl"),
      tpl,
    ),
    "docs/assets/.gitkeep": "# docs/assets placeholder\n",
    "tools/build-docs.mjs": loadDocsTemplate("tools/build-docs.mjs"),
    "tools/scan-admin-panels.mjs": loadDocsTemplate(
      "tools/scan-admin-panels.mjs",
    ),
  };

  const dirs = [
    "docs",
    "docs/user-guide",
    "docs/technical",
    "docs/assets",
    "docs/templates",
    "tools",
  ];

  return {
    files,
    dirs,
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "docs",
  feature: "docs",
  owns: [
    "docs/user-guide/01-introduction.md",
    "docs/user-guide/02-settings-overview.md",
    "docs/technical/architecture.md",
    "docs/assets/.gitkeep",
    "docs/templates/feature-manual.md",
    "tools/build-docs.mjs",
    "tools/scan-admin-panels.mjs",
  ],
  run,
};
