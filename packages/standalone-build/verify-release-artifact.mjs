#!/usr/bin/env node
/**
 * Fail-closed release artifact audit for wp-starter-kit consumer plugins.
 *
 * Why this gate exists (proven production incidents):
 *
 * 1. Out-of-pipeline ZIPs reached production. A consumer ZIP was produced by
 *    zipping the dev tree directly (it shipped the full dev vendor tree —
 *    phpunit/phpstan/rector/polyfills — with eager autoload.files entries,
 *    composer.lock, tests/, dev/, .husky/, and no artifact-manifest.json).
 *    Nothing in the deploy path rejected it because the canonical assembler
 *    gates only run when the assembler itself produces the ZIP.
 *
 * 2. Cross-plugin global symbol collisions fatal WordPress at activation.
 *    WordPress loads active plugins in alphabetical folder order. A merged
 *    sibling plugin that runs `class_alias('TLDB_X', 'Legacy_X')` at load
 *    time bricks every request (and fails `plugin_sandbox_scrape()`) when a
 *    second plugin declares the real `class Legacy_X` and loads later. The
 *    activation request dies with "Plugin could not be activated because it
 *    triggered a fatal error" — sometimes once (order dependent), sometimes
 *    permanently (both active).
 *
 * This auditor is the single pre-deploy gate that rejects both classes of
 * broken artifacts BEFORE they touch a live site. Philosophy follows the
 * deployment SOP: fail-closed, structured report, non-zero exit on any
 * fatal finding.
 *
 * Usage:
 *   node verify-release-artifact.mjs <path-to-zip-or-dir> [options]
 *
 * Options:
 *   --plugins-dir=<dir>   Sibling plugin directory for coexistence scanning
 *   --php-bin=<bin>       PHP binary for `php -l` lint (default: php)
 *   --allow-unmanifested  Downgrade missing artifact-manifest.json to warning
 *                         (legacy artifacts; still audited for content)
 *   --skip-lint           Skip the PHP syntax lint pass
 *   --json                Emit the machine-readable report instead of text
 *
 * Exit codes: 0 = passed, 1 = one or more fatal findings.
 */

import { existsSync, readFileSync, readdirSync, rmSync, statSync, mkdtempSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Packages that must never ship in a production artifact vendor tree.
const DEV_VENDOR_PACKAGES = [
  "phpunit/phpunit",
  "phpstan/phpstan",
  "rector/rector",
  "yoast/phpunit-polyfills",
  "wpdev/plugin-core-test",
  "sebastian",
  "phar-io",
  "theseer",
  "myclabs",
  "nikic/php-parser",
  "phpdocumentor",
  "phpspec",
  "webmozart",
  "spatie/phpunit-watcher",
];

// Top-level paths a clean artifact must not ship.
const FORBIDDEN_TOP_LEVEL = [
  "composer.lock",
  "package-lock.json",
  "phpunit.xml.dist",
  "phpunit.xml",
  ".phpunit.result.cache",
  ".husky",
  ".github",
  ".git",
  ".idea",
  "node_modules",
  "tests",
  "dev",
];

// Top-level paths that indicate a sloppy build (warning only).
const WARN_TOP_LEVEL = [
  ".DS_Store",
  "test-results",
  "playwright.config.js",
  "commitlint.config.cjs",
  ".eslintrc.cjs",
  ".prettierignore",
  ".editorconfig",
];

function parseArgs(argv) {
  const opts = {
    target: null,
    pluginsDir: null,
    phpBin: process.env.WPDEV_PHP_BIN || "php",
    allowUnmanifested: false,
    skipLint: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--plugins-dir=")) opts.pluginsDir = path.resolve(arg.slice("--plugins-dir=".length));
    else if (arg.startsWith("--php-bin=")) opts.phpBin = arg.slice("--php-bin=".length);
    else if (arg === "--allow-unmanifested") opts.allowUnmanifested = true;
    else if (arg === "--skip-lint") opts.skipLint = true;
    else if (arg === "--json") opts.json = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else if (!arg.startsWith("--") && !opts.target) opts.target = path.resolve(arg);
    else if (arg.startsWith("--")) throw new Error(`Unknown option '${arg}'`);
  }
  if (!opts.help && !opts.target) throw new Error("Target ZIP or directory is required");
  return opts;
}

function isZip(filePath) {
  return /\.zip$/i.test(filePath) && statSync(filePath).isFile();
}

/** Extract a ZIP into destDir via the system unzip binary. */
function extractZip(zipPath, destDir) {
  const res = spawnSync("unzip", ["-q", zipPath, "-d", destDir], { encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(`Failed to extract ZIP (${zipPath}): ${(res.stderr || res.stdout || "").trim()}`);
  }
}

/** The single plugin folder inside an extracted artifact root. */
function resolveArtifactRoot(extractDir) {
  const entries = readdirSync(extractDir, { withFileTypes: true }).filter((e) => !e.name.startsWith("."));
  if (entries.length === 1 && entries[0].isDirectory()) return path.join(extractDir, entries[0].name);
  return extractDir;
}

function walkFiles(root, base = "") {
  const out = [];
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) out.push(...walkFiles(path.join(root, entry.name), rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

/** Strip comments (keep string literals) — for quoted-name scans. */
function stripPhpComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
    .replace(/#[^\n]*/g, "");
}

/** Strip comments and string literals so declaration regexes see code only. */
function stripPhpNoise(source) {
  return stripPhpComments(source).replace(/(['"])(?:\\.|(?!\1)[^\\])*\1/g, "''");
}

const GLOBAL_DECL_RE = /(?:^|\n)(?:abstract\s+|final\s+|readonly\s+)*(class|interface|trait|enum)\s+([A-Za-z_]\w*)/g;
const GLOBAL_FUNC_RE = /(?:^|\n)(?:abstract\s+|final\s+)*function\s+([A-Za-z_]\w*)\s*\(/g;
const CLASS_ALIAS_RE = /class_alias\s*\(/;
const NAMESPACE_RE = /(?:^|\n)namespace\s+[\w\\]+;/;

/**
 * Collect global-namespace symbols declared at top level of a PHP file.
 * Files with a namespace block are skipped (their symbols are namespaced).
 */
function collectGlobalSymbols(filePath, source) {
  if (NAMESPACE_RE.test(source)) return { symbols: [], hasAliasCall: false };
  const symbols = new Set();
  let match;
  const reDecl = new RegExp(GLOBAL_DECL_RE.source, "g");
  while ((match = reDecl.exec(source)) !== null) symbols.add(match[2]);
  const reFunc = new RegExp(GLOBAL_FUNC_RE.source, "g");
  while ((match = reFunc.exec(source)) !== null) {
    if (match[1] && !["if", "foreach", "for", "while", "switch", "function"].includes(match[1])) {
      symbols.add(match[1]);
    }
  }
  return { symbols, hasAliasCall: CLASS_ALIAS_RE.test(source) };
}

/** Scan one plugin folder for global symbols + class_alias usage. */
function scanPluginForCoexistence(pluginDir) {
  const result = {
    dir: pluginDir,
    slug: path.basename(pluginDir),
    declares: new Set(), // symbol -> declared by this plugin (top-level, global ns)
    aliasUsages: new Map(), // symbol -> files referencing it in alias context
    filesWithAliasCall: [],
  };
  const files = walkFiles(pluginDir).filter((f) => f.endsWith(".php"));
  for (const rel of files) {
    // Skip sibling vendor trees: third-party code is upstream's problem,
    // except composer autoload maps which eagerly load in production.
    if (rel.startsWith("vendor/") && !rel.startsWith("vendor/composer/")) continue;
    if (rel.startsWith("node_modules/") || rel.startsWith("tests/") || rel.startsWith("dev/")) continue;
    const abs = path.join(pluginDir, rel);
    let source;
    try {
      source = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const stripped = stripPhpNoise(source);
    const { symbols, hasAliasCall } = collectGlobalSymbols(abs, stripped);
    for (const sym of symbols) result.declares.add(sym);
    if (hasAliasCall) result.filesWithAliasCall.push(rel);

    // Alias-context references: the symbol name appears as a quoted string in
    // a file that also calls class_alias() (compat maps pass the legacy name
    // as a variable-built string, so we scan the comment-stripped source that
    // KEEPS string literals).
    if (hasAliasCall) {
      const withStrings = stripPhpComments(source);
      const quotedSymRe = /['"]\\?([A-Za-z_]\w*(?:\\[A-Za-z_]\w*)*)['"]/g;
      let m;
      while ((m = quotedSymRe.exec(withStrings)) !== null) {
        const name = m[1].split("\\").pop();
        if (!result.aliasUsages.has(name)) result.aliasUsages.set(name, new Set());
        result.aliasUsages.get(name).add(rel);
      }
    }
  }
  return result;
}

/**
 * Audit the artifact content. `root` is the plugin folder (extracted or given).
 * Returns { findings: [{check, severity, message}], stats }.
 */
function auditArtifactTree(root, { artifactSlug }) {
  const findings = [];
  const stats = { files: 0, phpFiles: 0, vendorFiles: 0 };

  const allFiles = walkFiles(root);
  stats.files = allFiles.length;
  stats.phpFiles = allFiles.filter((f) => f.endsWith(".php")).length;
  stats.vendorFiles = allFiles.filter((f) => f.startsWith("vendor/")).length;

  // --- Check: build provenance -------------------------------------------
  const hasManifest = existsSync(path.join(root, "artifact-manifest.json"));
  const hasDistBuilt = existsSync(path.join(root, ".dist-built"));
  if (!hasManifest && !hasDistBuilt) {
    findings.push({
      check: "provenance",
      severity: "fatal",
      message:
        "No artifact-manifest.json and no .dist-built marker at the artifact root: " +
        "this ZIP did not come from the canonical release pipeline. " +
        "Rebuild with `composer release:dist` / `npm run release` (or pass --allow-unmanifested for legacy audits).",
    });
  } else if (hasManifest) {
    try {
      const manifest = JSON.parse(readFileSync(path.join(root, "artifact-manifest.json"), "utf8"));
      if (!manifest.manifestDigest) {
        findings.push({
          check: "provenance",
          severity: "fatal",
          message: "artifact-manifest.json is present but has no manifestDigest.",
        });
      }
    } catch (err) {
      findings.push({
        check: "provenance",
        severity: "fatal",
        message: `artifact-manifest.json is not valid JSON: ${err.message}`,
      });
    }
  }

  // --- Check: forbidden top-level paths -----------------------------------
  for (const rel of FORBIDDEN_TOP_LEVEL) {
    if (existsSync(path.join(root, rel))) {
      findings.push({
        check: "dev-tree",
        severity: "fatal",
        message: `Production artifact ships dev-only path '${rel}/'. The release pipeline must strip it (composer install --no-dev + purge).`,
      });
    }
  }
  for (const rel of WARN_TOP_LEVEL) {
    if (existsSync(path.join(root, rel))) {
      findings.push({
        check: "dev-tree",
        severity: "warning",
        message: `Artifact ships development leftover '${rel}'.`,
      });
    }
  }

  // --- Check: dev vendor packages ------------------------------------------
  const vendorDir = path.join(root, "vendor");
  if (existsSync(vendorDir)) {
    const vendorTop = readdirSync(vendorDir, { withFileTypes: true }).map((e) => e.name);
    for (const pkg of DEV_VENDOR_PACKAGES) {
      const parts = pkg.split("/");
      const hit =
        vendorTop.includes(parts[0]) &&
        (parts.length === 1
          ? true
          : existsSync(path.join(vendorDir, parts[0], parts[1])));
      if (hit) {
        findings.push({
          check: "dev-vendor",
          severity: "fatal",
          message:
            `Dev dependency '${pkg}' is shipped in vendor/. Dev packages with composer ` +
            `"files" autoload entries load eagerly in production and can redeclare ` +
            `symbols with sibling plugins. Run composer install --no-dev for the artifact.`,
        });
      }
    }

    // --- Check: autoload maps reference existing files --------------------
    const autoloadFilesPhp = path.join(vendorDir, "composer", "autoload_files.php");
    if (existsSync(autoloadFilesPhp)) {
      const content = readFileSync(autoloadFilesPhp, "utf8");
      const entryRe = /=>\s*(\$vendorDir\s*\.\s*)?(\$baseDir\s*\.\s*)?'([^']+)'/g;
      let m;
      while ((m = entryRe.exec(content)) !== null) {
        const usesVendorDir = Boolean(m[1]);
        const rel = m[3].replace(/^\//, "");
        const abs = usesVendorDir ? path.join(vendorDir, rel) : path.join(root, rel);
        if (!existsSync(abs)) {
          findings.push({
            check: "autoload-integrity",
            severity: "fatal",
            message: `autoload_files.php references missing file '${rel}'. Deploying this artifact fatals with "require(): Failed opening required" (SOP §1).`,
          });
        }
        for (const pkg of DEV_VENDOR_PACKAGES) {
          if (rel.startsWith(`${pkg}/`) || rel.startsWith(`vendor/${pkg}/`)) {
            findings.push({
              check: "dev-vendor",
              severity: "fatal",
              message: `composer "files" autoload eagerly loads dev package file '${rel}' on EVERY request.`,
            });
          }
        }
      }
    }
  }

  // --- Check: Strauss scoping ----------------------------------------------
  const wpdevJsonPath = path.join(root, "wpdev.json");
  let needsPrefix = false;
  let prefixTarget = "vendor-prefixed";
  try {
    if (existsSync(wpdevJsonPath)) {
      const wpdevJson = JSON.parse(readFileSync(wpdevJsonPath, "utf8"));
      if (wpdevJson?.features?.vendorScoping === "on") needsPrefix = true;
    }
    const compPath = path.join(root, "composer.json");
    if (existsSync(compPath)) {
      const comp = JSON.parse(readFileSync(compPath, "utf8"));
      const strauss = comp?.extra?.strauss;
      if (strauss?.target_directory) {
        needsPrefix = true;
        prefixTarget = strauss.target_directory;
      }
    }
  } catch {
    /* config read failures handled by other checks */
  }
  // Inline-framework artifacts (FrameworkClosure) legitimately ship a vendor
  // tree with no third-party packages — scoping only matters when the vendor
  // actually carries third-party code that would collide across consumers.
  let thirdPartyInVendor = false;
  if (existsSync(vendorDir)) {
    const vendorTop = readdirSync(vendorDir, { withFileTypes: true }).map((e) => e.name);
    thirdPartyInVendor = vendorTop.some((name) => name !== "composer" && name !== "wpdev" && name !== "bin" && !name.startsWith("autoload"));
  }
  if (needsPrefix && thirdPartyInVendor && existsSync(vendorDir) && !existsSync(path.join(root, prefixTarget, "autoload.php"))) {
    findings.push({
      check: "scoping",
      severity: "fatal",
      message:
        `Strauss scoping is configured (target '${prefixTarget}/') but '${prefixTarget}/autoload.php' is missing ` +
        `while vendor/ ships unscoped. Co-installed consumers sharing dependencies will collide.`,
    });
  }

  return { findings, stats, allFiles };
}

/** Lint shipped PHP files (artifact's own code + composer maps). */
function lintArtifactPhp(root, allFiles, phpBin) {
  const failures = [];
  const targets = allFiles.filter(
    (f) =>
      f.endsWith(".php") &&
      (!f.startsWith("vendor/") || f.startsWith("vendor/composer/") || f.startsWith("vendor/wpdev/"))
  );
  for (const rel of targets) {
    const res = spawnSync(phpBin, ["-l", path.join(root, rel)], { encoding: "utf8" });
    if (res.status !== 0) {
      failures.push({ file: rel, error: (res.stderr || res.stdout || "").trim().split("\n").slice(0, 3).join(" | ") });
    }
  }
  return failures;
}

/**
 * Cross-plugin coexistence audit: detects the alias-before-declaration
 * pattern that fatals WordPress during plugin activation.
 */
function auditCoexistence(root, artifactSymbols, artifactAliasUsages, pluginsDir) {
  const findings = [];
  if (!pluginsDir || !existsSync(pluginsDir)) return findings;

  const siblings = readdirSync(pluginsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => path.join(pluginsDir, e.name))
    .filter((dir) => path.resolve(dir) !== path.resolve(root) && path.basename(dir) !== path.basename(root));

  for (const siblingDir of siblings) {
    const sibling = scanPluginForCoexistence(siblingDir);

    // 1. Same global symbol declared by both artifacts.
    for (const sym of artifactSymbols) {
      if (sibling.declares.has(sym)) {
        findings.push({
          check: "coexistence",
          severity: "fatal",
          message:
            `Global symbol '${sym}' is declared top-level by BOTH this artifact and sibling plugin '${sibling.slug}'. ` +
            `WordPress loads plugins alphabetically: whichever loads second fatals with ` +
            `"Cannot declare class ${sym}, because the name is already in use". Namespace the symbol.`,
        });
      }
    }

    // 2. Sibling creates aliases for names this artifact declares for real.
    for (const sym of artifactSymbols) {
      if (sibling.aliasUsages.has(sym) && !sibling.declares.has(sym)) {
        findings.push({
          check: "coexistence",
          severity: "fatal",
          message:
            `Sibling plugin '${sibling.slug}' creates dynamic aliases (class_alias/compat map) for ` +
            `'${sym}' (files: ${[...sibling.aliasUsages.get(sym)].join(", ")}). If the sibling loads ` +
            `first (alphabetical: ${sibling.slug} vs ${path.basename(root)}), the alias occupies the name ` +
            `and this artifact's real declaration fatals on activation.`,
        });
      }
    }

    // 3. This artifact creates aliases for a name a sibling declares for real.
    for (const [sym, files] of artifactAliasUsages) {
      if (sibling.declares.has(sym)) {
        findings.push({
          check: "coexistence",
          severity: "fatal",
          message:
            `This artifact creates dynamic aliases (class_alias/compat map) for '${sym}' ` +
            `(files: ${[...files].join(", ")}) while sibling plugin '${sibling.slug}' declares the ` +
            `real top-level symbol. Whoever loads second fatals with "Cannot declare class ${sym}".`,
        });
      }
    }
  }

  return findings;
}

/** Scan the artifact itself for global symbols + alias usage. */
function scanArtifactSymbols(root) {
  const scan = scanPluginForCoexistence(root);
  return scan;
}

async function runAudit(opts) {
  const findings = [];
  let artifactRoot = null;
  let tempExtract = null;

  if (isZip(opts.target)) {
    tempExtract = mkdtempSync(path.join(os.tmpdir(), "wpdev-artifact-audit-"));
    extractZip(opts.target, tempExtract);
    artifactRoot = resolveArtifactRoot(tempExtract);
  } else if (statSync(opts.target).isDirectory()) {
    artifactRoot = opts.target;
  } else {
    throw new Error(`Target is neither a ZIP nor a directory: ${opts.target}`);
  }

  const artifactSlug = path.basename(artifactRoot);
  const { findings: treeFindings, stats, allFiles } = auditArtifactTree(artifactRoot, { artifactSlug });
  findings.push(...treeFindings);

  // Global symbol scan of the artifact itself (for coexistence rules).
  const artifactScan = scanArtifactSymbols(artifactRoot);

  // Autoload integrity for the artifact's own composer.json files entries.
  const ownCompPath = path.join(artifactRoot, "composer.json");
  if (existsSync(ownCompPath)) {
    try {
      const comp = JSON.parse(readFileSync(ownCompPath, "utf8"));
      for (const rel of comp?.autoload?.files || []) {
        if (!existsSync(path.join(artifactRoot, rel))) {
          findings.push({
            check: "autoload-integrity",
            severity: "fatal",
            message: `composer.json autoload.files entry '${rel}' does not exist in the artifact.`,
          });
        }
      }
    } catch (err) {
      findings.push({
        check: "autoload-integrity",
        severity: "fatal",
        message: `Artifact composer.json is not valid JSON: ${err.message}`,
      });
    }
  }

  if (!opts.skipLint) {
    const lintFailures = lintArtifactPhp(artifactRoot, allFiles, opts.phpBin);
    for (const fail of lintFailures) {
      findings.push({
        check: "php-lint",
        severity: "fatal",
        message: `PHP syntax error in '${fail.file}': ${fail.error}`,
      });
    }
  }

  findings.push(
    ...auditCoexistence(artifactRoot, artifactScan.declares, artifactScan.aliasUsages, opts.pluginsDir)
  );

  if (tempExtract) rmSync(tempExtract, { recursive: true, force: true });

  const fatals = findings.filter((f) => f.severity === "fatal");
  const warnings = findings.filter((f) => f.severity === "warning");

  return {
    target: opts.target,
    artifactSlug,
    stats,
    artifactGlobalSymbols: [...artifactScan.declares].sort(),
    artifactUsesClassAlias: artifactScan.filesWithAliasCall,
    passed: fatals.length === 0,
    fatals,
    warnings,
  };
}

function formatReport(report) {
  const lines = [];
  lines.push(`Artifact audit: ${report.target}`);
  lines.push(
    `  files=${report.stats.files} php=${report.stats.phpFiles} vendor=${report.stats.vendorFiles} ` +
      `globalSymbols=${report.artifactGlobalSymbols.length}`
  );
  if (report.artifactUsesClassAlias.length) {
    lines.push(`  class_alias usage in artifact: ${report.artifactUsesClassAlias.join(", ")}`);
  }
  if (report.passed && report.warnings.length === 0) {
    lines.push("  ✅ PASSED — no fatal findings, no warnings.");
  } else if (report.passed) {
    lines.push(`  ✅ PASSED with ${report.warnings.length} warning(s).`);
  } else {
    lines.push(`  ❌ FAILED — ${report.fatals.length} fatal finding(s), ${report.warnings.length} warning(s).`);
  }
  for (const f of report.fatals) lines.push(`  [FATAL:${f.check}] ${f.message}`);
  for (const w of report.warnings) lines.push(`  [WARN:${w.check}] ${w.message}`);
  return lines.join("\n");
}

export async function verifyReleaseArtifact(options = {}) {
  const opts = parseArgs(options.argv || process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(
      "Usage: node verify-release-artifact.mjs <zip-or-dir> [--plugins-dir=<dir>] [--php-bin=<bin>] [--allow-unmanifested] [--skip-lint] [--json]\n"
    );
    return 0;
  }
  const report = await runAudit(opts);
  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(formatReport(report) + "\n");
  }
  return report.passed ? 0 : 1;
}

/** Programmatic API for pipeline wiring. */
export async function auditArtifact(target, options = {}) {
  return runAudit({
    target: path.resolve(target),
    pluginsDir: options.pluginsDir ? path.resolve(options.pluginsDir) : null,
    phpBin: options.phpBin || process.env.WPDEV_PHP_BIN || "php",
    allowUnmanifested: Boolean(options.allowUnmanifested),
    skipLint: Boolean(options.skipLint),
    json: false,
  });
}

function isInvokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    const realArgv = realpathSync(path.resolve(process.argv[1]));
    const realMeta = realpathSync(fileURLToPath(import.meta.url));
    return realArgv === realMeta;
  } catch {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

if (isInvokedDirectly()) {
  verifyReleaseArtifact().then((code) => process.exit(code));
}
