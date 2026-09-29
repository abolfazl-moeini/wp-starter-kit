import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../validate-profile-a-readiness.mjs",
);

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value)}\n`);
}

test("rejects approved manifests that omit inventoried closure paths and settings fields", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-readiness-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [{ consumer: "pilot", status: "approved", buildInput: true, migrationRequired: false, currentVendorPrefix: "PilotVendor" }],
      collisions: {},
    });
    await writeJson(path.join(root, "framework-closure-inventory.json"), {
      scope: { consumer: "pilot" },
      literalIncludeClosure: { files: ["modules/runtime.php"] },
    });
    await writeJson(path.join(root, "settings-field-inventory.json"), {
      plugins: { pilot: { fields: { owned_setting: ["settings.php"] } } },
    });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      consumer: "pilot",
      sourceInventory: "framework-closure-inventory.json",
      status: "approved",
      buildInput: true,
      candidatePaths: [],
      blockers: {},
      reviewApproval: {
        schema: 1,
        approver: "Farid",
        date: "2026-08-28",
        accurateList: true,
        scope: "Reviewed candidate-path list.",
        limitations: ["Roles remain unresolved."],
        promotionImpact: "review-only",
      },
    });
    await writeJson(path.join(root, "plugins/pilot/dev/settings-ownership-review-manifest.json"), {
      consumer: "pilot",
      sourceInventory: "settings-field-inventory.json",
      status: "approved",
      buildInput: true,
      candidateFields: [],
      blockers: {},
      reviewApproval: {
        schema: 1,
        approver: "Farid",
        date: "2026-08-28",
        accurateList: true,
        scope: "Reviewed settings list.",
        limitations: ["Mixed-version behavior remains unresolved."],
        promotionImpact: "review-only",
      },
    });
    await writeJson(path.join(root, "plugins/pilot/dev/template-dependency-review.json"), {
      calls: [],
      resolvedLiteralFiles: {},
      blockers: {},
    });

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.status, "blocked");
        assert.ok(report.failures.some((failure) => failure.includes("does not exactly match source inventory")));
        assert.equal(report.failures.some((failure) => failure.includes("reviewApproval")), false);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a consumer argument that can escape the plugins root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-consumer-"));
  try {
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "../../outside"]),
      (error) => {
        assert.notEqual(error.code, 0);
        assert.match(error.stderr, /invalid consumer slug/i);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires an explicit immutable prefix registry input", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-registry-required-"));
  try {
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(
          report.failures.some((failure) => failure.includes("immutable prefix registry: explicit registry path is required")),
          "Profile A readiness must not run without an explicit immutable registry input.",
        );
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects malformed non-promoting review approval metadata", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-review-approval-shape-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1,
      consumer: "pilot",
      sourceInventory: "closure-inventory.json",
      status: "approved",
      buildInput: true,
      candidatePaths: [],
      blockers: {},
      reviewApproval: { schema: 1, approver: "Farid" },
    });
    await writeJson(path.join(root, "closure-inventory.json"), { literalIncludeClosure: { files: [] } });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(report.failures.some((failure) => failure.includes("closure manifest: reviewApproval")));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects promotion when serialized callback review evidence is absent", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-serialized-review-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [{ consumer: "pilot", status: "approved", buildInput: true, migrationRequired: false, currentVendorPrefix: "PilotVendor" }],
      collisions: {},
    });
    await writeJson(path.join(root, "framework-closure-inventory.json"), {
      scope: { consumer: "pilot" },
      literalIncludeClosure: { files: [] },
    });
    await writeJson(path.join(root, "settings-field-inventory.json"), {
      plugins: { pilot: { fields: {} } },
    });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1, consumer: "pilot", sourceInventory: "framework-closure-inventory.json", status: "approved", buildInput: true, candidatePaths: [], blockers: {},
    });
    await writeJson(path.join(root, "plugins/pilot/dev/settings-ownership-review-manifest.json"), {
      schema: 1, consumer: "pilot", sourceInventory: "settings-field-inventory.json", status: "approved", buildInput: true, candidateFields: [], blockers: {},
    });
    await writeJson(path.join(root, "plugins/pilot/dev/template-dependency-review.json"), {
      calls: [], resolvedLiteralFiles: {}, blockers: {},
    });

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(
          report.failures.some((failure) => failure.includes("serialized callback review manifest")),
          "Missing serialized callback review evidence must block Profile A readiness.",
        );
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports malformed prefix inventory collections without crashing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-malformed-prefix-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: { invalid: true },
      collisions: {},
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.status, "blocked");
        assert.ok(report.failures.includes("artifact-prefix-inventory.json: artifacts must be an array"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects symlinked Profile A evidence paths", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-symlink-evidence-"));
  try {
    const target = path.join(root, "prefix-target.json");
    await writeJson(target, { artifacts: [], collisions: {} });
    await symlink(target, path.join(root, "artifact-prefix-inventory.json"));
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.status, "blocked");
        assert.ok(report.failures.some((failure) => failure.includes("symlink evidence path is not allowed")));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports malformed review candidate collections without crashing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-malformed-review-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [], collisions: {},
    });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1,
      consumer: "pilot",
      status: "approved",
      buildInput: true,
      sourceInventory: "missing.json",
      candidatePaths: { invalid: true },
      blockers: {},
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.status, "blocked");
        assert.ok(report.failures.includes("closure manifest: candidate paths must be an array"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires explicit review candidate collections", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-missing-review-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [], collisions: {},
    });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1,
      consumer: "pilot",
      status: "approved",
      buildInput: true,
      sourceInventory: "missing.json",
      blockers: {},
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(report.failures.includes("closure manifest: candidate paths must be an array"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports non-object review candidates without crashing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-review-entry-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [], collisions: {},
    });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1,
      consumer: "pilot",
      status: "approved",
      buildInput: true,
      sourceInventory: "missing.json",
      candidatePaths: [null],
      blockers: {},
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.status, "blocked");
        assert.ok(report.failures.includes("closure manifest: candidate paths[0] must be an object"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports malformed closure inventory file collections without crashing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-closure-inventory-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [], collisions: {},
    });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1,
      consumer: "pilot",
      status: "approved",
      buildInput: true,
      sourceInventory: "closure-inventory.json",
      candidatePaths: [],
      blockers: {},
    });
    await writeJson(path.join(root, "closure-inventory.json"), {
      literalIncludeClosure: { files: { invalid: true } },
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.status, "blocked");
        assert.ok(report.failures.includes("closure inventory: literal include files must be an array"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects duplicate or unsafe literal include evidence before exact closure matching", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-unsafe-closure-files-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1,
      consumer: "pilot",
      status: "approved",
      buildInput: true,
      sourceInventory: "closure-inventory.json",
      candidatePaths: [{ path: "modules/runtime.php", status: "approved", proposedRole: "encode" }],
      blockers: {},
    });
    await writeJson(path.join(root, "closure-inventory.json"), {
      literalIncludeClosure: { files: ["modules/runtime.php", "modules/runtime.php", "../escape.php"] },
    });

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(report.failures.includes("closure inventory: duplicate literal include file modules/runtime.php"));
        assert.ok(report.failures.includes("closure inventory: literal include files[2] has unsafe path"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires an explicit template-call collection", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-template-review-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [], collisions: {},
    });
    await writeJson(path.join(root, "plugins/pilot/dev/template-dependency-review.json"), {
      calls: { invalid: true },
      resolvedLiteralFiles: {},
      blockers: {},
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.status, "blocked");
        assert.ok(report.failures.includes("template dependency review: calls must be an array"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires a structured blocker map", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-missing-blockers-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [], collisions: {},
    });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1,
      consumer: "pilot",
      status: "approved",
      buildInput: true,
      sourceInventory: "missing.json",
      candidatePaths: [],
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(report.failures.includes("closure manifest: blockers must be an object"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports malformed template literal-file mappings without crashing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-template-files-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [], collisions: {},
    });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1,
      consumer: "pilot",
      status: "approved",
      buildInput: true,
      sourceInventory: "closure-inventory.json",
      templateInventory: "template-review.json",
      candidatePaths: [],
      blockers: {},
    });
    await writeJson(path.join(root, "closure-inventory.json"), {
      literalIncludeClosure: { files: [] },
    });
    await writeJson(path.join(root, "template-review.json"), {
      calls: [],
      resolvedLiteralFiles: { "template/name": "not-an-array" },
      blockers: {},
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.status, "blocked");
        assert.ok(report.failures.includes("template dependency review: resolvedLiteralFiles.template/name must be an array"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires serialized callback inventory findings", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-missing-serialized-findings-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/serialized-callback-review-manifest.json"), {
      schema: 1,
      consumer: "pilot",
      status: "approved",
      buildInput: true,
      sourceInventory: "serialized-inventory.json",
      candidateFindings: [],
      blockers: {},
    });
    await writeJson(path.join(root, "serialized-inventory.json"), {});
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(report.failures.includes("serialized callback inventory: findings must be an array"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires settings inventory fields map", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-missing-settings-fields-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/settings-ownership-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "settings-inventory.json", candidateFields: [], blockers: {},
    });
    await writeJson(path.join(root, "settings-inventory.json"), { plugins: { pilot: {} } });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(report.failures.includes("settings inventory: fields must be an object"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires a structured prefix collision map", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-collisions-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [], collisions: [],
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(report.failures.includes("artifact-prefix-inventory.json: collisions must be an object"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports malformed prefix collision owners", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-collision-owners-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [{ consumer: "pilot", currentVendorPrefix: "WpdevVendor" }],
      collisions: { WpdevVendor: "pilot" },
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(report.failures.includes("artifact-prefix-inventory.json: collisions.WpdevVendor must be an array"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports non-string template literal-file entries", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-template-entry-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "closure-inventory.json", templateInventory: "template-review.json",
      candidatePaths: [], blockers: {},
    });
    await writeJson(path.join(root, "closure-inventory.json"), { literalIncludeClosure: { files: [] } });
    await writeJson(path.join(root, "template-review.json"), {
      calls: [], resolvedLiteralFiles: { "template/name": [null] }, blockers: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("template dependency review: resolvedLiteralFiles.template/name[0] must be a string"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects unsafe template literal-file paths", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-unsafe-template-path-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "closure-inventory.json", templateInventory: "template-review.json",
      candidatePaths: [], blockers: {},
    });
    await writeJson(path.join(root, "closure-inventory.json"), { literalIncludeClosure: { files: [] } });
    await writeJson(path.join(root, "template-review.json"), {
      calls: [], resolvedLiteralFiles: { "template/name": ["../outside.php"] }, blockers: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("template dependency review: resolvedLiteralFiles.template/name[0] has unsafe path"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects unsafe review candidate paths", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-unsafe-candidate-path-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "closure-inventory.json",
      candidatePaths: [{ path: "../outside.php", status: "approved", proposedRole: "encode" }],
      blockers: {},
    });
    await writeJson(path.join(root, "closure-inventory.json"), { literalIncludeClosure: { files: [] } });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("closure manifest: candidate paths[0] has unsafe path"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects review candidates missing required identifiers", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-missing-candidate-id-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "closure-inventory.json", candidatePaths: [{ status: "approved" }], blockers: {},
    });
    await writeJson(path.join(root, "closure-inventory.json"), { literalIncludeClosure: { files: [] } });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("closure manifest: candidate paths[0].path must be a non-empty string"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects settings candidates missing keys", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-missing-settings-key-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/settings-ownership-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "settings-inventory.json", candidateFields: [{}], blockers: {},
    });
    await writeJson(path.join(root, "settings-inventory.json"), { plugins: { pilot: { fields: {} } } });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("settings ownership manifest: candidate fields[0].key must be a non-empty string"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects serialized findings missing identity fields", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-missing-finding-id-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/serialized-callback-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "serialized-inventory.json", candidateFindings: [{}], blockers: {},
    });
    await writeJson(path.join(root, "serialized-inventory.json"), { findings: [] });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("serialized callback review manifest: candidate findings[0] has invalid identity"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports non-object serialized inventory findings", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-finding-entry-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/serialized-callback-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "serialized-inventory.json", candidateFindings: [], blockers: {},
    });
    await writeJson(path.join(root, "serialized-inventory.json"), { findings: [null] });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("serialized callback inventory: findings[0] must be an object"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires settings inventory plugin map", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-missing-settings-plugin-map-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/settings-ownership-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "settings-inventory.json", candidateFields: [], blockers: {},
    });
    await writeJson(path.join(root, "settings-inventory.json"), { plugins: [] });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("settings inventory: plugins must be an object"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires settings inventory consumer entry", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-missing-settings-consumer-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/settings-ownership-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "settings-inventory.json", candidateFields: [], blockers: {},
    });
    await writeJson(path.join(root, "settings-inventory.json"), { plugins: { other: { fields: {} } } });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("settings inventory: consumer entry is required"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects empty template mapping keys", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-empty-template-key-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "closure-inventory.json", templateInventory: "template-review.json",
      candidatePaths: [], blockers: {},
    });
    await writeJson(path.join(root, "closure-inventory.json"), { literalIncludeClosure: { files: [] } });
    await writeJson(path.join(root, "template-review.json"), {
      calls: [], resolvedLiteralFiles: { "": [] }, blockers: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("template dependency review: resolvedLiteralFiles key must be a non-empty string"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports malformed template call entries", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-template-call-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/template-dependency-review.json"), {
      calls: [null], resolvedLiteralFiles: {}, blockers: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("template dependency review: calls[0] must be an object"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("allows review-only dynamic template calls without promoting them", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-dynamic-template-call-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/template-dependency-review.json"), {
      calls: [{ file: "src/a.php", expression: "$view", literalView: null }],
      resolvedLiteralFiles: {}, blockers: { dynamicTemplateExpressions: ["src/a.php"] },
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(!report.failures.includes("template dependency review: calls[0] has invalid identity"));
      assert.ok(report.failures.includes("template dependency review: unresolved blocker dynamicTemplateExpressions"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects unsafe template call source paths", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-unsafe-template-call-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/template-dependency-review.json"), {
      calls: [{ file: "../outside.php", expression: "x", literalView: "v" }],
      resolvedLiteralFiles: {}, blockers: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("template dependency review: calls[0].file has unsafe path"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects unsafe serialized finding source paths", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-unsafe-finding-file-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/serialized-callback-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "serialized-inventory.json",
      candidateFindings: [{ file: "../outside.php", line: 1, kind: "magic", operation: "unserialize", compatibility: "approved" }],
      blockers: {},
    });
    await writeJson(path.join(root, "serialized-inventory.json"), { findings: [] });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("serialized callback review manifest: candidate findings[0].file has unsafe path"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects settings candidates with invalid owners", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-settings-owner-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/settings-ownership-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "settings-inventory.json",
      candidateFields: [{ key: "field", owner: 123 }], blockers: {},
    });
    await writeJson(path.join(root, "settings-inventory.json"), { plugins: { pilot: { fields: { field: {} } } } });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("settings ownership manifest: candidate fields[0].owner must be a non-empty string"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects settings candidates missing evidence arrays", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-missing-settings-evidence-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/settings-ownership-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "settings-inventory.json",
      candidateFields: [{ key: "field", owner: "pilot", evidence: {} }], blockers: {},
    });
    await writeJson(path.join(root, "settings-inventory.json"), { plugins: { pilot: { fields: { field: {} } } } });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("settings ownership manifest: candidate fields[0].evidence.registeredBy must be an array"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects non-string settings evidence entries", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-settings-evidence-entry-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/settings-ownership-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "settings-inventory.json",
      candidateFields: [{ key: "field", owner: "pilot", evidence: { registeredBy: [null], directAccess: [] } }], blockers: {},
    });
    await writeJson(path.join(root, "settings-inventory.json"), { plugins: { pilot: { fields: { field: {} } } } });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("settings ownership manifest: candidate fields[0].evidence.registeredBy[0] must be a non-empty string"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects unsafe template view identifiers", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-unsafe-view-id-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/template-dependency-review.json"), {
      calls: [{ file: "source.php", expression: "x", literalView: "../\u0000view" }],
      resolvedLiteralFiles: {}, blockers: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("template dependency review: calls[0].literalView has unsafe identifier"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects absolute template view identifiers", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-absolute-view-id-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/template-dependency-review.json"), {
      calls: [{ file: "source.php", expression: "x", literalView: "/absolute/view" }], resolvedLiteralFiles: {}, blockers: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      assert.ok(JSON.parse(error.stdout).failures.includes("template dependency review: calls[0].literalView has unsafe identifier"));
      return true;
    });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("rejects duplicate template literal-file evidence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-duplicate-template-file-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/closure-review-manifest.json"), {
      schema: 1, consumer: "pilot", status: "approved", buildInput: true,
      sourceInventory: "closure-inventory.json", templateInventory: "template-review.json",
      candidatePaths: [], blockers: {},
    });
    await writeJson(path.join(root, "closure-inventory.json"), { literalIncludeClosure: { files: [] } });
    await writeJson(path.join(root, "template-review.json"), {
      calls: [], resolvedLiteralFiles: { one: ["src/view.php"], two: ["src/view.php"] }, blockers: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("template dependency review: duplicate resolved file src/view.php"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects duplicate template call identities", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-duplicate-template-call-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/template-dependency-review.json"), {
      calls: [
        { file: "src/a.php", expression: "x", literalView: "v" },
        { file: "src/a.php", expression: "x", literalView: "v" },
      ],
      resolvedLiteralFiles: {}, blockers: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("template dependency review: duplicate call src/a.php:x:v"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects invalid prefix collision owners", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-collision-owner-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [], collisions: { Prefix: [null] },
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("artifact-prefix-inventory.json: collisions.Prefix[0] must be a non-empty string"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects duplicate prefix collision owners", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-duplicate-collision-owner-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [], collisions: { Prefix: ["pilot", "pilot"] },
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("artifact-prefix-inventory.json: collisions.Prefix has duplicate owners"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects invalid prefix collision keys", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-collision-key-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [], collisions: { "": [] },
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("artifact-prefix-inventory.json: collision key must be a valid prefix"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects malformed artifact prefix fields", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-artifact-prefix-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [{ consumer: "pilot", currentVendorPrefix: "bad-prefix", proposedVendorPrefix: "" }],
      collisions: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("pilot: currentVendorPrefix must be a valid prefix"));
      assert.ok(report.failures.includes("pilot: proposedVendorPrefix must be a valid prefix"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports non-object artifact inventory entries", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-artifact-entry-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [null], collisions: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("artifact-prefix-inventory.json: artifacts[0] must be an object"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects artifact inventory entries missing identity", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-missing-artifact-identity-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [{ currentVendorPrefix: "WpdevVendor", proposedVendorPrefix: "PilotVendor" }], collisions: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("artifact-prefix-inventory.json: artifacts[0].consumer must be a non-empty string"));
      assert.ok(report.failures.includes("artifact-prefix-inventory.json: artifacts[0].slug must be a non-empty string"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects malformed artifact inventory state", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-artifact-state-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [{ consumer: "pilot", slug: "pilot", status: "approved", buildInput: "yes" }], collisions: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("artifact-prefix-inventory.json: artifacts[0].buildInput must be boolean"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recognizes review-required artifact inventory state without promotion", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-review-required-state-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [{ consumer: "pilot", slug: "pilot", status: "review-required", buildInput: false, migrationRequired: true, currentVendorPrefix: "WpdevVendor", proposedVendorPrefix: "PilotVendor" }], collisions: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(!report.failures.some((failure) => failure.includes("artifacts[0].status is invalid")));
      assert.ok(report.failures.includes("pilot: prefix entry is review-only; an accepted immutable registry entry is required"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects malformed migration state", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-migration-state-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [{ consumer: "pilot", slug: "pilot", status: "approved", buildInput: true, migrationRequired: "no" }], collisions: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("artifact-prefix-inventory.json: artifacts[0].migrationRequired must be boolean"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects malformed prefixes on non-selected artifacts", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-other-prefix-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [{ consumer: "other", slug: "other", status: "approved", buildInput: true, migrationRequired: false, currentVendorPrefix: "bad-", proposedVendorPrefix: "Good" }],
      collisions: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("artifact-prefix-inventory.json: artifacts[0].currentVendorPrefix must be a valid prefix"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects invalid artifact identity slugs", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-invalid-artifact-slug-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [{ consumer: "bad slug", slug: "bad/slug", status: "approved", buildInput: true, migrationRequired: false, currentVendorPrefix: "Good", proposedVendorPrefix: "Good" }],
      collisions: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("artifact-prefix-inventory.json: artifacts[0].consumer must be a valid slug"));
      assert.ok(report.failures.includes("artifact-prefix-inventory.json: artifacts[0].slug must be a valid slug"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects promotion when hook-contract inventory is absent", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-missing-hooks-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(
          report.failures.some((failure) => failure.includes("hook contract inventory")),
          "Missing hook-contract evidence must block Profile A readiness.",
        );
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects unclassified hook ownership and unproven dynamic identifier domains", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-unclassified-hooks-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "hook-contract-inventory.json"), {
      schema: 1,
      scope: { consumer: "pilot" },
      contracts: {
        wpdev_public: {
          ownership: "unclassified",
          compatibility: "frozen-public",
          matchingFrameworkDynamicProducers: [],
        },
        wpdev_dynamic: {
          ownership: "product-public",
          compatibility: "frozen-public",
          matchingFrameworkDynamicProducers: [{ path: "modules/dynamic.php" }],
        },
      },
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(report.failures.includes("hook contract inventory: 1 contracts have unclassified or unapproved ownership"));
        assert.ok(report.failures.includes("hook contract inventory: 1 contracts have unproven dynamic identifier domains"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports malformed hook-contract collections without crashing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-malformed-hooks-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "hook-contract-inventory.json"), {
      schema: 1,
      scope: { consumer: "pilot" },
      contracts: ["wpdev_public"],
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.equal(report.status, "blocked");
        assert.ok(report.failures.includes("hook contract inventory: contracts must be an object"));
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects emptied template blockers when external-listener coverage remains incomplete", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-template-coverage-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), { artifacts: [], collisions: {} });
    await writeJson(path.join(root, "plugins/pilot/dev/template-dependency-review.json"), {
      calls: [],
      resolvedLiteralFiles: {},
      blockers: {},
      externalListenerCoverage: {
        status: "incomplete",
        scannedRoots: ["plugins/pilot"],
        notProven: "repository-only scan",
      },
    });
    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "pilot"]),
      (error) => {
        const report = JSON.parse(error.stdout);
        assert.ok(
          report.failures.includes("template dependency review: external listener coverage is incomplete"),
          "Incomplete external-listener coverage must block even when the blockers map is emptied.",
        );
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects duplicate artifact inventory identities", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-a-duplicate-artifact-id-"));
  try {
    await writeJson(path.join(root, "artifact-prefix-inventory.json"), {
      artifacts: [
        { consumer: "pilot", slug: "pilot", status: "approved", buildInput: true, migrationRequired: false, currentVendorPrefix: "Good", proposedVendorPrefix: "Good" },
        { consumer: "pilot", slug: "other", status: "approved", buildInput: true, migrationRequired: false, currentVendorPrefix: "Other", proposedVendorPrefix: "Other" },
      ], collisions: {},
    });
    await assert.rejects(execFileAsync(process.execPath, [script, root, "pilot"]), (error) => {
      const report = JSON.parse(error.stdout);
      assert.ok(report.failures.includes("artifact-prefix-inventory.json: duplicate consumer pilot"));
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
