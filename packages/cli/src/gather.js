/**
 * `gather.js` — the bridge between raw CLI input and the resolved
 * `{ answers, features, runOptions }` object the engine consumes.
 *
 * Two exports:
 *  - `mergeInputs(flags, prompted, defaults)` — pure, unit-tested.
 *  - `gatherInputs({ argv, interactive, engine, ui })` — the
 *    orchestrator that drives prompts, calls validation, and
 *    returns a fully-resolved input set.
 *
 * The pipeline (matches plan.installer.md I2.9):
 *   1. parseFlags(argv)           →  flag-derived answers/features/runOptions
 *   2. validateFeatureSet(flags)  →  fail-fast on invalid combos
 *   3. (if !--yes && missing) runPrompts(plan)  →  prompted values
 *   4. mergeInputs(flags, prompted, defaults) →  final resolved set
 *   5. validateFeatureSet(final) + validateAnswers(final)  →  last gate
 *
 * Phase I3: the default engine is the real one
 * (`@wpdev/create-wp-project`) — the engine-stub used during
 * I1/I2 has been deleted. Tests inject fakes through the
 * `engine` option; the bin wires the real engine.
 */

import { parseFlags } from "./flags.js";
import { buildPromptPlan, runPrompts } from "./prompts.js";
import * as realEngine from "@wpdev/create-wp-project";

/**
 * Pure merge. Precedence: flags > prompted > defaults.
 *
 * The `defaults` arg is the engine's `defaultFeatures()` (a
 * features-only object). The function lifts it to fill missing
 * feature keys but does NOT use it to fill `answers` or
 * `runOptions` — those have no engine-supplied defaults (the
 * pipeline builds them from `parseFlags` and prompts).
 *
 * @param {{answers?:object, features?:object, runOptions?:object}} flags
 * @param {{answers?:object, features?:object, runOptions?:object}} prompted
 * @param {Record<string,string>} defaults  engine's defaultFeatures()
 */
export function mergeInputs(flags, prompted, defaults) {
  const f = flags || {};
  const p = prompted || {};
  const d = defaults || {};

  // features: flag > prompt > default. The defaults object IS the
  // engine's feature map, so we start from there and override
  // upward.
  const features = { ...d, ...(p.features || {}), ...(f.features || {}) };

  // answers: flag > prompt. There are no engine defaults for
  // answers (they are user-supplied), so the merge is just two
  // levels.
  const answers = { ...(p.answers || {}), ...(f.answers || {}) };

  // runOptions: flag > prompt. Same logic as answers.
  const runOptions = { ...(p.runOptions || {}), ...(f.runOptions || {}) };

  return { answers, features, runOptions };
}

/**
 * The default engine surface used by `gatherInputs()`. Production
 * callers (Phase I3+) will inject a real engine via the `engine`
 * option. Tests inject a stub. The default is the real engine
 * (`@wpdev/create-wp-project`) — see plan §0.3.
 *
 * Phase I3 swapped the engine-stub for the real engine; this
 * function is the single source of truth for the default.
 */
function defaultEngine() {
  return realEngine;
}

/**
 * Orchestrate the gather pipeline.
 *
 * @param {object} opts
 * @param {string[]} opts.argv               raw argv tail (no `node wpdev`)
 * @param {boolean}  [opts.interactive=true]  set to false to skip prompts
 *                                           (overrides --yes inside the
 *                                           flag set)
 * @param {object}   [opts.engine]            injection: must export
 *                                           `defaultFeatures`,
 *                                           `validateFeatureSet`,
 *                                           `getFeatureCatalog`,
 *                                           `applyPreset`, `getPresets`.
 *                                           Defaults to engine-stub.
 * @param {object}   [opts.ui]                injection: clack wrapper.
 *                                           Defaults to `./ui.js`.
 * @returns {Promise<{
 *   answers: object,
 *   features: object,
 *   runOptions: object,
 *   preset: string|null,    // 'custom' | '<name>' | null
 *   validation: {ok: boolean, errors: object}
 * }>}
 */
export async function gatherInputs(opts) {
  const o = opts || {};
  if (!Array.isArray(o.argv)) {
    throw new TypeError("gatherInputs: opts.argv must be an array");
  }

  const engine = o.engine || (await defaultEngine());
  const ui = o.ui || (await import("./ui.js")).default;

  // 1. parseFlags
  const flagInput = parseFlags(o.argv);

  // 2. fail-fast validation of flag-derived features (no prompts yet).
  //    This is the I2.8 contract: an invalid combo (e.g. --fault-
  //    tolerance=on --php-min=7.4) errors before any prompt runs.
  //    The engine's real `validateFeatureSet` requires every
  //    catalog id to be present; the stub was lax. We layer the
  //    engine's defaults under the flag-derived set so a
  //    minimal flag set like `--yes --scope=acme` is still a
  //    valid (defaults-filled) feature set.
  const flagFeaturesMerged = {
    ...engine.defaultFeatures(),
    ...flagInput.features,
  };
  const flagValidation = engine.validateFeatureSet(
    flagFeaturesMerged,
    flagInput.answers,
  );
  if (!flagValidation.ok) {
    const err = new Error(
      "Invalid feature combination from flags: " +
        JSON.stringify(flagValidation.errors),
    );
    err.code = "WPDEV_INVALID_FLAG_COMBO";
    err.errors = flagValidation.errors;
    throw err;
  }

  // 3. Decide whether to prompt. --yes sets runOptions.interactive
  //    to false; the caller can also force non-interactive mode
  //    via the explicit `interactive: false` option.
  const wantPrompts =
    o.interactive !== false && flagInput.runOptions.interactive !== false;

  // Pre-apply a preset if one was passed via --preset=. Non-interactive
  // runs (--yes) default to "standard" when --preset is omitted (TASK-24c).
  let currentFeatures = flagInput.features;
  let presetName = flagInput.runOptions.preset || null;
  if (!presetName && !wantPrompts) {
    presetName = "standard";
  }
  if (presetName && presetName !== "custom") {
    currentFeatures = engine.applyPreset(presetName);
    // Flags still win — override the preset with anything the user
    // explicitly set on the command line.
    currentFeatures = { ...currentFeatures, ...flagInput.features };
  }

  let prompted = { answers: {}, features: {}, runOptions: {} };
  if (wantPrompts) {
    const plan = buildPromptPlan(currentFeatures, engine);
    // runPrompts(plan, ui) drives clack for every question whose
    // `when()` returns true. It returns the same {answers, features,
    // runOptions} shape with only the prompted keys filled.
    prompted = await runPrompts(plan, ui, { answers: flagInput.answers });
  }

  // 4. mergeInputs — flags > prompted > defaults (from the engine).
  //    When --preset= is set, the preset's feature map is the
  //    baseline instead of defaultFeatures() so non-interactive
  //    runs (--yes) honour the chosen preset.
  const featureDefaults =
    presetName && presetName !== "custom"
      ? engine.applyPreset(presetName)
      : engine.defaultFeatures();
  const merged = mergeInputs(flagInput, prompted, featureDefaults);

  // 5. Final validation. Catches anything the prompt-derived set
  //    introduced (a bad combination the user picked at the
  //    terminal).
  const finalValidation = engine.validateFeatureSet(
    merged.features,
    merged.answers,
  );
  return {
    ...merged,
    preset: presetName,
    validation: finalValidation,
  };
}
