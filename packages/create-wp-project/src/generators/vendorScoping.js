/**
 * @wpdev/create-wp-project — vendorScoping generator (Phase 21).
 *
 * Strauss vendor scoping for distributed plugins. When enabled,
 * vendor prefixing is configured in composer.json extra/strauss.
 * (The standalone strauss.json file is no longer emitted.)
 */

export function run(ctx) {
  // ponytail: strauss.json was a human-mirror of composer.json extra/strauss.
  // Strauss reads extra/strauss directly; the standalone file is removed.
  if (ctx.features.vendorScoping !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  return { files: {}, dirs: [], deps: {}, devDeps: {} };
}

export const descriptor = {
  id: "vendorScoping",
  feature: "vendorScoping",
  owns: [],
  run,
};
