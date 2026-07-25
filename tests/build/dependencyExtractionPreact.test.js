/**
 * Lock: when uiFramework is preact, bare react/* imports map to the shared
 * Preact vendor (handle `preact`), not WordPress core React handles.
 * importAsGlobals intercepts before esbuild aliases can rewrite paths.
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import {
  defaultRequestToExternal,
  defaultRequestToHandle,
  __setUiFrameworkForTests,
} from "@wpdev/dependency-extraction-esbuild-plugin";

describe("dependency extraction — preact uiFramework", () => {
  beforeEach(() => {
    __setUiFrameworkForTests("preact");
  });
  afterEach(() => {
    __setUiFrameworkForTests(null);
  });

  test("maps react / react-dom to preactCompat + handle preact", () => {
    expect(defaultRequestToExternal("react")).toBe("preactCompat");
    expect(defaultRequestToExternal("react-dom")).toBe("preactCompat");
    expect(defaultRequestToHandle("react")).toBe("preact");
    expect(defaultRequestToHandle("react-dom")).toBe("preact");
  });

  test("maps react jsx-runtime to preactJsxRuntime + handle preact", () => {
    expect(defaultRequestToExternal("react/jsx-runtime")).toBe(
      "preactJsxRuntime",
    );
    expect(defaultRequestToExternal("react/jsx-dev-runtime")).toBe(
      "preactJsxRuntime",
    );
    expect(defaultRequestToHandle("react/jsx-runtime")).toBe("preact");
    expect(defaultRequestToHandle("react/jsx-dev-runtime")).toBe("preact");
  });

  test("maps preact subpaths to vendor globals under single handle", () => {
    expect(defaultRequestToExternal("preact")).toBe("preact");
    expect(defaultRequestToExternal("preact/hooks")).toBe("preactHooks");
    expect(defaultRequestToExternal("preact/compat")).toBe("preactCompat");
    expect(defaultRequestToExternal("preact/jsx-runtime")).toBe(
      "preactJsxRuntime",
    );
    for (const req of [
      "preact",
      "preact/hooks",
      "preact/compat",
      "preact/jsx-runtime",
    ]) {
      expect(defaultRequestToHandle(req)).toBe("preact");
    }
  });

  test("still maps @wordpress packages to wp.* globals", () => {
    expect(defaultRequestToExternal("@wordpress/hooks")).toEqual([
      "wp",
      "hooks",
    ]);
    expect(defaultRequestToHandle("@wordpress/hooks")).toBe("wp-hooks");
  });
});

describe("dependency extraction — react uiFramework", () => {
  beforeEach(() => {
    __setUiFrameworkForTests("react");
  });
  afterEach(() => {
    __setUiFrameworkForTests(null);
  });

  test("maps react to WordPress core handles and globals", () => {
    expect(defaultRequestToExternal("react")).toBe("React");
    expect(defaultRequestToExternal("react-dom")).toBe("ReactDOM");
    expect(defaultRequestToExternal("react/jsx-runtime")).toBe(
      "ReactJSXRuntime",
    );
    expect(defaultRequestToHandle("react")).toBe("react");
    expect(defaultRequestToHandle("react-dom")).toBe("react-dom");
    expect(defaultRequestToHandle("react/jsx-runtime")).toBe(
      "react-jsx-runtime",
    );
  });
});
