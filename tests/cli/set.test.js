/**
 * Phase 3 — `wpdev set <key> <value>` CLI command.
 */

import { describe, test, expect, jest } from "@jest/globals";

import { runSet } from "../../packages/cli/src/commands/set.js";

function makeEngine({ ok = true, reason = "" } = {}) {
  return {
    getFeatureCatalog: jest.fn(() => [
      {
        id: "phpMinVersion",
        variants: ["7.4", "8.0", "8.1", "8.2"],
        default: "7.4",
      },
      { id: "js", variants: ["typescript", "none"], default: "typescript" },
      { id: "license", variants: ["gpl2", "gpl3", "mit"], default: "gpl2" },
    ]),
    setConfigValue: jest.fn(async () =>
      ok ? { ok: true, written: ["LICENSE"] } : { ok: false, reason },
    ),
    isConfigSettable: jest.fn((id) =>
      ["phpMinVersion", "wpMinVersion", "license", "ci"].includes(id),
    ),
  };
}

describe("runSet", () => {
  test("calls engine.setConfigValue(dir, key, value) on success", async () => {
    const engine = makeEngine();
    const out = await runSet(
      { dir: "/tmp/proj", key: "phpMinVersion", value: "8.2" },
      { engine },
    );
    expect(out.ok).toBe(true);
    expect(engine.setConfigValue).toHaveBeenCalledWith(
      "/tmp/proj",
      "phpMinVersion",
      "8.2",
    );
  });

  test('wpdev set js typescript is rejected ("use wpdev add for js")', async () => {
    const engine = makeEngine();
    const out = await runSet(
      { dir: "/tmp/proj", key: "js", value: "typescript" },
      { engine },
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/add/i);
    expect(engine.setConfigValue).not.toHaveBeenCalled();
  });

  test("surfaces engine failure reason", async () => {
    const engine = makeEngine({
      ok: false,
      reason: "invalid feature set: faultTolerance",
    });
    const out = await runSet(
      { dir: "/tmp/proj", key: "phpMinVersion", value: "7.4" },
      { engine },
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/faultTolerance/i);
  });

  test("requires key and value", async () => {
    const engine = makeEngine();
    const out = await runSet(
      { dir: "/tmp/proj", key: "", value: "" },
      { engine },
    );
    expect(out.ok).toBe(false);
    expect(engine.setConfigValue).not.toHaveBeenCalled();
  });
});
