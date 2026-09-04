#!/usr/bin/env node

// Recomputes the pinned tool-input and migration-contract digests of a
// review-only profile-a-pre-registry-candidate manifest from the live bytes
// on disk. The refresh is fail-closed: every pinned path must resolve to a
// regular non-symlink file, review-only fields must not be promoted, and the
// manifest is only rewritten when at least one digest actually changes.

import crypto from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MANIFEST_NAME = "profile-a-pre-registry-candidate.json";
const CONTRACT_SUFFIX = "plugins/tavangary-theme-panel/dev/prefix-migration-coexistence-contract.json";

const failures = [];
const contentRoot = process.argv[2];
const manifestPath = process.argv[3];
const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const hex = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const safe = (v) =>
  typeof v === "string" &&
  v !== "" &&
  !v.includes("\\") &&
  !v.includes("\0") &&
  !path.posix.isAbsolute(v) &&
  path.posix.normalize(v) === v &&
  v !== "." &&
  v !== ".." &&
  !v.startsWith("../");

async function liveDigest(root, relative, label) {
  if (!safe(relative)) {
    failures.push(`unsafe ${label} path: ${relative}`);
    return null;
  }
  let absolute = path.join(root, relative);
  try {
    let stat;
    try {
      stat = await lstat(absolute);
    } catch {
      if (relative.startsWith("plugins/tavangary-theme-panel/")) {
        const devPath = path.join(root, relative.replace("plugins/tavangary-theme-panel/", "plugins/tavangary-theme-panel-dev/"));
        const statDev = await lstat(devPath);
        if (statDev.isFile() && !statDev.isSymbolicLink()) {
          absolute = devPath;
          stat = statDev;
        }
      } else if (relative.startsWith("tools/")) {
        const packageDir = path.dirname(fileURLToPath(import.meta.url));
        const altPath = path.join(packageDir, relative.replace(/^tools\//, ""));
        try {
          const statAlt = await lstat(altPath);
          if (statAlt.isFile() && !statAlt.isSymbolicLink()) {
            absolute = altPath;
            stat = statAlt;
          }
        } catch {}
      }
    }
    if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
      throw new Error("regular non-symlink file required");
    }
    return {
      relative,
      sha256: crypto.createHash("sha256").update(await readFile(absolute)).digest("hex"),
    };
  } catch (error) {
    failures.push(`${label} ${relative}: ${error.message}`);
    return null;
  }
}

if (!contentRoot || !path.isAbsolute(contentRoot)) {
  failures.push("contentRoot path must be absolute");
}
if (!manifestPath || !path.isAbsolute(manifestPath)) {
  failures.push("manifest path must be absolute");
} else if (path.basename(manifestPath) !== MANIFEST_NAME) {
  failures.push(`manifest file name must be ${MANIFEST_NAME}`);
}

let manifest = null;
if (!failures.length) {
  try {
    const stat = await lstat(manifestPath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error("regular non-symlink file required");
    }
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    failures.push(`manifest: ${error.message}`);
  }
}

if (manifest) {
  if (manifest.schema !== 1 || manifest.purpose !== "profile-a-pre-registry-candidate") {
    failures.push("manifest must be a schema 1 profile-a-pre-registry-candidate record");
  }
  if (manifest.recordStatus !== "review-only" || manifest.buildInput !== false) {
    failures.push("refusing to refresh a manifest that is not review-only");
  }
  if (!object(manifest.digests) || manifest.digests.artifact !== null || manifest.digests.source !== null || manifest.digests.toolBundle !== null) {
    failures.push("digests must remain null until acceptance");
  }
}

const updated = [];
let next = manifest;

if (manifest && !failures.length) {
  next = structuredClone(manifest);

  if (!Array.isArray(manifest.toolInputs) || manifest.toolInputs.length === 0) {
    failures.push("toolInputs must be a non-empty array");
  } else {
    const seen = new Set();
    const refreshed = [];
    for (const [index, tool] of manifest.toolInputs.entries()) {
      if (!object(tool) || !hex(tool.sha256)) {
        failures.push(`invalid tool input ${object(tool) ? tool.path : `at index ${index}`}`);
        continue;
      }
      if (seen.has(tool.path)) {
        failures.push(`duplicate tool input ${tool.path}`);
        continue;
      }
      seen.add(tool.path);
      const digest = await liveDigest(contentRoot, tool.path, "tool input");
      if (!digest) continue;
      if (digest.sha256 !== tool.sha256) {
        updated.push(tool.path);
      }
      refreshed.push({ path: tool.path, sha256: digest.sha256 });
    }
    if (refreshed.length === manifest.toolInputs.length) {
      next.toolInputs = refreshed;
    }
  }

  const contract = manifest.migrationContract;
  if (!object(contract) || !safe(contract.path) || !hex(contract.sha256)) {
    failures.push("migrationContract path and sha256 are required");
  } else if (!contract.path.endsWith(CONTRACT_SUFFIX)) {
    failures.push(`migrationContract path must be ${CONTRACT_SUFFIX}`);
  } else {
    const digest = await liveDigest(contentRoot, contract.path, "migration contract");
    if (digest && digest.sha256 !== contract.sha256) {
      updated.push(contract.path);
      next.migrationContract = { path: contract.path, sha256: digest.sha256 };
    }
  }
}

if (failures.length) {
  process.stdout.write(
    `${JSON.stringify(
      {
        schema: 1,
        generatedBy: "tools/refresh-pre-registry-candidate-digests.mjs",
        status: "blocked",
        updated: [],
        failures,
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
} else if (updated.length === 0) {
  process.stdout.write(
    `${JSON.stringify(
      {
        schema: 1,
        generatedBy: "tools/refresh-pre-registry-candidate-digests.mjs",
        status: "unchanged",
        updated: [],
        failures,
      },
      null,
      2,
    )}\n`,
  );
} else {
  let writeOk = true;
  try {
    await writeFile(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  } catch (error) {
    writeOk = false;
    failures.push(`manifest write: ${error.message}`);
    process.stdout.write(
      `${JSON.stringify(
        { schema: 1, generatedBy: "tools/refresh-pre-registry-candidate-digests.mjs", status: "blocked", updated: [], failures },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 1;
  }
  if (writeOk) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schema: 1,
          generatedBy: "tools/refresh-pre-registry-candidate-digests.mjs",
          status: "refreshed",
          updated,
          failures,
        },
        null,
        2,
      )}\n`,
    );
  }
}

