#!/usr/bin/env node
/**
 * Configure local path resolution for unpublished wpdev packages.
 *
 * Composer: path repo with monorepo (project + global config).
 * npm: no native path-repo fallback — we use:
 *   - package.json "overrides" with file: (project, via --sync-project)
 *   - npm link for each @wpdev/* package (global, for consumers outside the monorepo)
 *   - npm config wpdev-kit-root (global pointer to this kit checkout)
 *
 * Usage:
 *   node dev/setup-local-deps.mjs                 # global composer + npm link
 *   node dev/setup-local-deps.mjs --sync-project  # also write overrides to root package.json
 *   node dev/setup-local-deps.mjs --consumer ./my-plugin  # patch a scaffolded consumer
 *   node dev/setup-local-deps.mjs --status        # show current config
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(__dirname, "local-deps/manifest.json");

const args = new Set(process.argv.slice(2));
const syncProject = args.has("--sync-project");
const showStatus = args.has("--status");
const consumerArg = [...args].find((a) => a.startsWith("--consumer="));
const consumerDir = consumerArg
  ? path.resolve(process.cwd(), consumerArg.slice("--consumer=".length))
  : args.has("--consumer")
    ? path.resolve(process.cwd(), process.argv[process.argv.indexOf("--consumer") + 1] || "")
    : null;

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Missing manifest: ${MANIFEST_PATH}`);
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: opts.cwd || KIT_ROOT, env: process.env });
}

function runCapture(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: "utf8",
    cwd: opts.cwd || KIT_ROOT,
    env: process.env,
  }).trim();
}

function npmOverridesFromManifest(manifest, { absolute = false } = {}) {
  const root = absolute ? KIT_ROOT : ".";
  return Object.fromEntries(
    Object.entries(manifest.npmPackages).map(([name, relPath]) => [
      name,
      `file:${absolute ? path.join(root, relPath) : relPath}`,
    ]),
  );
}

function setupComposerGlobal(manifest) {
  const repoUrl = path.join(KIT_ROOT, manifest.composerPathRepo.url);
  const payload = JSON.stringify({
    type: "path",
    url: repoUrl,
    options: manifest.composerPathRepo.options,
  });
  run(`composer config --global --merge repositories.wpdev-kit ${JSON.stringify(payload)}`);
  console.log("Composer global: repositories.wpdev-kit →", repoUrl);
}

function upsertNpmrcKey(npmrcPath, key, value) {
  const line = `${key}=${value}`;
  if (!existsSync(npmrcPath)) {
    writeFileSync(npmrcPath, `# wpdev local deps (dev/setup-local-deps.mjs)\n${line}\n`);
    return;
  }
  const content = readFileSync(npmrcPath, "utf8");
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) {
    writeFileSync(npmrcPath, content.replace(re, line));
  } else {
    appendFileSync(npmrcPath, `\n# wpdev local deps (dev/setup-local-deps.mjs)\n${line}\n`);
  }
}

function setupNpmGlobal(manifest) {
  const userNpmrc = path.join(os.homedir(), ".npmrc");
  upsertNpmrcKey(userNpmrc, "wpdev-kit-root", KIT_ROOT);
  console.log("npm user .npmrc: wpdev-kit-root →", KIT_ROOT);

  for (const [name, relPath] of Object.entries(manifest.npmPackages)) {
    const pkgDir = path.join(KIT_ROOT, relPath);
    if (!existsSync(path.join(pkgDir, "package.json"))) {
      console.warn(`skip npm link (no package.json): ${name} @ ${relPath}`);
      continue;
    }
    run(`npm link`, { cwd: pkgDir });
    console.log(`npm link: ${name}`);
  }
}

function syncProjectOverrides(manifest) {
  const pkgPath = path.join(KIT_ROOT, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.overrides = npmOverridesFromManifest(manifest, { absolute: false });
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log("Updated package.json overrides (file: paths relative to kit root).");
}

function patchConsumer(manifest, dir) {
  if (!dir || !existsSync(dir)) {
    throw new Error(`Consumer directory not found: ${dir}`);
  }
  const pkgPath = path.join(dir, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(`No package.json in consumer: ${dir}`);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const overrides = npmOverridesFromManifest(manifest, { absolute: true });
  pkg.overrides = { ...(pkg.overrides || {}), ...overrides };
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`Patched consumer overrides: ${pkgPath}`);
  console.log("Run: cd", dir, "&& npm install");
}

function printStatus(manifest) {
  console.log("Kit root:", KIT_ROOT);
  console.log("\nComposer global repositories.wpdev-kit:");
  try {
    const raw = runCapture("composer config --global repositories.wpdev-kit 2>/dev/null || true");
    console.log(raw ? `  ${raw}` : "  (not set — run npm run dev:setup-local-deps)");
  } catch (e) {
    console.log("  (composer not available)", e.message);
  }
  console.log("\nnpm user ~/.npmrc wpdev-kit-root:");
  try {
    const userNpmrc = path.join(os.homedir(), ".npmrc");
    if (existsSync(userNpmrc)) {
      const match = readFileSync(userNpmrc, "utf8").match(/^wpdev-kit-root=(.+)$/m);
      console.log(match ? `  ${match[1]}` : "  (not set — run npm run dev:setup-local-deps)");
    } else {
      console.log("  (not set — run npm run dev:setup-local-deps)");
    }
  } catch (e) {
    console.log("  (could not read ~/.npmrc)", e.message);
  }
  console.log("\nProject composer path repo:", manifest.composerPathRepo.url);
  console.log("Project npm overrides:", Object.keys(manifest.npmPackages).length, "packages in package.json");
}

function main() {
  const manifest = loadManifest();

  if (showStatus) {
    printStatus(manifest);
    return;
  }

  if (consumerDir) {
    patchConsumer(manifest, consumerDir);
    return;
  }

  setupComposerGlobal(manifest);
  setupNpmGlobal(manifest);

  if (syncProject) {
    syncProjectOverrides(manifest);
  }

  console.log("\nDone. Local deps configured.");
  console.log("- Monorepo: npm install at kit root (workspaces + overrides).");
  console.log("- Scaffolded consumer outside repo:");
  console.log("    node dev/setup-local-deps.mjs --consumer /path/to/my-plugin");
  console.log("    cd /path/to/my-plugin && npm install");
  console.log("- Remove global config later:");
  console.log("    composer config --global --unset repositories.wpdev-kit");
  console.log("    # remove wpdev-kit-root= line from ~/.npmrc");
}

main();
