/**
 * `wpsk update` — plan (default) or apply (with --run) a kit upgrade
 * for the current project.
 *
 * Phase I1: stub. Phase I5 wires `engine.planUpdate` / `runMigrations`.
 *
 * @param {object} opts
 * @param {boolean} [opts.run]   actually apply the migrations
 * @param {string}  [opts.to]    target kit version
 * @param {boolean} [opts.yes]
 * @param {boolean} [opts.verbose]
 */
export async function runUpdate(_opts) {
  throw new Error("wpsk update: not implemented (Phase I5)");
}
