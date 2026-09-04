#!/usr/bin/env node

/**
 * Validate Theme Panel settings ownership evidence without approving it.
 *
 * This is intentionally a review-only report. It never changes the manifest,
 * turns buildInput on, or returns promotionReady=true.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const failures = [];
const evidence = [];
const blockers = [];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSafeRelative(value) {
  return typeof value === "string" && value !== "" &&
    !value.includes("\\") && !path.posix.isAbsolute(value) &&
    path.posix.normalize(value) === value && value !== ".." && !value.startsWith("../");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function equal(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

async function readRegularJson(file, label) {
  try {
    const stat = await fs.lstat(file);
    if (stat.isSymbolicLink()) throw new Error("symlink evidence path is not allowed");
    if (!stat.isFile()) throw new Error("evidence path must be a regular file");
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    failures.push(`${label}: cannot read valid JSON (${error.message})`);
    return null;
  }
}

async function resolveConsumerRoot() {
  const defaultRelative = `plugins/${consumer}`;
  const map = await readRegularJson(
    path.join(contentRoot, "protection-consumer-source-map.json"),
    "consumer source map",
  );
  let relative = defaultRelative;
  if (map) {
    if (map.schema !== 1 || !isPlainObject(map.consumers)) {
      failures.push("consumer source map: schema 1 and a consumers object are required");
    } else if (Object.hasOwn(map.consumers, consumer)) {
      relative = map.consumers[consumer];
    }
  }
  if (!isSafeRelative(relative) || !relative.startsWith("plugins/")) {
    failures.push(`consumer source map: unsafe source path for ${consumer}`);
    relative = defaultRelative;
  }
  const root = path.join(contentRoot, relative);
  try {
    const stat = await fs.lstat(root);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("consumer source must be a regular directory");
  } catch (error) {
    failures.push(`consumer source map: cannot resolve ${consumer} (${error.message})`);
  }
  return { relative, root };
}

function validateReviewApproval(approval) {
  if (approval === undefined) {
    blockers.push("manifest: explicit human reviewApproval metadata is missing");
    return;
  }
  if (!isPlainObject(approval)) {
    failures.push("manifest: reviewApproval must be an object");
    return;
  }
  if (approval.schema !== 1) failures.push("manifest: reviewApproval.schema must be 1");
  if (typeof approval.approver !== "string" || approval.approver === "") {
    failures.push("manifest: reviewApproval.approver must be a non-empty string");
  }
  if (typeof approval.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(approval.date)) {
    failures.push("manifest: reviewApproval.date must be an ISO date");
  }
  if (approval.accurateList !== true) failures.push("manifest: reviewApproval.accurateList must be true");
  if (typeof approval.scope !== "string" || approval.scope === "") {
    failures.push("manifest: reviewApproval.scope must be a non-empty string");
  }
  if (!Array.isArray(approval.limitations) || approval.limitations.length === 0) {
    failures.push("manifest: reviewApproval.limitations must be a non-empty array");
  }
  if (approval.promotionImpact !== "review-only") {
    failures.push("manifest: reviewApproval.promotionImpact must be review-only");
  }
}

function validateFieldEntry(entry, index, inventoryFields, approved = false) {
  if (!isPlainObject(entry)) {
    failures.push(`manifest: candidateFields[${index}] must be an object`);
    return null;
  }
  if (typeof entry.key !== "string" || entry.key === "") {
    failures.push(`manifest: candidateFields[${index}].key must be a non-empty string`);
    return null;
  }
  if (!Object.hasOwn(inventoryFields, entry.key)) {
    failures.push(`manifest: candidateFields[${index}].key is not in source inventory`);
  }
  if (typeof entry.owner !== "string" || entry.owner === "") {
    failures.push(`manifest: candidateFields[${index}].owner must be a non-empty string`);
  } else if (entry.owner !== consumer && entry.owner !== "shared") {
    failures.push(`manifest: candidateFields[${index}].owner must be ${consumer} or shared`);
  }
  if (approved) {
    if (entry.status !== "approved") {
      failures.push(`manifest: candidateFields[${index}].status must be approved`);
    }
  } else if (entry.status !== "unclassified" && entry.status !== "review-required") {
    failures.push(`manifest: candidateFields[${index}].status must remain unclassified or review-required`);
  }
  if (!isPlainObject(entry.evidence)) {
    failures.push(`manifest: candidateFields[${index}].evidence must be an object`);
    return entry.key;
  }
  for (const evidenceName of ["registeredBy", "directAccess"]) {
    if (!Array.isArray(entry.evidence[evidenceName]) || entry.evidence[evidenceName].some((value) => !isSafeRelative(value))) {
      failures.push(`manifest: candidateFields[${index}].evidence.${evidenceName} must contain safe relative paths`);
    }
  }
  if (Array.isArray(inventoryFields[entry.key])) {
    for (const evidenceName of ["registeredBy"]) {
      if (!equal(entry.evidence[evidenceName], inventoryFields[entry.key])) {
        failures.push(`manifest: candidateFields[${index}].evidence.${evidenceName} does not match source inventory`);
      }
    }
  }
  return entry.key;
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(consumer)) {
  process.stderr.write("Invalid consumer slug.\n");
  process.exit(2);
}

const consumerSource = await resolveConsumerRoot();
const inventory = await readRegularJson(
  path.join(contentRoot, "settings-field-inventory.json"),
  "inventory",
);
const manifest = await readRegularJson(
  path.join(consumerSource.root, "dev", "settings-ownership-review-manifest.json"),
  "manifest",
);

let inventoryFields = {};
let inventoryConsumer = null;
if (inventory) {
  if (inventory.schema !== 1) failures.push("inventory: schema must be 1");
  if (typeof inventory.storage !== "string" || inventory.storage === "") failures.push("inventory: storage is required");
  if (!isPlainObject(inventory.plugins)) {
    failures.push("inventory: plugins must be an object");
  } else {
    inventoryConsumer = inventory.plugins[consumer];
    if (!isPlainObject(inventoryConsumer)) failures.push("inventory: consumer entry is required");
    else {
      if (inventoryConsumer.storage !== inventory.storage) failures.push("inventory: consumer storage must match inventory storage");
      if (!isPlainObject(inventoryConsumer.fields)) failures.push("inventory: consumer fields must be an object");
      else inventoryFields = inventoryConsumer.fields;
    }
  }
  if (!isPlainObject(inventory.collisions)) failures.push("inventory: collisions must be an object");
  if (typeof inventory.unresolved !== "string" || inventory.unresolved === "") failures.push("inventory: unresolved scope must be a non-empty string");
}

let manifestKeys = [];
let isApproved = false;
if (manifest) {
  if (manifest.schema !== 1) failures.push("manifest: schema must be 1");
  if (manifest.consumer !== consumer) failures.push("manifest: consumer does not match requested consumer");
  isApproved = manifest.status === "approved";
  if (manifest.status !== "review-required" && !isApproved) {
    failures.push("manifest: status must be review-required or approved");
  }
  if (isApproved) {
    if (manifest.buildInput !== true) failures.push("manifest: buildInput must be true");
  } else if (manifest.buildInput !== false) {
    failures.push("manifest: buildInput must be false for review evidence");
  }
  if (manifest.storage !== inventory?.storage || manifest.storage !== inventoryConsumer?.storage) {
    failures.push("manifest: storage must match source inventory");
  }
  validateReviewApproval(manifest.reviewApproval);

  if (!isSafeRelative(manifest.sourceInventory)) {
    failures.push("manifest: sourceInventory must be a safe relative path");
  } else if (manifest.sourceInventory !== "settings-field-inventory.json") {
    failures.push("manifest: sourceInventory must reference settings-field-inventory.json");
  }

  if (!Array.isArray(manifest.candidateFields)) {
    failures.push("manifest: candidateFields must be an array");
  } else {
    manifestKeys = manifest.candidateFields.map((entry, index) => validateFieldEntry(entry, index, inventoryFields, isApproved));
    const keys = manifestKeys.filter((key) => typeof key === "string");
    if (new Set(keys).size !== keys.length) failures.push("manifest: candidateFields contains duplicate keys");
    if (!equal(keys, Object.keys(inventoryFields))) failures.push("manifest: candidateFields does not exactly match source inventory");
  }

  if (!isPlainObject(manifest.blockers)) {
    failures.push("manifest: blockers must be an object");
  } else {
    const expectedUnregistered = Object.entries(inventoryConsumer?.directAccess || {})
      .filter(([key]) => !Object.hasOwn(inventoryFields, key))
      .map(([key, access]) => ({ key, access: [...access].sort() }));
    if (!equal(manifest.blockers.literalCrossProductCollisions, inventory.collisions)) {
      failures.push("manifest: literalCrossProductCollisions does not match source inventory");
    }
    if (!equal(manifest.blockers.directAccessWithoutRegistration, expectedUnregistered)) {
      failures.push("manifest: directAccessWithoutRegistration does not match source inventory");
    }
    if (isApproved) {
      if (manifest.blockers.unresolvedInventoryScope !== null && manifest.blockers.unresolvedInventoryScope !== undefined && manifest.blockers.unresolvedInventoryScope !== "") {
        failures.push("manifest: unresolvedInventoryScope must be null or resolved for approved manifest");
      }
    } else if (typeof manifest.blockers.unresolvedInventoryScope !== "string" || manifest.blockers.unresolvedInventoryScope !== inventory.unresolved) {
      failures.push("manifest: unresolvedInventoryScope does not match source inventory");
    }
  }
  if (!Array.isArray(manifest.promotionRules) || !manifest.promotionRules.some((rule) => typeof rule === "string" && rule.includes("unknown sibling keys"))) {
    failures.push("manifest: mixed-version unknown-sibling preservation rule is required");
  }
}

if (!isApproved) {
  if (typeof inventory?.unresolved === "string" && inventory.unresolved !== "") blockers.push(inventory.unresolved);
  if (isPlainObject(inventory?.collisions) && Object.keys(inventory.collisions).length > 0) blockers.push("inventory: literal cross-product collisions require review");
  if (manifest && isPlainObject(manifest.blockers) && Array.isArray(manifest.blockers.directAccessWithoutRegistration) && manifest.blockers.directAccessWithoutRegistration.length > 0) {
    blockers.push("manifest: direct access without registration requires review");
  }
}

const report = {
  status: failures.length > 0 ? "blocked" : "valid-review-evidence",
  promotionReady: false,
  consumer,
  fieldCounts: {
    inventory: Object.keys(inventoryFields).length,
    manifest: manifestKeys.filter((key) => typeof key === "string").length,
    matched: failures.some((failure) => failure.includes("candidateFields does not exactly match")) ? 0 :
      Math.min(Object.keys(inventoryFields).length, manifestKeys.filter((key) => typeof key === "string").length),
  },
  blockers: [...new Set(blockers)],
  failures,
  evidence,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
