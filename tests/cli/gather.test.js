import { describe, test, expect } from "@jest/globals";

import { gatherInputs } from "../../packages/cli/src/gather.js";
import * as engineStub from "@wpdev/create-wp-project";
import { defaultFeatures } from "@wpdev/create-wp-project";
import { applyPreset } from "@wpdev/create-wp-project";

/**
 * Recording fake UI. Same shape as the one in gather.test.js but
 * kept inline so this test file is self-contained.
 */
function makeRecordingUi() {
  const calls = [];
  const ui = {
    text: async (opts) => {
      calls.push({ kind: "text", opts });
      return "fake-text";
    },
    select: async (opts) => {
      calls.push({ kind: "select", opts });
      return opts.initialValue || (opts.options[0] && opts.options[0].value);
    },
    confirm: async (opts) => {
      calls.push({ kind: "confirm", opts });
      return false;
    },
    spinner: async (opts) => {
      calls.push({ kind: "spinner", opts });
      return { start: () => {}, stop: () => {}, message: () => {} };
    },
    log: async (msg) => {
      calls.push({ kind: "log", msg });
    },
    renderSummary: async () => {},
    renderError: async () => {},
  };
  ui.calls = calls;
  return ui;
}

describe("--yes / -y non-interactive (I2.10, I2.11)", () => {
  test("--yes: no prompt function is ever called", async () => {
    const ui = makeRecordingUi();
    await gatherInputs({
      argv: ["my-plugin", "--yes"],
      interactive: true, // --yes must override
      engine: engineStub,
      ui,
    });
    const promptCalls = ui.calls.filter(
      (c) => c.kind === "text" || c.kind === "select" || c.kind === "confirm",
    );
    expect(promptCalls).toEqual([]);
  });

  test("-y: short form also skips prompts", async () => {
    const ui = makeRecordingUi();
    await gatherInputs({
      argv: ["my-plugin", "-y"],
      interactive: true,
      engine: engineStub,
      ui,
    });
    const promptCalls = ui.calls.filter(
      (c) => c.kind === "text" || c.kind === "select" || c.kind === "confirm",
    );
    expect(promptCalls).toEqual([]);
  });

  test("--yes: all unspecified features come from the standard preset", async () => {
    const ui = makeRecordingUi();
    const out = await gatherInputs({
      argv: ["my-plugin", "--yes"],
      interactive: true,
      engine: engineStub,
      ui,
    });
    const standard = applyPreset("standard");
    for (const [k, v] of Object.entries(standard)) {
      expect(out.features[k]).toBe(v);
    }
    expect(out.preset).toBe("standard");
  });

  test("--yes: feature validation still runs on the merged set", async () => {
    // The flag combo is valid; gather must not throw, and the
    // validation.ok flag must be true.
    const ui = makeRecordingUi();
    const out = await gatherInputs({
      argv: ["my-plugin", "--yes", "--scope=acme"],
      interactive: true,
      engine: engineStub,
      ui,
    });
    expect(out.validation.ok).toBe(true);
  });

  test("--yes --js=none coerces stale JS dependents from the standard preset", async () => {
    const ui = makeRecordingUi();
    const out = await gatherInputs({
      argv: [
        "my-plugin",
        "--yes",
        "--js=none",
        "--php-framework=wpdev",
        "--hook=acme",
        "--php-fn=acme_",
      ],
      interactive: true,
      engine: engineStub,
      ui,
    });
    expect(out.validation.ok).toBe(true);
    expect(out.features.js).toBe("none");
    expect(out.features.jsTest).toBe("none");
    expect(out.features.jsLib).toBe("none");
    expect(out.features.css).toBe("none");
    expect(out.features.phpFramework).toBe("wpdev");
  });

  test("--preset=minimal applies the minimal feature set", async () => {
    const ui = makeRecordingUi();
    const out = await gatherInputs({
      argv: ["my-plugin", "--yes", "--preset=minimal"],
      interactive: true,
      engine: engineStub,
      ui,
    });
    const minimal = applyPreset("minimal");
    for (const [k, v] of Object.entries(minimal)) {
      expect(out.features[k]).toBe(v);
    }
    expect(out.preset).toBe("minimal");
  });

  test("interactive run asks preset first and applies minimal when selected", async () => {
    const ui = makeRecordingUi();
    ui.select = jest.fn(async (opts) => {
      ui.calls.push({ kind: "select", opts });
      if (opts.message && opts.message.match(/preset/i)) return "minimal";
      return opts.initialValue || (opts.options[0] && opts.options[0].value);
    });
    const out = await gatherInputs({
      argv: ["my-plugin"],
      interactive: true,
      engine: engineStub,
      ui,
    });
    const presetCall = ui.calls.find(
      (c) => c.kind === "select" && c.opts.message.match(/preset/i),
    );
    expect(presetCall).toBeDefined();
    const minimal = applyPreset("minimal");
    for (const [k, v] of Object.entries(minimal)) {
      expect(out.features[k]).toBe(v);
    }
    expect(out.preset).toBe("minimal");
  });

  test("explicit `interactive: false` also skips prompts (no --yes needed)", async () => {
    const ui = makeRecordingUi();
    const out = await gatherInputs({
      argv: ["my-plugin"],
      interactive: false,
      engine: engineStub,
      ui,
    });
    const promptCalls = ui.calls.filter(
      (c) => c.kind === "text" || c.kind === "select" || c.kind === "confirm",
    );
    expect(promptCalls).toEqual([]);
    // Defaults still applied.
    const defaults = defaultFeatures();
    expect(out.features.js).toBe(defaults.js);
  });
});
