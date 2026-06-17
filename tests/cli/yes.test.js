import { describe, test, expect } from "@jest/globals";

import { gatherInputs } from "../../packages/cli/src/gather.js";
import * as engineStub from "@wpdev/create-wp-project";

/**
 * A fake `ui` that records every call. We never actually call the
 * real @clack/prompts in unit tests — the gather pipeline asks
 * `ui.text`, `ui.select`, etc., and we want to assert that the
 * pipeline either did or did NOT reach the prompt loop.
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

describe("gatherInputs() — validation gate (I2.8)", () => {
  test("throws immediately when flags produce an invalid feature combo (no prompts run)", async () => {
    const ui = makeRecordingUi();
    // --fault-tolerance=on requires phpMinVersion >= 8.1, but the
    // user passed --php-min=7.4.
    await expect(
      gatherInputs({
        argv: ["my-plugin", "--fault-tolerance=on", "--php-min=7.4"],
        interactive: true,
        engine: engineStub,
        ui,
      }),
    ).rejects.toThrow(/Invalid feature combination/);
    // The fail-fast gate must run before any prompt. With a valid
    // gate, the fake UI's text/select should never have been
    // called.
    expect(
      ui.calls.filter((c) => c.kind === "text" || c.kind === "select"),
    ).toEqual([]);
  });

  test("the thrown error carries the per-field errors as a property", async () => {
    const ui = makeRecordingUi();
    let captured;
    try {
      await gatherInputs({
        argv: ["--fault-tolerance=on", "--php-min=7.4"],
        engine: engineStub,
        ui,
      });
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeDefined();
    expect(captured.errors).toBeDefined();
    expect(captured.errors.faultTolerance).toMatch(/phpMinVersion/);
  });

  test("accepts a valid feature combination from flags (no throw)", async () => {
    const ui = makeRecordingUi();
    const out = await gatherInputs({
      argv: [
        "my-plugin",
        "--scope=acme",
        "--global=Acme",
        "--domain=acme",
        "--hook=acme",
        "--php-fn=acme_",
        // valid: faultTolerance=on with phpMinVersion=8.1
        "--fault-tolerance=on",
        "--php-min=8.1",
      ],
      interactive: false, // skip prompts to keep the test small
      engine: engineStub,
      ui,
    });
    expect(out.validation.ok).toBe(true);
    expect(out.features.faultTolerance).toBe("on");
    expect(out.features.phpMinVersion).toBe("8.1");
  });
});

describe("gatherInputs() — happy path (I2.9)", () => {
  test("non-interactive (--yes) returns the merged feature set without prompts", async () => {
    const ui = makeRecordingUi();
    const out = await gatherInputs({
      argv: ["my-plugin", "--yes", "--scope=acme"],
      interactive: true, // --yes must override
      engine: engineStub,
      ui,
    });
    expect(out.answers.slug).toBe("my-plugin");
    expect(out.answers.npmScope).toBe("acme");
    expect(out.runOptions.interactive).toBe(false);
    // No prompts were asked.
    expect(
      ui.calls.filter((c) => c.kind === "text" || c.kind === "select"),
    ).toEqual([]);
  });

  test("interactive (no --yes) drives the prompt plan and merges the result", async () => {
    const ui = makeRecordingUi();
    // Provide everything via flags so the prompt loop just has to
    // make a single deterministic select (the first one — branding
    // "slug" — is a text prompt; the fake UI returns "fake-text"
    // and the gather uses it). The remaining prompts will run but
    // the fake UI returns each initialValue.
    const out = await gatherInputs({
      argv: [
        "--scope=acme",
        "--global=Acme",
        "--domain=acme",
        "--hook=acme",
        "--php-fn=acme_",
      ],
      interactive: true,
      engine: engineStub,
      ui,
    });
    // At least one prompt was asked.
    expect(
      ui.calls.filter((c) => c.kind === "text" || c.kind === "select").length,
    ).toBeGreaterThan(0);
    // The final feature set is valid (default + flagged overrides).
    expect(out.validation.ok).toBe(true);
    // Flag-derived features survived the merge.
    expect(out.answers.npmScope).toBe("acme");
    expect(out.answers.globalName).toBe("Acme");
  });
});
