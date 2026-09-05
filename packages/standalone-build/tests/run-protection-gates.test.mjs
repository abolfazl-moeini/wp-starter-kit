import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { rm, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { resolveContentRoot } from "../resolve-content-root.mjs";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let contentRoot;
if (process.env.WPDEV_CONTENT_ROOT) {
  contentRoot = path.resolve(process.env.WPDEV_CONTENT_ROOT);
} else {
  try {
    contentRoot = resolveContentRoot({ scriptDir: packageRoot, cwd: process.cwd(), env: process.env });
  } catch (err) {
    const fallback = "/Users/moeini/Dev/tavangary.new/wordpress/wp-content";
    if (fs.existsSync(fallback)) {
      contentRoot = fallback;
    } else {
      throw err;
    }
  }
}
const script = path.resolve(packageRoot, "run-protection-gates.mjs");

test("aggregates blocked read-only gates without mutating the workspace", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-gates-"));
  const registry = path.join(root, "registry.json");
  const inventoryPath = path.join(contentRoot, "artifact-prefix-inventory.json");
  const inventoryBefore = await readFile(inventoryPath, "utf8");
  try {
    await writeFile(
      registry,
      JSON.stringify({
        version: 1,
        registryPurpose: "private-runtime-artifacts",
        digestScheme: "sha256(sorted-posix-path\\0file-bytes\\0)",
        artifacts: [],
      }),
    );

    await assert.rejects(
      execFileAsync(process.execPath, [
        script,
        contentRoot,
        "tavangary-theme-panel",
        registry,
      ]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.status, "blocked");
        assert.deepEqual(
          report.gates.map((gate) => gate.name),
          ["composer-release-policy", "profile-a-readiness"],
        );
        assert.equal(report.gates[0].status, "ready");
        assert.equal(report.gates[1].status, "blocked");
        assert.deepEqual(
          report.evidenceGates.map((gate) => gate.name),
          ["closure-review-manifest", "test-portability-manifest", "settings-ownership-review", "serialized-callback-review", "profile-a-pre-registry-candidate", "template-dependency-review", "hook-contract-review", "hook-contract-dynamic-domain", "template-resolver-contract", "prefix-migration-contract"],
          "Draft portability, settings, closure, serialized callback, template dependency, hook dynamic domain, template resolver, and migration evidence must be reported without converting any into a promotion gate",
        );
        for (const evidenceGate of report.evidenceGates) {
          assert.equal(evidenceGate.status, "valid-review-evidence");
          assert.equal(evidenceGate.report.promotionReady, false);
        }
        assert.ok(
          report.failures.some((failure) =>
            failure.includes("profile-a-readiness: immutable prefix registry:"),
          ),
        );
        return true;
      },
    );
    assert.equal(await readFile(inventoryPath, "utf8"), inventoryBefore);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
