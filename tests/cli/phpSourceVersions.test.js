import { describe, test, expect, jest } from "@jest/globals";

import {
  FALLBACK_PHP_SOURCE_VERSIONS,
  buildPhpSourceVersionRange,
  normalizePhpMinor,
  parseActivePhpMaxVersion,
  fetchPhpSourceVersionOptions,
  toPhpSourceVersionSelectOptions,
  validatePhpSourceVersionInput,
} from "../../packages/cli/src/php-source-versions.js";

describe("buildPhpSourceVersionRange()", () => {
  test("returns versions from WP minimum through PHP.net maximum", () => {
    expect(buildPhpSourceVersionRange("7.4", "8.5")).toEqual([
      "7.4",
      "8.0",
      "8.1",
      "8.2",
      "8.3",
      "8.4",
      "8.5",
    ]);
  });

  test("falls back when bounds are unknown", () => {
    expect(buildPhpSourceVersionRange("6.0", "9.9")).toEqual(
      FALLBACK_PHP_SOURCE_VERSIONS,
    );
  });
});

describe("parseActivePhpMaxVersion()", () => {
  test("reads highest active minor from php.net JSON", () => {
    const active = {
      8: {
        8.2: {},
        8.3: {},
        8.5: {},
      },
    };
    expect(parseActivePhpMaxVersion(active)).toBe("8.5");
  });
});

describe("normalizePhpMinor()", () => {
  test("strips patch segment", () => {
    expect(normalizePhpMinor("8.2.5")).toBe("8.2");
  });
});

describe("validatePhpSourceVersionInput()", () => {
  test("rejects invalid version strings", () => {
    expect(validatePhpSourceVersionInput("8.x")).toMatch(/8\.2/);
  });
});

describe("toPhpSourceVersionSelectOptions()", () => {
  test("appends Other option", () => {
    const opts = toPhpSourceVersionSelectOptions(["8.1", "8.2"]);
    expect(opts.at(-1)).toEqual({
      label: "Other (type a version)",
      value: "__other__",
    });
  });
});

describe("fetchPhpSourceVersionOptions()", () => {
  test("uses WordPress minimum and php.net maximum", async () => {
    const fetch = jest.fn(async (url) => {
      if (url.includes("serve-happy")) {
        return {
          ok: true,
          json: async () => ({
            minimum_version: "7.4",
            recommended_version: "8.3",
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ 8: { 8.2: {}, 8.4: {} } }),
      };
    });

    const result = await fetchPhpSourceVersionOptions({ fetch });
    expect(result.versions).toEqual(["7.4", "8.0", "8.1", "8.2", "8.3", "8.4"]);
    expect(result.defaultVersion).toBe("7.4");
    expect(result.options.map((o) => o.value)).toContain("__other__");
  });

  test("falls back on network error", async () => {
    const fetch = jest.fn(async () => {
      throw new Error("offline");
    });
    const result = await fetchPhpSourceVersionOptions({ fetch });
    expect(result.versions).toEqual(FALLBACK_PHP_SOURCE_VERSIONS);
    expect(result.defaultVersion).toBe("7.4");
  });
});
