/**
 * @wpdev/create-wp-project — restBatch generator (Phase 21).
 *
 * REST batch PHP support ships with the core (RestSetup in framework).
 * The JS batch client lives in `@wpdev/rest-utils` (merged from `@wpdev/fetch`).
 * This generator is a no-op for files — `rest-utils` is always a core dep.
 */

export function run(ctx) {
  if (ctx.features.restBatch !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  if (ctx.features.js === "none") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

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