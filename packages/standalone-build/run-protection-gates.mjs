#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const registryInput = process.argv[4] || "";
const migrationProposalInput = process.argv[5] || process.env.PROTECTION_MIGRATION_PROPOSALS || "";
const failures = [];

async function consumerSourceDir() {
  const canonicalRelative = `plugins/${consumer}`;
  const legacyRelative = `plugins/${consumer}-dev`;
  const mapPath = path.join(contentRoot, "protection-consumer-source-map.json");
  try {
    const stat = await fs.lstat(mapPath);
    if (!stat.isSymbolicLink() && stat.isFile()) {
      const map = JSON.parse(await fs.readFile(mapPath, "utf8"));
      const mapped = map?.consumers?.[consumer];
      if (typeof mapped === "string" && mapped && !path.isAbsolute(mapped) && !mapped.split(/[\\/]+/).includes("..")) {
        const resolved = path.resolve(contentRoot, mapped);
        const relative = path.relative(contentRoot, resolved);
        if (relative && !relative.startsWith(`..${path.sep}`) && relative !== "..") return resolved;
      }
    }
  } catch { /* retain fallback */ }
  try {
    const devDir = path.join(contentRoot, legacyRelative);
    const stat = await fs.lstat(devDir);
    if (stat.isDirectory() && !stat.isSymbolicLink()) return devDir;
  } catch { /* try canonical */ }
  return path.join(contentRoot, canonicalRelative);
}

function parseJson(value) {
  try {
    return JSON.parse(value || "");
  } catch {
    return null;
  }
}

async function runGate(name, scriptName, args) {
  const scriptPath = path.join(scriptDirectory, scriptName);
  try {
    await fs.access(scriptPath);
  } catch (error) {
    return {
      name,
      status: "blocked",
      exitCode: 1,
      report: null,
      stderr: `gate script is not readable: ${error.message}`,
    };
  }

  try {
    const result = await execFileAsync(process.execPath, [scriptPath, ...args], {
      cwd: contentRoot,
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      name,
      status: "ready",
      exitCode: 0,
      report: parseJson(result.stdout),
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  } catch (error) {
    return {
      name,
      status: "blocked",
      exitCode: Number.isInteger(error.code) ? error.code : 1,
      report: parseJson(error.stdout),
      stdout: String(error.stdout || "").trim(),
      stderr: String(error.stderr || error.message || "").trim(),
    };
  }
}

async function runReviewEvidenceGate(name, scriptName, args) {
  const gate = await runGate(name, scriptName, args);
  if (gate.status !== "ready") return gate;

  if (gate.report?.status !== "valid-review-evidence" || gate.report?.promotionReady !== false) {
    return {
      ...gate,
      status: "blocked",
      exitCode: 1,
      stderr: "review-evidence gate returned an invalid promotion state",
    };
  }

  return { ...gate, status: "valid-review-evidence" };
}

if (!registryInput) {
  failures.push("immutable prefix registry: explicit registry path is required");
}

const gates = [
  await runGate("composer-release-policy", "validate-composer-release-policy.mjs", [contentRoot]),
  await runGate("profile-a-readiness", "validate-profile-a-readiness.mjs", [
    contentRoot,
    consumer,
    registryInput,
  ]),
];
const evidenceGates = [
  await runReviewEvidenceGate("closure-review-manifest", "validate-closure-review-manifest.mjs", [contentRoot, consumer]),
  await runReviewEvidenceGate("test-portability-manifest", "validate-test-portability-manifest.mjs", [
    contentRoot,
    consumer,
  ]),
  await runReviewEvidenceGate("settings-ownership-review", "validate-settings-ownership-review.mjs", [
    contentRoot,
    consumer,
  ]),
  await runReviewEvidenceGate("serialized-callback-review", "validate-serialized-callback-review.mjs", [
    contentRoot,
    consumer,
  ]),
];
const sourceDir = await consumerSourceDir();
const candidateManifestCandidates = [
  path.join(sourceDir, "dev", "profile-a-pre-registry-candidate.json"),
];
let candidateManifestPath = null;
for (const candidate of candidateManifestCandidates) {
  try {
    const stat = await fs.lstat(candidate);
    if (stat.isFile() && !stat.isSymbolicLink()) {
      candidateManifestPath = candidate;
      break;
    }
  } catch { /* candidate evidence is optional only by path discovery; missing is blocked */ }
}
evidenceGates.push(candidateManifestPath
  ? await runReviewEvidenceGate("profile-a-pre-registry-candidate", "validate-profile-a-pre-registry-candidate.mjs", [
      candidateManifestPath,
      contentRoot,
    ])
  : {
      name: "profile-a-pre-registry-candidate",
      status: "blocked",
      exitCode: 1,
      report: { failures: [`no pre-registry candidate evidence for ${consumer}`] },
      stderr: "pre-registry candidate evidence is missing",
    });
const templateReviewCandidates = [
  path.join(sourceDir, "dev", "template-dependency-review.json"),
];
let templateReviewPath = null;
for (const candidate of templateReviewCandidates) {
  try { const stat = await fs.lstat(candidate); if (stat.isFile() && !stat.isSymbolicLink()) { templateReviewPath = candidate; break; } } catch { /* try next */ }
}
evidenceGates.push(templateReviewPath
  ? await runReviewEvidenceGate("template-dependency-review", "validate-template-dependency-review.mjs", [templateReviewPath, contentRoot])
  : { name: "template-dependency-review", status: "blocked", exitCode: 1, report: { failures: [`no template dependency review evidence for ${consumer}`] }, stderr: "template dependency review evidence is missing" });
const hookInventoryPath = path.join(contentRoot, "hook-contract-inventory.json");
evidenceGates.push(await runReviewEvidenceGate("hook-contract-review", "validate-hook-contract-review.mjs", [
  hookInventoryPath,
  consumer,
]));
const hookDomainCandidates = [
  path.join(sourceDir, "dev", "hook-contract-dynamic-domain.json"),
];
let hookDomainPath = null;
for (const candidate of hookDomainCandidates) {
  try { const stat = await fs.lstat(candidate); if (stat.isFile() && !stat.isSymbolicLink()) { hookDomainPath = candidate; break; } } catch { /* try next */ }
}
evidenceGates.push(hookDomainPath
  ? await runReviewEvidenceGate("hook-contract-dynamic-domain", "validate-hook-contract-dynamic-domain.mjs", [
      hookDomainPath,
      contentRoot,
      hookInventoryPath,
    ])
  : { name: "hook-contract-dynamic-domain", status: "blocked", exitCode: 1, report: { failures: [`no hook contract dynamic domain evidence for ${consumer}`] }, stderr: "hook contract dynamic domain evidence is missing" });
const resolverContractCandidates = [
  path.join(sourceDir, "dev", "template-resolver-contract.json"),
];
let resolverContractPath = null;
for (const candidate of resolverContractCandidates) {
  try { const stat = await fs.lstat(candidate); if (stat.isFile() && !stat.isSymbolicLink()) { resolverContractPath = candidate; break; } } catch { /* try next */ }
}
evidenceGates.push(resolverContractPath
  ? await runReviewEvidenceGate("template-resolver-contract", "validate-template-resolver-contract.mjs", [
      resolverContractPath,
      contentRoot,
      path.join(path.dirname(resolverContractPath), "closure-review-manifest.json"),
    ])
  : { name: "template-resolver-contract", status: "blocked", exitCode: 1, report: { failures: [`no template resolver contract evidence for ${consumer}`] }, stderr: "template resolver contract evidence is missing" });
const migrationContractCandidates = [
  path.join(sourceDir, "dev", "prefix-migration-coexistence-contract.json"),
];
let migrationContractPath = null;
for (const candidate of migrationContractCandidates) {
  try {
    const stat = await fs.lstat(candidate);
    if (stat.isFile() && !stat.isSymbolicLink()) {
      migrationContractPath = candidate;
      break;
    }
  } catch {
    // Try the next canonical/dev path.
  }
}
evidenceGates.push(
  migrationContractPath
  ? await runReviewEvidenceGate("prefix-migration-contract", "validate-prefix-migration-contract.mjs", [
      migrationContractPath,
      path.join(contentRoot, "artifact-prefix-inventory.json"),
      ...(migrationProposalInput ? [migrationProposalInput] : []),
    ])
    : {
      name: "prefix-migration-contract",
      status: "blocked",
      exitCode: 1,
      report: { failures: [`no migration contract evidence for ${consumer}`] },
      stderr: "migration contract evidence is missing",
    },
);

for (const gate of gates) {
  if (gate.status !== "ready") {
    const details = Array.isArray(gate.report?.failures)
      ? gate.report.failures.filter((failure) => typeof failure === "string" && failure !== "")
      : [];
    if (details.length > 0) {
      failures.push(...details.map((failure) => `${gate.name}: ${failure}`));
    } else {
      failures.push(`${gate.name}: gate blocked`);
    }
  }
}
for (const gate of evidenceGates) {
  if (gate.status !== "valid-review-evidence") {
    const details = Array.isArray(gate.report?.failures)
      ? gate.report.failures.filter((failure) => typeof failure === "string" && failure !== "")
      : [];
    if (details.length > 0) {
      failures.push(...details.map((failure) => `${gate.name}: ${failure}`));
    } else {
      failures.push(`${gate.name}: gate blocked`);
    }
  }
}
const report = {
  schema: 1,
  generatedBy: "tools/run-protection-gates.mjs",
  contentRoot,
  consumer,
  status: failures.length === 0 ? "ready" : "blocked",
  failures,
  gates,
  evidenceGates,
  mutation: "none",
  promotionRule: "All release gates must be ready and every review-evidence gate must be structurally valid before any assembler mutates a release candidate; review evidence alone never approves Profile A.",
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
