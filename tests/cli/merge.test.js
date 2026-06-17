import { describe, test, expect } from "@jest/globals";

import { mergeInputs } from "../../packages/cli/src/gather.js";
import { defaultFeatures } from "@wpdev/create-wp-project";

describe("mergeInputs(flags, prompted)", () => {
  // The defaults are pulled from the engine stub's `defaultFeatures()`
  // — the lowest-precedence layer. The function is exposed for unit
  // testing but the live `gatherInputs()` pipeline always builds the
  // defaults internally.
  const defaults = defaultFeatures();

  test("fills every feature key from defaults when flags + prompted are empty", () => {
    const out = mergeInputs({}, {}, defaults);
    expect(out.features).toEqual(defaults);
  });

  test("flags override prompted values for the same feature key", () => {
    const out = mergeInputs(
      { features: { js: "flow" } },
      { features: { js: "typescript" } },
      defaults,
    );
    expect(out.features.js).toBe("flow");
  });

  test("prompted values override defaults for the same feature key", () => {
    const out = mergeInputs({}, { features: { js: "pure" } }, defaults);
    expect(out.features.js).toBe("pure");
  });

  test("preserves default values for keys not touched by flags or prompts", () => {
    const out = mergeInputs({ features: { css: "tailwind" } }, {}, defaults);
    expect(out.features.css).toBe("tailwind");
    // js stays at its default (whichever the stub sets)
    expect(out.features.js).toBe(defaults.js);
  });

  test("precedence: flags > prompted > defaults — combined example", () => {
    const out = mergeInputs(
      { features: { js: "flow", license: "mit" } },
      { features: { js: "typescript", css: "sass" } },
      defaults,
    );
    expect(out.features.js).toBe("flow"); // flag wins
    expect(out.features.license).toBe("mit"); // flag wins
    expect(out.features.css).toBe("sass"); // prompt fills gap
    expect(out.features.phpMinVersion).toBe(defaults.phpMinVersion); // default
  });

  test("does not mutate the input objects (pure merge)", () => {
    const flags = { features: { js: "flow" } };
    const prompted = { features: { css: "sass" } };
    const frozenDefaults = JSON.parse(JSON.stringify(defaults));
    const out = mergeInputs(flags, prompted, defaults);
    expect(flags).toEqual({ features: { js: "flow" } });
    expect(prompted).toEqual({ features: { css: "sass" } });
    expect(defaults).toEqual(frozenDefaults);
    expect(out).not.toBe(flags);
    expect(out).not.toBe(prompted);
  });

  test("merges answers with the same precedence (flags > prompted)", () => {
    // answers.* has no per-feature default — the function falls
    // through to the prompted value when no flag is set, and the
    // flag value when one is set.
    const promptAnswers = { slug: "from-prompt" };
    const flagAnswers = { slug: "from-flag" };
    const out = mergeInputs(
      { answers: flagAnswers },
      { answers: promptAnswers },
      defaults,
    );
    expect(out.answers.slug).toBe("from-flag");
  });

  test("merges runOptions: flags take precedence; prompted runOptions fill gaps", () => {
    const out = mergeInputs(
      { runOptions: { install: true } },
      { runOptions: { install: false, git: true } },
      defaults,
    );
    expect(out.runOptions.install).toBe(true); // flag wins
    expect(out.runOptions.git).toBe(true); // prompt fills gap
  });

  test("returns a stable top-level shape with all three buckets present", () => {
    const out = mergeInputs({}, {}, defaults);
    expect(Object.keys(out).sort()).toEqual(
      ["answers", "features", "runOptions"].sort(),
    );
  });
});
