/**
 * @wpdev/create-wp-project — e2eTest generator.
 *
 * When `e2eTest:playwright`, scaffolds wp-env + Playwright using the
 * official WordPress stack (@wordpress/e2e-test-utils-playwright).
 * npm scripts live in packageJsonForAnswers(); this generator only
 * ships owned config/spec files + Playwright-related devDeps.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { resolveEngineSrcDir } from "../resolve-kit-paths.js";

const TEMPLATE_DIR = "generators/templates/e2e";

/**
 * @returns {string}
 */
function templateRoot() {
  return path.join(resolveEngineSrcDir(), TEMPLATE_DIR);
}

/**
 * @param {string} slug
 * @param {string} pluginName
 * @returns {Record<string, string>}
 */
function loadE2eFiles(slug, pluginName) {
  const root = templateRoot();
  if (!existsSync(root)) {
    throw new Error(
      `e2eTest templates missing at ${root} — expected under packages/create-wp-project/src/${TEMPLATE_DIR}`,
    );
  }

  /** @type {Record<string, string>} */
  const files = {};
  const stack = [""];
  while (stack.length) {
    const rel = stack.pop();
    const dir = rel ? path.join(root, rel) : root;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      const full = path.join(root, childRel);
      if (entry.isDirectory()) {
        stack.push(childRel);
        continue;
      }
      if (!entry.isFile()) continue;
      if (entry.name === "README.md") continue;
      if (entry.name === ".DS_Store" || entry.name === "Thumbs.db") continue;
      let body = readFileSync(full, "utf8");
      body = body.replaceAll("{{slug}}", slug || "my-plugin");
      body = body.replaceAll(
        "{{pluginName}}",
        pluginName || slug || "My Plugin",
      );
      files[childRel] = body;
    }
  }
  return files;
}

/**
 * @param {object} ctx
 */
export function run(ctx) {
  if (ctx.features.e2eTest !== "playwright") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

  const tpl = ctx.vars || { ...ctx.answers, ...(ctx.cfg || {}) };
  const slug = tpl.slug || ctx.answers?.slug || "my-plugin";
  const pluginName =
    tpl.pluginName ||
    ctx.answers?.pluginName ||
    slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const files = loadE2eFiles(slug, pluginName);

  return {
    files,
    dirs: ["tests/e2e"],
    deps: {},
    devDeps: {
      "@playwright/test": "^1.58.2",
      "@wordpress/e2e-test-utils-playwright": "^1.41.0",
      "@wordpress/env": "^10.39.0",
      "@wordpress/scripts": "^30.0.0",
    },
  };
}

export const descriptor = {
  id: "e2eTest",
  feature: "e2eTest",
  owns: [".wp-env.json", "playwright.config.js", "tests/e2e/**"],
  run,
};
