import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdtemp, mkdir, readFile, rename, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { crc32 } from "node:zlib";

const harnessPath = new URL("../prepare-artifact-phpunit-harness.mjs", import.meta.url);

async function makeRoot({ portableContracts = ["tests/portable/ContractTest.php"] } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "artifact-phpunit-harness-"));
  const plugin = path.join(root, "plugins", "example-plugin");
  await mkdir(path.join(plugin, "dev"), { recursive: true });
  await mkdir(path.join(plugin, "tests", "portable"), { recursive: true });
  await writeFile(path.join(plugin, "example-plugin.php"), "<?php\n");
  await writeFile(path.join(plugin, "tests", "portable", "ContractTest.php"), "<?php\n");
  await writeFile(
    path.join(plugin, "dev", "test-portability-manifest.json"),
    JSON.stringify({
      schema: 1,
      status: "draft-blocked",
      plugin: "example-plugin",
      sourceCommit: "0123456",
      rules: {
        "source-internal": "source only",
        "portable-contract": "external artifact contract",
        "artifact-e2e": "browser artifact contract",
        "harness-only": "harness support",
      },
      tests: { "portable-contract": portableContracts },
      criticalBehaviorCoverage: {},
      promotionBlockers: ["A real candidate is still required."],
    }),
  );
  return { root, plugin };
}

async function makeZip(entries) {
  const root = await mkdtemp(path.join(os.tmpdir(), "artifact-phpunit-zip-"));
  const source = path.join(root, "source");
  const zip = path.join(root, "candidate.zip");
  await mkdir(path.join(source, "example-plugin"), { recursive: true });
  for (const [relative, value] of Object.entries(entries)) {
    const target = path.join(source, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, value);
  }
  execFileSync("zip", ["-q", "-r", zip, "example-plugin"], { cwd: source });
  return zip;
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

test("prepares a hash-bound, read-only external harness only for portable contracts", async () => {
  const { prepareArtifactPhpUnitHarness } = await import(harnessPath);
  const { root } = await makeRoot();
  const zip = await makeZip({
    "example-plugin/example-plugin.php": "<?php\n",
    "example-plugin/src/Runtime.php": "<?php\n",
  });
  const result = await prepareArtifactPhpUnitHarness({
    contentRoot: root,
    consumer: "example-plugin",
    candidateZip: zip,
    expectedSha256: await sha256(zip),
  });

  assert.equal(result.status, "prepared-unexercised", "Harness should not claim artifact evidence before PHPUnit runs.");
  assert.deepEqual(result.portableContracts, ["tests/portable/ContractTest.php"], "Only declared portable contracts may be selected.");
  assert.equal(result.sourceMountAllowed, false, "The source plugin must never be mounted as the artifact.");
  assert.equal(result.standaloneWpdevAllowed, false, "Standalone WPDev must remain absent for Profile A/B harnesses.");
  assert.match(result.pluginRoot, /example-plugin$/, "Extracted plugin root must be the archive root.");
});

test("fails closed for a missing, malformed, or mismatched candidate hash", async () => {
  const { prepareArtifactPhpUnitHarness } = await import(harnessPath);
  const { root } = await makeRoot();
  const zip = await makeZip({ "example-plugin/example-plugin.php": "<?php\n" });

  await assert.rejects(
    prepareArtifactPhpUnitHarness({ contentRoot: root, consumer: "example-plugin", candidateZip: zip }),
    /64-character SHA-256/i,
    "A caller must supply the exact candidate hash.",
  );
  await assert.rejects(
    prepareArtifactPhpUnitHarness({ contentRoot: root, consumer: "example-plugin", candidateZip: zip, expectedSha256: "x".repeat(64) }),
    /64-character SHA-256/i,
    "A malformed hash must not be normalized or accepted.",
  );
  await assert.rejects(
    prepareArtifactPhpUnitHarness({ contentRoot: root, consumer: "example-plugin", candidateZip: zip, expectedSha256: "0".repeat(64) }),
    /hash mismatch/i,
    "A different ZIP must never be extracted as the requested candidate.",
  );
});

test("fails closed when the portability manifest has no portable PHPUnit contracts", async () => {
  const { prepareArtifactPhpUnitHarness } = await import(harnessPath);
  const { root } = await makeRoot({ portableContracts: [] });
  const zip = await makeZip({ "example-plugin/example-plugin.php": "<?php\n" });

  await assert.rejects(
    prepareArtifactPhpUnitHarness({ contentRoot: root, consumer: "example-plugin", candidateZip: zip, expectedSha256: await sha256(zip) }),
    /no portable-contract PHPUnit tests/i,
    "A zero-test harness run must be blocked rather than reported green.",
  );
});

test("fails closed on a symlinked ZIP or portability manifest", async () => {
  const { prepareArtifactPhpUnitHarness } = await import(harnessPath);
  const { root, plugin } = await makeRoot();
  const zip = await makeZip({ "example-plugin/example-plugin.php": "<?php\n" });
  const zipLink = `${zip}.link`;
  await symlink(zip, zipLink);

  await assert.rejects(
    prepareArtifactPhpUnitHarness({ contentRoot: root, consumer: "example-plugin", candidateZip: zipLink, expectedSha256: await sha256(zip) }),
    /regular, non-symlink/i,
    "ZIP evidence addressed through a symlink must be rejected.",
  );

  const manifest = path.join(plugin, "dev", "test-portability-manifest.json");
  const manifestTarget = `${manifest}.target`;
  await writeFile(manifestTarget, await readFile(manifest));
  await unlink(manifest);
  await symlink(manifestTarget, manifest);
  await assert.rejects(
    prepareArtifactPhpUnitHarness({ contentRoot: root, consumer: "example-plugin", candidateZip: zip, expectedSha256: await sha256(zip) }),
    /regular, non-symlink/i,
    "Manifest evidence addressed through a symlink must be rejected.",
  );
});

test("fails closed when the consumer source root is a symlink", async () => {
  const { prepareArtifactPhpUnitHarness } = await import(harnessPath);
  const { root, plugin } = await makeRoot();
  const realPlugin = `${plugin}.real`;
  await rename(plugin, realPlugin);
  await symlink(realPlugin, plugin);
  const zip = await makeZip({ "example-plugin/example-plugin.php": "<?php\n" });

  await assert.rejects(
    prepareArtifactPhpUnitHarness({
      contentRoot: root,
      consumer: "example-plugin",
      candidateZip: zip,
      expectedSha256: await sha256(zip),
    }),
    /plugin source root must be a regular non-symlink directory/i,
    "A symlinked consumer root must not provide portability evidence.",
  );
});

function makeStoredZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const localName = Buffer.from(entry.localName ?? entry.name, "utf8");
    const centralName = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.data ?? "");
    const crc = crc32(data);
    const unixMode = entry.directory ? 0o040755 : 0o100644;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc >>> 0, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(localName.length, 26);
    const localBlock = Buffer.concat([local, localName, data]);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x031e, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc >>> 0, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(centralName.length, 28);
    central.writeUInt32LE((unixMode * 0x10000) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, centralName]));
    locals.push(localBlock);
    offset += localBlock.length;
  }
  const centralDirectory = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDirectory, eocd]);
}

test("fails closed when a local header path disagrees with the central directory", async () => {
  const { prepareArtifactPhpUnitHarness } = await import(harnessPath);
  const { root } = await makeRoot();
  const zipRoot = await mkdtemp(path.join(os.tmpdir(), "artifact-phpunit-confused-zip-"));
  const zip = path.join(zipRoot, "candidate.zip");
  await writeFile(zip, makeStoredZip([
    {
      name: "example-plugin/example-plugin.php",
      localName: "evil.php",
      data: "<?php\n",
    },
  ]));

  await assert.rejects(
    prepareArtifactPhpUnitHarness({
      contentRoot: root,
      consumer: "example-plugin",
      candidateZip: zip,
      expectedSha256: await sha256(zip),
    }),
    /local header path does not match central directory/i,
    "ZIP local/central path confusion must not be extracted as the candidate.",
  );
});

test("fails closed when extraction writes a path outside the consumer root", async () => {
  const { prepareArtifactPhpUnitHarness } = await import(harnessPath);
  const { root } = await makeRoot();
  const zip = await makeZip({ "example-plugin/example-plugin.php": "<?php\n" });

  await assert.rejects(
    prepareArtifactPhpUnitHarness({
      contentRoot: root,
      consumer: "example-plugin",
      candidateZip: zip,
      expectedSha256: await sha256(zip),
      afterExtract: async (staging) => writeFile(path.join(staging, "evil.php"), "<?php\n"),
    }),
    /must contain only example-plugin\//i,
    "An extracted sibling outside the plugin root must fail closed.",
  );
});

test("fails closed when candidate bytes change after the initial hash check", async () => {
  const { prepareArtifactPhpUnitHarness } = await import(harnessPath);
  const { root } = await makeRoot();
  const zip = await makeZip({ "example-plugin/example-plugin.php": "<?php\n" });
  const digest = await sha256(zip);

  await assert.rejects(
    prepareArtifactPhpUnitHarness({
      contentRoot: root,
      consumer: "example-plugin",
      candidateZip: zip,
      expectedSha256: digest,
      beforePostExtractionHash: async () => writeFile(zip, "changed candidate bytes"),
    }),
    /changed during harness preparation/i,
    "Candidate bytes must be checked again after extraction.",
  );
});

test("extracts the hash-checked ZIP snapshot when the candidate path is replaced", async () => {
  const { prepareArtifactPhpUnitHarness } = await import(harnessPath);
  const { root } = await makeRoot();
  const zip = await makeZip({ "example-plugin/example-plugin.php": "<?php\n" });
  const replacement = await makeZip({
    "example-plugin/example-plugin.php": "<?php\n",
    "example-plugin/evil.php": "<?php file_put_contents('/tmp/harness-toctou-pwned', 'x');\n",
  });
  const digest = await sha256(zip);
  let extractedReplacement = false;

  await assert.rejects(
    prepareArtifactPhpUnitHarness({
      contentRoot: root,
      consumer: "example-plugin",
      candidateZip: zip,
      expectedSha256: digest,
      beforeExtract: async () => writeFile(zip, await readFile(replacement)),
      afterExtract: async (staging) => {
        extractedReplacement = await access(path.join(staging, "example-plugin", "evil.php"))
          .then(() => true)
          .catch(() => false);
      },
    }),
    /changed during harness preparation/i,
    "A replaced candidate path must fail after extracting only the original hash-checked bytes.",
  );
  assert.equal(extractedReplacement, false, "The replacement ZIP must never be extracted.");
});
