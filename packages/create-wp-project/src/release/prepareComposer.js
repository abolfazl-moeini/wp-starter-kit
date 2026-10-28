/**
 * Pure helpers for production release packaging of scaffolded projects.
 *
 * Used by `prepare-release.mjs` (CLI) and unit tests.
 */
import fs from "node:fs";
import path from "node:path";

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
    "skills",
    "artifacts",
    "tests",
    "unit-tests",
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
    "unit-tests",
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
    "skills",
    "artifacts",
    "addons",
    "bin",
    "scripts",
    "tools",
  ];
}

/**
 * Exact root filenames removed from the dist tree after install/build.
 * Matched only at the dist root (not nested paths under vendor/).
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
    "composer.json",
    "composer.lock",
    "tsconfig.json",
    "jsconfig.json",
    "jest.config.js",
    "jest.config.cjs",
    "jest.config.mjs",
    "jest.config.ts",
    "vitest.config.js",
    "vitest.config.ts",
    "vitest.config.mjs",
    "playwright.config.js",
    "playwright.config.ts",
    "playwright.config.mjs",
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
    "commitlint.config.js",
    "commitlint.config.cjs",
    "commitlint.config.mjs",
    "commitlint.config.ts",
    "commitlint.config.json",
    "postcss.config.js",
    "postcss.config.cjs",
    "postcss.config.mjs",
    "postcss.config.ts",
    "postcss.config.json",
    "tailwind.config.js",
    "tailwind.config.cjs",
    "tailwind.config.mjs",
    "tailwind.config.ts",
    "webpack.config.js",
    "webpack.config.cjs",
    "webpack.config.mjs",
    "webpack.config.ts",
    "rollup.config.js",
    "rollup.config.mjs",
    "rollup.config.ts",
    "vite.config.js",
    "vite.config.ts",
    "vite.config.mjs",
    "esbuild.config.js",
    "esbuild.config.mjs",
  ];
}

/**
 * Filename prefixes / globs matched at any depth for strip.
 * `*` is a single-segment wildcard (not recursive path).
 *
 * @returns {string[]}
 */
export function releaseStripFileGlobs() {
  return [
    "*.md",
    "*.MD",
    "*.markdown",
    "coverage.xml*",
    "phpunit.xml*",
    "phpunit.xml",
    "commitlint.config.*",
    "postcss.config.*",
    "tailwind.config.*",
    "webpack.config.*",
    "vite.config.*",
    "rollup.config.*",
    "esbuild.config.*",
  ];
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

  // Root-only: keep nested composer.json under vendor/, etc.
  if (segments.length === 1 && releaseStripFileNames().includes(base)) {
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

/**
 * Default directory name patterns for compatibility/stub code.
 */
export const DEFAULT_COMPATIBILITY_DIR_PATTERNS = [
  /^(compatibility|compat)$/i,
  /^(stubs?)$/i,
  /^(polyfills?)$/i,
];

/**
 * Default glob patterns added to composer autoload.exclude-from-classmap
 * to ensure stubs are never indexed by composer dump-autoload.
 */
export const DEFAULT_CLASSMAP_EXCLUDE_GLOBS = [
  "**/[Cc]ompatibility/**",
  "**/[Cc]ompat/**",
  "**/[Ss]tub/**",
  "**/[Ss]tubs/**",
  "**/[Pp]olyfill/**",
  "**/[Pp]olyfills/**",
  "**/compatibility/**",
  "**/compat/**",
  "**/stub/**",
  "**/stubs/**",
  "**/polyfill/**",
  "**/polyfills/**",
];

/**
 * Recursively find directories inside candidate directories matching compatibility/stub naming.
 *
 * @param {string} pluginRoot Absolute directory of the plugin
 * @param {string[]} [candidateDirs=["src", "includes", "inc", "classes"]] Candidate dirs to inspect
 * @returns {string[]} Relative directory paths ending with a slash (e.g. "src/Modules/WheelRewards/Compatibility/")
 */
export function findCompatibilityDirs(
  pluginRoot,
  candidateDirs = ["src", "includes", "inc", "classes"],
) {
  const compatDirs = [];
  const dirPattern = /^(compatibility|compat|stubs?|polyfills?)$/i;

  function walk(currentDir, relativePrefix, depth) {
    if (depth > 6) return;
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const relPath = relativePrefix
        ? `${relativePrefix}/${entry.name}`
        : entry.name;
      if (dirPattern.test(entry.name)) {
        compatDirs.push(relPath + "/");
      } else {
        walk(path.join(currentDir, entry.name), relPath, depth + 1);
      }
    }
  }

  for (const candidate of candidateDirs) {
    const fullCand = path.join(pluginRoot, candidate);
    if (fs.existsSync(fullCand)) {
      walk(fullCand, candidate, 1);
    }
  }

  return compatDirs;
}

/**
 * Combine declared exclude-from-classmap patterns with auto-discovered
 * compatibility directories and default safety globs.
 *
 * @param {string[]} [declaredExcludes=[]]
 * @param {string[]} [autoDiscoveredDirs=[]]
 * @returns {string[]} Deduplicated exclusion list
 */
export function deriveAutoExcludeClassmap(
  declaredExcludes = [],
  autoDiscoveredDirs = [],
) {
  const declared = Array.isArray(declaredExcludes) ? declaredExcludes : [];
  const auto = Array.isArray(autoDiscoveredDirs) ? autoDiscoveredDirs : [];
  return [
    ...new Set([...declared, ...auto, ...DEFAULT_CLASSMAP_EXCLUDE_GLOBS]),
  ];
}

/**
 * Extract PSR-4 namespace prefixes from composer.json object.
 * Returns array of normalized prefixes ending with a backslash.
 *
 * @param {Record<string, unknown>} composerJson
 * @returns {string[]}
 */
export function extractPsr4PrefixesFromComposerJson(composerJson) {
  const psr4 = composerJson?.autoload?.["psr-4"];
  if (!psr4 || typeof psr4 !== "object") return [];
  return Object.keys(psr4).map((k) => (k.endsWith("\\") ? k : k + "\\"));
}

/**
 * Extract PSR-4 namespace prefixes from vendor/composer/autoload_psr4.php file content.
 *
 * @param {string} content
 * @returns {string[]}
 */
export function extractPsr4PrefixesFromPsr4Php(content) {
  if (typeof content !== "string") return [];
  const prefixes = [];
  const regex = /'((?:[^'\\]|\\.)*)'\s*=>\s*array\(/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const raw = match[1].replace(/\\\\/g, "\\");
    prefixes.push(raw.endsWith("\\") ? raw : raw + "\\");
  }
  return prefixes;
}

/**
 * Filter foreign classes out of vendor/composer/autoload_classmap.php content.
 *
 * Internal plugin classes mapping to $baseDir must belong to:
 * - Allowed consumer PSR-4 prefixes
 * - Inlined framework prefixes (WPDev\, WPDevFramework\)
 * - Vendor prefix (WpdevVendor\)
 * - Mangled closure or internal patterns (_c_, _fc_, WPDev_, Composer\)
 *
 * Classes mapping to $vendorDir (external Composer vendor dependencies) are kept.
 *
 * @param {string} classmapContent
 * @param {object} options
 * @param {string[]} [options.allowedPrefixes=[]]
 * @param {RegExp[]} [options.allowedPatterns=[]]
 * @returns {{ filteredContent: string, stripped: Array<{ rawClass: string, normalizedClass: string, relPath: string }> }}
 */
export function filterClassmapEntries(classmapContent, options = {}) {
  if (typeof classmapContent !== "string") {
    return { filteredContent: classmapContent, stripped: [] };
  }

  const baseAllowedPrefixes = [
    "WPDev\\",
    "WPDevFramework\\",
    "WpdevVendor\\",
    ...(options.allowedPrefixes || []),
  ];
  const allowedPrefixes = baseAllowedPrefixes.map((p) =>
    p.endsWith("\\") ? p : p + "\\",
  );

  const allowedPatterns = [
    /^Composer\\/,
    /^_c_/,
    /^_fc_/,
    /^WPDev_/,
    /^WPDevFramework_/,
    ...(options.allowedPatterns || []),
  ];

  function isClassAllowed(className) {
    for (const prefix of allowedPrefixes) {
      if (className.startsWith(prefix)) return true;
    }
    for (const pat of allowedPatterns) {
      if (pat.test(className)) return true;
    }
    return false;
  }

  const lines = classmapContent.split("\n");
  const stripped = [];
  const filteredLines = [];
  const dirStubPattern = /[/\\](compatibility|compat|stubs?|polyfills?)[/\\]/i;

  for (const line of lines) {
    const m = line.match(
      /^\s*'((?:[^'\\]|\\.)*)'\s*=>\s*(\$baseDir|\$vendorDir)\s*\.\s*'([^']*)',\s*$/,
    );
    if (m) {
      const rawClass = m[1];
      const targetVar = m[2];
      const relPath = m[3];
      const normalizedClass = rawClass.replace(/\\\\/g, "\\");

      // Internal plugin file ($baseDir)
      if (targetVar === "$baseDir") {
        // 1. Any file inside a compatibility/stub directory must never be in classmap
        if (dirStubPattern.test(relPath)) {
          stripped.push({ rawClass, normalizedClass, relPath });
          continue;
        }

        // 2. Any namespaced class must belong to an allowed namespace prefix
        if (normalizedClass.includes("\\")) {
          if (!isClassAllowed(normalizedClass)) {
            stripped.push({ rawClass, normalizedClass, relPath });
            continue;
          }
        }
      }
    }
    filteredLines.push(line);
  }

  return {
    filteredContent: filteredLines.join("\n"),
    stripped,
  };
}

/**
 * Filter stripped classes out of vendor/composer/autoload_static.php content.
 *
 * @param {string} staticContent
 * @param {Set<string>|string[]|Array<{ rawClass?: string, normalizedClass?: string }>} strippedClasses
 * @returns {string} Filtered content
 */
export function filterAutoloadStaticClassmap(staticContent, strippedClasses) {
  if (typeof staticContent !== "string") return staticContent;
  const strippedSet = new Set();
  if (strippedClasses instanceof Set) {
    for (const item of strippedClasses) {
      strippedSet.add(item);
    }
  } else if (Array.isArray(strippedClasses)) {
    for (const item of strippedClasses) {
      if (typeof item === "string") {
        strippedSet.add(item);
      } else if (item && typeof item === "object") {
        if (item.rawClass) strippedSet.add(item.rawClass);
        if (item.normalizedClass) strippedSet.add(item.normalizedClass);
      }
    }
  }

  if (strippedSet.size === 0) return staticContent;

  const lines = staticContent.split("\n");
  const filteredLines = [];
  let inClassMap = false;

  for (const line of lines) {
    if (line.includes("public static $classMap = array")) {
      inClassMap = true;
      filteredLines.push(line);
      continue;
    }
    if (inClassMap && /^\s*\);/.test(line)) {
      inClassMap = false;
      filteredLines.push(line);
      continue;
    }
    if (inClassMap) {
      const m = line.match(
        /^\s*'((?:[^'\\]|\\.)*)'\s*=>\s*__DIR__\s*\.\s*'\/(\.\.\/\.\.|\.\.)'/,
      );
      if (m) {
        const rawClass = m[1];
        const normalizedClass = rawClass.replace(/\\\\/g, "\\");
        if (strippedSet.has(rawClass) || strippedSet.has(normalizedClass)) {
          continue;
        }
      }
    }
    filteredLines.push(line);
  }

  return filteredLines.join("\n");
}

/**
 * Sanitize Composer classmap files in a plugin directory, stripping foreign classes.
 *
 * @param {string} pluginDir Absolute path to the plugin directory
 * @param {object} [options={}]
 * @param {string[]} [options.allowedPrefixes=[]]
 * @param {string} [options.vendorPrefix]
 * @param {Record<string, unknown>} [options.psr4]
 * @param {RegExp[]} [options.allowedPatterns]
 * @returns {{ strippedCount: number, stripped: Array<{ rawClass: string, normalizedClass: string, relPath: string }> }}
 */
export function sanitizeComposerClassmap(pluginDir, options = {}) {
  const allowedPrefixes = [...(options.allowedPrefixes || [])];
  if (options.vendorPrefix) {
    allowedPrefixes.push(options.vendorPrefix);
  }

  const compPath = path.join(pluginDir, "composer.json");
  if (fs.existsSync(compPath)) {
    try {
      const comp = JSON.parse(fs.readFileSync(compPath, "utf8"));
      allowedPrefixes.push(...extractPsr4PrefixesFromComposerJson(comp));
    } catch {}
  }

  const psr4Path = path.join(pluginDir, "vendor/composer/autoload_psr4.php");
  if (fs.existsSync(psr4Path)) {
    try {
      const psr4Content = fs.readFileSync(psr4Path, "utf8");
      allowedPrefixes.push(...extractPsr4PrefixesFromPsr4Php(psr4Content));
    } catch {}
  }

  if (options.psr4 && typeof options.psr4 === "object") {
    allowedPrefixes.push(
      ...extractPsr4PrefixesFromComposerJson({
        autoload: { "psr-4": options.psr4 },
      }),
    );
  }

  const classmapPath = path.join(
    pluginDir,
    "vendor/composer/autoload_classmap.php",
  );
  if (!fs.existsSync(classmapPath)) {
    return { strippedCount: 0, stripped: [] };
  }

  const rawClassmap = fs.readFileSync(classmapPath, "utf8");
  const { filteredContent, stripped } = filterClassmapEntries(rawClassmap, {
    allowedPrefixes,
    allowedPatterns: options.allowedPatterns,
  });

  if (stripped.length > 0) {
    fs.writeFileSync(classmapPath, filteredContent, "utf8");

    const staticPath = path.join(
      pluginDir,
      "vendor/composer/autoload_static.php",
    );
    if (fs.existsSync(staticPath)) {
      const rawStatic = fs.readFileSync(staticPath, "utf8");
      const filteredStatic = filterAutoloadStaticClassmap(rawStatic, stripped);
      if (filteredStatic !== rawStatic) {
        fs.writeFileSync(staticPath, filteredStatic, "utf8");
      }
    }
  }

  return {
    strippedCount: stripped.length,
    stripped,
  };
}
