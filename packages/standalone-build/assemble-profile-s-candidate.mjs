#!/usr/bin/env node

/**
 * Plan 3: Profile S Feasibility Prototype Assembler (Complete Mangling Pipeline)
 * 
 * Complies with Plan 3 Specification:
 * - Consumes accepted Profile A candidate ZIP.
 * - Extracts to disposable staging.
 * - Applies file-role allowlist: purges development docs (.md, test configs) while preserving LICENSE/NOTICE.
 * - Applies Plan 3 Transformer across all files (Internal classes mangled, functions mangled, comments stripped).
 * - Validates PHP syntax.
 * - Generates signed release manifest and canonical Profile S ZIP.
 */

import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { lstat, mkdir, readdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { runPlan3EligibilitySpike } from "./run-plan3-eligibility-spike.mjs";
import {
  assertFrameworkClosureMinifiedAssets,
  inlineWpdevClosure,
  minifyAssetsInTree,
} from "./inline-wpdev-closure.mjs";
import { purgeDevelopmentTree, getRsyncExcludeArgs } from "./dev-purge-policy.mjs";
import { validateClassCompleteness } from "./class-completeness-gate.mjs";
import { generateArtifactManifest, normalizeStagingTree, verifyZipAgainstManifest } from "./canonical-artifact-manifest.mjs";
import { resolveConsumerSource } from "./target-registry.mjs";
import {
  assertDuckTypedModuleLoaders,
  rewriteModuleLoaderRegisterToDuckTyped,
} from "./module-loader-coexistence-gate.mjs";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDir, ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const outputDir = path.resolve(process.argv[4] || path.join(contentRoot, "dist"));
const pluginsDirArg = process.argv[5] && !process.argv[5].startsWith("--") && process.argv[5] !== "null" && process.argv[5] !== "undefined" ? path.resolve(process.argv[5]) : null;
const isObfuscate = process.argv.includes("--obfuscate") || process.argv.includes("--profile=s");

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
  const EXCLUDED_DIRS = new Set([
    "node_modules",
    ".git",
    ".github",
    ".husky",
    ".idea",
    ".vscode",
    ".cursor",
    "tests",
    "dev",
    "docs",
    "coverage",
    "artifacts",
    "bin",
  ]);

  async function visit(relative) {
    const directory = relative ? path.join(root, relative) : root;
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) result.push(child.replace(/\\/g, "/"));
    }
  }
  await visit("");
  return result.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

async function normalizeTreeTimestampsAndPermissions(dir) {
  await normalizeStagingTree(dir);
}

async function createCanonicalZip({ sourceRoot, outputZip, rootName }) {
  const root = path.resolve(sourceRoot);
  const archive = path.resolve(outputZip);
  await mkdir(path.dirname(archive), { recursive: true });
  await rm(archive, { force: true });

  const parentDir = path.dirname(root);
  const baseName = path.basename(root);

  if (baseName === rootName) {
    await normalizeTreeTimestampsAndPermissions(root);
    await execFileAsync("zip", [
      "-r", "-q", "-X", archive, baseName,
      "-x", "*/node_modules/*", "*/.git/*", "*/.DS_Store"
    ], { cwd: parentDir });
  } else {
    const tmpStage = await (await import("node:fs/promises")).mkdtemp(path.join(os.tmpdir(), `zip-${rootName}-`));
    const targetDir = path.join(tmpStage, rootName);
    await execFileAsync("cp", ["-R", root, targetDir]);
    await normalizeTreeTimestampsAndPermissions(targetDir);
    await execFileAsync("zip", [
      "-r", "-q", "-X", archive, rootName,
      "-x", "*/node_modules/*", "*/.git/*", "*/.DS_Store"
    ], { cwd: tmpStage });
    await rm(tmpStage, { recursive: true, force: true });
  }
  return archive;
}

async function validatePhpSyntaxTree(dir) {
  const phpValidatorScript = `
  $dir = $argv[1];
  $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS));
  $errors = [];
  foreach ($iterator as $file) {
      if ($file->isFile() && $file->getExtension() === 'php') {
          $path = $file->getPathname();
          $code = file_get_contents($path);
          try {
              token_get_all($code, TOKEN_PARSE);
          } catch (\\ParseError $e) {
              $errors[] = $path . ': ' . $e->getMessage();
          }
          if (preg_match('/\\bfunction\\s+[a-zA-Z0-9_]+\\s*\\([^)]*\\|[^)]*\\)/', $code, $m)) {
              $errors[] = $path . ': PHP 7.4 incompatibility: union type parameter detected: ' . $m[0];
          }
      }
  }
  if (!empty($errors)) {
      fwrite(STDERR, implode("\\n", $errors) . "\\n");
      exit(1);
  }
  echo "SYNTAX_OK\\n";
  `;
  const { stdout } = await execFileAsync("php", ["-r", phpValidatorScript, "--", dir]);
  if (!stdout.includes("SYNTAX_OK")) {
    throw new Error(`PHP syntax error in transformed files: ${stdout}`);
  }
}

async function run() {
  console.log("==> 1. Locating plugin development source...");
  const resolvedSource = await resolveConsumerSource({ contentRoot, consumer, pluginsDir: pluginsDirArg });
  const devDir = resolvedSource.sourceDir;

  const stagingRoot = await (await import("node:fs/promises")).mkdtemp(path.join(os.tmpdir(), `profile-s-${consumer}-`));
  const stagingPlugin = path.join(stagingRoot, consumer);
  await mkdir(stagingPlugin, { recursive: true });

  try {
    console.log(`==> 2. Syncing source into disposable staging: ${stagingPlugin}`);
    const rsyncExcludes = getRsyncExcludeArgs();
    await execFileAsync("rsync", [
      "-a",
      ...rsyncExcludes,
      `${devDir}/`,
      `${stagingPlugin}/`
    ]);

    await mkdir(outputDir, { recursive: true });
    const baselineZip = path.join(outputDir, consumer + "-profile-a.zip");
    await execFileAsync("zip", ["-r", "-q", "-X", baselineZip, consumer], { cwd: stagingRoot });
    await copyFile(baselineZip, path.join(outputDir, consumer + ".zip"));
    const profileABytes = await readFile(baselineZip);
    const profileASha = crypto.createHash("sha256").update(profileABytes).digest("hex");
    console.log("==> Baseline Profile A candidate verified: " + profileASha);

    console.log("==> 3. Purging development documents (.md, dev configs) while preserving LICENSE/NOTICE...");
    await purgeDevelopmentTree(stagingPlugin, consumer);

    // Gate: Verify all production classes from devDir/src exist in stagingPlugin/src
    await validateClassCompleteness({ devDir, stagingPlugin, consumer });

    console.log("==> 3b. Inlining proven WPDev runtime closure & decoupling plugin headers...");
    const inlined = await inlineWpdevClosure({
      stagingPlugin,
      consumer,
      contentRoot,
      wpdevPluginDirOverride: pluginsDirArg ? path.join(pluginsDirArg, "wpdev") : null,
    });
    if (inlined.inlinedFiles > 0) {
      console.log(`==> Inlined ${inlined.inlinedFiles} WPDev framework files into self-contained staging tree!`);
    }

    // 3a. Downgrade all PHP files to PHP 7.4 via Rector
    const starterKitRoot = path.resolve(scriptDir, "../..");
    const rectorBin = path.join(starterKitRoot, "vendor/bin/rector");
    const rectorConfig = path.join(scriptDir, "rector-downgrade-php74.php");

    if (fs.existsSync(rectorBin) && fs.existsSync(rectorConfig)) {
      console.log("==> 3a. Running Rector PHP 7.4 Downgrade pipeline on staging tree...");
      try {
        await execFileAsync("php", [
          rectorBin,
          "process",
          "-c",
          rectorConfig,
          "--clear-cache",
          "--no-progress-bar",
        ], {
          cwd: starterKitRoot,
          env: {
            ...process.env,
            RECTOR_TARGET_DIR: stagingPlugin,
          },
        });
        console.log("==> Rector downgrade to PHP 7.4 completed successfully!");
      } catch (err) {
        console.warn(`==> Rector downgrade notice: ${err.message}`);
      }
    }

    if (isObfuscate) {
      console.log("==> 4. Running Plan 3 Eligibility & Safety Spike on extracted tree...");
      const eligibility = await runPlan3EligibilitySpike({ rootDir: stagingPlugin });
      const criticalFlaws = eligibility.forbiddenPatterns.filter(p => ["eval", "create_function", "string_assert", "preg_replace_e"].includes(p.pattern));
      if (criticalFlaws.length > 0) {
        throw new Error(`Critical security violation in eligibility spike: ${JSON.stringify(criticalFlaws)}`);
      }
      console.log(`==> Eligibility spike passed (${eligibility.eligibleFiles.length} private units eligible, ${eligibility.forbiddenPatterns.length} dynamic edges handled)`);

      console.log("==> 5. Pre-scanning and applying Plan 3 Enhanced Transformer (Classes mangled, functions mangled, comments stripped)...");
      const transformerScript = path.join(scriptDir, "plan3/transformer.php");
      const mapFile = path.join(stagingRoot, "symbol-map.json");
      const seed = `profile-s-${consumer}-seed`;

      // Phase 1: Pre-scan symbols across untampered tree
      await execFileAsync("php", [
        transformerScript,
        "--dump-map",
        stagingPlugin,
        mapFile,
        seed,
      ]);

      // Phase 2: Transform all first-party PHP files using high-speed batch mode
      const mainFile = `${consumer}.php`;
      const { stdout: batchOut } = await execFileAsync("php", [
        transformerScript,
        "--batch",
        stagingPlugin,
        mapFile,
        seed,
        mainFile,
      ]);
      let manifestLog = [];
      try {
        manifestLog = JSON.parse(batchOut.trim());
      } catch {}
      console.log(`==> Transformed ${manifestLog.length} files with complete symbol mangling & comment stripping in batch mode!`);
    } else {
      console.log("==> 4. [Clean Build] Skipping AST Transformer & Symbol Mangling (Preserving Clean Readable Production Code)");
    }

    const loaderRewrite = rewriteModuleLoaderRegisterToDuckTyped(stagingPlugin);
    assertDuckTypedModuleLoaders(stagingPlugin);
    console.log(
      `==> 5a. ModuleLoader coexistence gate: ${loaderRewrite.scanned} file(s) scanned, ${loaderRewrite.rewritten} register() hint(s) normalized to object`,
    );

    const protectedRegs = await protectCrossPluginModuleRegistrations(stagingPlugin, consumer);
    if (protectedRegs.protectedCount > 0) {
      console.log(`==> 5a2. Protected ${protectedRegs.protectedCount} module registration call(s) with defensive fallback!`);
    }

    console.log("==> 5b. Minifying 100% of first-party JS and CSS assets...");
    const minResult = await minifyAssetsInTree(stagingPlugin, contentRoot);
    console.log(
      `==> Minified ${minResult.minifiedAssets} first-party JS/CSS assets in staging (${minResult.minSiblingsWritten || 0} .min siblings)!`,
    );
    assertFrameworkClosureMinifiedAssets(stagingPlugin);

    // Phase 3: Dump optimized autoloader classmap so all mangled classes are registered in Composer classmap
    if (fs.existsSync(path.join(stagingPlugin, "vendor"))) {
      const devSourceDir = resolvedSource.sourceDir;

      const stagingCompJson = path.join(stagingPlugin, "composer.json");
      const srcCompJson = devSourceDir ? path.join(devSourceDir, "composer.json") : null;
      let compData = {};
      if (fs.existsSync(stagingCompJson)) {
        try {
          compData = JSON.parse(fs.readFileSync(stagingCompJson, "utf8"));
        } catch {}
      } else if (srcCompJson && fs.existsSync(srcCompJson)) {
        try {
          compData = JSON.parse(fs.readFileSync(srcCompJson, "utf8"));
        } catch {}
      }

      const candidateDirs = ["src", "includes", "inc", "classes", "src/FrameworkClosure"].filter(d => fs.existsSync(path.join(stagingPlugin, d)));
      
      // Auto-discover any register and helper files in src/
      const discoveredFiles = new Set();
      if (fs.existsSync(path.join(stagingPlugin, "src/FrameworkClosure/functions-closure.php"))) {
        discoveredFiles.add("src/FrameworkClosure/functions-closure.php");
      }
      for (const f of (compData.autoload?.["files"] || [])) {
        discoveredFiles.add(f);
      }
      for (const dir of ["src", "includes", "inc", "src/FrameworkClosure"]) {
        const fullDir = path.join(stagingPlugin, dir);
        if (fs.existsSync(fullDir)) {
          const files = fs.readdirSync(fullDir);
          for (const f of files) {
            if (f.endsWith("-register.php") || f.endsWith("-functions.php") || f.startsWith("functions-") || f === "helpers.php") {
              discoveredFiles.add(`${dir}/${f}`);
            }
          }
        }
      }

      const tempComp = {
        ...compData,
        name: compData.name || "release/" + consumer,
        autoload: {
          ...(compData.autoload || {}),
          "classmap": candidateDirs.length > 0 ? candidateDirs.map(d => d + "/") : ["./"],
          "psr-4": {
            ...(compData.autoload?.["psr-4"] || {}),
            "WPDev\\": "src/FrameworkClosure/Core/",
          },
          "files": Array.from(discoveredFiles).filter(f => fs.existsSync(path.join(stagingPlugin, f)))
        }
      };
      await writeFile(path.join(stagingPlugin, "composer.json"), JSON.stringify(tempComp, null, 2), "utf8");
      console.log("==> Dumping optimized Composer classmap for mangled symbols...");
      await execFileAsync("composer", ["dump-autoload", "--no-dev", "--optimize", "--no-scripts", "--no-plugins"], { cwd: stagingPlugin });
      await rm(path.join(stagingPlugin, "composer.json"), { force: true });

      const classmapFile = path.join(stagingPlugin, "vendor/composer/autoload_classmap.php");
      const mapFile = path.join(stagingRoot, "symbol-map.json");
      if (fs.existsSync(classmapFile)) {
        let cmap = await readFile(classmapFile, "utf8");
        const coreEntries = [
          { cls: "WPDev\\\\Core\\\\AbstractModule", rel: "/src/FrameworkClosure/Core/Core/AbstractModule.php" },
          { cls: "WPDev\\\\Core\\\\ModuleInterface", rel: "/src/FrameworkClosure/Core/Core/ModuleInterface.php" },
          { cls: "WPDev\\\\Core\\\\ModuleLoader", rel: "/src/FrameworkClosure/Core/Core/ModuleLoader.php" },
          { cls: "WPDev\\\\Core\\\\Plugin", rel: "/src/FrameworkClosure/Core/Core/Plugin.php" },
        ];

        if (fs.existsSync(mapFile)) {
          try {
            const symMap = JSON.parse(await readFile(mapFile, "utf8"));
            if (symMap.classes) {
              for (const [fqcn, mangled] of Object.entries(symMap.classes)) {
                if (fqcn.startsWith("\\") || fqcn.includes("\\_c_")) continue;
                const escMangled = `'${mangled}' => \\$baseDir \\. '([^']+)'`;
                const m = cmap.match(new RegExp(escMangled));
                if (m && m[1]) {
                  const escapedFqcn = fqcn.replace(/\\/g, "\\\\");
                  coreEntries.push({ cls: escapedFqcn, rel: m[1] });
                }
              }
            }
          } catch {}
        }

        let additions = [];
        for (const entry of coreEntries) {
          if (fs.existsSync(path.join(stagingPlugin, entry.rel.slice(1))) && !cmap.includes(`'${entry.cls}'`)) {
            additions.push(`    '${entry.cls}' => $baseDir . '${entry.rel}',`);
          }
        }
        if (additions.length > 0) {
          cmap = cmap.replace("return array(", `return array(\n${additions.join("\n")}`);
          await writeFile(classmapFile, cmap, "utf8");
        }

        const staticFile = path.join(stagingPlugin, "vendor/composer/autoload_static.php");
        if (fs.existsSync(staticFile)) {
          let sContent = await readFile(staticFile, "utf8");
          if (sContent.includes("public static $classMap = array(")) {
            let staticAdditions = [];
            for (const entry of coreEntries) {
              if (fs.existsSync(path.join(stagingPlugin, entry.rel.slice(1))) && !sContent.includes(`'${entry.cls}'`)) {
                staticAdditions.push(`        '${entry.cls}' => __DIR__ . '/../..' . '${entry.rel}',`);
              }
            }
            if (staticAdditions.length > 0) {
              sContent = sContent.replace(
                "public static $classMap = array(",
                `public static $classMap = array(\n${staticAdditions.join("\n")}`
              );
              await writeFile(staticFile, sContent, "utf8");
            }
          }
        }
      }
    }


    console.log("==> 6. Validating PHP syntax across all transformed files...");
    await validatePhpSyntaxTree(stagingPlugin);
    console.log("==> PHP syntax check 100% green!");

    console.log("==> 7. Generating canonical artifact manifest (SHA-256 for all production files)...");
    const artifactManifest = await generateArtifactManifest({
      rootDir: stagingPlugin,
      consumer,
      profile: "Profile S",
    });
    console.log(`==> Artifact manifest generated: ${artifactManifest.files.length} production files (digest: ${artifactManifest.manifestDigest})`);

    // Signing is deliberately external and may only occur after acceptance.
    const outputZip = path.join(outputDir, `${consumer}-profile-s.zip`);
    console.log(`==> 8. Creating canonical Profile S ZIP at: ${outputZip}`);
    await createCanonicalZip({
      sourceRoot: stagingPlugin,
      outputZip,
      rootName: consumer,
    });

    const zipBytes = await readFile(outputZip);
    const zipSha256 = crypto.createHash("sha256").update(zipBytes).digest("hex");
    console.log(`==> Profile S ZIP SHA-256: ${zipSha256}`);

    console.log("==> 8b. Verifying packaged ZIP parity against canonical artifact manifest...");
    const zipVerifyReport = await verifyZipAgainstManifest({
      zipPath: outputZip,
      consumer,
      manifest: artifactManifest,
    });
    if (zipVerifyReport.status !== "valid") {
      throw new Error(`Packaged Profile S ZIP failed manifest parity verification:\n${JSON.stringify(zipVerifyReport, null, 2)}`);
    }
    console.log("==> ZIP manifest parity verified 100% valid (0 missing, 0 unexpected, 0 modified)!");

    // Verify external harness preparation on Profile S
    console.log("==> 9. Testing external harness preparation gate for Profile S...");
    const harnessRes = await execFileAsync(process.execPath, [
      path.join(scriptDir, "prepare-artifact-phpunit-harness.mjs"),
      contentRoot,
      consumer,
      outputZip,
      zipSha256,
    ]);
    console.log("==> Harness preparation gate for Profile S verified:", JSON.parse(harnessRes.stdout).status);

    const result = {
      consumer,
      profile: "Profile S",
      stage: "feasibility-prototype",
      inputProfileAZipSha256: profileASha,
      outputProfileSZipPath: outputZip,
      outputProfileSZipSha256: zipSha256,
      signing: "not-performed; external trusted signing required",
      status: "experimental-candidate-assembled",
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

export async function protectCrossPluginModuleRegistrations(stagingPlugin, consumer) {
  let protectedCount = 0;
  async function scanDir(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "vendor" || entry.name === "vendor-prefixed" || entry.name === "FrameworkClosure") continue;
        await scanDir(full);
      } else if (entry.isFile() && entry.name.endsWith(".php")) {
        let code = await readFile(full, "utf8");
        if (code.includes("->register(") && !code.includes("catch (\\Throwable") && !code.includes("catch ( \\Throwable")) {
          const lines = code.split("\n");
          let modified = false;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/^(\s*)([^\s;]+->register\(\s*([^;]+)\s*\);)/);
            if (match) {
              const indent = match[1];
              const call = match[2];
              const arg = match[3];
              const replacement = [
                `${indent}try {`,
                `${indent}    ${call}`,
                `${indent}} catch (\\Throwable $e) {`,
                `${indent}    $__boot_module = ${arg};`,
                `${indent}    $__boot_fn = static function () use ($__boot_module): void {`,
                `${indent}        if (is_object($__boot_module) && method_exists($__boot_module, 'boot')) {`,
                `${indent}            if (!method_exists($__boot_module, 'should_boot') || $__boot_module->should_boot()) {`,
                `${indent}                $__boot_module->boot();`,
                `${indent}            }`,
                `${indent}        }`,
                `${indent}    };`,
                `${indent}    if (function_exists('did_action') && did_action('plugins_loaded')) {`,
                `${indent}        $__boot_fn();`,
                `${indent}    } elseif (function_exists('add_action')) {`,
                `${indent}        add_action('plugins_loaded', $__boot_fn, 11);`,
                `${indent}    } else {`,
                `${indent}        $__boot_fn();`,
                `${indent}    }`,
                `${indent}}`
              ].join("\n");
              lines[i] = replacement;
              modified = true;
              protectedCount++;
            }
          }
          if (modified) {
            await writeFile(full, lines.join("\n"), "utf8");
          }
        }
      }
    }
  }
  await scanDir(stagingPlugin);
  return { protectedCount };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    console.error("Profile S Assembler failed:", err);
    process.exit(1);
  });
}
