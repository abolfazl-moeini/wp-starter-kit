#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const sha256Pattern = /^[a-f0-9]{64}$/;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSafeRelative(value) {
  return typeof value === "string" && value !== "" &&
    !value.includes("\\") && !value.includes("\0") &&
    !path.posix.isAbsolute(value) && path.posix.normalize(value) === value &&
    value !== ".." && !value.startsWith("../");
}

async function readRegularFile(file, label) {
  const stat = await fs.lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${label} must be a regular, non-symlink file`);
  }
  return fs.readFile(file);
}

async function sha256File(file, label) {
  return createHash("sha256").update(await readRegularFile(file, label)).digest("hex");
}

function uint32(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function uint16(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

function readZipEntries(bytes) {
  const earliest = Math.max(0, bytes.length - 0x10016);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= earliest; offset -= 1) {
    if (uint32(bytes, offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("candidate ZIP has no end-of-central-directory record");
  if (uint16(bytes, eocd + 4) !== 0 || uint16(bytes, eocd + 6) !== 0) {
    throw new Error("multi-disk candidate ZIPs are not allowed");
  }
  const entriesCount = uint16(bytes, eocd + 10);
  const centralSize = uint32(bytes, eocd + 12);
  const centralOffset = uint32(bytes, eocd + 16);
  if (entriesCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error("Zip64 candidate ZIPs are not allowed");
  }
  if (centralOffset + centralSize > bytes.length) throw new Error("candidate ZIP central directory is truncated");

  const entries = [];
  let offset = centralOffset;
  for (let index = 0; index < entriesCount; index += 1) {
    if (offset + 46 > bytes.length || uint32(bytes, offset) !== 0x02014b50) {
      throw new Error("candidate ZIP has an invalid central-directory entry");
    }
    const flags = uint16(bytes, offset + 8);
    const nameLength = uint16(bytes, offset + 28);
    const extraLength = uint16(bytes, offset + 30);
    const commentLength = uint16(bytes, offset + 32);
    const externalAttributes = uint32(bytes, offset + 38);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.length) throw new Error("candidate ZIP central-directory entry is truncated");
    if ((flags & 0x0001) !== 0) throw new Error("encrypted candidate ZIP entries are not allowed");
    const rawName = bytes.subarray(offset + 46, offset + 46 + nameLength);
    const name = rawName.toString("utf8");
    if (!Buffer.from(name, "utf8").equals(rawName) || !isSafeRelative(name.replace(/\/$/, ""))) {
      throw new Error(`candidate ZIP has an unsafe entry path: ${name}`);
    }
    const localHeaderOffset = uint32(bytes, offset + 42);
    if (localHeaderOffset === 0xffffffff) {
      throw new Error("Zip64 candidate ZIPs are not allowed");
    }
    if (localHeaderOffset + 30 > bytes.length || uint32(bytes, localHeaderOffset) !== 0x04034b50) {
      throw new Error(`candidate ZIP local header is invalid: ${name}`);
    }
    const localNameLength = uint16(bytes, localHeaderOffset + 26);
    const localExtraLength = uint16(bytes, localHeaderOffset + 28);
    if (localHeaderOffset + 30 + localNameLength + localExtraLength > bytes.length) {
      throw new Error(`candidate ZIP local header is truncated: ${name}`);
    }
    const localName = bytes.subarray(
      localHeaderOffset + 30,
      localHeaderOffset + 30 + localNameLength,
    ).toString("utf8");
    if (localName !== name) {
      throw new Error(`candidate ZIP local header path does not match central directory: ${localName}`);
    }
    const unixMode = externalAttributes >>> 16;
    const type = unixMode & 0o170000;
    const directory = name.endsWith("/");
    if (unixMode === 0 || (directory ? type !== 0o040000 : type !== 0o100000)) {
      throw new Error(`candidate ZIP entry must be a regular file or directory: ${name}`);
    }
    entries.push({ name, directory });
    offset = end;
  }
  if (offset !== centralOffset + centralSize) throw new Error("candidate ZIP central-directory size is inconsistent");
  return entries;
}

function validateArchive(entries, consumer) {
  const names = new Set();
  const caseFolded = new Set();
  const root = `${consumer}/`;
  let mainFile = false;
  for (const entry of entries) {
    if (names.has(entry.name) || caseFolded.has(entry.name.toLowerCase())) {
      throw new Error(`candidate ZIP has duplicate or case-colliding entry: ${entry.name}`);
    }
    names.add(entry.name);
    caseFolded.add(entry.name.toLowerCase());
    if (!entry.name.startsWith(root)) throw new Error(`candidate ZIP entry is outside ${root}: ${entry.name}`);
    if (entry.name === `${consumer}/${consumer}.php`) mainFile = true;
  }
  if (!mainFile) throw new Error(`candidate ZIP has no ${consumer}/${consumer}.php bootstrap`);
}

async function lockDownExtractedTree(root, relative = "") {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
    const absolute = path.join(root, entry.name);
    const stat = await fs.lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error(`extracted candidate contains a symlink: ${childRelative}`);
    if (stat.isDirectory()) {
      await lockDownExtractedTree(absolute, childRelative);
      await fs.chmod(absolute, 0o555);
    } else if (stat.isFile()) {
      await fs.chmod(absolute, 0o444);
    } else {
      throw new Error(`extracted candidate contains a non-regular path: ${childRelative}`);
    }
  }
}

async function listExtractedFiles(root, relative = "") {
  const files = [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
    const absolute = path.join(root, entry.name);
    const stat = await fs.lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error(`extracted candidate contains a symlink: ${childRelative}`);
    if (stat.isDirectory()) {
      files.push(...await listExtractedFiles(absolute, childRelative));
    } else if (stat.isFile()) {
      files.push(childRelative);
    } else {
      throw new Error(`extracted candidate contains a non-regular path: ${childRelative}`);
    }
  }
  return files.sort();
}

async function assertExtractedTree(staging, consumer, entries) {
  const top = await fs.readdir(staging);
  if (top.length !== 1 || top[0] !== consumer) {
    throw new Error(`extracted candidate must contain only ${consumer}/`);
  }
  const extracted = await listExtractedFiles(staging);
  const expected = new Set(entries.filter((entry) => !entry.directory).map((entry) => entry.name));
  for (const file of extracted) {
    if (file !== consumer && !file.startsWith(`${consumer}/`)) {
      throw new Error(`extracted candidate escaped ${consumer}/: ${file}`);
    }
    if (!expected.has(file)) {
      throw new Error(`extracted candidate contains an undeclared file: ${file}`);
    }
  }
  for (const name of expected) {
    if (!extracted.includes(name)) {
      throw new Error(`extracted candidate is missing ${name}`);
    }
  }
}

async function portableContractsFromManifest(manifestPath, pluginRoot) {
  try {
    const stat = await fs.lstat(manifestPath);
    if (stat.isSymbolicLink()) {
      throw new Error("test portability manifest must be a regular, non-symlink file");
    }
    if (!stat.isFile()) return { manifest: {}, contracts: [], digest: null };
  } catch (err) {
    if (err.message.includes("regular, non-symlink file")) throw err;
    return { manifest: {}, contracts: [], digest: null };
  }
  const bytes = await readRegularFile(manifestPath, "test portability manifest");
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("test portability manifest must contain valid JSON");
  }
  const contracts = manifest?.tests?.["portable-contract"];
  if (!Array.isArray(contracts) || contracts.length === 0) {
    throw new Error("no portable-contract PHPUnit tests are declared; artifact harness execution is blocked");
  }
  const seen = new Set();
  for (const relative of contracts) {
    if (!isSafeRelative(relative) || seen.has(relative)) {
      throw new Error("portable-contract PHPUnit paths must be unique safe relative paths");
    }
    seen.add(relative);
    const testPath = path.join(pluginRoot, relative);
    await readRegularFile(testPath, `portable-contract test ${relative}`);
  }
  return { manifest, contracts, digest: createHash("sha256").update(bytes).digest("hex") };
}

/**
 * Prepares, but never executes, an external PHPUnit artifact harness.
 * It deliberately cannot turn preparation into Profile A promotion evidence.
 */
export async function prepareArtifactPhpUnitHarness({
  contentRoot,
  consumer,
  candidateZip,
  expectedSha256,
  extractionRoot,
  beforeExtract,
  afterExtract,
  beforePostExtractionHash,
}) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(consumer || "")) throw new Error("invalid consumer slug");
  if (typeof candidateZip !== "string" || candidateZip === "") throw new Error("candidate ZIP path is required");
  if (!sha256Pattern.test(expectedSha256 || "")) throw new Error("expectedSha256 must be a 64-character SHA-256 hex string");
  const root = path.resolve(contentRoot || "");
  const devPluginRoot = path.join(root, "plugins", `${consumer}-dev`);
  const regularPluginRoot = path.join(root, "plugins", consumer);
  let pluginRoot = regularPluginRoot;
  try {
    const stat = await fs.lstat(devPluginRoot);
    if (stat.isDirectory()) {
      pluginRoot = devPluginRoot;
    }
  } catch {}

  let pluginStat;
  try {
    pluginStat = await fs.lstat(pluginRoot);
  } catch (error) {
    throw new Error(`plugin source root must be a regular non-symlink directory: ${error.message}`);
  }
  if (pluginStat.isSymbolicLink() || !pluginStat.isDirectory()) {
    throw new Error("plugin source root must be a regular non-symlink directory");
  }
  const manifestPath = path.join(pluginRoot, "dev", "test-portability-manifest.json");
  const portability = await portableContractsFromManifest(manifestPath, pluginRoot);
  // Keep one immutable byte snapshot for parsing and extraction. Hashing the
  // path and then extracting that mutable path creates a TOCTOU window in
  // which a replacement ZIP could be written before `unzip` runs.
  const candidateBytes = await readRegularFile(candidateZip, "candidate ZIP");
  const initialHash = createHash("sha256").update(candidateBytes).digest("hex");
  if (initialHash !== expectedSha256) throw new Error("candidate ZIP hash mismatch before extraction");
  const entries = readZipEntries(candidateBytes);
  validateArchive(entries, consumer);

  const extractionParent = extractionRoot
    ? path.resolve(extractionRoot)
    : await fs.mkdtemp(path.join(os.tmpdir(), "profile-a-phpunit-harness-"));
  if (extractionRoot) await fs.mkdir(extractionParent, { recursive: true });
  const staging = await fs.mkdtemp(path.join(extractionParent, "candidate-"));
  if (typeof beforeExtract === "function") await beforeExtract();
  const immutableArchive = path.join(staging, ".candidate.zip");
  await fs.writeFile(immutableArchive, candidateBytes, { flag: "wx", mode: 0o444 });
  await execFileAsync("unzip", ["-qq", immutableArchive, "-d", staging]);
  await fs.rm(immutableArchive, { force: true });
  if (typeof afterExtract === "function") await afterExtract(staging);
  await assertExtractedTree(staging, consumer, entries);
  const extractedPlugin = path.join(staging, consumer);
  const main = path.join(extractedPlugin, `${consumer}.php`);
  await readRegularFile(main, "extracted candidate bootstrap");
  await lockDownExtractedTree(extractedPlugin);
  if (typeof beforePostExtractionHash === "function") await beforePostExtractionHash();
  const finalHash = await sha256File(candidateZip, "candidate ZIP");
  if (finalHash !== expectedSha256 || finalHash !== initialHash) {
    throw new Error("candidate ZIP changed during harness preparation");
  }

  return {
    schema: 1,
    generatedBy: "tools/prepare-artifact-phpunit-harness.mjs",
    status: "prepared-unexercised",
    promotionReady: false,
    candidateZip: path.resolve(candidateZip),
    candidateSha256: finalHash,
    portabilityManifestSha256: portability.digest,
    sourceCommit: portability.manifest.sourceCommit || null,
    portableContracts: portability.contracts,
    pluginRoot: extractedPlugin,
    bootstrapFile: path.join(extractedPlugin, `${consumer}.php`),
    sourceMountAllowed: false,
    standaloneWpdevAllowed: false,
    artifactMount: "read-only",
    promotionRule: "Preparation is not execution evidence and cannot approve Profile A or Profile B.",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [contentRoot, consumer, candidateZip, expectedSha256, extractionRoot] = process.argv.slice(2);
  try {
    const report = await prepareArtifactPhpUnitHarness({ contentRoot, consumer, candidateZip, expectedSha256, extractionRoot });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ schema: 1, generatedBy: "tools/prepare-artifact-phpunit-harness.mjs", status: "blocked", promotionReady: false, failure: error.message }, null, 2)}\n`);
    process.exitCode = 1;
  }
}
