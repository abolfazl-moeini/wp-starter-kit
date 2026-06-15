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
 * scaffold). The Phase 21 release mode is `distMode: vendored`,
 * so the consumer scaffold still ships src/Core locally and
 * still excludes WPSK from prefixing to scope correctly. The
 * vendorScoping generator's `run()` overrides that with the
 * exclusion-free version so a consumer who turns vendorScoping
 * ON gets the right config for their build.
 *
 * When vendorScoping is OFF, the consumer relies on the core
 * template (with the WPSK exclusion). That's the BC behaviour:
 * the legacy scaffold always emitted the WPSK-excluding
 * strauss.json.
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
