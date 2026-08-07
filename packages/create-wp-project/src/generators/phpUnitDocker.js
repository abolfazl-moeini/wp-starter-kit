/**
 * @wpdev/create-wp-project — phpUnitDocker generator.
 *
 * When `phpUnitDocker:on` (and phpTest=phpunit via normalizeFeatureSet),
 * scaffolds `tests/docker-phpunit/` using the wordpress-plugin-unit-tests
 * Docker PHPUnit layout (Compose PHP + MySQL, bind-mounted plugin).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { resolveEngineSrcDir } from "../resolve-kit-paths.js";
import { wordpressPhpImage } from "../sync-php-min.js";

const TEMPLATE_DIR = "generators/templates/docker-phpunit";
const OUT_PREFIX = "tests/docker-phpunit/";

/**
 * @returns {string}
 */
function templateRoot() {
  return path.join(resolveEngineSrcDir(), TEMPLATE_DIR);
}

/**
 * @param {string} slug
 * @param {string} phpMin
 * @returns {Record<string, string>}
 */
function loadDockerPhpunitFiles(slug, phpMin) {
  const root = templateRoot();
  if (!existsSync(root)) {
    throw new Error(
      `phpUnitDocker templates missing at ${root} — expected under packages/create-wp-project/src/${TEMPLATE_DIR}`,
    );
  }

  const phpImage = wordpressPhpImage(phpMin || "8.1");

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
      let body = readFileSync(full, "utf8");
      body = body.replaceAll("{{slug}}", slug || "my-plugin");
      body = body.replaceAll("{{phpImage}}", phpImage);
      body = body.replaceAll("wordpress:php8.1-apache", phpImage);
      files[`${OUT_PREFIX}${childRel}`] = body;
    }
  }
  return files;
}

/**
 * @param {object} ctx
 */
export function run(ctx) {
  if (ctx.features.phpUnitDocker !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  // Defensive: generator only runs when feature is on; normalize should
  // already clear this when phpTest !== phpunit.
  if (ctx.features.phpTest !== "phpunit") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

  const tpl = ctx.vars || { ...ctx.answers, ...(ctx.cfg || {}) };
  const slug = tpl.slug || ctx.answers?.slug || "my-plugin";
  const phpMin =
    ctx.features.phpMinVersion ||
    tpl.phpMinVersion ||
    ctx.cfg?.phpMinVersion ||
    "7.4";
  const files = loadDockerPhpunitFiles(slug, phpMin);

  return {
    files,
    dirs: ["tests/docker-phpunit"],
    deps: {},
    devDeps: {},
    composerPatches: {
      scripts: {
        "test:docker": "bash tests/docker-phpunit/run-phpunit.sh",
      },
    },
  };
}

export const descriptor = {
  id: "phpUnitDocker",
  feature: "phpUnitDocker",
  owns: ["tests/docker-phpunit/**"],
  run,
};
