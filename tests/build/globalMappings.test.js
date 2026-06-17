import { describe, test, expect } from "@jest/globals";

/**
 * The 1.6 third-party library pattern uses esbuild's `importAsGlobals` plugin
 * to remap bare-specifier imports of the form
 *
 *   import { Tabulator } from 'tabulator-tables';
 *
 * into
 *
 *   module.exports = WPDev.table;
 *
 * (or whatever the configured global expression is). This file drives the
 * plugin's onResolve / onLoad callbacks directly, without invoking the real
 * esbuild bundler.
 */
describe("importAsGlobals — custom global mapping (tabulator pattern)", () => {
  /** Run the plugin's setup() and return the captured handlers. */
  async function runPlugin(mapping) {
    const { importAsGlobals } =
      await import("@wpdev/dependency-extraction-esbuild-plugin");
    const plugin = importAsGlobals(mapping, []);
    const handlers = { onResolve: [], onLoad: [] };
    plugin.setup({
      onResolve: (filter, cb) => handlers.onResolve.push({ filter, cb }),
      onLoad: (filter, cb) => handlers.onLoad.push({ filter, cb }),
    });
    // The plugin registers one wildcard onResolve + two namespaced onLoad handlers.
    // We pick the first onResolve (the wildcard) by structure, not by regex
    // identity (jest may wrap or re-create the RegExp).
    return {
      onResolveAny: handlers.onResolve[0]?.cb,
      onLoadCustom: handlers.onLoad.find(
        (h) => h.filter?.namespace === "external-global-custom",
      )?.cb,
    };
  }

  test('returns a plugin named "global-imports"', async () => {
    const { importAsGlobals } =
      await import("@wpdev/dependency-extraction-esbuild-plugin");
    const plugin = importAsGlobals({}, []);
    expect(plugin.name).toBe("global-imports");
  });

  test('"tabulator-tables" → "WPDev.table" is honored (1.6 third-party lib pattern)', async () => {
    const { onResolveAny, onLoadCustom } = await runPlugin({
      "tabulator-tables": "WPDev.table",
    });
    const resolve = await onResolveAny({ path: "tabulator-tables" });
    expect(resolve.namespace).toBe("external-global-custom");
    expect(resolve.path).toBe("tabulator-tables");

    const load = await onLoadCustom({ path: "tabulator-tables" });
    expect(load.contents).toBe("module.exports = WPDev.table;");
    expect(load.loader).toBe("js");
  });

  test("multiple mappings can coexist; each is honored", async () => {
    const { onLoadCustom } = await runPlugin({
      "tabulator-tables": "WPDev.table",
      sweetalert2: "WPDev.swal",
    });
    const tab = await onLoadCustom({ path: "tabulator-tables" });
    const swal = await onLoadCustom({ path: "sweetalert2" });
    expect(tab.contents).toBe("module.exports = WPDev.table;");
    expect(swal.contents).toBe("module.exports = WPDev.swal;");
  });

  test("unmapped imports pass through with an empty result (no namespace)", async () => {
    const { onResolveAny } = await runPlugin({
      "tabulator-tables": "WPDev.table",
    });
    const result = await onResolveAny({ path: "some-unmapped-pkg" });
    // Unmapped paths return `{}` — esbuild continues normal resolution.
    expect(result).toEqual({});
  });
});
