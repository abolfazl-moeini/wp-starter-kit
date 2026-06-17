import { describe, test, expect } from "@jest/globals";
import {
  getJsxOptions,
  getReactAliases,
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