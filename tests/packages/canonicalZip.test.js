import { describe, expect, test } from "@jest/globals";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { createCanonicalZip } from "../../packages/create-wp-project/src/release/canonical-zip.js";

const digest = async (file) =>
  crypto
    .createHash("sha256")
    .update(await fs.readFile(file))
    .digest("hex");

describe("canonical ZIP writer", () => {
  test("is deterministic, sorted, and extractable", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "wpdev-canonical-zip-"),
    );
    const source = path.join(root, "plugin");
    await fs.mkdir(path.join(source, "z"), { recursive: true });
    await fs.mkdir(path.join(source, "a"), { recursive: true });
    await fs.writeFile(path.join(source, "z/file.txt"), "z\n");
    await fs.writeFile(path.join(source, "a/file.txt"), "a\n");
    await fs.utimes(
      path.join(source, "z/file.txt"),
      new Date("2025-01-01"),
      new Date("2025-01-01"),
    );
    const first = path.join(root, "one.zip");
    const second = path.join(root, "two.zip");
    await createCanonicalZip({
      sourceRoot: source,
      outputZip: first,
      rootName: "plugin",
    });
    await fs.utimes(
      path.join(source, "z/file.txt"),
      new Date("2035-01-01"),
      new Date("2035-01-01"),
    );
    await createCanonicalZip({
      sourceRoot: source,
      outputZip: second,
      rootName: "plugin",
    });
    await expect(digest(first)).resolves.toBe(await digest(second));
    const listing = spawnSync("unzip", ["-Z1", first], { encoding: "utf8" });
    expect(listing.status).toBe(0);
    expect(listing.stdout.trim().split("\n")).toEqual([
      "plugin/a/file.txt",
      "plugin/z/file.txt",
    ]);
    const check = spawnSync("unzip", ["-t", first], { encoding: "utf8" });
    expect(check.status).toBe(0);
    await fs.rm(root, { recursive: true, force: true });
  });
});
