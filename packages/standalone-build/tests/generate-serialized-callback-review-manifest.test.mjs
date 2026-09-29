import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../generate-serialized-callback-review-manifest.mjs",
);

test("creates an unapproved exact review manifest from serialized callback inventory", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-serialized-manifest-"));
  try {
    await mkdir(path.join(root, "plugins/pilot/dev"), { recursive: true });
    await writeFile(path.join(root, "serialized-callback-inventory.json"), JSON.stringify({
      consumer: "pilot",
      findings: [{ file: "plugins/wpdev/runtime.php", line: 9, kind: "deserialization", operation: "unserialize" }],
      blockers: { persistedCallbackClosure: "Unknown values." },
    }));
    const output = path.join(root, "plugins/pilot/dev/manifest.json");
    await execFileAsync(process.execPath, [script, root, "pilot", output]);
    const manifest = JSON.parse(await readFile(output, "utf8"));

    assert.equal(manifest.status, "review-required");
    assert.equal(manifest.buildInput, false);
    assert.deepEqual(manifest.candidateFindings, [{
      file: "plugins/wpdev/runtime.php",
      line: 9,
      kind: "deserialization",
      operation: "unserialize",
      status: "unclassified",
      compatibility: "unclassified",
      review: "Prove stored-data shape with frozen legacy bytes and define migration, adapter, alias, or explicit non-runtime exclusion before any class prefix or relocation.",
    }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
