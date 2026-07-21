import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  getJsxOptions,
  getReactAliases,
  getProjectAliases,
  getBuildAliases,
} from "@wpdev/build/getJsxOptions.js";

describe("getJsxOptions", () => {
  test("defaults to preact automatic JSX runtime", () => {
    expect(getJsxOptions()).toEqual({
      jsx: "automatic",
      jsxImportSource: "preact",
    });
  });

  test("uses react import source when uiFramework is react", () => {
    expect(getJsxOptions("react")).toEqual({
      jsx: "automatic",
      jsxImportSource: "react",
    });
  });

  test("treats unknown uiFramework as preact", () => {
    expect(getJsxOptions("vue")).toEqual({
      jsx: "automatic",
      jsxImportSource: "preact",
    });
  });
});

describe("getReactAliases", () => {
  test("aliases react to preact/compat for preact projects", () => {
    expect(getReactAliases("preact")).toEqual({
      react: "preact/compat",
      "react-dom": "preact/compat",
    });
  });

  test("returns no aliases for react projects", () => {
    expect(getReactAliases("react")).toEqual({});
  });
});

describe("getProjectAliases", () => {
  let tmp;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "wpdev-aliases-"));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  test("returns empty when src/polaris is missing", () => {
    expect(getProjectAliases(tmp)).toEqual({});
  });

  test("maps @wpdev/polaris-stack to local src/polaris when present", () => {
    const polaris = join(tmp, "src", "polaris");
    mkdirSync(polaris, { recursive: true });
    writeFileSync(join(polaris, "index.ts"), "export {};\n", "utf8");
    writeFileSync(join(polaris, "styles.css"), "/* ok */\n", "utf8");

    const aliases = getProjectAliases(tmp);
    expect(aliases["@wpdev/polaris-stack"]).toBe(join(polaris, "index.ts"));
    expect(aliases["@wpdev/polaris-stack/styles.css"]).toBe(
      join(polaris, "styles.css"),
    );
  });
});

describe("getBuildAliases", () => {
  test("merges react-compat with project aliases", () => {
    const tmp = mkdtempSync(join(tmpdir(), "wpdev-build-aliases-"));
    try {
      const polaris = join(tmp, "src", "polaris");
      mkdirSync(polaris, { recursive: true });
      writeFileSync(join(polaris, "index.ts"), "export {};\n", "utf8");
      writeFileSync(join(polaris, "styles.css"), "/* ok */\n", "utf8");

      const aliases = getBuildAliases("preact", tmp);
      expect(aliases.react).toBe("preact/compat");
      expect(aliases["@wpdev/polaris-stack"]).toBe(join(polaris, "index.ts"));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
