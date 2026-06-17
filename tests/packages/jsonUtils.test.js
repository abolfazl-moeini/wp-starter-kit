import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { updateJsonFile } from "../../packages/create-wp-project/src/json-utils.js";

/**
 * Phase 20.11 / 20.12 — updateJsonFile() helper.
 *
 * The kit edits a number of JSON files in consumer projects
 * (project.config.json, wpdev-kit.json, package.json, etc.) as
 * it adds / removes features. The naive approach — read, parse,
 * modify, JSON.stringify with a fixed indent — is wrong: it
 * reformats the entire file, which produces noisy diffs and
 * breaks user customisations.
 *
 * updateJsonFile(filePath, callback) reads a JSON file, parses
 * it, calls callback with the parsed value, writes the result
 * back with the SAME indentation the file had on disk:
 *
 *  - 2-space indent  (the kit default — project.config.json,
 *                     wpdev-kit.json, package.json all use it)
 *  - 4-space indent  (some IDE-formatted configs)
 *  - tab indent      (Makefiles, some style guides)
 *  - compact         (single-line JSON; treated as a degenerate
 *                     0-space indent)
 *
 * The detection rule: take the leading whitespace of the first
 * indented line, then either identify it as a tab (\t) or count
 * spaces. A file with no indentation is "compact" — written back
 * compact.
 *
 * Two contracts are locked:
 *  1. The callback sees the parsed object and can mutate it.
 *     The result is written back, parsed back, and equals what
 *     the callback returned.
 *  2. The original indentation is preserved (no reformatting).
 */
describe("updateJsonFile() — basic round-trip (Phase 20.11/20.12)", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-jsonutils-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("reads, applies the callback, writes back with the same content", async () => {
    const file = path.join(tmp, "config.json");
    const initial = { slug: "my-plugin", version: "0.1.0" };
    await fs.writeFile(file, JSON.stringify(initial, null, 2) + "\n", "utf8");

    const result = await updateJsonFile(file, (cfg) => {
      cfg.version = "0.2.0";
      return cfg;
    });

    expect(result.ok).toBe(true);
    const after = JSON.parse(await fs.readFile(file, "utf8"));
    expect(after).toEqual({ slug: "my-plugin", version: "0.2.0" });
  });

  test("returns the modified object via the callback's return value", async () => {
    const file = path.join(tmp, "config.json");
    await fs.writeFile(file, JSON.stringify({ a: 1 }, null, 2) + "\n", "utf8");

    const result = await updateJsonFile(file, (cfg) => {
      cfg.a = 2;
      return cfg;
    });

    expect(result.value).toEqual({ a: 2 });
  });

  test("throws a clear error if the file is missing", async () => {
    const file = path.join(tmp, "does-not-exist.json");
    await expect(updateJsonFile(file, (cfg) => cfg)).rejects.toThrow(
      /not found|cannot read|ENOENT/i,
    );
  });

  test("throws a clear error if the file is malformed JSON", async () => {
    const file = path.join(tmp, "bad.json");
    await fs.writeFile(file, "{ not valid json", "utf8");
    await expect(updateJsonFile(file, (cfg) => cfg)).rejects.toThrow(
      /malformed|JSON|parse/i,
    );
  });
});

describe("updateJsonFile() — preserves original indentation (Phase 20.12)", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-jsonutils-indent-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("preserves 2-space indentation", async () => {
    const file = path.join(tmp, "config.json");
    const initial = { slug: "p", nested: { a: 1, b: 2 } };
    await fs.writeFile(file, JSON.stringify(initial, null, 2) + "\n", "utf8");

    await updateJsonFile(file, (cfg) => {
      cfg.nested.a = 99;
      return cfg;
    });

    const raw = await fs.readFile(file, "utf8");
    // Every indented line in the file must use exactly 2 spaces.
    const indentedLines = raw.split("\n").filter((l) => /^ +/.test(l));
    for (const l of indentedLines) {
      // The leading whitespace should be a multiple of 2 spaces.
      const m = l.match(/^( +)/);
      expect(m).not.toBeNull();
      expect(m[1].length % 2).toBe(0);
    }
    // 2-space: a nested key sits at column 4 (2 levels × 2 spaces).
    expect(raw).toMatch(/^ {4}"a": 99/m);
  });

  test("preserves 4-space indentation", async () => {
    const file = path.join(tmp, "config.json");
    const initial = { slug: "p", nested: { a: 1, b: 2 } };
    await fs.writeFile(file, JSON.stringify(initial, null, 4) + "\n", "utf8");

    await updateJsonFile(file, (cfg) => {
      cfg.nested.a = 99;
      return cfg;
    });

    const raw = await fs.readFile(file, "utf8");
    // Nested key at column 8 (2 levels × 4 spaces).
    expect(raw).toMatch(/^ {8}"a": 99/m);
  });

  test("preserves tab indentation", async () => {
    const file = path.join(tmp, "config.json");
    const initial = { slug: "p", nested: { a: 1, b: 2 } };
    // Manually build a tab-indented JSON to prove the detector
    // picks the right unit. JSON.stringify with null, '\t' does this.
    await fs.writeFile(
      file,
      JSON.stringify(initial, null, "\t") + "\n",
      "utf8",
    );

    await updateJsonFile(file, (cfg) => {
      cfg.nested.a = 99;
      return cfg;
    });

    const raw = await fs.readFile(file, "utf8");
    // Nested key indented with 2 tabs.
    expect(raw).toMatch(/^\t\t"a": 99/m);
  });

  test("preserves a trailing newline when the original had one", async () => {
    const file = path.join(tmp, "config.json");
    const initial = { slug: "p" };
    await fs.writeFile(file, JSON.stringify(initial, null, 2) + "\n", "utf8");
    await updateJsonFile(file, (cfg) => {
      cfg.slug = "q";
      return cfg;
    });
    const raw = await fs.readFile(file, "utf8");
    expect(raw.endsWith("\n")).toBe(true);
  });

  test("does not add a trailing newline if the original lacked one", async () => {
    const file = path.join(tmp, "config.json");
    const initial = { slug: "p" };
    await fs.writeFile(file, JSON.stringify(initial, null, 2), "utf8");
    await updateJsonFile(file, (cfg) => {
      cfg.slug = "q";
      return cfg;
    });
    const raw = await fs.readFile(file, "utf8");
    expect(raw.endsWith("\n")).toBe(false);
  });

  test("callback can add a NEW key (not just modify existing ones)", async () => {
    const file = path.join(tmp, "config.json");
    const initial = { slug: "p" };
    await fs.writeFile(file, JSON.stringify(initial, null, 2) + "\n", "utf8");

    await updateJsonFile(file, (cfg) => {
      cfg.features = { js: "typescript" };
      return cfg;
    });

    const after = JSON.parse(await fs.readFile(file, "utf8"));
    expect(after.features).toEqual({ js: "typescript" });
  });

  test("callback can delete a key (Phase 22 removeFeature path)", async () => {
    const file = path.join(tmp, "config.json");
    const initial = { slug: "p", obsolete: true };
    await fs.writeFile(file, JSON.stringify(initial, null, 2) + "\n", "utf8");

    await updateJsonFile(file, (cfg) => {
      delete cfg.obsolete;
      return cfg;
    });

    const after = JSON.parse(await fs.readFile(file, "utf8"));
    expect(after.obsolete).toBeUndefined();
    expect(after.slug).toBe("p");
  });
});
