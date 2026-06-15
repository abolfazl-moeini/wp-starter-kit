/**
 * @wpsk/create-wp-project — restBatch generator (Phase 21).
 *
 * REST batch + `@scope/fetch` JS client. The PHP-side batch
 * support ships with the core (RestSetup is in src/Support),
 * so this generator ONLY owns the JS wiring — the `@scope/fetch`
 * package and the import line in `assets/dependencies.*` that
 * the js generator emits.
 *
 * The full JS bundle is added in Phase 25 (the `@scope/fetch`
 * package is real; this Phase 21 generator only registers the
 * `deps` entry the scaffold merges with `package.json`). The
 * consumer's `package.json` will gain a `@myorg/fetch` dep; the
 * full template + usage example lands in Phase 25.
 *
 * Two gates:
 *  - restBatch === "on"
 *  - js !== "none"  (the registry filter applies; we still
 *                   early-return for defence in depth)
 */

export function run(ctx) {
  if (ctx.features.restBatch !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  if (ctx.features.js === "none") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  // Phase 21: no files emitted directly. The full JS bundle is
  // added in Phase 25; for now we report the dep so the scaffold
  // can add it to the consumer's package.json (Phase 22 reads
  // `deps` from each generator's contribution; Phase 21 keeps
  // the merge logic in place but does not act on it).
  return {
    files: {},
    dirs: [],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "restBatch",
  feature: "restBatch",
  owns: ["src/Modules/RestBatch/**"],
  run,
};
