#!/usr/bin/env node
/**
 * Prepare a production-ready plugin package under dist/{slug}/.
 *
 * Source tree is left untouched. Steps:
 *   0. Run enabled PHP/JS unit + Playwright e2e (unless --skip-tests)
 *   1. Resolve slug + phpMinVersion from wpdev.json (or project.config.json)
 *   2. Copy project → dist/{slug}/ (excluding node_modules, vendor, dist, …)
 *   3. Downgrade PHP in dist/ via Rector to phpMinVersion (host `vendor/bin/rector`)
 *   4. If composer.json exists: harden for release, composer install --no-dev
 *   5. Strip dev-only paths (tests, docs, packages, composer.json/lock, …)
 *   6. Zip dist/{slug}/ → dist/{slug}.zip (WordPress-style: folder as zip root)
 *
 * Usage (from project root):
 *   node dev/release/prepare-release.js
 *   node dev/release/prepare-release.js --out=dist --skip-composer
 *   node dev/release/prepare-release.js --skip-rector
 *   node dev/release/prepare-release.js --skip-zip
 *   node dev/release/prepare-release.js --skip-tests
 *
 * Pre-dist gate (default ON): runs enabled PHP/JS unit tests and Playwright
 * e2e from wpdev.json features before mutating dist/. Bypass with
 * --skip-tests or WPDEV_SKIP_TESTS=1.
 *
 * Wired as:
 *   npm run release  →  node dev/release/run-release.js
 *     (tests → npm run build → prepare-release --skip-tests)
 *   composer release:dist  →  node dev/release/prepare-release.js
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  lstatSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as os from "node:os";
import {
  prepareComposerForRelease,
  releaseCopyExcludeNames,
  shouldStripRelativePath,
} from "./prepareComposer.js";
import { gateReleaseTests } from "./releaseTests.js";
import { createCanonicalZip } from "./canonical-zip.js";
import { requireProfileSTransformer } from "./resolve-profile-s-transformer.js";

import {
  rewriteModuleLoaderRegisterToDuckTyped,
  assertDuckTypedModuleLoaders,
} from "./module-loader-coexistence-gate.js";

function getReleaseScriptDir(pluginRoot) {
  if (typeof __dirname !== "undefined") {
    return __dirname;
  }
  if (process.argv[1] && typeof process.argv[1] === "string") {
    const resolved = path.resolve(process.argv[1]);
    try {
      if (existsSync(resolved) && lstatSync(resolved).isFile()) {
        return path.dirname(resolved);
      }
    } catch {
      /* fallback */
    }
  }
  if (pluginRoot && existsSync(path.join(pluginRoot, "dev/release"))) {
    return path.join(pluginRoot, "dev/release");
  }
  return process.cwd();
}

function normalizeStandaloneModuleLoaders(distRoot) {
  rewriteModuleLoaderRegisterToDuckTyped(distRoot);
  assertDuckTypedModuleLoaders(distRoot);
}

export const CANONICAL_CONSUMERS = new Set([
  "tavangary-core",
  "tavangary-theme-panel",
  "wpdev-crm",
  "wpdev-tickets",
  "wpdev-analytics",
  "wpdev-woo-persian",
  "drm-connector",
  "wpdev-woocommerce",
  "wpdev-bulk-price-manager",
]);

export function registerCanonicalConsumer(slug) {
  if (slug && typeof slug === "string") {
    CANONICAL_CONSUMERS.add(slug.trim());
  }
}

export function resolveCanonicalAssembler({
  fromDir,
  pluginRoot,
  env = process.env,
} = {}) {
  const explicit = String(env.WPDEV_STANDALONE_ASSEMBLER || "").trim();
  if (explicit && existsSync(explicit)) {
    return path.resolve(explicit);
  }

  const starterKit = String(env.WPDEV_STARTER_KIT || "").trim();
  const candidates = [];
  if (starterKit) {
    candidates.push(
      path.join(
        starterKit,
        "packages/standalone-build/assemble-profile-s-candidate.mjs",
      ),
    );
  }
  const defaultKit = path.join(
    os.homedir(),
    "Documents/ideas/extend-kit/wp-starter-kit",
  );
  if (existsSync(defaultKit)) {
    candidates.push(
      path.join(
        defaultKit,
        "packages/standalone-build/assemble-profile-s-candidate.mjs",
      ),
    );
  }

  if (fromDir) {
    candidates.push(
      path.resolve(
        fromDir,
        "../../../standalone-build/assemble-profile-s-candidate.mjs",
      ),
    );
    let dir = path.resolve(fromDir);
    for (let i = 0; i < 10; i += 1) {
      candidates.push(
        path.join(
          dir,
          "packages/standalone-build/assemble-profile-s-candidate.mjs",
        ),
      );
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  if (pluginRoot) {
    let dir = path.resolve(pluginRoot);
    for (let i = 0; i < 10; i += 1) {
      candidates.push(
        path.join(
          dir,
          "wp-starter-kit/packages/standalone-build/assemble-profile-s-candidate.mjs",
        ),
        path.join(
          dir,
          "packages/standalone-build/assemble-profile-s-candidate.mjs",
        ),
      );
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  const found = candidates.find((c) => existsSync(c));
  return found ? path.resolve(found) : null;
}

export function parseArgs(argv) {
  const opts = {
    out: "dist",
    skipComposer: false,
    skipRector: false,
    skipZip: false,
    skipTests: false,
    obfuscate: false,
    profile: null,
    root: process.cwd(),
    spaghetti: false,
    inlineFramework: undefined,
  };
  const selectedProfiles = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--skip-composer") opts.skipComposer = true;
    else if (arg === "--skip-rector") opts.skipRector = true;
    else if (arg === "--skip-zip") opts.skipZip = true;
    else if (arg === "--skip-tests") opts.skipTests = true;
    else if (arg === "--inline-framework") opts.inlineFramework = true;
    else if (arg === "--no-inline-framework") opts.inlineFramework = false;
    else if (arg === "--standalone") {
      selectedProfiles.push("standalone");
    } else if (arg === "--no-standalone") {
      opts.inlineFramework = false;
    } else if (arg === "--spaghetti") {
      selectedProfiles.push("spaghetti");
    } else if (arg === "--obfuscate") {
      selectedProfiles.push("s");
    } else if (arg === "--profile") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        throw new Error(
          "Invalid --profile: a value is required (spaghetti, standalone, clean, or s)",
        );
      }
      const val = next.trim().toLowerCase();
      if (
        val !== "s" &&
        val !== "clean" &&
        val !== "spaghetti" &&
        val !== "standalone"
      ) {
        throw new Error(
          `Invalid --profile '${val}'. Allowed: spaghetti, standalone, clean, s`,
        );
      }
      selectedProfiles.push(val);
      i++;
    } else if (arg === "--profile=") {
      throw new Error(
        "Invalid --profile: a value is required (spaghetti, standalone, clean, or s)",
      );
    } else if (typeof arg === "string" && arg.startsWith("--profile=")) {
      const val = arg.slice("--profile=".length).trim().toLowerCase();
      if (
        val !== "s" &&
        val !== "clean" &&
        val !== "spaghetti" &&
        val !== "standalone"
      ) {
        throw new Error(
          `Invalid --profile '${val}'. Allowed: spaghetti, standalone, clean, s`,
        );
      }
      selectedProfiles.push(val);
    } else if (typeof arg === "string" && arg.startsWith("--out=")) {
      opts.out = arg.slice("--out=".length);
    } else if (typeof arg === "string" && arg.startsWith("--root=")) {
      opts.root = path.resolve(arg.slice("--root=".length));
    } else if (arg === "--use-canonical-assembler" || arg === "--canonical") {
      opts.useCanonicalAssembler = true;
    } else if (arg === "--no-canonical-assembler") {
      opts.useCanonicalAssembler = false;
    } else if (arg === "--help" || arg === "-h") {
      opts.help = true;
    }
  }
  const unique = [...new Set(selectedProfiles)];
  if (unique.length > 1) {
    throw new Error(`Conflicting profile flags: ${unique.join(", ")}`);
  }
  if (unique.length === 1) {
    opts.profile = unique[0];
    opts.obfuscate = unique[0] === "s";
    opts.spaghetti = unique[0] === "spaghetti";
    if (unique[0] === "standalone") {
      opts.inlineFramework = true;
    }
  }
  return opts;
}

function readProjectConfig(root) {
  const wpdevPath = path.join(root, "wpdev.json");
  const legacyPath = path.join(root, "project.config.json");
  const configPath = existsSync(wpdevPath)
    ? wpdevPath
    : existsSync(legacyPath)
      ? legacyPath
      : null;
  if (!configPath) {
    throw new Error(
      "wpdev.json (or project.config.json) not found in project root",
    );
  }
  const raw = JSON.parse(readFileSync(configPath, "utf8"));
  if (!raw || typeof raw !== "object" || !raw.slug) {
    throw new Error(
      `${path.basename(configPath)} must contain a non-empty "slug"`,
    );
  }
  return {
    slug: String(raw.slug),
    phpMinVersion: String(
      (raw.features && raw.features.phpMinVersion) ||
        raw.phpMinVersion ||
        "7.4",
    ),
    configPath,
    raw,
  };
}

export function resolveProjectVersion(root, slug, raw = {}) {
  const pkgPath = path.join(root, "package.json");
  let pkgVersion = null;
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (typeof pkg.version === "string" && pkg.version.trim()) {
        pkgVersion = pkg.version.trim();
      }
    } catch {}
  }

  let headerVersion = null;
  const mainPhpCandidates = [
    path.join(root, `${slug}.php`),
    path.join(root, "plugin.php"),
  ];
  for (const mainPhp of mainPhpCandidates) {
    if (existsSync(mainPhp)) {
      try {
        const content = readFileSync(mainPhp, "utf8");
        const match = content.match(/^[ \t/*#@]*Version:\s*([0-9A-Za-z.-]+)/im);
        if (match) {
          headerVersion = match[1].trim();
          break;
        }
      } catch {}
    }
  }

  const rawVersion =
    typeof raw?.version === "string" && raw.version.trim()
      ? raw.version.trim()
      : null;

  return pkgVersion || headerVersion || rawVersion || "1.0.0";
}

function shouldExcludeOnCopy(relative, excludeNames, outBase) {
  const normalized = relative.replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return false;

  const rootSegment = segments[0];
  if (outBase && rootSegment === outBase) return true;

  // Global exclusions at any depth
  const globalExcludes = ["node_modules", ".git"];
  for (const seg of segments) {
    if (globalExcludes.includes(seg)) return true;
    if (seg.startsWith(".") && seg !== "." && seg !== "..") return true;
  }

  // Root-only directory / file exclusions
  if (excludeNames.includes(rootSegment)) return true;

  return false;
}

function copyTree(srcRoot, destRoot, excludeNames, outAbs) {
  mkdirSync(destRoot, { recursive: true });
  const outBase = outAbs ? path.basename(outAbs) : null;
  const resolvedOutAbs = outAbs ? path.resolve(outAbs) : null;
  const stack = [""];
  while (stack.length) {
    const rel = stack.pop();
    const fromDir = rel ? path.join(srcRoot, rel) : srcRoot;
    let entries;
    try {
      entries = readdirSync(fromDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (shouldExcludeOnCopy(childRel, excludeNames, outBase)) continue;
      const from = path.join(srcRoot, childRel);
      if (
        resolvedOutAbs &&
        (from === resolvedOutAbs || from.startsWith(resolvedOutAbs + path.sep))
      ) {
        continue;
      }
      const to = path.join(destRoot, childRel);
      let st;
      try {
        st = lstatSync(from);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) {
        // Skip symlinks — release packages must not ship host links.
        continue;
      }
      if (st.isDirectory()) {
        mkdirSync(to, { recursive: true });
        stack.push(childRel);
        continue;
      }
      if (st.isFile()) {
        mkdirSync(path.dirname(to), { recursive: true });
        copyFileSync(from, to);
      }
    }
  }
}

function walkFiles(root) {
  const out = [];
  const stack = [""];
  while (stack.length) {
    const rel = stack.pop();
    const dir = rel ? path.join(root, rel) : root;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        stack.push(childRel);
      } else if (entry.isFile()) {
        out.push(childRel.replace(/\\/g, "/"));
      }
    }
  }
  return out;
}

function stripDist(distRoot) {
  const files = walkFiles(distRoot);
  for (const rel of files) {
    if (shouldStripRelativePath(rel)) {
      try {
        rmSync(path.join(distRoot, rel), { force: true });
      } catch {
        /* ignore */
      }
    }
  }

  const allDirs = [];
  const stack = [""];
  while (stack.length) {
    const rel = stack.pop();
    const dir = rel ? path.join(distRoot, rel) : distRoot;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      stack.push(childRel);
      allDirs.push(childRel.replace(/\\/g, "/"));
    }
  }
  allDirs.sort((a, b) => b.length - a.length);
  for (const rel of allDirs) {
    if (shouldStripRelativePath(rel)) {
      try {
        rmSync(path.join(distRoot, rel), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }

  for (const entry of readdirSync(distRoot, { withFileTypes: true })) {
    const rel = entry.name;
    if (shouldStripRelativePath(rel)) {
      try {
        rmSync(path.join(distRoot, rel), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}

function runComposerInstall(distRoot) {
  const result = spawnSync(
    "composer",
    [
      "install",
      "--no-dev",
      "--no-interaction",
      "--no-progress",
      "--prefer-dist",
    ],
    {
      cwd: distRoot,
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0) {
    const out = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    throw new Error(
      `composer install --no-dev failed in ${distRoot} (exit ${result.status}):\n${out}`,
    );
  }
}

/**
 * Downgrade PHP in the dist tree to phpMinVersion using the *host*
 * project's Rector binary (dist has no vendor yet / will install --no-dev).
 *
 * Soft-skip when rector is not installed or configs are missing — projects
 * that already author at phpMinVersion do not need this step.
 *
 * @param {string} root Project root (has vendor/bin/rector).
 * @param {string} distRoot Copied tree still containing dev/rector-*.php.
 */
function parseTransformerBatchLog(stdout) {
  const trimmed = String(stdout || "").trim();
  if (!trimmed) {
    throw new Error("Profile S transformer --batch produced empty stdout");
  }
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (first) {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        throw new Error(
          `Profile S transformer --batch did not emit valid JSON: ${first.message}`,
        );
      }
    } else {
      throw new Error(
        `Profile S transformer --batch did not emit valid JSON: ${first.message}`,
      );
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      "Profile S transformer --batch JSON must be a non-empty array of file records",
    );
  }
  for (const rec of parsed) {
    if (
      !rec ||
      typeof rec !== "object" ||
      typeof rec.file !== "string" ||
      rec.file.length === 0
    ) {
      throw new Error("Profile S transformer --batch record missing file path");
    }
  }
  return parsed;
}

function runRectorBuildOnDist(root, distRoot, { required = false } = {}) {
  const rectorBin = path.join(root, "vendor/bin/rector");
  const config = path.join(distRoot, "dev/rector-build.php");
  if (!existsSync(rectorBin) || !existsSync(config)) {
    if (required) {
      throw new Error(
        `Profile S requires Rector PHP 7.4 downgrade (missing ${!existsSync(rectorBin) ? rectorBin : config})`,
      );
    }
    return { skipped: true, reason: "rector binary or config missing" };
  }

  const result = spawnSync(
    "php",
    [rectorBin, "process", "-c", "dev/rector-build.php", "--clear-cache"],
    {
      cwd: distRoot,
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0) {
    const out = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    throw new Error(
      `rector:build failed in ${distRoot} (exit ${result.status}):\n${out}`,
    );
  }
  return { skipped: false };
}

/**
 * Zip dist/{slug}/ into dist/{slug}.zip with `{slug}/…` as the archive root
 * (WordPress plugin install convention).
 *
 * @param {string} outAbs Absolute path to the output base (e.g. …/dist)
 * @param {string} slug Plugin slug / folder name inside outAbs
 * @returns {string} Absolute path to the zip file
 */
async function createReleaseZip(outAbs, slug) {
  const zipPath = path.join(outAbs, `${slug}.zip`);
  if (existsSync(zipPath)) {
    rmSync(zipPath, { force: true });
  }
  await createCanonicalZip({
    sourceRoot: path.join(outAbs, slug),
    outputZip: zipPath,
    rootName: slug,
  });
  if (!existsSync(zipPath)) {
    throw new Error(`zip reported success but ${zipPath} was not created`);
  }
  return zipPath;
}

/**
 * Programmatic entry (for tests and CLI).
 *
 * @param {{ root?: string, out?: string, skipComposer?: boolean, skipRector?: boolean, skipZip?: boolean, skipTests?: boolean }} options
 * @returns {Promise<{ distRoot: string, zipPath: string|null, slug: string, phpMinVersion: string }>}
 */
export async function prepareRelease(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const outBase = options.out || "dist";
  const skipComposer = Boolean(options.skipComposer);
  const skipRector = Boolean(options.skipRector);
  const skipZip = Boolean(options.skipZip);
  const skipTests = Boolean(options.skipTests);

  const { slug, phpMinVersion, raw } = readProjectConfig(root);
  const version = resolveProjectVersion(root, slug, raw);
  const defaultProfile = raw?.releaseProfile || raw?.profile || "clean";
  const profile =
    options.profile ||
    (options.obfuscate
      ? "s"
      : options.spaghetti
        ? "spaghetti"
        : defaultProfile);
  const isObfuscate = Boolean(options.obfuscate || profile === "s");
  const isSpaghetti = Boolean(options.spaghetti || profile === "spaghetti");

  // Preflight validation BEFORE any filesystem mutations or test suites
  if (isObfuscate && skipRector) {
    throw new Error("Profile S cannot combine --obfuscate with --skip-rector");
  }
  if (
    profile &&
    profile !== "s" &&
    profile !== "clean" &&
    profile !== "spaghetti" &&
    profile !== "standalone"
  ) {
    throw new Error(
      `Invalid profile '${profile}'. Allowed: spaghetti, standalone, clean, s`,
    );
  }
  if (options.obfuscate && options.profile === "clean") {
    throw new Error(
      "Conflicting profile flags: --obfuscate and --profile=clean",
    );
  }
  if (options.obfuscate && options.profile === "spaghetti") {
    throw new Error(
      "Conflicting profile flags: --obfuscate and --profile=spaghetti",
    );
  }
  if (options.spaghetti && options.profile === "clean") {
    throw new Error(
      "Conflicting profile flags: --spaghetti and --profile=clean",
    );
  }
  if (options.spaghetti && options.profile === "s") {
    throw new Error("Conflicting profile flags: --spaghetti and --profile=s");
  }
  if (options.obfuscate && options.spaghetti) {
    throw new Error("Conflicting profile flags: --obfuscate and --spaghetti");
  }

  // Gate BEFORE wiping dist so a failed suite leaves an existing package intact.
  gateReleaseTests(root, { skipTests });

  const outAbs = path.join(root, outBase);

  // Check if this consumer can delegate to canonical standalone assembler
  const canonicalAssemblerPath = resolveCanonicalAssembler({
    fromDir: getReleaseScriptDir(root),
    pluginRoot: root,
  });

  const isRegisteredConsumer =
    CANONICAL_CONSUMERS.has(slug) ||
    Boolean(
      raw?.features?.phpFramework === "wpdev" ||
      raw?.phpFramework === "wpdev" ||
      raw?.framework === "wpdev" ||
      raw?.kitVersion ||
      existsSync(path.join(root, "includes/framework")) ||
      existsSync(path.join(root, "packages/framework")),
    );
  const shouldDelegateCanonical =
    Boolean(canonicalAssemblerPath) &&
    options.useCanonicalAssembler !== false &&
    (isRegisteredConsumer ||
      options.useCanonicalAssembler === true ||
      isObfuscate ||
      isSpaghetti ||
      Boolean(options.inlineFramework) ||
      profile === "standalone" ||
      Boolean(raw?.canonicalAssembler || raw?.features?.canonicalAssembler));

  if (shouldDelegateCanonical) {
    const importUrl =
      process.env.JEST_WORKER_ID !== undefined
        ? canonicalAssemblerPath
        : pathToFileURL(canonicalAssemblerPath).href;
    const { assembleProfileSCandidate } = await import(importUrl);
    let contentRoot = null;
    let pluginsDir = null;
    if (process.env.WPDEV_CONTENT_ROOT) {
      contentRoot = path.resolve(process.env.WPDEV_CONTENT_ROOT);
      pluginsDir = path.join(contentRoot, "plugins");
    } else {
      pluginsDir = path.dirname(root);
      contentRoot = path.dirname(pluginsDir);
    }

    const result = await assembleProfileSCandidate({
      contentRoot,
      pluginsDir,
      sourceRoot: root,
      consumer: slug,
      outputDir: outAbs,
      isObfuscate:
        options.isObfuscate ?? (options.obfuscate || profile === "s"),
      obfuscate: options.obfuscate ?? profile === "s",
      profile: profile,
      inlineFramework: options.inlineFramework,
      spaghetti: options.spaghetti ?? profile === "spaghetti",
      minifyAssets: options.minifyAssets,
      skipZip,
      targetPhp:
        options.targetPhp ||
        options.phpTarget ||
        (raw?.features && raw.features.phpMinVersion) ||
        phpMinVersion ||
        "7.4",
      phpBin: options.phpBin,
      enforceTargetPhp: options.enforceTargetPhp,
      emitDistDir: true,
      frameworkProvider:
        options.frameworkProvider ||
        raw?.frameworkProvider ||
        raw?.features?.frameworkProvider,
      frozenClasses: options.frozenClasses || raw?.preservation?.classes,
      frozenFunctions: options.frozenFunctions || raw?.preservation?.functions,
      frozenConstants: options.frozenConstants || raw?.preservation?.constants,
      frozenProperties:
        options.frozenProperties || raw?.preservation?.properties,
      frozenMethods: options.frozenMethods || raw?.preservation?.methods,
      frozenVars:
        options.frozenVars ||
        raw?.preservation?.variables ||
        raw?.preservation?.vars,
      gettextDomains:
        options.gettextDomains || raw?.preservation?.gettextDomains,
      reflectionCallbacks:
        options.reflectionCallbacks || raw?.preservation?.reflectionCallbacks,
      buildPlan: options.buildPlan,
    });

    const distRoot = path.join(outAbs, slug);
    const zipPath = skipZip
      ? null
      : result.outputProfileSZipPath || path.join(outAbs, `${slug}.zip`);
    return {
      distRoot,
      zipPath,
      slug,
      version: result.manifest?.version || version,
      phpMinVersion,
      manifest: result,
    };
  }

  // Generic release workflow (only when canonical assembler is unavailable or explicitly disabled)
  const distRoot = path.join(outAbs, slug);

  if (existsSync(distRoot)) {
    rmSync(distRoot, { recursive: true, force: true });
  }
  mkdirSync(outAbs, { recursive: true });

  copyTree(root, distRoot, releaseCopyExcludeNames(), outAbs);

  // Downgrade *before* composer --no-dev and before stripping `dev/`.
  if (!skipRector) {
    runRectorBuildOnDist(root, distRoot, {
      required: Boolean(isObfuscate),
    });
  }

  const composerPath = path.join(distRoot, "composer.json");
  if (existsSync(composerPath)) {
    const composer = JSON.parse(readFileSync(composerPath, "utf8"));
    const prepared = prepareComposerForRelease(composer, phpMinVersion, root);
    writeFileSync(
      composerPath,
      JSON.stringify(prepared, null, 2) + "\n",
      "utf8",
    );

    if (!skipComposer) {
      runComposerInstall(distRoot);
    }
  }

  stripDist(distRoot);

  // Profile transformation: Profile S (obfuscated) or Spaghetti (unobfuscated).
  if (isObfuscate || isSpaghetti) {
    const toolsTransformer = requireProfileSTransformer({
      fromDir: getReleaseScriptDir(root),
      pluginRoot: root,
    });
    process.stderr.write(
      `release: applying ${isSpaghetti && !isObfuscate ? "Spaghetti (unobfuscated)" : "Profile S AST obfuscation"} transformer (${toolsTransformer})\n`,
    );
    const mapFile = path.join(distRoot, "symbol-map.json");
    const seed = `profile-s-${slug}-seed`;
    const flattenFlag =
      isSpaghetti || isObfuscate ? "--flatten=1" : "--flatten=0";
    const mangleFlag = isObfuscate ? "--mangle=1" : "--mangle=0";
    const stripFlag = isObfuscate ? "--strip-comments=1" : "--strip-comments=0";

    const dumpArgs = [
      "-d",
      "memory_limit=1G",
      toolsTransformer,
      "--dump-map",
      distRoot,
      mapFile,
      seed,
      flattenFlag,
      mangleFlag,
      stripFlag,
    ];
    const dumpRes = spawnSync("php", dumpArgs, { stdio: "inherit" });
    if (dumpRes.status !== 0) {
      throw new Error("Transformer --dump-map failed");
    }
    const batchArgs = [
      "-d",
      "memory_limit=1G",
      toolsTransformer,
      "--batch",
      distRoot,
      mapFile,
      seed,
      `${slug}.php`,
      flattenFlag,
      mangleFlag,
      stripFlag,
    ];
    const batchRes = spawnSync("php", batchArgs, { encoding: "utf8" });
    if (batchRes.stderr) {
      process.stderr.write(batchRes.stderr);
    }
    if (batchRes.status !== 0) {
      throw new Error("Transformer --batch failed");
    }
    parseTransformerBatchLog(batchRes.stdout);
    if (existsSync(mapFile)) {
      rmSync(mapFile, { force: true });
    }

    // Dump Composer classmap after mangling if vendor exists
    const vendorDir = path.join(distRoot, "vendor");
    if (existsSync(vendorDir)) {
      const tempCompPath = path.join(distRoot, "composer.json");
      const hadCompJson = existsSync(tempCompPath);
      let compData = {};
      if (hadCompJson) {
        try {
          compData = JSON.parse(readFileSync(tempCompPath, "utf8"));
        } catch {}
      }
      const rootComposerPath = path.join(root, "composer.json");
      let originalAutoload = {};
      let originalRequire = {};
      let rootComp = null;
      if (existsSync(rootComposerPath)) {
        try {
          rootComp = JSON.parse(readFileSync(rootComposerPath, "utf8"));
          if (rootComp.autoload && typeof rootComp.autoload === "object") {
            originalAutoload = rootComp.autoload;
          }
          if (rootComp.require && typeof rootComp.require === "object") {
            originalRequire = rootComp.require;
          }
        } catch {}
      }
      const candidateDirs = ["src", "includes", "inc", "classes"].filter((d) =>
        existsSync(path.join(distRoot, d)),
      );
      const originalClassmap = Array.isArray(originalAutoload.classmap)
        ? originalAutoload.classmap
        : [];
      const discoveredClassmap =
        candidateDirs.length > 0 ? candidateDirs.map((d) => d + "/") : ["./"];
      const mergedClassmap = [
        ...new Set([...originalClassmap, ...discoveredClassmap]),
      ];

      const tempComp = {
        ...compData,
        name: compData.name || "release/" + slug,
        version: compData.version || version,
        require: originalRequire,
        config: {
          ...(rootComp?.config || {}),
          platform: {
            php: phpMinVersion,
            ...(rootComp?.config?.platform || {}),
          },
          "platform-check": false,
        },
        autoload: {
          ...originalAutoload,
          ...(compData.autoload || {}),
          classmap: mergedClassmap,
        },
      };
      if (rootComp?.repositories) {
        tempComp.repositories = rootComp.repositories;
      }
      writeFileSync(
        tempCompPath,
        JSON.stringify(tempComp, null, 2) + "\n",
        "utf8",
      );
      const dumpRes = spawnSync(
        "composer",
        [
          "dump-autoload",
          "--no-dev",
          "--optimize",
          "--no-scripts",
          "--no-plugins",
        ],
        {
          cwd: distRoot,
          stdio: "inherit",
        },
      );
      if (!hadCompJson && existsSync(tempCompPath)) {
        rmSync(tempCompPath, { force: true });
      }
      if (dumpRes.status !== 0) {
        throw new Error("composer dump-autoload failed after transformation");
      }
    }
  }

  await normalizeStandaloneModuleLoaders(distRoot);

  // Marker only (no wall-clock stamp in the emitted scaffold body).
  writeFileSync(
    path.join(distRoot, ".dist-built"),
    `ok\nphpMinVersion=${phpMinVersion}\n`,
    "utf8",
  );

  const targetZip = path.join(outAbs, `${slug}.zip`);
  if (skipZip && existsSync(targetZip)) {
    rmSync(targetZip, { force: true });
  }

  const zipPath = skipZip ? null : await createReleaseZip(outAbs, slug);

  return { distRoot, zipPath, slug, version, phpMinVersion };
}

function printHelp() {
  process.stdout.write(`Usage: node prepare-release.js [options]

Prepare a production plugin package under dist/{slug}/ (and
dist/{slug}.zip) without modifying the source tree.

By default, enabled PHP/JS unit tests and Playwright e2e (from
wpdev.json features) run before packaging. Failures block dist/.

Options:
  --out=DIR          Output base directory (default: dist)
  --root=DIR         Project root (default: cwd)
  --skip-composer    Skip composer install --no-dev
  --skip-rector      Skip PHP downgrade (rector:build) on dist/
  --skip-zip         Skip creating dist/{slug}.zip
  --skip-tests       Skip pre-dist unit/e2e suites (or set WPDEV_SKIP_TESTS=1)
  --spaghetti        Opt-in Spaghetti transformation (flatten namespaces without obfuscation)
  --obfuscate        Opt-in Profile S AST obfuscation (off by default; fails if transformer missing)
  --profile=NAME     Build profile (spaghetti, clean, or s)
  -h, --help         Show this help
`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }
  try {
    const result = await prepareRelease(opts);
    process.stdout.write(`Release package ready: ${result.distRoot}\n`);
    if (result.zipPath) {
      process.stdout.write(`Release zip ready: ${result.zipPath}\n`);
    }
  } catch (err) {
    process.stderr.write(
      `prepare-release failed: ${err && err.message ? err.message : err}\n`,
    );
    process.exit(1);
  }
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isDirect =
  entry.endsWith(`${path.sep}prepare-release.js`) ||
  entry.endsWith("/prepare-release.js") ||
  entry.endsWith("prepare-release.js");

if (isDirect) {
  main();
}
