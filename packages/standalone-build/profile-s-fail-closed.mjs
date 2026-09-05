/**
 * Fail-closed Profile S gates shared by the assembler and CLI parsers.
 *
 * Profile S must not ship a ZIP after a skipped Rector pass, invalid transformer
 * JSON, or an unknown protection profile.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const ALLOWED_BUILD_PROFILES = new Set(["s", "clean"]);

const REQUIRED_BUILD_TOOLS = [
  ["php", ["-v"]],
  ["zip", ["-v"]],
  ["unzip", ["-v"]],
  ["rsync", ["--version"]],
  ["composer", ["--version"]],
];

export function parseClosedProfileFlags(argv = []) {
  const selected = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--obfuscate") {
      selected.push("s");
      continue;
    }
    if (arg === "--profile") {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        throw new Error("Invalid --profile: a value is required (s or clean)");
      }
      const value = next.trim().toLowerCase();
      if (!ALLOWED_BUILD_PROFILES.has(value)) {
        throw new Error(
          `Invalid --profile '${value}'. Allowed: ${Array.from(ALLOWED_BUILD_PROFILES).join(", ")}`,
        );
      }
      selected.push(value);
      i++;
      continue;
    }
    if (arg === "--profile=") {
      throw new Error("Invalid --profile: a value is required (s or clean)");
    }
    if (typeof arg === "string" && arg.startsWith("--profile=")) {
      const value = arg.slice("--profile=".length).trim().toLowerCase();
      if (!ALLOWED_BUILD_PROFILES.has(value)) {
        throw new Error(
          `Invalid --profile '${value}'. Allowed: ${Array.from(ALLOWED_BUILD_PROFILES).join(", ")}`,
        );
      }
      selected.push(value);
    }
  }
  const unique = [...new Set(selected)];
  if (unique.length > 1) {
    throw new Error(`Conflicting profile flags: ${unique.join(", ")}`);
  }
  const profile = unique[0] || "clean";
  return {
    profile,
    isObfuscate: profile === "s",
  };
}

export function requireRectorForProfileS({ rectorBin, rectorConfig }) {
  const missing = [];
  if (!rectorBin || !fs.existsSync(rectorBin)) missing.push(rectorBin || "vendor/bin/rector");
  if (!rectorConfig || !fs.existsSync(rectorConfig)) missing.push(rectorConfig || "rector-downgrade-php74.php");
  if (missing.length > 0) {
    throw new Error(
      `Profile S requires Rector PHP 7.4 downgrade (missing ${missing.join(", ")})`,
    );
  }
  return { rectorBin, rectorConfig };
}

export function collectFirstPartyPhpFiles(rootDir) {
  const skipDirs = new Set(["vendor", "vendor-prefixed", "node_modules", ".git"]);
  const files = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".php")) {
        files.push(full);
      }
    }
  }

  walk(rootDir);
  return files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function parseTransformerBatchLog(stdout, { expectedFiles = null } = {}) {
  const parsed = extractJsonArray(stdout);
  if (!Array.isArray(parsed)) {
    throw new Error("transformer --batch JSON must be an array of file records");
  }
  for (const rec of parsed) {
    if (!rec || typeof rec !== "object" || Array.isArray(rec) || typeof rec.file !== "string" || rec.file.length === 0) {
      throw new Error("transformer --batch record missing file path");
    }
  }

  if (Array.isArray(expectedFiles)) {
    const got = new Set(parsed.map((rec) => path.resolve(rec.file)));
    const missing = expectedFiles.filter((file) => !got.has(path.resolve(file)));
    if (missing.length > 0) {
      throw new Error(
        `transformer --batch omitted ${missing.length} PHP file(s), e.g. ${missing[0]}`,
      );
    }
    if (parsed.length !== expectedFiles.length) {
      throw new Error(
        `transformer --batch record count ${parsed.length} !== expected ${expectedFiles.length}`,
      );
    }
  } else if (parsed.length === 0) {
    throw new Error("transformer --batch JSON array is empty");
  }

  return parsed;
}

function extractJsonArray(stdout) {
  const trimmed = String(stdout || "").trim();
  if (!trimmed) {
    throw new Error("transformer --batch produced empty stdout");
  }
  try {
    return JSON.parse(trimmed);
  } catch (first) {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new Error(`transformer --batch did not emit valid JSON: ${first.message}`);
  }
}

export const CRITICAL_ELIGIBILITY_PATTERNS = new Set([
  "eval",
  "create_function",
  "string_assert",
  "preg_replace_e",
]);

export function assertEligibilityAllowsObfuscation(eligibility) {
  const patterns = Array.isArray(eligibility?.forbiddenPatterns) ? eligibility.forbiddenPatterns : [];
  const critical = patterns.filter((item) => CRITICAL_ELIGIBILITY_PATTERNS.has(item.pattern));
  if (critical.length > 0) {
    throw new Error(`Critical security violation in eligibility spike: ${JSON.stringify(critical)}`);
  }
  return patterns;
}

export function assertSymbolMapHasNoCollisions(symMap) {
  if (!symMap || typeof symMap !== "object" || Array.isArray(symMap)) {
    throw new Error("symbol map must be an object");
  }
  let totalChecked = 0;
  for (const section of ["classes", "functions", "constants"]) {
    const table = symMap[section] && typeof symMap[section] === "object" ? symMap[section] : {};
    const fqcnsByMangled = new Map();
    const globalsByMangled = new Map();
    const shortNamesFqcnCount = new Map();
    const caseInsensitive = section === "classes" || section === "functions";

    // First pass: register all FQCNs (containing backslash)
    for (const [symbol, rawMangled] of Object.entries(table)) {
      if (typeof symbol !== "string" || symbol.startsWith("\\")) continue;
      const mangled = String(rawMangled || "").replace(/^\\/, "");
      if (!mangled) continue;

      if (symbol.includes("\\")) {
        const mangledKey = caseInsensitive ? mangled.toLowerCase() : mangled;
        if (fqcnsByMangled.has(mangledKey)) {
          const existing = fqcnsByMangled.get(mangledKey);
          const isSameSymbol = caseInsensitive
            ? existing.toLowerCase() === symbol.toLowerCase()
            : existing === symbol;
          if (!isSameSymbol) {
            throw new Error(
              `symbol map collision in ${section}: ${existing} and ${symbol} both mangle to ${mangled}`,
            );
          }
        }
        fqcnsByMangled.set(mangledKey, symbol);

        const shortName = symbol.slice(symbol.lastIndexOf("\\") + 1);
        const shortKey = caseInsensitive ? shortName.toLowerCase() : shortName;
        shortNamesFqcnCount.set(shortKey, (shortNamesFqcnCount.get(shortKey) || 0) + 1);
        totalChecked++;
      }
    }

    // Second pass: register short names and globals (no backslash)
    for (const [symbol, rawMangled] of Object.entries(table)) {
      if (typeof symbol !== "string" || symbol.startsWith("\\") || symbol.includes("\\")) continue;
      const mangled = String(rawMangled || "").replace(/^\\/, "");
      if (!mangled) continue;

      const mangledKey = caseInsensitive ? mangled.toLowerCase() : mangled;
      const shortKey = caseInsensitive ? symbol.toLowerCase() : symbol;

      if ((shortNamesFqcnCount.get(shortKey) || 0) > 1) {
        throw new Error(
          `symbol map collision in ${section}: ambiguous short name '${symbol}' belongs to multiple FQCNs and cannot be mapped`,
        );
      }

      if (fqcnsByMangled.has(mangledKey)) {
        const fqcn = fqcnsByMangled.get(mangledKey);
        const fqcnShort = fqcn.slice(fqcn.lastIndexOf("\\") + 1);
        const matchesShort = caseInsensitive
          ? fqcnShort.toLowerCase() === symbol.toLowerCase()
          : fqcnShort === symbol;
        if (!matchesShort) {
          throw new Error(
            `symbol map collision in ${section}: ${fqcn} and ${symbol} both mangle to ${mangled}`,
          );
        }
        // Valid short alias of the same class.
      } else {
        if (globalsByMangled.has(mangledKey)) {
          const existing = globalsByMangled.get(mangledKey);
          const isSameSymbol = caseInsensitive
            ? existing.toLowerCase() === symbol.toLowerCase()
            : existing === symbol;
          if (!isSameSymbol) {
            throw new Error(
              `symbol map collision in ${section}: ${existing} and ${symbol} both mangle to ${mangled}`,
            );
          }
        }
        globalsByMangled.set(mangledKey, symbol);
        totalChecked++;
      }
    }
  }
  return totalChecked;
}

export function assertZipHasNoSecretIntermediates(entries) {
  const secrets = [];
  const secretPattern = /(^|\/)(?:symbol[-_]map|symbols)[^/]*\.json$/i;
  for (const entry of entries || []) {
    const name = typeof entry === "string" ? entry : entry?.name;
    if (!name) continue;
    if (secretPattern.test(name)) secrets.push(name);
  }
  if (secrets.length > 0) {
    throw new Error(`secret build intermediate packaged in ZIP: ${secrets.join(", ")}`);
  }
}

async function firstLineVersion(command, args) {
  const { stdout, stderr } = await execFileAsync(command, args);
  const lines = String(stdout || stderr).trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const versionLine = lines.find((l) => /(?:version|v\d|\bzip\s+\d|\b\d+\.\d+)/i.test(l)) || lines[0] || "";
  return versionLine.slice(0, 240);
}

export async function collectToolchainEvidence({ rectorBin = null } = {}) {
  const evidence = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  };
  const probes = [
    ["php", ["-r", "echo PHP_VERSION;"], "php"],
    ["zip", ["-v"], "zip"],
    ["unzip", ["-v"], "unzip"],
    ["rsync", ["--version"], "rsync"],
    ["composer", ["--version"], "composer"],
  ];
  for (const [command, args, key] of probes) {
    try {
      evidence[key] = await firstLineVersion(command, args);
    } catch (err) {
      throw new Error(`Profile S toolchain preflight failed: ${command} (${err.message})`);
    }
  }
  if (rectorBin) {
    try {
      evidence.rector = await firstLineVersion("php", [rectorBin, "--version"]);
    } catch (err) {
      throw new Error(`Profile S toolchain preflight failed: rector (${err.message})`);
    }
  }
  return evidence;
}

export async function assertRequiredBuildTools(commands = REQUIRED_BUILD_TOOLS) {
  const missing = [];
  for (const [command, args] of commands) {
    try {
      await execFileAsync(command, args);
    } catch (err) {
      missing.push(`${command} (${err.message})`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Profile S toolchain preflight failed: missing ${missing.join("; ")}`);
  }
}

export async function secureUnlinkSymbolMap(mapFile) {
  if (!mapFile || !fs.existsSync(mapFile)) return;
  try {
    const stat = fs.statSync(mapFile);
    if (stat.isFile() && stat.size > 0) {
      fs.writeFileSync(mapFile, Buffer.alloc(Math.min(stat.size, 64 * 1024 * 1024), 0));
    }
  } catch {
    // Still unlink even if the overwrite fails.
  }
  await rm(mapFile, { force: true });
}

export async function validatePhpSyntaxTree(dir, { phpBin = process.env.WPDEV_PHP74_BIN || "php" } = {}) {
  const phpValidatorScript = `
  $dir = $argv[1];
  $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS));
  $errors = [];
  $php8TokenIds = [];
  foreach (['T_ENUM', 'T_READONLY', 'T_MATCH', 'T_NULLSAFE_OBJECT_OPERATOR'] as $const) {
      if (defined($const)) {
          $php8TokenIds[constant($const)] = $const;
      }
  }
  $attrId = defined('T_ATTRIBUTE') ? constant('T_ATTRIBUTE') : -1;
  foreach ($iterator as $file) {
      if (!$file->isFile() || $file->getExtension() !== 'php') {
          continue;
      }
      $path = $file->getPathname();
      if (strpos($path, DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR) !== false) {
          continue;
      }
      if (strpos($path, DIRECTORY_SEPARATOR . 'vendor-prefixed' . DIRECTORY_SEPARATOR) !== false) {
          continue;
      }
      $code = file_get_contents($path);
      try {
          $tokens = token_get_all($code, TOKEN_PARSE);
      } catch (\\ParseError $e) {
          $errors[] = $path . ': ' . $e->getMessage();
          continue;
      }
      $count = count($tokens);
      for ($i = 0; $i < $count; $i++) {
          $token = $tokens[$i];
          $tokenId = is_array($token) ? $token[0] : null;
          $tokenText = is_array($token) ? $token[1] : $token;

          if ($tokenId !== null && isset($php8TokenIds[$tokenId])) {
              $errors[] = $path . ': PHP 7.4 incompatibility: ' . $php8TokenIds[$tokenId] . ' remains after downgrade';
              break;
          }

          if ($tokenId === $attrId) {
              $attrTokens = [];
              $j = $i + 1;
              while ($j < $count && $tokens[$j] !== ']') {
                  $attrTokens[] = is_array($tokens[$j]) ? $tokens[$j][1] : $tokens[$j];
                  $j++;
              }
              $attrName = trim(implode('', $attrTokens));
              $cleanAttrName = ltrim($attrName, "\\\\");
              if (!in_array($cleanAttrName, ['ReturnTypeWillChange', 'AllowDynamicProperties', 'Override'], true)) {
                  $errors[] = $path . ': PHP 7.4 incompatibility: T_ATTRIBUTE remains after downgrade: ' . $attrName;
                  break;
              }
              $i = $j;
              continue;
          }

          if ($tokenId === T_FUNCTION) {
              while ($i < $count && $tokens[$i] !== '(') {
                  $i++;
              }
              $depth = 1;
              $paramTokens = [];
              $i++;
              while ($i < $count && $depth > 0) {
                  if ($tokens[$i] === '(') $depth++;
                  elseif ($tokens[$i] === ')') $depth--;
                  if ($depth > 0) $paramTokens[] = $tokens[$i];
                  $i++;
              }
              $inDefault = false;
              foreach ($paramTokens as $pt) {
                  if ($pt === '=') $inDefault = true;
                  elseif ($pt === ',') $inDefault = false;
                  elseif (!$inDefault && $pt === '|') {
                      $errors[] = $path . ': PHP 7.4 incompatibility: union type parameter detected in function declaration';
                      break;
                  }
              }
              $returnTokens = [];
              $hasColon = false;
              while ($i < $count && $tokens[$i] !== '{' && $tokens[$i] !== ';') {
                  if ($tokens[$i] === ':') {
                      $hasColon = true;
                  } elseif ($hasColon) {
                      $returnTokens[] = $tokens[$i];
                  }
                  $i++;
              }
              if ($hasColon) {
                  foreach ($returnTokens as $rt) {
                      if ($rt === '|') {
                          $errors[] = $path . ': PHP 7.4 incompatibility: union return type detected in function declaration';
                          break;
                      }
                  }
              }
          }
      }
  }
  if (!empty($errors)) {
      fwrite(STDERR, implode("\\n", $errors) . "\\n");
      exit(1);
  }
  echo "SYNTAX_OK\\n";
  `;
  const { stdout, stderr } = await execFileAsync(phpBin, ["-d", "xdebug.mode=off", "-r", phpValidatorScript, "--", dir]);
  if (!stdout.includes("SYNTAX_OK")) {
    throw new Error(`PHP syntax error in transformed files: ${stdout || stderr}`);
  }
}
