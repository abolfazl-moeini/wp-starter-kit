#!/usr/bin/env node

import crypto from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, hashFile } from "./generate-signed-release-manifest.mjs";

const DOMAIN_SEPARATOR = "WPDEV-MANIFEST-v1\0";

export async function validateSignedReleaseManifest({
  rootDir,
  keyring, // { [kid: string]: string (hex public key) }
}) {
  const failures = [];
  const manifestPath = path.join(rootDir, "release-manifest.json");

  let manifestContent;
  try {
    const stat = await lstat(manifestPath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      return { status: "blocked", failures: ["release-manifest.json must be a regular non-symlink file"] };
    }
    manifestContent = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (err) {
    return { status: "blocked", failures: [`Cannot read release-manifest.json: ${err.message}`] };
  }

  if (manifestContent.schema !== 1) {
    failures.push("manifest schema must be 1");
  }
  if (manifestContent.purpose !== "release-integrity-manifest") {
    failures.push("manifest purpose must be release-integrity-manifest");
  }
  if (!manifestContent.kid || typeof manifestContent.kid !== "string") {
    failures.push("manifest missing kid");
  }
  if (!manifestContent.signature || typeof manifestContent.signature !== "string") {
    failures.push("manifest missing signature");
  }

  const publicKeyHex = keyring[manifestContent.kid];
  if (!publicKeyHex) {
    failures.push(`Unknown key ID (kid): ${manifestContent.kid}`);
  } else if (manifestContent.signature) {
    try {
      const { signature, kid, ...payload } = manifestContent;
      const canonical = canonicalJson(payload);
      const message = Buffer.concat([
        Buffer.from(DOMAIN_SEPARATOR, "utf8"),
        Buffer.from(canonical, "utf8"),
      ]);

      const publicKeyDer = Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(publicKeyHex, "hex"),
      ]);
      const publicKey = crypto.createPublicKey({
        key: publicKeyDer,
        format: "der",
        type: "spki",
      });

      const isValid = crypto.verify(
        null,
        message,
        publicKey,
        Buffer.from(signature, "hex"),
      );

      if (!isValid) {
        failures.push("Ed25519 signature verification failed");
      }
    } catch (err) {
      failures.push(`Signature verification error: ${err.message}`);
    }
  }

  if (Array.isArray(manifestContent.files)) {
    const seenPaths = new Set();
    const caseFolded = new Set();
    for (const fileEntry of manifestContent.files) {
      if (!fileEntry.path || typeof fileEntry.path !== "string") {
        failures.push("file entry missing path");
        continue;
      }
      if (
        fileEntry.path.includes("\\") ||
        path.posix.normalize(fileEntry.path) !== fileEntry.path ||
        fileEntry.path.startsWith("../") ||
        path.isAbsolute(fileEntry.path)
      ) {
        failures.push(`Unsafe file path in manifest: ${fileEntry.path}`);
        continue;
      }
      if (seenPaths.has(fileEntry.path) || caseFolded.has(fileEntry.path.toLowerCase())) {
        failures.push(`Duplicate or case-colliding entry in manifest: ${fileEntry.path}`);
        continue;
      }
      seenPaths.add(fileEntry.path);
      caseFolded.add(fileEntry.path.toLowerCase());

      const physicalPath = path.join(rootDir, fileEntry.path);
      try {
        const stat = await lstat(physicalPath);
        if (stat.isSymbolicLink()) {
          failures.push(`Symlinks are forbidden on disk: ${fileEntry.path}`);
        } else if (!stat.isFile()) {
          failures.push(`Path is not a regular file: ${fileEntry.path}`);
        } else {
          const actualSha = await hashFile(physicalPath);
          if (actualSha !== fileEntry.sha256) {
            failures.push(`Digest mismatch for ${fileEntry.path}: expected ${fileEntry.sha256}, got ${actualSha}`);
          }
        }
      } catch (err) {
        failures.push(`Missing file on disk: ${fileEntry.path}`);
      }
    }

    // Check for unlisted files on disk
    async function scanDisk(dir) {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = path.relative(rootDir, full).split(path.sep).join("/");
        if (rel === "release-manifest.json" || rel === "release-manifest.sig") {
          continue;
        }
        if (entry.name.startsWith(".")) {
          failures.push(`Hidden dotfile found on disk: ${rel}`);
          continue;
        }
        if (entry.isDirectory()) {
          await scanDisk(full);
        } else if (entry.isFile()) {
          if (!seenPaths.has(rel)) {
            failures.push(`Unlisted file found on disk: ${rel}`);
          }
        }
      }
    }
    try {
      await scanDisk(rootDir);
    } catch (err) {
      failures.push(`Disk scan error: ${err.message}`);
    }
  } else {
    failures.push("manifest files must be an array");
  }

  const status = failures.length === 0 ? "ready" : "blocked";
  return {
    schema: 1,
    generatedBy: "tools/validate-signed-release-manifest.mjs",
    manifestPath,
    status,
    failures,
  };
}

if (process.argv[1] && process.argv[1].endsWith("validate-signed-release-manifest.mjs")) {
  const [,, targetDir, keyringJsonPath] = process.argv;
  if (!targetDir || !keyringJsonPath) {
    console.error("Usage: node validate-signed-release-manifest.mjs <targetDir> <keyringJsonPath>");
    process.exit(1);
  }
  const keyring = JSON.parse(await readFile(path.resolve(keyringJsonPath), "utf8"));
  validateSignedReleaseManifest({
    rootDir: path.resolve(targetDir),
    keyring,
  }).then((report) => {
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== "ready") process.exit(1);
  }).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
