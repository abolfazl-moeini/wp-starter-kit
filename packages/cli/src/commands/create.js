/**
 * `wpsk create` — scaffold a new wp-starter-kit plugin.
 *
 * Phase I1/I2: the create command wires `gatherInputs` to turn
 * argv into a validated `{ answers, features, runOptions }`. The
 * actual `engine.scaffoldProject` call (Phase I3) is still a stub.
 *
 * Signature is fixed by the plan; keep it stable so tests can wire
 * fakes. The `argv` tail comes from `main.js` which extracts
 * everything after the subcommand name.
 *
 * @param {object} opts
 * @param {string} [opts.slug]   optional positional (sanitized by
 *                               gatherInputs)
 * @param {string[]} [opts.argv] raw tail (flags + positionals)
 *                               forwarded from main.js
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function runCreate(opts) {
  const o = opts || {};
  // Phase I3 will hand the resolved { answers, features,
  // runOptions } to engine.scaffoldProject. For now we run the
  // gather pipeline (which exercises the validation gate, the
  // prompt plan, the --yes short-circuit, and the merge) and then
  // bail with the stub error so the user sees a clean message.
  const { gatherInputs } = await import("../gather.js");
  const resolved = await gatherInputs({ argv: o.argv || [] });

  // If a positional slug was passed via the command, it ends up in
  // resolved.answers.slug (or it stays undefined if the user
  // relied on --slug=).
  void resolved;
  throw new Error(
    "wpsk create: not implemented (Phase I3) — gather pipeline " +
      "ran successfully; engine call is pending",
  );
}
