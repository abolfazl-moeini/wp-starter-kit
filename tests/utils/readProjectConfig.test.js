import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import mockFs from "mock-fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const validConfig = {
  slug: "my-project",
  globalName: "MyProject",
  localizeVar: "MyProjectLoc",
  textDomain: "my-project",
  hookPrefix: "my-project",
  npmScope: "@my-org",
};
const minimal = {
  slug: "test",
  globalName: "Test",
  localizeVar: "TestLoc",
  textDomain: "test",
  hookPrefix: "test",
  npmScope: "@test",
};

beforeEach(() => {
  jest.resetModules();
});
afterEach(() => {
  mockFs.restore();
});

describe("readProjectConfig", () => {
  test("reads JSON via custom path", async () => {
    mockFs({ "/tmp/a.json": JSON.stringify(validConfig) });
    const { readProjectConfig } = await import("@core/utils");
    const result = readProjectConfig({ path: "/tmp/a.json" });
    expect(result).toMatchObject(validConfig);
  });

  test("throws if required fields missing", async () => {
    mockFs({ "/tmp/b.json": JSON.stringify({ slug: "only" }) });
    const { readProjectConfig } = await import("@core/utils");
    expect(() => readProjectConfig({ path: "/tmp/b.json" })).toThrow(
      /slug|globalName|localizeVar|textDomain|hookPrefix|npmScope/,
    );
  });

  test("returns parsed when all fields present", async () => {
    mockFs({ "/tmp/c.json": JSON.stringify(minimal) });
    const { readProjectConfig } = await import("@core/utils");
    const result = readProjectConfig({ path: "/tmp/c.json" });
    expect(result.slug).toBe("test");
  });

  test("custom path works", async () => {
    mockFs({ "/special/config.json": JSON.stringify(validConfig) });
    const { readProjectConfig } = await import("@core/utils");
    const result = readProjectConfig({ path: "/special/config.json" });
    expect(result.slug).toBe("my-project");
  });

  test("malformed JSON", async () => {
    mockFs({ "/tmp/d.json": "{ bad }" });
    const { readProjectConfig } = await import("@core/utils");
    expect(() => readProjectConfig({ path: "/tmp/d.json" })).toThrow(
      /malformed|invalid JSON|parse/,
    );
  });

  test("missing file", async () => {
    mockFs({});
    const { readProjectConfig } = await import("@core/utils");
    expect(() => readProjectConfig({ path: "/nope.json" })).toThrow(
      /not found/,
    );
  });

  test("applies defaults for optional fields when omitted", async () => {
    mockFs({ "/tmp/defaults.json": JSON.stringify(minimal) });
    const { readProjectConfig } = await import("@core/utils");
    const result = readProjectConfig({ path: "/tmp/defaults.json" });
    expect(result.depsBundle).toBe("test-deps.js");
    expect(result.phpFunctionPrefix).toBe("wpsk_");
    expect(result.uiFramework).toBe("preact");
  });

  test("throws when uiFramework is invalid", async () => {
    mockFs({
      "/tmp/invalid-ui.json": JSON.stringify({
        ...minimal,
        uiFramework: "vue",
      }),
    });
    const { readProjectConfig } = await import("@core/utils");
    expect(() => readProjectConfig({ path: "/tmp/invalid-ui.json" })).toThrow(
      /uiFramework must be "preact" or "react"/,
    );
  });

  test("explicit optional values override defaults", async () => {
    const withOptionals = {
      ...minimal,
      depsBundle: "custom-deps.js",
      phpFunctionPrefix: "custom_",
      uiFramework: "react",
    };
    mockFs({ "/tmp/override.json": JSON.stringify(withOptionals) });
    const { readProjectConfig } = await import("@core/utils");
    const result = readProjectConfig({ path: "/tmp/override.json" });
    expect(result.depsBundle).toBe("custom-deps.js");
    expect(result.phpFunctionPrefix).toBe("custom_");
    expect(result.uiFramework).toBe("react");
  });

  test("applies v2 defaults when omitted", async () => {
    mockFs({ "/tmp/v2-defaults.json": JSON.stringify(minimal) });
    const { readProjectConfig } = await import("@core/utils");
    const result = readProjectConfig({ path: "/tmp/v2-defaults.json" });
    expect(result.restNamespace).toBe("wpsk/v1");
    expect(result.vendorPrefix).toBe("WpskVendor");
    expect(result.phpMinVersion).toBe("7.4");
    expect(result.phpSourceVersion).toBe("8.1");
    expect(result.batchEndpoint).toBe("/batch/v1");
  });

  test("validates restNamespace format", async () => {
    mockFs({
      "/tmp/bad-ns.json": JSON.stringify({
        ...minimal,
        restNamespace: "INVALID",
      }),
    });
    const { readProjectConfig } = await import("@core/utils");
    expect(() => readProjectConfig({ path: "/tmp/bad-ns.json" })).toThrow(
      /restNamespace/,
    );
  });

  test("validates vendorPrefix format", async () => {
    mockFs({
      "/tmp/bad-vendor.json": JSON.stringify({
        ...minimal,
        vendorPrefix: "1Bad",
      }),
    });
    const { readProjectConfig } = await import("@core/utils");
    expect(() => readProjectConfig({ path: "/tmp/bad-vendor.json" })).toThrow(
      /vendorPrefix/,
    );
  });

  test("default config path resolves from getRootPath not cwd", () => {
    const source = readFileSync(
      join(process.cwd(), "core/packages/utils/readProjectConfig.js"),
      "utf8",
    );
    // Source may use either single or double quotes — accept both.
    expect(source).toMatch(
      /join\(getRootPath\(\),\s*['"]project\.config\.json['"]\)/,
    );
    expect(source).not.toMatch(
      /join\(process\.cwd\(\),\s*['"]project\.config\.json['"]\)/,
    );
  });

  /* ---------------------------------------------------------------- */
  /* Phase 14.1–14.2 — v2 config fields                                */
  /* ---------------------------------------------------------------- */

  describe("v2 fields (Phase 14.1-14.2)", () => {
    test("applies v2 defaults when fields are omitted", async () => {
      mockFs({ "/tmp/v2-defaults.json": JSON.stringify(minimal) });
      const { readProjectConfig } = await import("@core/utils");
      const result = readProjectConfig({ path: "/tmp/v2-defaults.json" });
      expect(result.restNamespace).toBe("wpsk/v1");
      expect(result.vendorPrefix).toBe("WpskVendor");
      expect(result.phpMinVersion).toBe("7.4");
      expect(result.phpSourceVersion).toBe("8.1");
      expect(result.batchEndpoint).toBe("/batch/v1");
    });

    test("preserves explicit v2 values (no override)", async () => {
      const cfg = {
        ...minimal,
        restNamespace: "myns/v2",
        vendorPrefix: "AcmeVendor",
        phpMinVersion: "8.0",
        phpSourceVersion: "8.2",
        batchEndpoint: "/wp/v2/batch",
      };
      mockFs({ "/tmp/v2-explicit.json": JSON.stringify(cfg) });
      const { readProjectConfig } = await import("@core/utils");
      const result = readProjectConfig({ path: "/tmp/v2-explicit.json" });
      expect(result.restNamespace).toBe("myns/v2");
      expect(result.vendorPrefix).toBe("AcmeVendor");
      expect(result.phpMinVersion).toBe("8.0");
      expect(result.phpSourceVersion).toBe("8.2");
      expect(result.batchEndpoint).toBe("/wp/v2/batch");
    });

    test("validates vendorPrefix is a valid PHP namespace segment", async () => {
      // Reject empty
      mockFs({
        "/tmp/bad-vendor-empty.json": JSON.stringify({
          ...minimal,
          vendorPrefix: "",
        }),
      });
      const { readProjectConfig: r1 } = await import("@core/utils");
      expect(() => r1({ path: "/tmp/bad-vendor-empty.json" })).toThrow(
        /vendorPrefix/,
      );

      // Reject lowercase PHP keyword-ish — vendorPrefix must start with a
      // capital letter (PHP namespace convention).
      mockFs({
        "/tmp/bad-vendor-lower.json": JSON.stringify({
          ...minimal,
          vendorPrefix: "acmeVendor",
        }),
      });
      jest.resetModules();
      const { readProjectConfig: r2 } = await import("@core/utils");
      expect(() => r2({ path: "/tmp/bad-vendor-lower.json" })).toThrow(
        /vendorPrefix/,
      );

      // Reject chars that aren't [A-Za-z0-9_].
      mockFs({
        "/tmp/bad-vendor-chars.json": JSON.stringify({
          ...minimal,
          vendorPrefix: "Bad-Prefix",
        }),
      });
      jest.resetModules();
      const { readProjectConfig: r3 } = await import("@core/utils");
      expect(() => r3({ path: "/tmp/bad-vendor-chars.json" })).toThrow(
        /vendorPrefix/,
      );
    });

    test("validates restNamespace matches the WP safe namespace shape", async () => {
      // Must contain a single slash (vendor/segment).
      mockFs({
        "/tmp/bad-ns-noslash.json": JSON.stringify({
          ...minimal,
          restNamespace: "nospace",
        }),
      });
      const { readProjectConfig: r1 } = await import("@core/utils");
      expect(() => r1({ path: "/tmp/bad-ns-noslash.json" })).toThrow(
        /restNamespace/,
      );

      // Reject whitespace, brackets, etc.
      mockFs({
        "/tmp/bad-ns-chars.json": JSON.stringify({
          ...minimal,
          restNamespace: "bad ns/v1",
        }),
      });
      jest.resetModules();
      const { readProjectConfig: r2 } = await import("@core/utils");
      expect(() => r2({ path: "/tmp/bad-ns-chars.json" })).toThrow(
        /restNamespace/,
      );
    });

    test("validates phpMinVersion + phpSourceVersion look like X.Y or X.Y.Z", async () => {
      mockFs({
        "/tmp/bad-min.json": JSON.stringify({
          ...minimal,
          phpMinVersion: "seven",
        }),
      });
      const { readProjectConfig: r1 } = await import("@core/utils");
      expect(() => r1({ path: "/tmp/bad-min.json" })).toThrow(/phpMinVersion/);

      mockFs({
        "/tmp/bad-src.json": JSON.stringify({
          ...minimal,
          phpSourceVersion: "8.x",
        }),
      });
      jest.resetModules();
      const { readProjectConfig: r2 } = await import("@core/utils");
      expect(() => r2({ path: "/tmp/bad-src.json" })).toThrow(
        /phpSourceVersion/,
      );
    });

    test("validates batchEndpoint starts with /", async () => {
      mockFs({
        "/tmp/bad-batch.json": JSON.stringify({
          ...minimal,
          batchEndpoint: "batch/v1",
        }),
      });
      const { readProjectConfig } = await import("@core/utils");
      expect(() => readProjectConfig({ path: "/tmp/bad-batch.json" })).toThrow(
        /batchEndpoint/,
      );
    });
  });
});
