/**
 * Pure helpers for production release packaging of scaffolded projects.
 *
 * Used by `prepare-release.mjs` (CLI) and unit tests. No I/O.
 */

/**
 * Ensure composer.json is production-ready for a dist install.
 *
 * - require.php is `>={phpMinVersion}`
 * - config.platform.php is `{phpMinVersion}`
 * - every path repository gets options.symlink = false
 * - relative path repository URLs are rewritten to absolute
 *   paths rooted at `sourceRoot` (so install works from dist/)
 *
 * @param {Record<string, unknown>} composer
 * @param {string} phpMinVersion e.g. "7.4"
 * @param {string} [sourceRoot] absolute project root used to resolve path URLs
 * @returns {Record<string, unknown>} a new object (input is not mutated)
 */
export function prepareComposerForRelease(
  composer,
  phpMinVersion,
  sourceRoot = "",
) {
  const phpMin =
    typeof phpMinVersion === "string" && phpMinVersion.length > 0
      ? phpMinVersion
      : "7.4";

  const next = structuredClone
    ? structuredClone(composer)
    : JSON.parse(JSON.stringify(composer));

  if (!next.require || typeof next.require !== "object") {
    next.require = {};
  }
  next.require.php = `>=${phpMin}`;

  if (!next.config || typeof next.config !== "object") {
    next.config = {};
  }
  // Runtime PHP is enforced in the plugin bootstrap file, not Composer.
  next.config["platform-check"] = false;
  if (!next.config.platform || typeof next.config.platform !== "object") {
    next.config.platform = {};
  }
  next.config.platform.php = phpMin;

  let hasPathRepo = false;
  if (Array.isArray(next.repositories)) {
    next.repositories = next.repositories.map((repo) => {
      if (!repo || typeof repo !== "object") return repo;
      if (repo.type !== "path") return repo;

      hasPathRepo = true;
      const out = { ...repo };
      const options =
        out.options && typeof out.options === "object"
          ? { ...out.options }
          : {};
      options.symlink = false;
      out.options = options;

      if (
        typeof out.url === "string" &&
        sourceRoot &&
        !isAbsolutePath(out.url) &&
        !out.url.includes("*")
      ) {
        out.url = joinPath(sourceRoot, out.url);
      } else if (
        typeof out.url === "string" &&
        sourceRoot &&
        !isAbsolutePath(out.url) &&
        out.url.includes("*")
      ) {
        // monorepo path pattern e.g. "packages/*" — leave relative so
        // composer resolves against the dist cwd after packages/ is copied.
      }

      return out;
    });
  }

  // Path repositories expose packages as dev-main / 9999999-dev without a
  // stable version. Default Composer min-stability is "stable", so
  // `require: { "pkg": "*" }` fails with "does not match your
  // minimum-stability". Allow dev packages when path repos are present.
  if (hasPathRepo) {
    if (!next["minimum-stability"]) {
      next["minimum-stability"] = "dev";
    }
    if (next["prefer-stable"] === undefined) {
      next["prefer-stable"] = true;
    }
  }

  return next;
}

/**
 * Patterns / names excluded from the initial source → dist copy.
 * (After composer install we strip more aggressively.)
 *
 * @returns {string[]}
 */
export function releaseCopyExcludeNames() {
  return [
    "node_modules",
    "vendor",
    "vendor-prefixed",
    "dist",
    ".git",
    "coverage",
    ".phpunit.result.cache",
  ];
}

/**
 * Directory names removed from the dist tree after install/build.
 *
 * @returns {string[]}
 */
export function releaseStripDirNames() {
  return [
    "tests",
    "docker-phpunit",
    "docs",
    "packages",
    "dev",
    "node_modules",
    "coverage",
    ".git",
    ".github",
    ".husky",
    ".idea",
    ".vscode",
    ".cursor",
    ".kiro",
    ".claude",
  ];
}

/**
 * Exact root filenames removed from the dist tree after install/build.
 *
 * @returns {string[]}
 */
export function releaseStripFileNames() {
  return [
    "CLAUDE.md",
    "Claude.md",
    "context.md",
    "AGENTS.md",
    "package.json",
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "jsconfig.json",
    "jest.config.js",
    "jest.config.cjs",
    "jest.config.mjs",
    "jest.config.ts",
    "vitest.config.js",
    "vitest.config.ts",
    "vitest.config.mjs",
    "babel.config.js",
    "babel.config.cjs",
    "babel.config.json",
    ".babelrc",
    ".babelrc.js",
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.cjs",
    ".eslintrc.json",
    "eslint.config.js",
    "eslint.config.mjs",
    ".prettierrc",
    ".prettierrc.js",
    ".prettierrc.cjs",
    ".prettierrc.json",
    "prettier.config.js",
    ".flowconfig",
    "phpstan.neon",
    "phpstan.neon.dist",
    "phpcs.xml",
    "phpcs.xml.dist",
    "rector.php",
    ".editorconfig",
    ".gitignore",
    ".gitattributes",
    ".npmrc",
    ".nvmrc",
  ];
}

/**
 * Filename prefixes / globs matched at any depth for strip.
 * `*` is a single-segment wildcard (not recursive path).
 *
 * @returns {string[]}
 */
export function releaseStripFileGlobs() {
  return ["coverage.xml*", "phpunit.xml*", "phpunit.xml"];
}

/**
 * Whether a filename matches a simple glob (`*` = any chars).
 *
 * @param {string} name
 * @param {string} pattern
 * @returns {boolean}
 */
export function matchSimpleGlob(name, pattern) {
  if (!pattern.includes("*")) {
    return name === pattern;
  }
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(name);
}

/**
 * Decide if a relative path should be stripped after packaging.
 *
 * @param {string} relativePath posix-style relative path from dist root
 * @returns {boolean}
 */
export function shouldStripRelativePath(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized) return false;

  const segments = normalized.split("/").filter(Boolean);
  const base = segments[segments.length - 1];

  // Any segment that is a strip directory name, or any leading dot-dir.
  for (const seg of segments) {
    if (seg.startsWith(".") && seg !== "." && seg !== "..") {
      return true;
    }
    if (releaseStripDirNames().includes(seg)) {
      return true;
    }
  }

  if (releaseStripFileNames().includes(base)) {
    return true;
  }

  for (const glob of releaseStripFileGlobs()) {
    if (matchSimpleGlob(base, glob)) {
      return true;
    }
  }

  return false;
}

function isAbsolutePath(p) {
  return (
    (typeof p === "string" && p.startsWith("/")) ||
    /^[A-Za-z]:[\\/]/.test(p) ||
    p.startsWith("\\\\")
  );
}

function joinPath(root, rel) {
  const cleanRel = String(rel).replace(/^\.\//, "").replace(/\\/g, "/");
  const cleanRoot = String(root).replace(/[/\\]+$/, "");
  return `${cleanRoot}/${cleanRel}`;
}
