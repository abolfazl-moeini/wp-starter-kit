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

import { getFeatureCatalog, getPresets } from "@wpdev/create-wp-project";

import {
  deriveBrandingDefaults,
  fillDerivedBranding,
  needsGlobalNamePrompt,
  slugToPhpFunctionPrefix,
} from "./branding.js";
import {
  FALLBACK_PHP_SOURCE_VERSIONS,
  normalizePhpMinor,
  toPhpSourceVersionSelectOptions,
  validatePhpSourceVersionInput,
} from "./php-source-versions.js";

/* -------------------------------------------------------------------- */
/* Branding questions (always first; asked before features)              */
/* -------------------------------------------------------------------- */

/**
 * @param {{ slug: string, textDomain: string, globalName: string, phpFunctionPrefix: string, npmScope: string }} defaults
 * @param {object} [engine]
 * @returns {Array<object>}
 */
function buildBrandingQuestions(
  defaults,
  engine,
  buildTimePreset,
  phpSourceVersionOptions,
) {
  const d = defaults || deriveBrandingDefaults("my-plugin");
  const eng = engine || { getPresets, applyPreset: undefined };
  const phpOpts = phpSourceVersionOptions || {
    versions: [...FALLBACK_PHP_SOURCE_VERSIONS],
    defaultVersion: FALLBACK_PHP_SOURCE_VERSIONS[0] || "7.4",
    options: toPhpSourceVersionSelectOptions(FALLBACK_PHP_SOURCE_VERSIONS),
  };

  return [
    {
      id: "slug",
      type: "text",
      target: "answers",
      message: "Project name (slug)",
      placeholder: d.slug,
      defaultValue: d.slug,
      validate: (s) =>
        typeof s === "string" && /^[a-z0-9][a-z0-9-]*$/.test(s) && s.length > 0
          ? undefined
          : "slug must be lowercase kebab-case (a-z, 0-9, dashes)",
    },
    {
      id: "npmScope",
      type: "text",
      target: "answers",
      message: "npm scope (no @) — usually your brand or org name",
      placeholder: d.npmScope,
      defaultValue: d.npmScope,
      validate: (s) =>
        typeof s === "string" && /^[a-z0-9][a-z0-9-]*$/.test(s)
          ? undefined
          : "npm scope must be lowercase kebab-case (no @)",
    },
    {
      id: "globalName",
      type: "text",
      target: "answers",
      message:
        "Global JS name (window.* object exposed by script bundles; auto-filled for PHP-only)",
      placeholder: d.globalName,
      defaultValue: d.globalName,
      when: (s) => {
        if (
          buildTimePreset &&
          buildTimePreset !== "custom" &&
          typeof eng.applyPreset === "function"
        ) {
          const presetFeatures = eng.applyPreset(buildTimePreset);
          if (presetFeatures?.js === "none") return false;
        }
        return needsGlobalNamePrompt(s, eng);
      },
      validate: (s) =>
        typeof s === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/.test(s)
          ? undefined
          : "global name must be a valid JS identifier",
    },
    {
      id: "textDomain",
      type: "text",
      target: "answers",
      message: "Text domain (for translations)",
      placeholder: d.textDomain,
      defaultValue: d.textDomain,
    },
    {
      id: "phpFunctionPrefix",
      type: "text",
      target: "answers",
      message: "PHP function prefix (must end with _)",
      placeholder: (collected) =>
        slugToPhpFunctionPrefix(collected.answers.slug || d.slug),
      defaultValue: (collected) =>
        slugToPhpFunctionPrefix(collected.answers.slug || d.slug),
      validate: (s) =>
        typeof s === "string" && /^[a-z][a-z0-9_]*_$/.test(s)
          ? undefined
          : "PHP function prefix must end with an underscore",
    },
    {
      id: "phpSourceVersion",
      type: "select",
      target: "answers",
      message:
        "PHP version you write source code in (Rector downgrades on release)",
      options: phpOpts.options,
      initialValue: phpOpts.defaultVersion,
    },
  ];
}

/**
 * @param {object} q
 * @param {object} collected
 * @param {object} brandingDefaults
 * @returns {string|undefined}
 */
function resolveQuestionDefault(q, collected, brandingDefaults) {
  if (typeof q.defaultValue === "function") {
    return q.defaultValue(collected, brandingDefaults);
  }
  if (q.defaultValue !== undefined && q.defaultValue !== null) {
    return q.defaultValue;
  }
  return undefined;
}

/**
 * @param {object} q
 * @param {string|undefined} defaultValue
 * @returns {((value: string) => string|undefined)|undefined}
 */
function wrapTextValidate(q, defaultValue) {
  if (typeof q.validate !== "function") {
    return undefined;
  }
  return (raw) => {
    const value =
      raw === "" || raw === undefined || raw === null
        ? defaultValue || ""
        : raw;
    return q.validate(value);
  };
}

/** Human labels for catalog features (catalog rows use `notes`, not prompts). */
const FEATURE_QUESTIONS = {
  js: "Enable JavaScript?",
  jsLib: "UI library?",
  jsTest: "JS test runner?",
  css: "CSS toolchain?",
  phpMinVersion: "Minimum PHP version to support?",
  phpFramework: "Use WPDev Admin Framework?",
  phpTest: "PHP unit tests (PHPUnit)?",
  license: "License?",
  wpMinVersion: "Minimum WordPress version?",
  restBatch: "REST batch endpoint + client?",
  faultTolerance: "PHP fault-tolerance package?",
  vendorScoping: "Strauss vendor scoping on release?",
  husky: "Git pre-commit hooks (Husky)?",
  exampleFeature: "Include the ExampleFeature demo module?",
  i18n: "Translation pipeline?",
  blocks: "Gutenberg blocks (Blockstudio)?",
  mcpAbilities: "WordPress Abilities API (MCP)?",
  frontendStack: "Frontend structure?",
};

/* -------------------------------------------------------------------- */
/* Feature-to-prompt mapping                                             */
/* -------------------------------------------------------------------- */

/**
 * Translate a feature id into a question descriptor. Variants are
 * rendered as `{ label, value }` pairs for clack's `select`.
 */
function featureQuestion(feature) {
  const message =
    feature.question || FEATURE_QUESTIONS[feature.id] || feature.id;
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
      message,
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
    message,
    options: feature.variants.map((v) => ({
      label:
        feature.id === "phpFramework"
          ? v === "none"
            ? "No, stand-alone"
            : v === "wpdev"
              ? "Yes, companion-plugin model"
              : v
          : v,
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
 * @param {object} state
 * @param {Record<string,string>} [buildTimeFeatures]
 * @returns {string}
 */
function resolvePresetChoice(state, buildTimeFeatures) {
  if (state.runOptions?.preset) return state.runOptions.preset;
  if (buildTimeFeatures?.__preset) return buildTimeFeatures.__preset;
  return "custom";
}

/**
 * @param {object} state
 * @param {Record<string,string>} [buildTimeFeatures]
 * @returns {boolean}
 */
function presetIsCustom(state, buildTimeFeatures) {
  return resolvePresetChoice(state, buildTimeFeatures) === "custom";
}

/**
 * @param {object} state
 * @param {Record<string,string>} [buildTimeFeatures]
 * @returns {boolean}
 */
function presetIsMinimal(state, buildTimeFeatures) {
  return resolvePresetChoice(state, buildTimeFeatures) === "minimal";
}

/**
 * Minimal scaffolds still ask whether PHPUnit is wanted; every
 * other preset feature stays pinned by the preset map.
 *
 * @param {Array<object>} plan
 * @param {Array<object>} catalog
 * @param {Record<string,string>} buildTimeFeatures
 */
function appendMinimalExtraQuestions(plan, catalog, buildTimeFeatures) {
  const phpTest = catalog.find((f) => f.id === "phpTest");
  if (!phpTest) return;
  plan.push({
    id: "phpTest",
    type: "select",
    target: "features",
    message: FEATURE_QUESTIONS.phpTest,
    options: [
      { label: "Yes", value: "phpunit" },
      { label: "No", value: "none" },
    ],
    initialValue: phpTest.default || "phpunit",
    when: (s) => presetIsMinimal(s, buildTimeFeatures),
  });
}

/**
 * @param {object} engine
 * @returns {object}
 */
function buildPresetQuestion(engine) {
  const eng = engine || { getPresets };
  const presets =
    typeof eng.getPresets === "function" ? eng.getPresets() : getPresets();
  const options = presets.map((p) => ({
    label: `${p.id} — ${p.description}`,
    value: p.id,
  }));
  options.push({
    label: "Custom — choose features individually",
    value: "custom",
  });
  return {
    id: "preset",
    type: "select",
    target: "runOptions",
    message: "Choose a starter preset",
    options,
    initialValue: "standard",
  };
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
export function buildPromptPlan(currentFeatures, engine, options) {
  const eng = engine || {
    getFeatureCatalog,
    getPresets,
    applyPreset: undefined,
  };
  const opts = options || {};
  const brandingDefaults = deriveBrandingDefaults(
    opts.dirBasename || "my-plugin",
  );
  const phpSourceVersionOptions = opts.phpSourceVersionOptions;
  const catalog = eng.getFeatureCatalog();
  const buildTimePreset = (currentFeatures && currentFeatures.__preset) || null;
  const skipPresetQuestion = buildTimePreset && buildTimePreset !== "custom";
  const skipFeaturesAtBuild = buildTimePreset && buildTimePreset !== "custom";

  const wrapWhen = (originalWhen) => (s) => {
    if (!presetIsCustom(s, currentFeatures)) return false;
    if (typeof originalWhen === "function") return originalWhen(s);
    return true;
  };

  const plan = [];

  if (!skipPresetQuestion) {
    plan.push({ ...buildPresetQuestion(eng), when: () => true });
  }

  for (const q of buildBrandingQuestions(
    brandingDefaults,
    eng,
    buildTimePreset,
    phpSourceVersionOptions,
  )) {
    const baseWhen = typeof q.when === "function" ? q.when : () => true;
    plan.push({ ...q, when: (s) => baseWhen(s) });
  }

  appendMinimalExtraQuestions(plan, catalog, currentFeatures);

  if (skipFeaturesAtBuild) {
    return plan;
  }

  const js = catalog.find((f) => f.id === "js");
  if (js) {
    plan.push({
      ...featureQuestion(js),
      when: wrapWhen(() => true),
    });
  }

  for (const id of ["jsLib", "jsTest", "css"]) {
    const f = catalog.find((x) => x.id === id);
    if (!f) continue;
    plan.push({
      ...featureQuestion(f),
      when: wrapWhen((s) => needsJsSubQuestions(s)),
    });

    if (id === "jsLib") {
      const frontendStack = catalog.find((x) => x.id === "frontendStack");
      if (frontendStack) {
        plan.push({
          ...featureQuestion(frontendStack),
          when: wrapWhen(
            (s) =>
              s.features.js === "typescript" &&
              (s.features.jsLib === "react" || s.features.jsLib === "preact"),
          ),
        });
      }
    }
  }

  for (const id of ["phpMinVersion", "phpFramework"]) {
    const f = catalog.find((x) => x.id === id);
    if (!f) continue;
    plan.push({ ...featureQuestion(f), when: wrapWhen(() => true) });
  }

  for (const id of [
    "blocks",
    "mcpAbilities",
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
        when: wrapWhen((s) => canAskFaultTolerance(s)),
      });
    } else if (id === "restBatch") {
      plan.push({
        ...featureQuestion(f),
        when: wrapWhen((s) => needsJsSubQuestions(s)),
      });
    } else {
      plan.push({ ...featureQuestion(f), when: wrapWhen(() => true) });
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
  const brandingDefaults =
    prefilled.brandingDefaults ||
    deriveBrandingDefaults(prefilled.dirBasename || "my-plugin");

  const collected = {
    answers: { ...(prefilled.answers || {}) },
    features: {},
    runOptions: { ...(prefilled.runOptions || {}) },
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
      const defaultValue = resolveQuestionDefault(
        q,
        collected,
        brandingDefaults,
      );
      const placeholder =
        typeof q.placeholder === "function"
          ? q.placeholder(collected, brandingDefaults)
          : (q.placeholder ?? defaultValue);
      value = await u.text({
        message: q.message,
        placeholder,
        defaultValue,
        validate: wrapTextValidate(q, defaultValue),
      });
      if (
        (value === "" || value === undefined || value === null) &&
        defaultValue
      ) {
        value = defaultValue;
      }
    } else if (q.type === "select") {
      const options =
        typeof q.options === "function"
          ? q.options(collected, brandingDefaults)
          : q.options;
      value = await u.select({
        message: q.message,
        options,
        initialValue: q.initialValue,
      });
    } else if (q.type === "confirm") {
      value = await u.confirm({ message: q.message });
    } else {
      throw new Error("runPrompts: unknown question type: " + q.type);
    }

    // Cancel = user pressed Ctrl-C. clack returns a Symbol
    // (Symbol.for("clack:cancel")) or undefined. Treat both as
    // a graceful abort.
    if (value === undefined || value === null || typeof value === "symbol") {
      const err = new Error("user cancelled");
      err.code = "WPDEV_USER_CANCELLED";
      throw err;
    }

    if (q.id === "phpSourceVersion" && value === "__other__") {
      const custom = await u.text({
        message: "PHP source version (e.g. 8.2)",
        validate: validatePhpSourceVersionInput,
      });
      if (
        custom === undefined ||
        custom === null ||
        typeof custom === "symbol"
      ) {
        const err = new Error("user cancelled");
        err.code = "WPDEV_USER_CANCELLED";
        throw err;
      }
      value = normalizePhpMinor(custom.trim()) || custom.trim();
    }

    if (q.target === "answers") collected.answers[q.id] = value;
    else if (q.target === "features") collected.features[q.id] = value;
    else if (q.target === "runOptions") collected.runOptions[q.id] = value;

    if (q.id === "npmScope" && value) {
      collected.answers.hookPrefix = value;
    }

    if (q.id === "phpFramework" && value === "wpdev") {
      fillDerivedBranding(collected.answers);
      if (collected.answers.hookPrefix === "wpdev") {
        await u.log(
          "phpFramework=wpdev reserves the 'wpdev' hook prefix. Choose a different npm scope.",
        );
        const suggested = collected.answers.slug || brandingDefaults.slug;
        let newScope;
        do {
          newScope = await u.text({
            message: "npm scope (no @) — usually your brand or org name",
            placeholder: suggested,
            defaultValue: suggested,
            validate: (val) => {
              if (!val) return "npm scope is required";
              if (val === "wpdev") return "Cannot use 'wpdev' as npm scope";
              if (!/^[a-z0-9][a-z0-9-]*$/.test(val)) {
                return "npm scope must be lowercase kebab-case (no @)";
              }
              return undefined;
            },
          });
          if (
            newScope === undefined ||
            newScope === null ||
            typeof newScope === "symbol"
          ) {
            const err = new Error("user cancelled");
            err.code = "WPDEV_USER_CANCELLED";
            throw err;
          }
        } while (newScope === "wpdev");
        collected.answers.npmScope = newScope;
        collected.answers.hookPrefix = newScope;
      }

      if (collected.answers.phpFunctionPrefix === "wpdev_") {
        await u.log(
          "phpFramework=wpdev reserves the 'wpdev_' PHP function prefix. Please choose a different function prefix.",
        );
        const slugUnderscore = (collected.answers.slug || "my-plugin").replace(
          /-/g,
          "_",
        );
        const suggestedFn = slugUnderscore + "_";
        let newFn;
        do {
          newFn = await u.text({
            message: "PHP function prefix (must end with _)",
            placeholder: suggestedFn,
            validate: (val) => {
              if (!val) return "PHP function prefix is required";
              if (val === "wpdev_")
                return "Cannot use 'wpdev_' as function prefix";
              if (!/^[a-z][a-z0-9_]*_$/.test(val))
                return "PHP function prefix must end with an underscore";
              return undefined;
            },
          });
          if (
            newFn === undefined ||
            newFn === null ||
            typeof newFn === "symbol"
          ) {
            const err = new Error("user cancelled");
            err.code = "WPDEV_USER_CANCELLED";
            throw err;
          }
        } while (newFn === "wpdev_");
        collected.answers.phpFunctionPrefix = newFn;
      }
    }
  }

  fillDerivedBranding(collected.answers);

  return collected;
}
