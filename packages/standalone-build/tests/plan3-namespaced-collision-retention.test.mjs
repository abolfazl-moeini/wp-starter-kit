import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);
const TRANSFORMER_PHP = path.resolve(packageRoot, "plan3/transformer.php");

async function dumpSymbolMap(rootDir) {
  const mapFile = path.join(rootDir, "symbol-map.json");
  await execFileAsync("php", [
    "-d",
    "memory_limit=1G",
    TRANSFORMER_PHP,
    "--dump-map",
    rootDir,
    mapFile,
    "namespaced-collision-seed",
    "--flatten=1",
    "--mangle=1",
    "--strip-comments=1",
  ], { maxBuffer: 50 * 1024 * 1024 });
  return JSON.parse(await readFile(mapFile, "utf8"));
}

test("Plan 3: same short class name in two WPDev namespaces retains both namespaces", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "plan3-collision-"));
  try {
    await mkdir(path.join(rootDir, "crm"), { recursive: true });
    await mkdir(path.join(rootDir, "crm", "Model"), { recursive: true });
    await mkdir(path.join(rootDir, "tickets"), { recursive: true });
    await mkdir(path.join(rootDir, "tickets", "Model"), { recursive: true });

    await writeFile(
      path.join(rootDir, "crm", "Model", "SyncJob.php"),
      `<?php
namespace WPDev\\Modules\\Crm\\Model;

class SyncJob {
    public function run(): int {
        return 1;
    }
}
`,
      "utf8"
    );

    await writeFile(
      path.join(rootDir, "tickets", "Model", "SyncJob.php"),
      `<?php
namespace WPDev\\Modules\\Tickets\\Model;

class SyncJob {
    public function run(): int {
        return 2;
    }
}
`,
      "utf8"
    );

    const map = await dumpSymbolMap(rootDir);
    const raw = map.retained_namespaces || map.retainedNamespaces || {};
    const retained = new Set(Array.isArray(raw) ? raw : Object.keys(raw));

    assert.ok(
      retained.has("WPDev\\Modules\\Crm\\Model"),
      "Colliding WPDev namespace must be retained (crm)"
    );
    assert.ok(
      retained.has("WPDev\\Modules\\Tickets\\Model"),
      "Colliding WPDev namespace must be retained (tickets)"
    );

    const crmSource = await readFile(path.join(rootDir, "crm", "Model", "SyncJob.php"), "utf8");
    const ticketsSource = await readFile(path.join(rootDir, "tickets", "Model", "SyncJob.php"), "utf8");
    assert.ok(
      crmSource.includes("namespace WPDev\\Modules\\Crm\\Model"),
      "Retained namespace declaration must survive flattening"
    );
    assert.ok(
      ticketsSource.includes("namespace WPDev\\Modules\\Tickets\\Model"),
      "Retained namespace declaration must survive flattening"
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
