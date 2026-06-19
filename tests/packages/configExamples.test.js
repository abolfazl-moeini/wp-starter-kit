import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROJECT_KEYS = [
  "slug",
  "globalName",
  "localizeVar",
  "textDomain",
  "hookPrefix",
  "npmScope",
  "depsBundle",
  "uiFramework",
];

const BUILD_KEYS = ["globalMappings", "assetMappings", "styleEntryPoints"];

describe("example config files", () => {
  test("wpdev.example.json is valid JSON with required keys", () => {
    const raw = readFileSync(join(process.cwd(), "wpdev.example.json"), "utf8");
    const example = JSON.parse(raw);
    for (const key of PROJECT_KEYS) {
      expect(example).toHaveProperty(key);
    }
    expect(example.phpFunctionPrefix).not.toBe("wpdev_");
  });

  test("wpdev.example.json build section is valid JSON with required keys", () => {
    const raw = readFileSync(join(process.cwd(), "wpdev.example.json"), "utf8");
    const example = JSON.parse(raw);
    const build = example.build || example;
    for (const key of BUILD_KEYS) {
      expect(build).toHaveProperty(key);
    }
  });
});
