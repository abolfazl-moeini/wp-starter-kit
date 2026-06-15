/**
 * `wpsk add <feature>` — add a feature to an existing project.
 *
 * Phase I1: stub. Phase I4 wires `engine.addFeature(dir, id, variant)`.
 *
 * @param {object} opts
 * @param {string} opts.feature  required feature id from the catalog
 * @param {string} [opts.variant]  optional variant override
 * @param {boolean} [opts.yes]   non-interactive
 * @param {boolean} [opts.install]  re-run npm/composer install after
 * @param {boolean} [opts.verbose]
 */
export async function runAdd(_opts) {
  throw new Error("wpsk add: not implemented (Phase I4)");
}
