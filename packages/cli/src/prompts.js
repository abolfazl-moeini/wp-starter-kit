/**
 * `prompts.js` — interactive question orchestration on top of
 * `@clack/prompts`. Two exports:
 *  - `buildPromptPlan(currentFeatures, engine)` — pure, returns an
 *    ordered list of question descriptors. Each descriptor has
 *    `{ id, type, message, options?, target, when }` and is
 *    consumed by `runPrompts`.
 *  - `runPrompts(plan, ui, prefill)` — drives the plan; returns
 *    `{ answers, features, runOptions }` containing only the keys
 *    actually asked about.
 *
 * Conditional rules (plan.installer.md I2.5):
 *  - Skip JS sub-questions (`jsLib`, `jsTest`) when `js:none`.
 *  - Skip `css` when `js:none`.
 *  - Ask `blocks` independently (Blockstudio is PHP-first).
 *  - Skip `faultTolerance` when `phpMinVersion < 8.1`.
 *  - Branding questions always come first.
 *  - Preset short-circuit: when `preset` is not `custom`, no
 *    per-feature prompts are asked (the preset fills them).
 *  - The `when()` function receives the running answer/feature set
 *    so we can react to choices made earlier in the plan.
 */

import { getFeatureCatalog } from "@wpsk/create-wp-project";

/* -------------------------------------------------------------------- */
/* Branding questions (always first; asked before features)              */
/* -------------------------------------------------------------------- */

const BRANDING_QUESTIONS = [
  {
    id: "slug",
    type: "text",
    target: "answers",
    message: "Project name (slug)",
    placeholder: "my-plugin",
    validate: (s) =>
      typeof s === "string" && /^[a-z0-9][a-z0-9-]*$/.test(s) && s.length > 0
        ? undefined
        : "slug must be lowercase kebab-case (a-z, 0-9, dashes)",
  },
  {
    id: "npmScope",
    type: "text",
    target: "answers",
    message: "npm scope (no @)",
    placeholder: "myorg",
    validate: (s) =>
      typeof s === "string" && /^[a-z0-9][a-z0-9-]*$/.test(s)
        ? undefined
        : "npm scope must be lowercase kebab-case (no @)",
  },
  {
    id: "globalName",
    type: "text",
    target: "answers",
    message: "Global JS name",
    placeholder: "MyPlugin",
    validate: (s) =>
      typeof s === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/.test(s)
        ? undefined
        : "global name must be a valid JS identifier",
  },
  {
    id: "textDomain",
    type: "text",
    target: "answers",
    message: "Text domain",
    placeholder: "my-plugin",
  },
  {
    id: "hookPrefix",
    type: "text",
    target: "answers",
    message: "Hook prefix",
    placeholder: "my-plugin",
  },
  {
    id: "phpFunctionPrefix",
    type: "text",
    target: "answers",
    message: "PHP function prefix (must end with _)",
    placeholder: "myprj_",
    validate: (s) =>
      typeof s === "string" && /^[a-z][a-z0-9_]*_$/.test(s)
        ? undefined
        : "PHP function prefix must end with an underscore",
  },
];

/* -------------------------------------------------------------------- */
/* Feature-to-prompt mapping                                             */
/* -------------------------------------------------------------------- */

/**
 * Translate a feature id into a question descriptor. Variants are
 * rendered as `{ label, value }` pairs for clack's `select`.
 */
function featureQuestion(feature) {
  // On/off features: use a confirm-style yes/no. We model them as
  // a select so the value strings match the catalog ("on" / "off")
  // without a translation step.
  if (
    feature.variants.length === 2 &&
    feature.variants.includes("on") &&
    feature.variants.includes("off")
  ) {
    return {
      id: feature.id,
      type: "select",
      target: "features",
      message: feature.question,
      options: [
        { label: "Yes", value: "on" },
        { label: "No", value: "off" },
      ],
      initialValue: feature.default,
    };
  }
  return {
    id: feature.id,
    type: "select",
    target: "features",
    message: feature.question,
    options: feature.variants.map((v) => ({
      label: v,
      value: v,
    })),
    initialValue: feature.default,
  };
}

/* -------------------------------------------------------------------- */
/* Conditional logic (I2.5)                                              */
/* -------------------------------------------------------------------- */

/**
 * Should the JS sub-questions (`jsLib`, `jsTest`, `css`) be asked?
 * The plan says: hide them when `js:none`.
 */
function needsJsSubQuestions(state) {
  return state.features.js && state.features.js !== "none";
}

/**
 * Should `faultTolerance` be asked? The plan says: hide it when
 * `phpMinVersion < 8.1`.
 */
const PHP_MIN_ORDER = ["7.4", "8.0", "8.1", "8.2", "8.3"];
function canAskFaultTolerance(state) {
  const idx = PHP_MIN_ORDER.indexOf(state.features.phpMinVersion);
  // Unknown / unset → assume 7.4 (most conservative).
  return idx >= PHP_MIN_ORDER.indexOf("8.1");
}

/**
 * Build the ordered list of question descriptors.
 *
 * @param {Record<string,string>} currentFeatures
 *   The features known so far (from flags + preset). Used to
 *   pre-skip questions that would be no-ops.
 * @param {object} [engine]  optional engine injection. Defaults to
 *   the engine stub.
 * @returns {Array<object>}  ordered question descriptors
 */
export function buildPromptPlan(currentFeatures, engine) {
  const eng = engine || { getFeatureCatalog };
  const catalog = eng.getFeatureCatalog();
  const preset = (currentFeatures && currentFeatures.__preset) || "custom";

  // Preset short-circuit (I2.6): when the user already chose a
  // preset (--preset=full etc.), no per-feature prompts are asked.
  // We still ask branding questions because the preset does not
  // pin them.
  const skipFeatures = preset && preset !== "custom";

  const plan = [];

  // 1. Branding always first.
  for (const q of BRANDING_QUESTIONS) {
    plan.push({ ...q, when: () => true });
  }

  if (skipFeatures) {
    return plan;
  }

  // 2. JS feature first so its variants gate the rest.
  const js = catalog.find((f) => f.id === "js");
  if (js) {
    plan.push({
      ...featureQuestion(js),
      when: () => true,
    });
  }

  // 3. JS sub-features. Each `when` re-checks state.features.js.
  for (const id of ["jsLib", "jsTest", "css"]) {
    const f = catalog.find((x) => x.id === id);
    if (!f) continue;
    plan.push({
      ...featureQuestion(f),
      when: (s) => {
        // Update the running state with the latest `js` choice
        // (the prompt loop will populate s.features before
        // evaluating `when`).
        return needsJsSubQuestions(s);
      },
    });

    if (id === "jsLib") {
      plan.push({
        id: "frontendStack",
        type: "select",
        target: "features",
        message: "Frontend structure?",
        options: [
          { label: "None", value: "none" },
          { label: "Polaris Stack", value: "polaris" },
        ],
        initialValue: "none",
        when: (s) =>
          s.features.js === "typescript" &&
          (s.features.jsLib === "react" || s.features.jsLib === "preact"),
      });
    }
  }

  // 4. PHP features. Order matches plan.installer.md §1.1 UX.
  for (const id of ["phpMinVersion", "phpSourceVersion", "phpFramework"]) {
    const f = catalog.find((x) => x.id === id);
    if (!f) continue;
    plan.push({ ...featureQuestion(f), when: () => true });
  }

  plan.push({
    id: "mcpAbilities",
    type: "select",
    target: "features",
    message: "WordPress Abilities API (MCP)?",
    options: [
      { label: "No", value: "off" },
      { label: "Yes", value: "on" },
    ],
    initialValue: "off",
    when: () => true,
  });

  plan.push({
    id: "blocks",
    type: "select",
    target: "features",
    message: "Gutenberg blocks (Blockstudio)?",
    options: [
      { label: "No", value: "off" },
      { label: "Yes", value: "on" },
    ],
    initialValue: "off",
    when: () => true,
  });

  for (const id of [
    "phpTest",
    "license",
    "wpMinVersion",
    "restBatch",
    "faultTolerance",
    "vendorScoping",
    "husky",
    "exampleFeature",
    "i18n",
  ]) {
    const f = catalog.find((x) => x.id === id);
    if (!f) continue;
    if (id === "faultTolerance") {
      plan.push({
        ...featureQuestion(f),
        when: (s) => canAskFaultTolerance(s),
      });
    } else {
      plan.push({ ...featureQuestion(f), when: () => true });
    }
  }

  return plan;
}

/* -------------------------------------------------------------------- */
/* runPrompts — drives the plan and returns collected values            */
/* -------------------------------------------------------------------- */

/**
 * @param {Array<object>} plan
 * @param {object} ui  the clack wrapper (default ui.js)
 * @param {object} [prefill]  pre-populated values to short-circuit
 *   questions (e.g. answers from the positional/--slug flag)
 * @returns {Promise<{answers: object, features: object, runOptions: object}>}
 */
export async function runPrompts(plan, ui, prefill) {
  const u = ui || (await import("./ui.js")).default;
  const prefilled = prefill || {};

  const collected = {
    answers: { ...(prefilled.answers || {}) },
    features: {},
    runOptions: {},
  };

  for (const q of plan) {
    // Pre-filled: skip the prompt entirely.
    if (q.target === "answers" && collected.answers[q.id] !== undefined) {
      continue;
    }
    if (q.target === "features" && collected.features[q.id] !== undefined) {
      continue;
    }

    // Conditional: ask `when()` if the plan says so.
    if (typeof q.when === "function" && !q.when(collected)) {
      continue;
    }

    let value;
    if (q.type === "text") {
      value = await u.text({
        message: q.message,
        placeholder: q.placeholder,
        validate: q.validate,
      });
    } else if (q.type === "select") {
      value = await u.select({
        message: q.message,
        options: q.options,
        initialValue: q.initialValue,
      });
    } else if (q.type === "confirm") {
      value = await u.confirm({ message: q.message });
    } else {
      throw new Error("runPrompts: unknown question type: " + q.type);
    }

    // Cancel = user pressed Ctrl-C. clack returns `undefined` (or
    // a symbol in newer versions). Treat any non-string as a
    // graceful abort.
    if (value === undefined || value === null) {
      const err = new Error("user cancelled");
      err.code = "WPSK_USER_CANCELLED";
      throw err;
    }

    if (q.target === "answers") collected.answers[q.id] = value;
    else if (q.target === "features") collected.features[q.id] = value;
    else if (q.target === "runOptions") collected.runOptions[q.id] = value;
  }

  return collected;
}
