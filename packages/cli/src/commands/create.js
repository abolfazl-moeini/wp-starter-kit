/**
 * `wpsk create` — scaffold a new wp-starter-kit plugin.
 *
 * Phase I1: stub. Phase I3 wires the real engine call
 * (`engine.scaffoldProject(dir, answers, { features })`) plus the
 * `runOptions` post-gen actions (install, git).
 *
 * Signature is fixed by the plan; keep it stable so tests can wire
 * fakes.
 *
 * @param {object} opts
 * @param {string} [opts.slug]  optional positional (sanitized inside)
 * @param {string} [opts.dir]   output directory (overrides slug)
 * @param {boolean} [opts.yes]  non-interactive
 * @param {boolean} [opts.install]
 * @param {boolean} [opts.git]
 * @param {boolean} [opts.force]
 * @param {boolean} [opts.verbose]
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function runCreate(_opts) {
  throw new Error("wpsk create: not implemented (Phase I3)");
}
