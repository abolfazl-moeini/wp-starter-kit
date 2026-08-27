import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import crypto from "node:crypto";

export const FILE_ROLES = new Set([
  "encode",
  "readable-preflight",
  "readable-migration-recovery",
  "readable-third-party",
  "static-public",
  "exclude",
]);

function toPath(value) {
  return value instanceof URL ? value.pathname : path.resolve(String(value));
}

function studly(value) {
  return String(value)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

export function buildRuntimePrefix(artifactId, slug) {
  if (!artifactId || !slug) throw new Error("artifactId and slug are required");
  return `${studly(artifactId)}${studly(slug)}Rt`;
}

export function validateArtifactRegistry(registry) {
  if (
    !registry ||
    registry.version !== 1 ||
    !Array.isArray(registry.artifacts)
  ) {
    return { valid: false, error: "registry version/artifacts are invalid" };
  }
  const ids = new Set();
  const runtimePrefixes = new Set();
  const vendorPrefixes = new Set();
  for (const artifact of registry.artifacts) {
    for (const key of ["artifactId", "slug", "runtimePrefix", "vendorPrefix"]) {
      if (typeof artifact?.[key] !== "string" || artifact[key] === "") {
        return { valid: false, error: `registry artifact missing ${key}` };
      }
    }
    for (const key of ["sourceDigest", "toolDigest"]) {
      if (
        typeof artifact?.[key] !== "string" ||
        !/^[a-f0-9]{64}$/.test(artifact[key])
      ) {
        return { valid: false, error: `invalid ${key}` };
      }
    }
    if (ids.has(artifact.artifactId))
      return { valid: false, error: "duplicate artifactId" };
    if (runtimePrefixes.has(artifact.runtimePrefix))
      return { valid: false, error: "duplicate runtimePrefix" };
    if (vendorPrefixes.has(artifact.vendorPrefix))
      return { valid: false, error: "duplicate vendorPrefix" };
    if (
      buildRuntimePrefix(artifact.artifactId, artifact.slug) !==
      artifact.runtimePrefix
    ) {
      return {
        valid: false,
        error: "runtimePrefix is not derived from artifact identity",
      };
    }
    ids.add(artifact.artifactId);
    runtimePrefixes.add(artifact.runtimePrefix);
    vendorPrefixes.add(artifact.vendorPrefix);
  }
  return { valid: true };
}

export function buildPrivateStateKey(prefix, logicalKey, family) {
  const limit =
    family === "site-transient" ? 167 : family === "transient" ? 172 : 250;
  const typed = `${family}:v1:${logicalKey}`;
  const candidate = `${prefix}${logicalKey}`;
  if (candidate.length <= limit) return candidate;
  const digest = crypto
    .createHash("sha256")
    .update(typed)
    .digest("hex")
    .slice(0, 24);
  const room = limit - prefix.length - 2 - digest.length;
  if (room < 1) throw new Error("private state prefix is too long");
  return `${prefix}${String(logicalKey).slice(0, room)}_h${digest}`;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

function transformPhp(source, target, mapping, astTransformScript) {
  const result = spawnSync(
    "php",
    [astTransformScript, JSON.stringify(mapping), source, target],
    {
      encoding: "utf8",
    },
  );
  if (result.status !== 0)
    throw new Error(result.stderr || "PHP AST transform failed");
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

async function assertNoSymlinkPath(root, relative) {
  const parts = relative.split("/");
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink())
      throw new Error(`symlinked closure path is not allowed: ${relative}`);
  }
}

async function assertRegularFile(root, relative) {
  const stat = await fs.lstat(path.join(root, relative));
  if (!stat.isFile())
    throw new Error(`closure path must be a regular file: ${relative}`);
}

function isSafeRelativeFile(value) {
  if (typeof value !== "string" || value === "") return false;
  const normalized = path.posix.normalize(value);
  return (
    normalized === value &&
    !normalized.startsWith("../") &&
    !path.isAbsolute(value)
  );
}

function hasReviewBlockers(blockers) {
  if (!blockers || typeof blockers !== "object") return false;
  return Object.values(blockers).some(
    (value) => Array.isArray(value) && value.length > 0,
  );
}

async function assertApprovedClosureReviewManifest(sourceRoot, policy) {
  const manifestRelative = policy.closureReviewManifest;
  if (manifestRelative === undefined) return;
  if (!isSafeRelativeFile(manifestRelative))
    throw new Error("unsafe closure review manifest path");
  await assertNoSymlinkPath(sourceRoot, manifestRelative);
  await assertRegularFile(sourceRoot, manifestRelative);
  const manifest = await readJson(path.join(sourceRoot, manifestRelative));
  if (
    manifest?.schema !== 1 ||
    manifest.status !== "approved" ||
    manifest.buildInput !== true
  ) {
    throw new Error("closure review manifest is not approved for build input");
  }
  if (!Array.isArray(manifest.candidatePaths) || hasReviewBlockers(manifest.blockers))
    throw new Error("closure review manifest has unresolved candidates or blockers");

  const candidates = new Map();
  for (const candidate of manifest.candidatePaths) {
    if (!candidate || !isSafeRelativeFile(candidate.path) || candidates.has(candidate.path))
      throw new Error("closure review manifest has invalid candidate paths");
    if (candidate.status !== "approved")
      throw new Error(`closure review manifest candidate is not approved: ${candidate.path}`);
    if (candidate.proposedRole !== policy.fileRoles?.[candidate.path])
      throw new Error(`closure review manifest role mismatch: ${candidate.path}`);
    candidates.set(candidate.path, candidate);
  }

  const closure = new Set(policy.closure);
  if (candidates.size !== closure.size || [...closure].some((file) => !candidates.has(file)))
    throw new Error("closure review manifest does not exactly match policy closure");
}

/**
 * Assemble one policy allow-list into an output tree. This function never
 * removes source files and rejects symlinks, unsafe paths and output nesting.
 */
export async function assemblePrivateRuntime({
  root,
  output,
  registry,
  astTransformScript,
}) {
  const sourceRoot = toPath(root);
  const outputRoot = toPath(output);
  const sourceStat = await fs.lstat(sourceRoot);
  if (sourceStat.isSymbolicLink() || !sourceStat.isDirectory())
    throw new Error("source root must be a real directory");
  if (isInside(sourceRoot, outputRoot))
    throw new Error("output must be outside the immutable source tree");
  // Never merge into an existing output tree: stale files could otherwise
  // survive a narrower closure and accidentally become part of the artifact.
  // Cleanup is deliberately left to the caller so this function remains
  // non-destructive.
  try {
    const outputStat = await fs.lstat(outputRoot);
    if (outputStat.isSymbolicLink() || !outputStat.isDirectory())
      throw new Error("output must be a real directory");
    const existing = await fs.readdir(outputRoot);
    if (existing.length > 0) throw new Error("output directory must be empty");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const policy = await readJson(
    path.join(sourceRoot, "protection-policy.json"),
  );
  const check = validateArtifactRegistry(registry);
  if (!check.valid)
    throw new Error(`invalid artifact registry: ${check.error}`);
  const registered = registry.artifacts.find(
    (item) => item.artifactId === policy.artifactId,
  );
  if (!registered || registered.slug !== policy.slug)
    throw new Error("policy is not registered for this artifact");
  if (
    registered.runtimePrefix !== policy.runtimePrefix ||
    registered.vendorPrefix !== policy.vendorPrefix
  ) {
    throw new Error("policy prefix does not match registry");
  }
  if (!Array.isArray(policy.closure) || policy.closure.length === 0)
    throw new Error("policy closure must be a non-empty allow-list");
  await assertApprovedClosureReviewManifest(sourceRoot, policy);
  const files = [...new Set(policy.closure)].sort();
  if (files.length !== policy.closure.length)
    throw new Error("duplicate closure path");
  for (const relative of files) {
    const normalized = path.posix.normalize(relative);
    if (
      normalized !== relative ||
      normalized.startsWith("../") ||
      path.isAbsolute(relative)
    )
      throw new Error(`unsafe closure path: ${relative}`);
    const role = policy.fileRoles?.[relative];
    if (!FILE_ROLES.has(role) || role === "exclude")
      throw new Error(`missing/invalid role for ${relative}`);
    await assertNoSymlinkPath(sourceRoot, relative);
    await assertRegularFile(sourceRoot, relative);
  }
  await fs.mkdir(outputRoot, { recursive: true });
  const mapping = {
    wpdev_register_table: `${policy.runtimePrefix}_register_table`,
    wpdev_register_form: `${policy.runtimePrefix}_register_form`,
  };
  const helper =
    astTransformScript ||
    path.join(sourceRoot, "dev/release/php-ast-transform.php");
  const php = {};
  const ownership = {};
  for (const relative of files) {
    const from = path.join(sourceRoot, relative);
    const to = path.join(outputRoot, relative);
    await fs.mkdir(path.dirname(to), { recursive: true });
    if (relative.endsWith(".php") && policy.fileRoles[relative] === "encode") {
      transformPhp(from, to, mapping, helper);
      php[relative] = await fs.readFile(to, "utf8");
    } else {
      await fs.copyFile(from, to);
      if (relative.endsWith(".php"))
        php[relative] = await fs.readFile(to, "utf8");
    }
    ownership[relative] = policy.fileRoles[relative];
  }
  return {
    artifactId: registered.artifactId,
    runtimePrefix: registered.runtimePrefix,
    vendorPrefix: registered.vendorPrefix,
    files,
    php,
    ownership,
    composer: policy.toolOwnership?.composer || "unassigned",
    strauss: policy.toolOwnership?.strauss || "unassigned",
    rector: policy.toolOwnership?.rector || "unassigned",
  };
}
