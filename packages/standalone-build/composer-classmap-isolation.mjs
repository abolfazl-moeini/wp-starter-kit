import fs from "node:fs";
import path from "node:path";

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
  // Ensure normalized trailing backslashes
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
            continue; // Strip this line!
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
          continue; // Strip this line!
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

  // 1. Try reading composer.json for psr-4 prefixes
  const compPath = path.join(pluginDir, "composer.json");
  if (fs.existsSync(compPath)) {
    try {
      const comp = JSON.parse(fs.readFileSync(compPath, "utf8"));
      allowedPrefixes.push(...extractPsr4PrefixesFromComposerJson(comp));
    } catch {}
  }

  // 2. Try reading vendor/composer/autoload_psr4.php for registered PSR-4 prefixes
  const psr4Path = path.join(pluginDir, "vendor/composer/autoload_psr4.php");
  if (fs.existsSync(psr4Path)) {
    try {
      const psr4Content = fs.readFileSync(psr4Path, "utf8");
      allowedPrefixes.push(...extractPsr4PrefixesFromPsr4Php(psr4Content));
    } catch {}
  }

  // If psr4 map is passed in options
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

/**
 * Verify that vendor/composer/autoload_classmap.php does not contain any foreign classes.
 *
 * @param {string} extractedPluginDir Absolute path to the plugin directory
 * @param {object} [options={}]
 * @returns {{ passed: boolean, foreignEntries: Array<{ rawClass: string, normalizedClass: string, relPath: string }> }}
 */
export function verifyClassmapIsolation(extractedPluginDir, options = {}) {
  const classmapPath = path.join(
    extractedPluginDir,
    "vendor/composer/autoload_classmap.php",
  );
  if (!fs.existsSync(classmapPath)) {
    return { passed: true, foreignEntries: [] };
  }

  const allowedPrefixes = [...(options.allowedPrefixes || [])];
  if (options.vendorPrefix) {
    allowedPrefixes.push(options.vendorPrefix);
  }

  const psr4Path = path.join(
    extractedPluginDir,
    "vendor/composer/autoload_psr4.php",
  );
  if (fs.existsSync(psr4Path)) {
    try {
      const psr4Content = fs.readFileSync(psr4Path, "utf8");
      allowedPrefixes.push(...extractPsr4PrefixesFromPsr4Php(psr4Content));
    } catch {}
  }

  const compPath = path.join(extractedPluginDir, "composer.json");
  if (fs.existsSync(compPath)) {
    try {
      const comp = JSON.parse(fs.readFileSync(compPath, "utf8"));
      allowedPrefixes.push(...extractPsr4PrefixesFromComposerJson(comp));
    } catch {}
  }

  const rawClassmap = fs.readFileSync(classmapPath, "utf8");
  const { stripped } = filterClassmapEntries(rawClassmap, {
    allowedPrefixes,
    allowedPatterns: options.allowedPatterns,
  });

  return {
    passed: stripped.length === 0,
    foreignEntries: stripped,
  };
}
