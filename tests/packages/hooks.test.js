/** @jest-environment jsdom */
import { describe, test, expect, beforeEach, jest } from "@jest/globals";

let hooks;

beforeEach(async () => {
  jest.resetModules();
  delete globalThis.WPDev;
  delete globalThis.MyApp;
  hooks = await import("../../packages/hooks/index.js");
});

describe("@wpdev/hooks", () => {
  test("exports a default accessor function (default export is callable)", () => {
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
    globalThis.WPDev = { hooks: fakeHooks };

    const accessor = hooks.default ?? hooks.getHooks;
    expect(accessor()).toBe(fakeHooks);
  });

  test("reads from the globalName defined in project.config.json", () => {
    globalThis.WPDev = { hooks: { tag: "from-wpdev" } };

    const accessor = hooks.default ?? hooks.getHooks;
    const hooksValue = accessor();
    expect(hooksValue).toEqual({ tag: "from-wpdev" });
  });

  test("getHooks(globalName) accepts an explicit override", () => {
    globalThis.AnotherApp = { hooks: { tag: "override" } };
    expect(hooks.getHooks("AnotherApp")).toEqual({ tag: "override" });
  });
});