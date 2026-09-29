#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const inventoryPath = path.resolve(process.argv[2] || "");
const consumer = process.argv[3] || "";
const failures = [];
const blockers = [];
let inventory = null;

function isSafeRelative(value) {
  return typeof value === "string" && value !== "" &&
    !value.includes("\\") && !path.posix.isAbsolute(value) &&
    path.posix.normalize(value) === value && value !== ".." && !value.startsWith("../");
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(consumer)) {
  process.stderr.write("Invalid consumer slug.\n");
  process.exit(2);
}

try {
  const stat = await fs.lstat(inventoryPath);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("evidence path must be a regular file");
  inventory = JSON.parse(await fs.readFile(inventoryPath, "utf8"));
} catch (error) { failures.push(`inventory is unreadable: ${error.message}`); }

if (inventory) {
  if (inventory.schema !== 1) failures.push("schema must be 1");
  if (inventory.scope?.consumer !== consumer) failures.push("scope.consumer does not match requested consumer");
  if (inventory.policyDecision?.status !== "approved-hybrid-facade") failures.push("policyDecision.status must be approved-hybrid-facade");
  if (!inventory.contracts || typeof inventory.contracts !== "object" || Array.isArray(inventory.contracts)) failures.push("contracts must be an object");
  else for (const [name, contract] of Object.entries(inventory.contracts)) {
    if (!contract || typeof contract !== "object" || Array.isArray(contract)) { failures.push(`contracts.${name} must be an object`); continue; }
    if (!["runtime-private", "product-public", "cross-product", "WordPress/third-party", "unclassified"].includes(contract.ownership)) failures.push(`contracts.${name}.ownership is invalid`);
    if (contract.compatibility !== "frozen-public") failures.push(`contracts.${name}.compatibility must be frozen-public`);
    if (!Array.isArray(contract.consumerListeners) || !Array.isArray(contract.consumerProducers) || !Array.isArray(contract.frameworkProducers) || !Array.isArray(contract.matchingFrameworkDynamicProducers)) failures.push(`contracts.${name} producer/listener arrays are required`);
    for (const [key, entries] of Object.entries(contract)) if (["consumerListeners", "consumerProducers", "frameworkProducers", "matchingFrameworkDynamicProducers"].includes(key) && Array.isArray(entries)) entries.forEach((entry, i) => {
      if (!entry || !isSafeRelative(entry.path) || !Number.isInteger(entry.line) || entry.line < 1 || typeof entry.operation !== "string" || entry.operation === "") failures.push(`contracts.${name}.${key}[${i}] has invalid evidence`);
      if (key === "matchingFrameworkDynamicProducers" && (typeof entry.template !== "string" || typeof entry.matcher !== "string")) failures.push(`contracts.${name}.${key}[${i}] requires template and matcher`);
    });
    if (contract.ownership === "unclassified") blockers.push(`unclassified ownership: ${name}`);
    if (contract.matchingFrameworkDynamicProducers?.length) blockers.push(`dynamic identifier domain requires proof: ${name}`);
  }
}
const report = { schema: 1, status: failures.length ? "blocked" : "valid-review-evidence", promotionReady: false, consumer, blockerCount: blockers.length, blockers, failures };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
