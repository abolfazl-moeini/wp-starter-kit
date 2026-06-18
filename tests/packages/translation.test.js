/**
 * Phase 8 — direct tests for @wpdev/translation pure helpers (via CLI bridge).
 *
 * The package entry uses `import.meta` for CLI dispatch; Jest imports it as
 * CJS. We exercise the exported functions through the stable CLI contract
 * (same as tests/phpunit/TranslationPipelineTest.php).
 */

import { describe, test, expect } from "@jest/globals";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const INDEX = join(process.cwd(), "packages/translation/src/index.js");

function call(op, payload) {
  const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const out = execFileSync("node", [INDEX, op, b64], { encoding: "utf8" });
  const parsed = JSON.parse(out.trim());
  if (!parsed.ok) {
    throw new Error(parsed.error || "translation CLI failed");
  }
  return parsed.result;
}

describe("@wpdev/translation helpers", () => {
  test("parseMapFile extracts unique source paths", () => {
    const pot = [
      "#: src/foo.ts:10",
      "#: src/bar.ts:20",
      "#: src/foo.ts:30",
    ].join("\n");
    expect(call("parseMapFile", [pot, "MyBundle"])).toEqual({
      "src/foo.ts": "MyBundle",
      "src/bar.ts": "MyBundle",
    });
  });

  test("isTranslationValid rejects empty and non-strings", () => {
    expect(call("isTranslationValid", ["hello"])).toBe(true);
    expect(call("isTranslationValid", ["  x  "])).toBe(true);
    expect(call("isTranslationValid", [""])).toBe(false);
    expect(call("isTranslationValid", ["   "])).toBe(false);
    expect(call("isTranslationValid", [null])).toBe(false);
  });

  test("extractTranslation returns message map from JSON", () => {
    const json = JSON.stringify({
      locale_data: {
        messages: {
          "": { domain: "messages", lang: "en" },
          Hello: "Hola",
          Empty: "",
        },
      },
    });
    expect(call("extractTranslation", [json, "json"])).toEqual({
      Hello: "Hola",
    });
  });

  test("updateTranslation merges additions without overwriting existing", () => {
    const existing = JSON.stringify({
      locale_data: { messages: { Keep: "A", Add: "B" } },
    });
    const out = JSON.parse(
      call("updateTranslation", [existing, { Add: "X", New: "Y" }, "json"]),
    );
    expect(out.locale_data.messages.Keep).toBe("A");
    expect(out.locale_data.messages.Add).toBe("B");
    expect(out.locale_data.messages.New).toBe("Y");
  });

  test("extractInternalPackages parses asset.php internal_packages", () => {
    const php = `<?php return [
      'dependencies' => [],
      'internal_packages' => [ 'hooks', 'utils' ],
    ];`;
    expect(call("extractInternalPackages", [php])).toEqual(["hooks", "utils"]);
  });

  test("mergeTranslationFiles merges other files into main", () => {
    const dir = mkdtempSync(join(tmpdir(), "wpdev-tr-"));
    try {
      const mainPath = join(dir, "main.json");
      writeFileSync(
        mainPath,
        JSON.stringify({
          locale_data: { messages: { A: "a", B: "b" } },
        }),
        "utf8",
      );
      const otherPath = join(dir, "other.json");
      writeFileSync(
        otherPath,
        JSON.stringify({
          locale_data: { messages: { B: "override", C: "c" } },
        }),
        "utf8",
      );

      const res = call("mergeTranslationFiles", [
        mainPath,
        [otherPath],
        "json",
      ]);
      expect(res.wrote).toBe(mainPath);
      const merged = JSON.parse(readFileSync(mainPath, "utf8"));
      expect(merged.locale_data.messages.A).toBe("a");
      expect(merged.locale_data.messages.B).toBe("b");
      expect(merged.locale_data.messages.C).toBe("c");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
