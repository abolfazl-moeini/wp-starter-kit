#!/usr/bin/env node

import crypto from "node:crypto";
import { lstat, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DOMAIN_SEPARATOR = "WPDEV-MANIFEST-v1\0";

export function canonicalJson(obj) {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJson).join(",") + "]";
  }
  const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") + "}";
}

export async function hashFile(filePath) {
  const content = await readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function collectFiles(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  let files = [];
  const seenPaths = new Set();
  const caseFolded = new Set();

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).split(path.sep).join("/");
    if (entry.name === "release-manifest.json" || entry.name === "release-manifest.sig") {
      continue;
    }
    if (entry.name.startsWith(".")) {
      throw new Error(`Hidden dotfiles are forbidden in release tree: ${relPath}`);
    }
    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are forbidden: ${relPath}`);
    }
    if (entry.isDirectory()) {
      files = files.concat(await collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (seenPaths.has(relPath) || caseFolded.has(relPath.toLowerCase())) {
        throw new Error(`Duplicate or case-colliding file path: ${relPath}`);
      }
      seenPaths.add(relPath);
      caseFolded.add(relPath.toLowerCase());

      const sha256 = await hashFile(fullPath);
      const stat = await lstat(fullPath);
      files.push({
        path: relPath,
        sha256,
        size: stat.size,
      });
    }
  }
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export function signManifestPayload(payloadObject, privateKeyHex, keyId) {
  const canonical = canonicalJson(payloadObject);
  const message = Buffer.concat([
    Buffer.from(DOMAIN_SEPARATOR, "utf8"),
    Buffer.from(canonical, "utf8"),
  ]);

  const privateKeyDer = Buffer.concat([
    Buffer.from("302e020100300506032b657004220420", "hex"),
    Buffer.from(privateKeyHex, "hex"),
  ]);
  const privateKey = crypto.createPrivateKey({
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
  });

  const signature = crypto.sign(null, message, privateKey);

  return {
    ...payloadObject,
    signature: signature.toString("hex"),
    kid: keyId,
  };
}

export async function generateSignedReleaseManifest({
  rootDir,
  artifactId,
  version,
  privateKeyHex,
  keyId,
  abiMap = {},
}) {
  const files = await collectFiles(rootDir);
  const payload = {
    schema: 1,
    purpose: "release-integrity-manifest",
    artifactId,
    version,
    abi: abiMap,
    files,
    generatedAt: new Date().toISOString(),
  };

  const signed = signManifestPayload(payload, privateKeyHex, keyId);
  const manifestPath = path.join(rootDir, "release-manifest.json");
  await writeFile(manifestPath, JSON.stringify(signed, null, 2) + "\n", "utf8");
  return { manifestPath, signed };
}

if (process.argv[1] && process.argv[1].endsWith("generate-signed-release-manifest.mjs")) {
  const [, , targetDir, artifactId, version, keyId] = process.argv;
  const looksLikeHexKey = (value) => typeof value === "string" && /^[0-9a-fA-F]{64}$/.test(value);
  if (looksLikeHexKey(keyId) || looksLikeHexKey(process.argv[5])) {
    console.error("Refusing private key material on the CLI. Set WPDEV_RELEASE_PRIVATE_KEY_FILE to a key file path.");
    process.exit(1);
  }
  const keyFile = process.env.WPDEV_RELEASE_PRIVATE_KEY_FILE;
  if (!targetDir || !artifactId || !version || !keyId || !keyFile) {
    console.error("Usage: node generate-signed-release-manifest.mjs <targetDir> <artifactId> <version> <keyId>");
    console.error("Private key must come from WPDEV_RELEASE_PRIVATE_KEY_FILE, never from CLI arguments.");
    process.exit(1);
  }
  const privateKeyHex = (await readFile(keyFile, "utf8")).trim();
  generateSignedReleaseManifest({
    rootDir: path.resolve(targetDir),
    artifactId,
    version,
    privateKeyHex,
    keyId,
  }).then(({ manifestPath }) => {
    console.log(`Signed release manifest generated at: ${manifestPath}`);
  }).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
