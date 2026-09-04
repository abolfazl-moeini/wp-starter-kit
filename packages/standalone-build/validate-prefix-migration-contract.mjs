#!/usr/bin/env node

import crypto from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

const input = process.argv[2];
const inventoryInput = process.argv[3];
const proposalInput = process.argv[4];
const failures = [];
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isPrefix = (value) => typeof value === "string" && /^[A-Za-z][A-Za-z0-9]*$/.test(value);
const isPrefixStem = (value) => typeof value === "string" && /^[A-Za-z][A-Za-z0-9]*_$/.test(value);
const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
const isArrayOfStrings = (value) => Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);

async function readEvidence(file, label) {
  if (!file || !path.isAbsolute(file)) {
    failures.push(`${label} path must be absolute`);
    return null;
  }
  try {
    const stat = await lstat(file);
    if (stat.isSymbolicLink()) throw new Error("symlink evidence path is not allowed");
    if (!stat.isFile()) throw new Error("evidence path must be a regular file");
    const bytes = await readFile(file);
    return { value: JSON.parse(bytes.toString("utf8")), digest: crypto.createHash("sha256").update(bytes).digest("hex") };
  } catch (error) {
    failures.push(`${label}: cannot read valid JSON (${error.message})`);
    return null;
  }
}

const contractEvidence = await readEvidence(input, "contract");
const contract = contractEvidence?.value;
const contractIsObject = isObject(contract);
if (!contractIsObject) {
  failures.push("contract must be an object");
}

if (contract?.schema !== 1) failures.push("contract.schema must be 1");
if (contract?.purpose !== "prefix-migration-coexistence-contract") {
  failures.push("contract.purpose must be prefix-migration-coexistence-contract");
}
if (!isNonEmptyString(contract?.consumer)) failures.push("contract.consumer is required");
if (contract?.status !== "review-required") failures.push("contract.status must be review-required");
if (contract?.buildInput !== false) failures.push("contract.buildInput must be false");
for (const field of ["sourceDigest", "toolDigest", "migrationContractDigest"]) {
  if (contractIsObject && field in contract && contract[field] !== null) failures.push(`contract.${field} must be null until immutable acceptance`);
}

const legacy = contract?.legacy;
const target = contract?.target;
if (!legacy || typeof legacy !== "object" || Array.isArray(legacy)) failures.push("contract.legacy must be an object");
if (!target || typeof target !== "object" || Array.isArray(target)) failures.push("contract.target must be an object");
if (!isPrefix(legacy?.vendorPrefix)) failures.push("legacy.vendorPrefix must be a valid prefix");
for (const field of ["vendorPrefix", "runtimePrefix"]) {
  if (!isPrefix(target?.[field])) failures.push(`target.${field} must be a valid prefix`);
}
for (const field of ["classmapPrefix", "constantPrefix"]) {
  if (!isPrefixStem(target?.[field])) failures.push(`target.${field} must be a valid prefix stem`);
}
if (isPrefix(legacy?.vendorPrefix) && isPrefix(target?.vendorPrefix) && legacy.vendorPrefix === target.vendorPrefix) {
  failures.push("target.vendorPrefix must differ from legacy.vendorPrefix");
}

const coexistence = contract?.coexistence;
if (!coexistence || typeof coexistence !== "object" || Array.isArray(coexistence)) {
  failures.push("contract.coexistence must be an object");
} else {
  if (!Array.isArray(coexistence.loadOrders) || !coexistence.loadOrders.includes("legacy-first") || !coexistence.loadOrders.includes("target-first")) {
    failures.push("coexistence.loadOrders must include legacy-first and target-first");
  }
  if (coexistence.legacyPresent !== true) failures.push("coexistence.legacyPresent must be true");
  if (coexistence.duplicateLegacyClaims !== "fail-closed") failures.push("coexistence.duplicateLegacyClaims must be fail-closed");
  if (coexistence.sharedSettings !== "owner-scoped-merge") failures.push("coexistence.sharedSettings must be owner-scoped-merge");
}

const serialization = contract?.serialization;
if (!serialization || typeof serialization !== "object" || Array.isArray(serialization)) {
  failures.push("contract.serialization must be an object");
} else {
  if (!isNonEmptyString(serialization.strategy)) failures.push("serialization.strategy is required");
  if (serialization.unknownPayload !== "non-destructive-stop") failures.push("serialization.unknownPayload must be non-destructive-stop");
  if (!isArrayOfStrings(serialization.frozenFixtures)) failures.push("serialization.frozenFixtures must be a non-empty string array");
}

const publicContracts = contract?.publicContracts;
if (!publicContracts || typeof publicContracts !== "object" || Array.isArray(publicContracts)) {
  failures.push("contract.publicContracts must be an object");
} else {
  if (publicContracts.hooks !== "frozen-public") failures.push("publicContracts.hooks must be frozen-public");
  if (!isNonEmptyString(publicContracts.restNamespace)) failures.push("publicContracts.restNamespace is required");
  if (!isNonEmptyString(publicContracts.storageOption)) failures.push("publicContracts.storageOption is required");
}

const activation = contract?.activationOrdering;
if (!activation || typeof activation !== "object" || Array.isArray(activation)) {
  failures.push("contract.activationOrdering must be an object");
} else {
  for (const field of ["sandbox", "runtime", "standaloneWpdev"]) {
    if (!isNonEmptyString(activation[field])) failures.push(`activationOrdering.${field} is required`);
  }
}

const rollback = contract?.rollback;
if (!rollback || typeof rollback !== "object" || Array.isArray(rollback)) {
  failures.push("contract.rollback must be an object");
} else {
  if (!isNonEmptyString(rollback.policy)) failures.push("rollback.policy is required");
  if (rollback.backupRequired !== true) failures.push("rollback.backupRequired must be true");
  if (rollback.cleanup !== "no-sibling-data-deletion") failures.push("rollback.cleanup must be no-sibling-data-deletion");
}

const tests = contract?.tests;
if (!tests || typeof tests !== "object" || Array.isArray(tests)) {
  failures.push("contract.tests must be an object");
} else {
  for (const field of ["unit", "php74", "e2e"]) {
    if (!isArrayOfStrings(tests[field])) failures.push(`tests.${field} must be a non-empty string array`);
  }
}
if (!isArrayOfStrings(contract?.blockers)) failures.push("contract.blockers must be a non-empty string array");

async function compareReference(file, label) {
  if (!file) return;
  const evidence = await readEvidence(file, label);
  const record = evidence?.value;
  if (!record) return;
  const artifact = Array.isArray(record.artifacts)
    ? record.artifacts.find((candidate) => candidate?.consumer === contract?.consumer || candidate?.slug === contract?.consumer)
    : null;
  if (!artifact) {
    failures.push(`${label}: no artifact matches consumer ${contract?.consumer}`);
    return;
  }
  const expectedVendor = artifact.proposedVendorPrefix ?? artifact.target?.vendorPrefix;
  if (!isPrefix(expectedVendor)) failures.push(`${label}: target vendor prefix is missing or invalid`);
  else if (expectedVendor !== target?.vendorPrefix) failures.push(`${label}: target vendor prefix does not match inventory/proposal`);
  const expectedCurrent = artifact.legacyVendorPrefix ?? artifact.currentVendorPrefix ?? artifact.current?.vendorPrefix;
  if (!isPrefix(expectedCurrent)) failures.push(`${label}: legacy vendor prefix is missing or invalid`);
  else if (expectedCurrent !== legacy?.vendorPrefix) failures.push(`${label}: legacy vendor prefix does not match inventory/proposal`);
}
await compareReference(inventoryInput, "inventory");
await compareReference(proposalInput, "proposal");

const report = {
  schema: 1,
  generatedBy: "tools/validate-prefix-migration-contract.mjs",
  contract: input || null,
  contractDigest: contractEvidence?.digest || null,
  status: failures.length === 0 ? "valid-review-evidence" : "blocked",
  promotionReady: false,
  failures,
  promotionRule: "Migration/coexistence contracts are review evidence only; they never authorize shipped prefix changes or substitute for immutable source/artifact/tool acceptance.",
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
