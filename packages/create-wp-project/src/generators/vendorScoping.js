/**
 * @wpsk/create-wp-project — vendorScoping generator (Phase 21).
 *
 * Strauss vendor scoping for distributed plugins. When this
 * feature is on, the consumer's `strauss.json` is emitted
 * WITHOUT the `"WPSK"` namespace in `exclude_from_prefix` —
 * per plan §0.4.1 (Strauss scopes the framework under the
 * consumer's vendor prefix at release time, so the WPSK
 * exclusion that protects the kit's local src/Core copies
 * is no longer correct once the framework lives in
 * `vendor/wpsk/framework`).
 *
 * IMPORTANT: the core generator's `TEMPLATE_STRAUSS_JSON`
 * keeps the WPSK exclusion (the kit's own root config still
 * needs it; Phase 23 lands the deps-mode default for the
 * scaffold). Phase 23+ defaults to `distMode: deps` with
 * `wpsk/framework` as a Composer dependency. Core writes
 * `composer.json` `extra/strauss` (the config Strauss reads);
 * this generator also emits a standalone `strauss.json` mirror
 * for human reference. refreshGlue keeps both in sync when
 * vendorScoping toggles.
 */

import { renderTemplate } from "./_templates.js";
import { TEMPLATE_STRAUSS_JSON_NO_WPSK_EXCLUSION } from "./_templates.js";

export function run(ctx) {
  if (ctx.features.vendorScoping !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  const tpl = ctx.vars || { ...ctx.answers, ...(ctx.cfg || {}) };
  return {
    files: {
      "strauss.json": renderTemplate(
        TEMPLATE_STRAUSS_JSON_NO_WPSK_EXCLUSION,
        tpl,
      ),
    },
    dirs: [],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "vendorScoping",
  feature: "vendorScoping",
  owns: ["strauss.json"],
  run,
};
