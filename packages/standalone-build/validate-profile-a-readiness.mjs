#!/usr/bin/env node

import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const registryInput = process.argv[4] || "";
if (!/^[a-z0-9][a-z0-9-]*$/.test(consumer)) {
  process.stderr.write("Invalid consumer slug.\n");
  process.exit(2);
}
const failures = [];
const evidence = [];
const execFileAsync = promisify(execFile);

async function resolveConsumerRoot() {
  const defaultRelative = `plugins/${consumer}`;
  const mapPath = path.join(contentRoot, "protection-consumer-source-map.json");
  let relative = defaultRelative;
  try {
    const stat = await fs.lstat(mapPath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error("source map must be a regular non-symlink file");
    }
    const map = JSON.parse(await fs.readFile(mapPath, "utf8"));
    if (map.schema !== 1 || !map.consumers || typeof map.consumers !== "object" || Array.isArray(map.consumers)) {
      throw new Error("source map must provide schema 1 and a consumers object");
    }
    if (Object.hasOwn(map.consumers, consumer)) relative = map.consumers[consumer];
  } catch (error) {
    if (error.code !== "ENOENT") failures.push(`consumer source map: ${error.message}`);
  }
  if (
    typeof relative !== "string" ||
    !relative.startsWith("plugins/") ||
    relative.includes("\\") ||
    path.posix.normalize(relative) !== relative ||
    relative.includes("../")
  ) {
    failures.push(`consumer source map: unsafe source path for ${consumer}`);
    return { root: path.join(contentRoot, defaultRelative), relative: defaultRelative };
  }
  const root = path.join(contentRoot, relative);
  try {
    const stat = await fs.lstat(root);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("consumer source must be a regular directory");
  } catch (error) {
    failures.push(`consumer source map: cannot resolve ${consumer} (${error.message})`);
  }
  return { root, relative };
}

const consumerSource = await resolveConsumerRoot();
const pluginRoot = consumerSource.root;

async function readJson(relativePath) {
  const canonicalPrefix = `plugins/${consumer}/`;
  if (
    typeof relativePath === "string" &&
    consumerSource.relative !== canonicalPrefix.slice(0, -1) &&
    relativePath.startsWith(canonicalPrefix)
  ) {
    relativePath = `${consumerSource.relative}/${relativePath.slice(canonicalPrefix.length)}`;
  }
  if (
    typeof relativePath !== "string" ||
    relativePath === "" ||
    relativePath.includes("\\") ||
    path.posix.normalize(relativePath) !== relativePath ||
    relativePath.startsWith("../") ||
    path.isAbsolute(relativePath)
  ) {
    failures.push(`${String(relativePath)}: unsafe evidence path`);
    return null;
  }
  const absolutePath = path.join(contentRoot, relativePath);
  try {
    const stat = await fs.lstat(absolutePath);
    if (stat.isSymbolicLink()) throw new Error("symlink evidence path is not allowed");
    if (!stat.isFile()) throw new Error("evidence path must be a regular file");
    return JSON.parse(await fs.readFile(absolutePath, "utf8"));
  } catch (error) {
    failures.push(`${relativePath}: cannot read valid JSON (${error.message})`);
    return null;
  }
}

function hasValues(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return value !== null && value !== undefined && value !== "";
}

function blockerEntries(label, blockers) {
  if (!blockers || typeof blockers !== "object" || Array.isArray(blockers)) {
    failures.push(`${label}: blockers must be an object`);
    return [];
  }
  return Object.entries(blockers);
}

function reviewApproval(label, manifest) {
  if (manifest?.reviewApproval === undefined) return;
  const approval = manifest.reviewApproval;
  if (!approval || typeof approval !== "object" || Array.isArray(approval)) {
    failures.push(`${label}: reviewApproval must be an object`);
    return;
  }
  if (approval.schema !== 1) failures.push(`${label}: reviewApproval.schema must be 1`);
  if (typeof approval.approver !== "string" || approval.approver === "") {
    failures.push(`${label}: reviewApproval.approver must be a non-empty string`);
  }
  if (typeof approval.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(approval.date)) {
    failures.push(`${label}: reviewApproval.date must be an ISO date`);
  }
  if (approval.accurateList !== true) failures.push(`${label}: reviewApproval.accurateList must be true`);
  if (typeof approval.scope !== "string" || approval.scope === "") {
    failures.push(`${label}: reviewApproval.scope must be a non-empty string`);
  }
  if (!Array.isArray(approval.limitations) || approval.limitations.length === 0) {
    failures.push(`${label}: reviewApproval.limitations must be a non-empty array`);
  } else if (approval.limitations.some((limitation) => typeof limitation !== "string" || limitation === "")) {
    failures.push(`${label}: reviewApproval.limitations must contain non-empty strings`);
  }
  if (approval.promotionImpact !== "review-only") {
    failures.push(`${label}: reviewApproval.promotionImpact must be review-only`);
  }
}

function requireApprovedManifest(label, manifest, entries = [], entryLabel = "entries") {
  if (!manifest) return;
  if (manifest.schema !== 1) failures.push(`${label}: unsupported schema`);
  if (manifest.consumer !== consumer) failures.push(`${label}: consumer mismatch`);
  if (manifest.status !== "approved") {
    failures.push(`${label}: status must be approved, found ${String(manifest.status)}`);
  }
  if (manifest.buildInput !== true) {
    failures.push(`${label}: buildInput must be true`);
  }
  const unapproved = entries.filter((entry) => entry.status !== "approved");
  if (unapproved.length > 0) {
    failures.push(`${label}: ${unapproved.length} ${entryLabel} are not approved`);
  }
  entries.forEach((entry, index) => {
    if (entryLabel === "candidate paths" && (typeof entry.path !== "string" || entry.path === "")) {
      failures.push(`${label}: ${entryLabel}[${index}].path must be a non-empty string`);
    }
    if (entryLabel === "candidate fields" && (typeof entry.key !== "string" || entry.key === "")) {
      failures.push(`${label}: ${entryLabel}[${index}].key must be a non-empty string`);
    }
    if (entryLabel === "candidate fields" && (typeof entry.owner !== "string" || entry.owner === "")) {
      failures.push(`${label}: ${entryLabel}[${index}].owner must be a non-empty string`);
    }
    if (entryLabel === "candidate fields") {
      for (const field of ["registeredBy", "directAccess"]) {
        if (!Array.isArray(entry.evidence?.[field])) {
          failures.push(`${label}: ${entryLabel}[${index}].evidence.${field} must be an array`);
        } else {
          entry.evidence[field].forEach((value, valueIndex) => {
            if (typeof value !== "string" || value === "") {
              failures.push(`${label}: ${entryLabel}[${index}].evidence.${field}[${valueIndex}] must be a non-empty string`);
            }
          });
        }
      }
    }
    if (typeof entry.path === "string") {
      if (
        entry.path.includes("\\") ||
        path.posix.normalize(entry.path) !== entry.path ||
        path.posix.isAbsolute(entry.path) ||
        entry.path === ".." ||
        entry.path.startsWith("../")
      ) {
        failures.push(`${label}: ${entryLabel}[${index}] has unsafe path`);
      }
    }
  });
  for (const [name, value] of blockerEntries(label, manifest.blockers)) {
    if (hasValues(value)) failures.push(`${label}: unresolved blocker ${name}`);
  }
}

function requireExactKeys(label, expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  if (
    actualSet.size !== actual.length ||
    expectedSet.size !== actualSet.size ||
    [...expectedSet].some((value) => !actualSet.has(value))
  ) {
    failures.push(`${label}: does not exactly match source inventory`);
  }
}

function manifestEntries(label, manifest, field, entryLabel) {
  const entries = manifest?.[field];
  if (!Array.isArray(entries)) {
    failures.push(`${label}: ${entryLabel} must be an array`);
    return [];
  }
  return entries.filter((entry, index) => {
    const valid = entry && typeof entry === "object" && !Array.isArray(entry);
    if (!valid) failures.push(`${label}: ${entryLabel}[${index}] must be an object`);
    return valid;
  });
}

function requiredArray(label, value) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array`);
    return [];
  }
  return value;
}

function objectArray(label, value) {
  const entries = requiredArray(label, value);
  return entries.filter((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      failures.push(`${label}[${index}] must be an object`);
      return false;
    }
    return true;
  });
}

function resolvedTemplateFiles(templateInventory) {
  const filesByTemplate = templateInventory?.resolvedLiteralFiles;
  if (!filesByTemplate || typeof filesByTemplate !== "object" || Array.isArray(filesByTemplate)) {
    failures.push("template dependency review: resolvedLiteralFiles must be an object");
    return [];
  }
  const seenFiles = new Set();
  return Object.entries(filesByTemplate).flatMap(([template, files]) => {
    if (typeof template !== "string" || template === "") {
      failures.push("template dependency review: resolvedLiteralFiles key must be a non-empty string");
    }
    if (!Array.isArray(files)) {
      failures.push(`template dependency review: resolvedLiteralFiles.${template} must be an array`);
      return [];
    }
    return files.filter((file, index) => {
      if (typeof file !== "string" || file === "") {
        failures.push(`template dependency review: resolvedLiteralFiles.${template}[${index}] must be a string`);
        return false;
      }
      if (
        file.includes("\\") ||
        path.posix.normalize(file) !== file ||
        path.posix.isAbsolute(file) ||
        file === ".." ||
        file.startsWith("../")
      ) {
        failures.push(`template dependency review: resolvedLiteralFiles.${template}[${index}] has unsafe path`);
        return false;
      }
      if (seenFiles.has(file)) {
        failures.push(`template dependency review: duplicate resolved file ${file}`);
        return false;
      }
      seenFiles.add(file);
      return true;
    });
  });
}

const prefixInventory = await readJson("artifact-prefix-inventory.json");
if (prefixInventory) {
  const prefixArtifacts = Array.isArray(prefixInventory.artifacts) ? prefixInventory.artifacts : null;
  if (!prefixArtifacts) failures.push("artifact-prefix-inventory.json: artifacts must be an array");
  const seenConsumers = new Set();
  const seenSlugs = new Set();
  prefixArtifacts?.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      failures.push(`artifact-prefix-inventory.json: artifacts[${index}] must be an object`);
    } else {
      if (seenConsumers.has(entry.consumer)) failures.push(`artifact-prefix-inventory.json: duplicate consumer ${entry.consumer}`);
      if (seenSlugs.has(entry.slug)) failures.push(`artifact-prefix-inventory.json: duplicate slug ${entry.slug}`);
      seenConsumers.add(entry.consumer);
      seenSlugs.add(entry.slug);
      for (const field of ["consumer", "slug"]) {
        if (typeof entry[field] !== "string" || entry[field] === "") {
          failures.push(`artifact-prefix-inventory.json: artifacts[${index}].${field} must be a non-empty string`);
        } else if (!/^[a-z0-9][a-z0-9-]*$/.test(entry[field])) {
          failures.push(`artifact-prefix-inventory.json: artifacts[${index}].${field} must be a valid slug`);
        }
      }
      for (const field of ["currentVendorPrefix", "proposedVendorPrefix"]) {
        if (typeof entry[field] !== "string" || !/^[A-Za-z][A-Za-z0-9]*$/.test(entry[field])) {
          failures.push(`artifact-prefix-inventory.json: artifacts[${index}].${field} must be a valid prefix`);
        }
      }
      if (!["approved", "unclassified", "review-required"].includes(entry.status)) {
        failures.push(`artifact-prefix-inventory.json: artifacts[${index}].status is invalid`);
      }
      if (typeof entry.buildInput !== "boolean") {
        failures.push(`artifact-prefix-inventory.json: artifacts[${index}].buildInput must be boolean`);
      }
      if (typeof entry.migrationRequired !== "boolean") {
        failures.push(`artifact-prefix-inventory.json: artifacts[${index}].migrationRequired must be boolean`);
      }
    }
  });
  const collisions = prefixInventory.collisions;
  if (!collisions || typeof collisions !== "object" || Array.isArray(collisions)) {
    failures.push("artifact-prefix-inventory.json: collisions must be an object");
  } else {
    for (const [prefix, owners] of Object.entries(collisions)) {
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(prefix)) {
        failures.push("artifact-prefix-inventory.json: collision key must be a valid prefix");
      }
      if (!Array.isArray(owners)) {
        failures.push(`artifact-prefix-inventory.json: collisions.${prefix} must be an array`);
      } else {
        if (new Set(owners).size !== owners.length) {
          failures.push(`artifact-prefix-inventory.json: collisions.${prefix} has duplicate owners`);
        }
        owners.forEach((owner, index) => {
          if (typeof owner !== "string" || owner === "") {
            failures.push(`artifact-prefix-inventory.json: collisions.${prefix}[${index}] must be a non-empty string`);
          }
        });
      }
    }
  }
  const artifact = prefixArtifacts?.find((candidate) => candidate?.consumer === consumer);
  if (!artifact) {
    failures.push(`artifact-prefix-inventory.json: no entry for ${consumer}`);
  } else {
    for (const field of ["currentVendorPrefix", "proposedVendorPrefix"]) {
      if (typeof artifact[field] !== "string" || !/^[A-Za-z][A-Za-z0-9]*$/.test(artifact[field])) {
        failures.push(`${consumer}: ${field} must be a valid prefix`);
      }
    }
    if (artifact.status !== "approved" || artifact.buildInput !== true) {
      failures.push(`${consumer}: prefix entry is review-only; an accepted immutable registry entry is required`);
    }
    if (artifact.migrationRequired) {
      failures.push(`${consumer}: current vendor prefix requires an accepted migration/coexistence contract`);
    }
    const sharedOwners = Array.isArray(collisions?.[artifact.currentVendorPrefix])
      ? collisions[artifact.currentVendorPrefix]
      : [];
    if (sharedOwners.length > 1) {
      failures.push(`${consumer}: vendor prefix ${artifact.currentVendorPrefix} collides with ${sharedOwners.join(", ")}`);
    }
  }
}

if ( ! registryInput ) {
  failures.push("immutable prefix registry: explicit registry path is required");
} else {
  try {
    await execFileAsync(
      process.execPath,
      [
        path.join(scriptDirectory, "validate-protection-artifact-registry.mjs"),
        contentRoot,
        registryInput,
        "artifact-prefix-inventory.json",
      ],
    );
    evidence.push("immutable prefix registry matches artifact inventory");
  } catch (error) {
    let registryReport;
    try {
      registryReport = JSON.parse(error.stdout || "{}");
    } catch {
      registryReport = null;
    }
    const registryFailures = registryReport?.failures || [error.message];
    for (const failure of registryFailures) {
      failures.push(`immutable prefix registry: ${failure}`);
    }
  }
}

const closurePath = path.relative(contentRoot, path.join(pluginRoot, "dev", "closure-review-manifest.json"));
const closure = await readJson(closurePath);
reviewApproval("closure manifest", closure);
const closureCandidates = manifestEntries("closure manifest", closure, "candidatePaths", "candidate paths");
requireApprovedManifest("closure manifest", closure, closureCandidates, "candidate paths");
if (closure) {
  const closureInventory = await readJson(closure.sourceInventory);
  const templateInventory = closure.templateInventory
    ? await readJson(closure.templateInventory)
    : null;
  const literalIncludeFiles = requiredArray(
    "closure inventory: literal include files",
    closureInventory?.literalIncludeClosure?.files,
  );
  const seenLiteralIncludeFiles = new Set();
  literalIncludeFiles.forEach((file, index) => {
    if (typeof file !== "string" || file === "") {
      failures.push(`closure inventory: literal include files[${index}] must be a non-empty string`);
      return;
    }
    if (
      file.includes("\\") ||
      path.posix.normalize(file) !== file ||
      path.posix.isAbsolute(file) ||
      file === ".." ||
      file.startsWith("../")
    ) {
      failures.push(`closure inventory: literal include files[${index}] has unsafe path`);
    }
    if (seenLiteralIncludeFiles.has(file)) {
      failures.push(`closure inventory: duplicate literal include file ${file}`);
    }
    seenLiteralIncludeFiles.add(file);
  });
  const expectedPaths = [
    ...literalIncludeFiles,
    ...resolvedTemplateFiles(templateInventory),
  ];
  requireExactKeys(
    "closure manifest",
    [...new Set(expectedPaths)],
    closureCandidates.map((entry) => entry.path),
  );
  const allowedRoles = new Set([
    "encode",
    "readable-preflight",
    "readable-migration-recovery",
    "readable-third-party",
    "static-public",
  ]);
  if (closureCandidates.some((entry) => !allowedRoles.has(entry.proposedRole))) {
    failures.push("closure manifest: candidate path has missing or invalid role");
  }
}

const settingsPath = path.relative(contentRoot, path.join(pluginRoot, "dev", "settings-ownership-review-manifest.json"));
const settings = await readJson(settingsPath);
reviewApproval("settings ownership manifest", settings);
const settingsCandidates = manifestEntries("settings ownership manifest", settings, "candidateFields", "candidate fields");
requireApprovedManifest("settings ownership manifest", settings, settingsCandidates, "candidate fields");
if (settings) {
  const settingsInventory = await readJson(settings.sourceInventory);
  const settingsPlugins = settingsInventory?.plugins;
  if (!settingsPlugins || typeof settingsPlugins !== "object" || Array.isArray(settingsPlugins)) {
    failures.push("settings inventory: plugins must be an object");
  }
  const settingsConsumer = settingsPlugins && typeof settingsPlugins === "object" && !Array.isArray(settingsPlugins)
    ? settingsPlugins[consumer]
    : null;
  if (!settingsConsumer || typeof settingsConsumer !== "object" || Array.isArray(settingsConsumer)) {
    failures.push("settings inventory: consumer entry is required");
  }
  const settingsFields = settingsConsumer?.fields;
  if (!settingsFields || typeof settingsFields !== "object" || Array.isArray(settingsFields)) {
    failures.push("settings inventory: fields must be an object");
  }
  requireExactKeys(
    "settings ownership manifest",
    Object.keys(settingsFields && typeof settingsFields === "object" && !Array.isArray(settingsFields) ? settingsFields : {}),
    settingsCandidates.map((field) => field.key),
  );
  const missingOwner = settingsCandidates.filter((field) => !field.owner);
  if (missingOwner.length > 0) {
    failures.push(`settings ownership manifest: ${missingOwner.length} candidate fields have no approved owner`);
  }
}

const templatesPath = path.relative(contentRoot, path.join(pluginRoot, "dev", "template-dependency-review.json"));
const templates = await readJson(templatesPath);
reviewApproval("template dependency review", templates);
if (templates) {
  const templateCalls = objectArray("template dependency review: calls", templates.calls);
  const seenCalls = new Set();
  templateCalls.forEach((call, index) => {
    if (
      typeof call.file !== "string" || call.file === "" ||
      typeof call.expression !== "string" || call.expression === "" ||
      (call.literalView !== null && (typeof call.literalView !== "string" || call.literalView === ""))
    ) {
      failures.push(`template dependency review: calls[${index}] has invalid identity`);
    }
    if (
      typeof call.file === "string" &&
      (call.file.includes("\\") || path.posix.normalize(call.file) !== call.file ||
        path.posix.isAbsolute(call.file) || call.file === ".." || call.file.startsWith("../"))
    ) {
      failures.push(`template dependency review: calls[${index}].file has unsafe path`);
    }
    if (
      typeof call.literalView === "string" &&
      (call.literalView.includes("\0") || call.literalView.includes("\\") ||
        path.posix.isAbsolute(call.literalView) || path.posix.normalize(call.literalView) !== call.literalView ||
        call.literalView === ".." || call.literalView.startsWith("../"))
    ) {
      failures.push(`template dependency review: calls[${index}].literalView has unsafe identifier`);
    }
    if (typeof call.literalView === "string") {
      const callKey = `${call.file}:${call.expression}:${call.literalView}`;
      if (seenCalls.has(callKey)) failures.push(`template dependency review: duplicate call ${callKey}`);
      seenCalls.add(callKey);
    }
  });
  for (const [name, value] of blockerEntries("template dependency review", templates.blockers)) {
    if (hasValues(value)) failures.push(`template dependency review: unresolved blocker ${name}`);
  }
  const coverage = templates.externalListenerCoverage;
  if (!coverage || typeof coverage !== "object" || Array.isArray(coverage)) {
    failures.push("template dependency review: externalListenerCoverage must be an object");
  } else if (coverage.status !== "complete") {
    failures.push("template dependency review: external listener coverage is incomplete");
  }
  evidence.push(`${templateCalls.length} template calls inspected`);
}

const hookInventory = await readJson("hook-contract-inventory.json");
if (!hookInventory) {
  failures.push("hook contract inventory: required evidence is missing or unreadable");
} else {
  if (hookInventory.scope?.consumer !== consumer) {
    failures.push("hook contract inventory: consumer mismatch");
  }
  const dynamicDomainPath = path.relative(
    contentRoot,
    path.join(pluginRoot, "dev", "hook-contract-dynamic-domain.json"),
  );
  const dynamicDomain = await readJson(dynamicDomainPath);
  const provenDynamicIdentifiers = new Set();
  if (
    dynamicDomain &&
    dynamicDomain.schema === 1 &&
    dynamicDomain.consumer === consumer &&
    Array.isArray(dynamicDomain.domains)
  ) {
    for (const domain of dynamicDomain.domains) {
      if (Array.isArray(domain.observedIdentifiers)) {
        for (const id of domain.observedIdentifiers) {
          provenDynamicIdentifiers.add(id);
        }
      }
    }
  }
  const contracts = hookInventory.contracts;
  if (!contracts || typeof contracts !== "object" || Array.isArray(contracts)) {
    failures.push("hook contract inventory: contracts must be an object");
  } else {
    const allowedOwnership = new Set([
      "runtime-private",
      "product-public",
      "cross-product",
      "WordPress/third-party",
    ]);
    let unapprovedOwnership = 0;
    let unprovenDynamic = 0;
    for (const [name, contract] of Object.entries(contracts)) {
      if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
        failures.push(`hook contract inventory: contracts.${name} must be an object`);
        continue;
      }
      if (!allowedOwnership.has(contract.ownership)) unapprovedOwnership += 1;
      if (!Array.isArray(contract.matchingFrameworkDynamicProducers)) {
        failures.push(`hook contract inventory: contracts.${name}.matchingFrameworkDynamicProducers must be an array`);
      } else if (contract.matchingFrameworkDynamicProducers.length > 0 && !provenDynamicIdentifiers.has(name)) {
        unprovenDynamic += 1;
      }
    }
    if (unapprovedOwnership > 0) {
      failures.push(`hook contract inventory: ${unapprovedOwnership} contracts have unclassified or unapproved ownership`);
    }
    if (unprovenDynamic > 0) {
      failures.push(`hook contract inventory: ${unprovenDynamic} contracts have unproven dynamic identifier domains`);
    }
  }
}

const serializedReviewPath = path.relative(
  contentRoot,
  path.join(pluginRoot, "dev", "serialized-callback-review-manifest.json"),
);
const serializedReview = await readJson(serializedReviewPath);
reviewApproval("serialized callback review manifest", serializedReview);
if (!serializedReview) {
  failures.push("serialized callback review manifest: required evidence is missing or unreadable");
} else {
  const serializedCandidates = manifestEntries(
    "serialized callback review manifest",
    serializedReview,
    "candidateFindings",
    "candidate findings",
  );
  requireApprovedManifest(
    "serialized callback review manifest",
    serializedReview,
    serializedCandidates,
    "candidate findings",
  );
  serializedCandidates.forEach((finding, index) => {
    if (
      typeof finding.file !== "string" || finding.file === "" ||
      !Number.isInteger(finding.line) || finding.line < 1 ||
      typeof finding.kind !== "string" || finding.kind === "" ||
      typeof finding.operation !== "string" || finding.operation === ""
    ) {
      failures.push(`serialized callback review manifest: candidate findings[${index}] has invalid identity`);
    }
    if (
      typeof finding.file === "string" &&
      (finding.file.includes("\\") || path.posix.normalize(finding.file) !== finding.file ||
        path.posix.isAbsolute(finding.file) || finding.file === ".." || finding.file.startsWith("../"))
    ) {
      failures.push(`serialized callback review manifest: candidate findings[${index}].file has unsafe path`);
    }
  });
  const serializedInventory = await readJson(serializedReview.sourceInventory);
  const serializedFindings = objectArray(
    "serialized callback inventory: findings",
    serializedInventory?.findings,
  );
  const findingKey = (finding) => [finding.file, finding.line, finding.kind, finding.operation].join(":");
  requireExactKeys(
    "serialized callback review manifest",
    serializedFindings.map(findingKey),
    serializedCandidates.map(findingKey),
  );
  const unclassifiedCompatibility = serializedCandidates.filter(
    (finding) => finding.compatibility !== "approved",
  );
  if (unclassifiedCompatibility.length > 0) {
    failures.push(
      `serialized callback review manifest: ${unclassifiedCompatibility.length} candidate findings lack approved compatibility policy`,
    );
  }
}

const report = {
  schema: 1,
  generatedBy: "tools/validate-profile-a-readiness.mjs",
  consumer,
  status: failures.length === 0 ? "ready" : "blocked",
  failures,
  evidence,
  promotionRule: "A Profile A assembler must run this gate before mutation and must reject blocked evidence.",
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
