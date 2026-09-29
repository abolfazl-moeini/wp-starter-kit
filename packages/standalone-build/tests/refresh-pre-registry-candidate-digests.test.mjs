import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const exec = promisify(execFile);
const script = path.resolve(packageRoot, "refresh-pre-registry-candidate-digests.mjs");
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

const MANIFEST_NAME = "profile-a-pre-registry-candidate.json";

async function fixture({ toolBytes = "tool-v1\n", pinnedDigest = "a".repeat(64) } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "refresh-candidate-"));
  const toolPath = path.join(root, "tools", "run-gate.mjs");
  await mkdir(path.dirname(toolPath), { recursive: true });
  await writeFile(toolPath, toolBytes);
  const contractPath = path.join(
    root,
    "plugins/tavangary-theme-panel/dev/prefix-migration-coexistence-contract.json",
  );
  await mkdir(path.dirname(contractPath), { recursive: true });
  await writeFile(contractPath, "{}\n");
  const manifestPath = path.join(
    root,
    "plugins/tavangary-theme-panel/dev",
    MANIFEST_NAME,
  );
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        schema: 1,
        purpose: "profile-a-pre-registry-candidate",
        consumer: "tavangary-theme-panel",
        recordStatus: "review-only",
        buildInput: false,
        source: { worktree: "dirty-unrelated-user-changes-present" },
        toolInputs: [{ path: "tools/run-gate.mjs", sha256: pinnedDigest }],
        migrationContract: {
          path: "plugins/tavangary-theme-panel/dev/prefix-migration-coexistence-contract.json",
          sha256: sha("{}\n"),
        },
        target: { vendorPrefix: "TavangaryThemePanelVendor" },
        digests: { source: null, artifact: null, toolBundle: null },
        blockers: ["pending"],
      },
      null,
      2,
    )}\n`,
  );
  return { root, toolPath, manifestPath };
}

test("recomputes stale pinned digests from live tool bytes", async () => {
  const fx = await fixture();
  const before = await readFile(fx.manifestPath, "utf8");
  assert.ok(before.includes(`"sha256": "${"a".repeat(64)}"`));

  const result = await exec(process.execPath, [script, fx.root, fx.manifestPath]);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "refreshed");
  assert.deepEqual(report.updated, ["tools/run-gate.mjs"]);

  const after = JSON.parse(await readFile(fx.manifestPath, "utf8"));
  assert.equal(after.toolInputs[0].sha256, sha("tool-v1\n"));
  assert.equal(after.recordStatus, "review-only");
  assert.equal(after.buildInput, false);
  assert.deepEqual(after.digests, { source: null, artifact: null, toolBundle: null });
  await rm(fx.root, { recursive: true, force: true });
});

test("is a no-op when every pinned digest already matches", async () => {
  const fx = await fixture({ pinnedDigest: sha("tool-v1\n") });
  const before = await readFile(fx.manifestPath, "utf8");
  const result = await exec(process.execPath, [script, fx.root, fx.manifestPath]);
  assert.equal(JSON.parse(result.stdout).status, "unchanged");
  assert.equal(await readFile(fx.manifestPath, "utf8"), before);
  await rm(fx.root, { recursive: true, force: true });
});

test("fails closed without writing when a pinned tool input is missing", async () => {
  const fx = await fixture();
  await rm(fx.toolPath);
  const before = await readFile(fx.manifestPath, "utf8");
  await assert.rejects(
    exec(process.execPath, [script, fx.root, fx.manifestPath]),
    (error) => error.stdout.includes("tools/run-gate.mjs"),
  );
  assert.equal(await readFile(fx.manifestPath, "utf8"), before);
  await rm(fx.root, { recursive: true, force: true });
});

test("refuses symlinked tool inputs and symlinked manifest", async () => {
  const fx = await fixture();
  const realTool = path.join(fx.root, "tools", "real.mjs");
  await writeFile(realTool, "real\n");
  await rm(fx.toolPath);
  await symlink(realTool, fx.toolPath);
  await assert.rejects(
    exec(process.execPath, [script, fx.root, fx.manifestPath]),
    (error) => error.stdout.includes("regular non-symlink"),
  );

  const manifestCopy = path.join(fx.root, "copy-dir", MANIFEST_NAME);
  await mkdir(path.dirname(manifestCopy), { recursive: true });
  await symlink(fx.manifestPath, manifestCopy);
  await assert.rejects(
    exec(process.execPath, [script, fx.root, manifestCopy]),
    (error) => error.stdout.includes("regular non-symlink"),
  );
  await rm(fx.root, { recursive: true, force: true });
});

test("refuses unexpected manifest filenames and non-review-only records", async () => {
  const fx = await fixture();
  const wrongName = path.join(fx.root, "candidate.json");
  await writeFile(wrongName, await readFile(fx.manifestPath, "utf8"));
  await assert.rejects(
    exec(process.execPath, [script, fx.root, wrongName]),
    (error) => error.stdout.includes("manifest file name must be"),
  );

  const promoted = JSON.parse(await readFile(fx.manifestPath, "utf8"));
  promoted.buildInput = true;
  await writeFile(fx.manifestPath, JSON.stringify(promoted, null, 2));
  await assert.rejects(
    exec(process.execPath, [script, fx.root, fx.manifestPath]),
    (error) => error.stdout.includes("review-only"),
  );
  await rm(fx.root, { recursive: true, force: true });
});

test("rejects traversal and duplicate tool input paths", async () => {
  const fx = await fixture();
  const escaped = JSON.parse(await readFile(fx.manifestPath, "utf8"));
  escaped.toolInputs.push({ path: "../outside.mjs", sha256: "b".repeat(64) });
  await writeFile(fx.manifestPath, JSON.stringify(escaped, null, 2));
  await assert.rejects(
    exec(process.execPath, [script, fx.root, fx.manifestPath]),
    (error) => error.stdout.includes("unsafe tool input path"),
  );

  const duplicated = JSON.parse(await readFile(fx.manifestPath, "utf8"));
  duplicated.toolInputs = [
    { path: "tools/run-gate.mjs", sha256: "b".repeat(64) },
    { path: "tools/run-gate.mjs", sha256: "c".repeat(64) },
  ];
  await writeFile(fx.manifestPath, JSON.stringify(duplicated, null, 2));
  await assert.rejects(
    exec(process.execPath, [script, fx.root, fx.manifestPath]),
    (error) => error.stdout.includes("duplicate tool input"),
  );
  await rm(fx.root, { recursive: true, force: true });
});

test("rejects relative or missing paths", async () => {
  const fx = await fixture();
  await assert.rejects(
    exec(process.execPath, [script, "relative-root", fx.manifestPath]),
    (error) => error.stdout.includes("contentRoot path must be absolute"),
  );
  await assert.rejects(
    exec(process.execPath, [script, fx.root, "manifest.json"]),
    (error) => error.stdout.includes("manifest path must be absolute"),
  );
  await rm(fx.root, { recursive: true, force: true });
});
