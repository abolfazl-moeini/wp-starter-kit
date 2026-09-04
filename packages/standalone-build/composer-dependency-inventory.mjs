#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const output = path.resolve(
  process.argv[4] || path.join(contentRoot, "plugins", consumer, "dev", "composer-dependency-review.json"),
);
const pluginRoot = path.join(contentRoot, "plugins", consumer);

async function readJson(relative) {
  return JSON.parse(await fs.readFile(path.join(pluginRoot, relative), "utf8"));
}

const composer = await readJson("composer.json");
const framework = await readJson("packages/framework/composer.json");
const maps = {};
for (const name of ["autoload_psr4.php", "autoload_classmap.php", "autoload_files.php"]) {
  const file = path.join(pluginRoot, "vendor/composer", name);
  try {
    maps[name] = await fs.readFile(file, "utf8");
  } catch {
    maps[name] = null;
  }
}

const runtimeFiles = [...(composer.autoload?.files || []), ...(framework.autoload?.files || [])].sort();
const lifecycleScripts = [
  ...(Array.isArray(composer.scripts?.["post-install-cmd"]) ? composer.scripts["post-install-cmd"] : []),
  ...(Array.isArray(composer.scripts?.["post-update-cmd"]) ? composer.scripts["post-update-cmd"] : []),
  ...(typeof composer.scripts?.["scope:vendor"] === "string" ? [composer.scripts["scope:vendor"]] : []),
];
const ignoredLifecycleFailures = lifecycleScripts.filter((script) => /\|\|\s*true\b/.test(String(script)));
const unboundedWpdevConstraints = Object.entries(composer.require || {})
  .filter(([name, constraint]) => /^wpdev\//i.test(name) && String(constraint).trim() === "*")
  .map(([name]) => name);
const devOnlyMarkers = ["phpunit", "plugin-core-test", "polyfills", "deep-copy"];
const generatedFiles = (maps["autoload_files.php"] || "")
  .split(/\n/)
  .map((line) => line.match(/\$vendorDir\s*\.\s*['"]([^'"]+)['"]/i)?.[1])
  .filter(Boolean)
  .map((file) => file.replace(/^\/+/, ""))
  .sort();

const report = {
  schema: 1,
  generatedBy: "tools/composer-dependency-inventory.mjs",
  purpose: "Composer ownership evidence; not a release manifest.",
  scope: { consumer, pluginRoot: `plugins/${consumer}` },
  declared: {
    require: composer.require || {},
    requireDev: composer["require-dev"] || {},
    psr4: composer.autoload?.["psr-4"] || {},
    files: runtimeFiles,
    lifecycleScripts,
    frameworkPsr4: framework.autoload?.["psr-4"] || {},
    frameworkFiles: framework.autoload?.files || [],
  },
  generated: {
    mapsPresent: Object.fromEntries(Object.entries(maps).map(([name, value]) => [name, value !== null])),
    autoloadFiles: generatedFiles,
    devOnlyGeneratedFiles: generatedFiles.filter((file) => devOnlyMarkers.some((marker) => file.toLowerCase().includes(marker))),
  },
  blockers: {
    devFilesInGeneratedRuntimeMap: generatedFiles.filter((file) => devOnlyMarkers.some((marker) => file.toLowerCase().includes(marker))),
    runtimeAutoloadFilesRequireExplicitReadableEntry: runtimeFiles,
    straussPackagesMustBeResolvedFromLock: composer.extra?.strauss?.packages ?? null,
    ignoredLifecycleFailures,
    unboundedWpdevConstraints,
  },
  promotionRules: [
    "Final artifact maps must be regenerated from the final lock and final paths after Rector/build, never copied from a source checkout.",
    "Any require-dev/generated dev file in a customer autoload map blocks promotion.",
    "Every runtime autoload.files entry needs an explicit readable-entry or protected-runtime decision.",
    "Vendor-prefix lifecycle commands must fail closed; shell fallbacks such as `|| true` are prohibited.",
    "First-party wpdev/* requirements must use a bounded constraint that matches the locked package provenance.",
    "Composer/Strauss ownership must not overlap the framework assembler closure.",
  ],
};

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`Composer dependency inventory written: ${output}\n`);
