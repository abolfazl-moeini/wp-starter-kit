#!/usr/bin/env node

import { execFile } from "node:child_process";
import crypto from "node:crypto";
import { lstat, mkdir, readdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { generateSignedReleaseManifest } from "./generate-signed-release-manifest.mjs";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDir, ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const outputDir = path.resolve(process.argv[4] || path.join(contentRoot, "dist"));

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let bit = 0; bit < 8; bit += 1)
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data)
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

async function filesUnder(root) {
  const result = [];
  async function visit(relative) {
    const directory = relative ? path.join(root, relative) : root;
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) result.push(child.replace(/\\/g, "/"));
      else if (entry.isSymbolicLink())
        throw new Error(`symlink cannot be archived: ${child}`);
    }
  }
  await visit("");
  return result.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

async function createCanonicalZip({ sourceRoot, outputZip, rootName }) {
  const root = path.resolve(sourceRoot);
  const archive = path.resolve(outputZip);
  const files = await filesUnder(root);

  const local = [];
  const central = [];
  let offset = 0;

  for (const relative of files) {
    const data = await readFile(path.join(root, relative));
    const name = Buffer.from(`${rootName}/${relative}`, "utf8");
    const crc = crc32(data);

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28);
    local.push(header, name, data);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(0x0314, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x800, 8);
    entry.writeUInt16LE(0, 10);
    entry.writeUInt16LE(0, 12);
    entry.writeUInt16LE(33, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt16LE(0, 30);
    entry.writeUInt16LE(0, 32);
    entry.writeUInt16LE(0, 34);
    entry.writeUInt16LE(0, 36);
    entry.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += header.length + name.length + data.length;
  }

  const centralBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  const totalBuffer = Buffer.concat([...local, centralBytes, end]);
  await mkdir(path.dirname(archive), { recursive: true });
  await writeFile(archive, totalBuffer);
  return archive;
}

const ROOT_EXCLUDE_DIRS = new Set([
  "node_modules",
  "vendor",
  "tests",
  "dev",
  "dist",
  "artifacts",
  "docs",
  "packages",
  "bin",
  "coverage",
  "docker-phpunit",
]);

const EXCLUDE_FILES = new Set([
  "package.json",
  "package-lock.json",
  "playwright.config.js",
  "playwright.config.ts",
  "phpunit.xml.dist",
  "phpunit.xml",
  ".wp-env.json",
  "rector.php",
  "postcss.config.js",
  "postcss.config.cjs",
  "postcss.config.mjs",
  "commitlint.config.js",
  "commitlint.config.cjs",
  "commitlint.config.mjs",
]);

async function copyRecursive(src, dest, isRoot = true) {
  const stat = await lstat(src);
  if (stat.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (isRoot && ROOT_EXCLUDE_DIRS.has(entry.name)) continue;
      await copyRecursive(path.join(src, entry.name), path.join(dest, entry.name), false);
    }
  } else if (stat.isFile()) {
    const base = path.basename(src);
    if (EXCLUDE_FILES.has(base) || (base.endsWith(".md") && !base.toLowerCase().includes("license") && !base.toLowerCase().includes("notice"))) {
      return;
    }
    await copyFile(src, dest);
  }
}

async function run() {
  console.log("==> 1. Running release gates verification...");
  const registryPath = path.join(contentRoot, "config/protection-artifact-registry.json");
  await execFileAsync(process.execPath, [
    path.join(scriptDir, "run-protection-gates.mjs"),
    contentRoot,
    consumer,
    registryPath,
  ]);
  console.log("==> Release gates passed!");

  const sourceDir = path.join(contentRoot, "plugins", consumer);
  const stagingRoot = await (await import("node:fs/promises")).mkdtemp(path.join(os.tmpdir(), `profile-a-${consumer}-`));
  const stagingPlugin = path.join(stagingRoot, consumer);

  try {
    console.log(`==> 2. Staging source tree to: ${stagingPlugin}`);
    await copyRecursive(sourceDir, stagingPlugin);

    // Strip "Requires Plugins: wpdev" from main plugin bootstrap header in Profile A
    const mainPhpPath = path.join(stagingPlugin, `${consumer}.php`);
    try {
      const mainPhp = await readFile(mainPhpPath, "utf8");
      const strippedPhp = mainPhp.replace(/^[ \t]*\*[ \t]*Requires Plugins:[ \t]*wpdev\r?\n/m, "");
      await writeFile(mainPhpPath, strippedPhp, "utf8");
      console.log("==> Stripped Requires Plugins: wpdev header for self-contained Profile A");
    } catch {
      // Main PHP not found or no header
    }

    // If composer.json exists in source, run locked install and strauss in staging
    const sourceComposerJson = path.join(sourceDir, "composer.json");
    try {
      await lstat(sourceComposerJson);
      await copyFile(sourceComposerJson, path.join(stagingPlugin, "composer.json"));
      const sourceLock = path.join(sourceDir, "composer.lock");
      try {
        await lstat(sourceLock);
        await copyFile(sourceLock, path.join(stagingPlugin, "composer.lock"));
      } catch {}

      console.log("==> 3. Running locked composer install --no-dev...");
      await execFileAsync("composer", ["install", "--no-dev", "--no-scripts", "--no-plugins", "--optimize-autoloader"], {
        cwd: stagingPlugin,
      });

      console.log("==> 4. Running Strauss prefixing...");
      const localStrauss = path.join(stagingPlugin, "vendor/bin/strauss");
      try {
        await lstat(localStrauss);
        await execFileAsync("php", [localStrauss], { cwd: stagingPlugin });
      } catch {
        await execFileAsync("composer", ["dump-autoload", "--no-dev", "--optimize"], { cwd: stagingPlugin });
      }
    } catch {
      // No composer.json
    }

    // Strip build metadata from customer staging
    await rm(path.join(stagingPlugin, "composer.json"), { force: true });
    await rm(path.join(stagingPlugin, "composer.lock"), { force: true });

    const keyFile = process.env.WPDEV_RELEASE_PRIVATE_KEY_FILE;
    let signingStatus = "not-performed; external trusted signing required";
    if (!keyFile) {
      console.log("==> 5. Skipping Ed25519 signing: no WPDEV_RELEASE_PRIVATE_KEY_FILE (ephemeral keys are forbidden).");
    } else {
      const privateKeyHex = (await readFile(keyFile, "utf8")).trim();
      const keyId = process.env.WPDEV_RELEASE_KEY_ID || "release-root-1";
      console.log("==> 5. Generating Ed25519 signed release manifest from key file...");
      await generateSignedReleaseManifest({
        rootDir: stagingPlugin,
        artifactId: `${consumer}-profile-a`,
        version: "1.0.0",
        privateKeyHex,
        keyId,
      });
      signingStatus = "signed-with-external-key-file";
    }

    const outputZip = path.join(outputDir, `${consumer}-profile-a.zip`);
    console.log(`==> 6. Creating canonical ZIP at: ${outputZip}`);
    await createCanonicalZip({
      sourceRoot: stagingPlugin,
      outputZip,
      rootName: consumer,
    });

    const zipBytes = await readFile(outputZip);
    const zipSha256 = crypto.createHash("sha256").update(zipBytes).digest("hex");
    console.log(`==> Profile A ZIP SHA-256: ${zipSha256}`);

    // Verify external harness preparation
    console.log("==> 7. Testing external harness preparation gate...");
    const harnessRes = await execFileAsync(process.execPath, [
      path.join(scriptDir, "prepare-artifact-phpunit-harness.mjs"),
      contentRoot,
      consumer,
      outputZip,
      zipSha256,
    ]);
    console.log("==> Harness preparation gate verified:", JSON.parse(harnessRes.stdout).status);

    const result = {
      consumer,
      profile: "Profile A",
      zipPath: outputZip,
      zipSha256,
      signing: signingStatus,
      status: "experimental-candidate-assembled; Profile A acceptance still blocked",
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error("Assembler failed:", err);
  process.exit(1);
});
