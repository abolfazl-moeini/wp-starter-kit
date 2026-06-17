import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, "project.config.json");
let originalConfig;

function requiredConfig(npmScope) {
  return {
    slug: "test",
    globalName: "Test",
    localizeVar: "TestLoc",
    textDomain: "test",
    hookPrefix: "test",
    npmScope,
  };
}

function withProjectConfig(config, fn) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config));
  jest.resetModules();
  return fn();
}

beforeEach(() => {
  originalConfig = readFileSync(CONFIG_PATH, "utf8");
  jest.resetModules();
});

afterEach(() => {
  writeFileSync(CONFIG_PATH, originalConfig);
  jest.resetModules();
});

describe("INTERNAL_NAMESPACE", () => {
  test("is a clean string (not a Promise or [object Promise])", async () => {
    const { INTERNAL_NAMESPACE } =
      await import("@wpdev/dependency-extraction-esbuild-plugin");
    expect(typeof INTERNAL_NAMESPACE).toBe("string");
    expect(INTERNAL_NAMESPACE).not.toContain("object Promise");
    expect(INTERNAL_NAMESPACE).not.toContain("Promise");
    expect(INTERNAL_NAMESPACE).toBe("@wpdev/");
  });

  test("prefers npmScope from project.config.json when available", async () => {
    await withProjectConfig(requiredConfig("@my-org"), async () => {
      const { INTERNAL_NAMESPACE } =
        await import("@wpdev/dependency-extraction-esbuild-plugin");
      expect(INTERNAL_NAMESPACE).toBe("@my-org/");
    });
  });
});

describe("internalRequestToHandle", () => {
  test("extracts short name for internal packages", async () => {
    const { internalRequestToHandle } =
      await import("@wpdev/dependency-extraction-esbuild-plugin");
    expect(internalRequestToHandle("@wpdev/hooks")).toBe("hooks");
    expect(internalRequestToHandle("@wpdev/utils")).toBe("utils");
    expect(internalRequestToHandle("@wpdev/rest-utils")).toBe("rest-utils");
    expect(internalRequestToHandle("@wordpress/api-fetch")).toBeUndefined();
    expect(internalRequestToHandle("lodash")).toBeUndefined();
  });
});

describe("filterInternalRootPackages", () => {
  test("uses INTERNAL_NAMESPACE org and returns short names", async () => {
    const { filterInternalRootPackages } =
      await import("@wpdev/dependency-extraction-esbuild-plugin");
    const mixed = [
      "@wpdev/hooks",
      "@wpdev/utils",
      "@wpdev/ui-components",
      "@wordpress/i18n",
      "tabulator-tables",
      "@wpdev/some-pkg",
    ];

    const result = filterInternalRootPackages(mixed);
    expect(result).toEqual(["hooks", "utils", "ui-components", "some-pkg"]);
  });

  test("deduplicates and excludes non-matching packages", async () => {
    const { filterInternalRootPackages } =
      await import("@wpdev/dependency-extraction-esbuild-plugin");
    const pkgs = ["@wpdev/foo", "not-scoped", "@wpdev/foo", "@Other/bar"];
    const result = filterInternalRootPackages(pkgs);
    expect(result).toEqual(["foo"]);
  });

  test("unscoped name like lodash is not in result", async () => {
    const { filterInternalRootPackages } =
      await import("@wpdev/dependency-extraction-esbuild-plugin");
    const result = filterInternalRootPackages(["lodash", "jquery"]);
    expect(result).toEqual([]);
  });

  test("derives org from INTERNAL_NAMESPACE (project.config npmScope), not getOrgNameSync", async () => {
    await withProjectConfig(requiredConfig("@my-org"), async () => {
      const { filterInternalRootPackages } =
        await import("@wpdev/dependency-extraction-esbuild-plugin");
      const result = filterInternalRootPackages([
        "@my-org/hooks",
        "@wpdev/utils",
      ]);
      expect(result).toEqual(["hooks"]);
    });
  });

  test("matches seeded @wpdev scope from project.config.json", async () => {
    const { filterInternalRootPackages } =
      await import("@wpdev/dependency-extraction-esbuild-plugin");
    const result = filterInternalRootPackages(["@wpdev/pkg", "@anything/pkg"]);
    expect(result).toEqual(["pkg"]);
  });

  test("input with no matching packages returns empty array", async () => {
    await withProjectConfig(requiredConfig("@MyOrg"), async () => {
      const { filterInternalRootPackages } =
        await import("@wpdev/dependency-extraction-esbuild-plugin");
      const result = filterInternalRootPackages([
        "@OtherOrg/pkg",
        "lodash",
        "@Another/pkg",
      ]);
      expect(result).toEqual([]);
    });
  });
});
