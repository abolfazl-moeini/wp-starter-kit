/**
 * @wpsk/create-wp-project — husky generator (Phase 21).
 *
 * Husky is the git pre-commit hook installer. The generator
 * emits `.husky/pre-commit` (a shell script that runs
 * `npx lint-staged`) when the feature is on. The `package.json`
 * `prepare: "husky install"` script is core's responsibility
 * (it ships with the full package.json the core generator
 * emits when js !== none).
 *
 * This generator early-returns when the feature is off — the
 * registry gate already filters it out, but the early-return
 * is a defence in depth for the case where the generator is
 * invoked directly (Phase 22's `addFeature` may run a single
 * generator in isolation).
 */

import { renderTemplate } from "./_templates.js";
import { TEMPLATE_HUSKY_PRE_COMMIT } from "./_templates.js";

export function run(ctx) {
  if (ctx.features.husky !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  return {
    files: {
      ".husky/pre-commit": TEMPLATE_HUSKY_PRE_COMMIT,
    },
    dirs: [".husky"],
    deps: {},
    devDeps: {
      husky: "^9.0.0",
      "lint-staged": "^15.0.0",
    },
  };
}

export const descriptor = {
  id: "husky",
  feature: "husky",
  owns: [".husky/pre-commit"],
  run,
};
