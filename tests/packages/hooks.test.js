/** @jest-environment jsdom */
import { describe, test, expect, beforeEach, jest } from "@jest/globals";

let hooks;

beforeEach(async () => {
  jest.resetModules();
  delete globalThis.WPSK;
  delete globalThis.MyApp;
  hooks = await import("../../packages/hooks/index.js");
});

describe("@wpsk/hooks", () => {
  test("exports a default accessor function (default export is callable)", () => {
    // The package must expose either a default or named `getHooks` export.
    const accessor = hooks.default ?? hooks.getHooks;
    expect(accessor).toBeDefined();
    expect(typeof accessor).toBe("function");
  });

  test("returns undefined when the global namespace is not set on window", () => {
    const accessor = hooks.default ?? hooks.getHooks;
    const hooksValue = accessor();
    expect(hooksValue).toBeUndefined();
  });

  test("returns the hooks object when the global namespace is set", () => {
    const fakeHooks = { doAction: () => {}, addAction: () => {} };
    globalThis.WPSK = { hooks: fakeHooks };

    const accessor = hooks.default ?? hooks.getHooks;
    expect(accessor()).toBe(fakeHooks);
  });

  test("reads from the globalName defined in project.config.json", () => {
    // The default project.config.json has globalName: 'WPSK'.
    // The hooks package uses this as the fallback global name
    // (injected via esbuild define; falls back to seeded value in dev).
    globalThis.WPSK = { hooks: { tag: "from-wpsk" } };

    const accessor = hooks.default ?? hooks.getHooks;
    const hooksValue = accessor();
    expect(hooksValue).toEqual({ tag: "from-wpsk" });
  });

  test("getHooks(globalName) accepts an explicit override", () => {
    globalThis.AnotherApp = { hooks: { tag: "override" } };
    expect(hooks.getHooks("AnotherApp")).toEqual({ tag: "override" });
  });
});
