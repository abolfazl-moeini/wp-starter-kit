/**
 * @wpdev/create-wp-project — husky generator (Phase 21).
 *
 * Husky is the git hook installer. The generator emits
 * `.husky/pre-commit` (lint-staged + related tests) and
 * `.husky/commit-msg` (commitlint) when the feature is on.
 * The `package.json` `prepare: "husky"` script is core's
 * responsibility (it ships with the full package.json the core
 * generator emits when js !== none).
 *
 * This generator early-returns when the feature is off — the
 * registry gate already filters it out, but the early-return
 * is a defence in depth for the case where the generator is
 * invoked directly (Phase 22's `addFeature` may run a single
 * generator in isolation).
 */

import {
  TEMPLATE_COMMITLINT_CONFIG,
  TEMPLATE_HUSKY_COMMIT_MSG,
  TEMPLATE_HUSKY_PRE_COMMIT,
} from "./_templates.js";

export function run(ctx) {
  if (ctx.features.husky !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  return {
    files: {
      ".husky/pre-commit": TEMPLATE_HUSKY_PRE_COMMIT,
      ".husky/commit-msg": TEMPLATE_HUSKY_COMMIT_MSG,
      "commitlint.config.cjs": TEMPLATE_COMMITLINT_CONFIG,
    },
    dirs: [".husky"],
    deps: {},
    devDeps: {
      husky: "^9.0.0",
      "lint-staged": "^15.0.0",
      "@commitlint/cli": "^19.8.1",
      "@commitlint/config-conventional": "^19.8.1",
    },
  };
}

export const descriptor = {
  id: "husky",
  feature: "husky",
  owns: [".husky/pre-commit", ".husky/commit-msg", "commitlint.config.cjs"],
  run,
};
