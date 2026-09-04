#!/usr/bin/env node

// Fail-closed validator for proven dynamic hook identifier domains.
//
// A dynamic producer such as `wpdev_field_validate_{$type}` is only a prefix
// match, never an exact proof. This tool verifies that a recorded domain is
// backed by real evidence in the scanned tree before it may be treated as
// proven:
//
//   * every producer site exists and its recorded line really emits the hook
//   * every observed identifier matches the declared matcher
//   * every observed identifier's variable part is really registered
//   * every dynamic hook in the inventory is covered by some proven domain
//   * the residual risk (runtime registration) is stated, never hidden
//
// This is review evidence only. It never promotes an artifact.

import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

const manifestPath = path.resolve(process.argv[2] || "");
const contentRoot = path.resolve(process.argv[3] || "");
const inventoryPath = process.argv[4] ? path.resolve(process.argv[4]) : null;

const failures = [];
const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const nonEmptyString = (v) => typeof v === "string" && v.trim() !== "";

function isSafeRelative(value) {
  return (
    typeof value === "string" &&
    value !== "" &&
    !value.includes("\\") &&
    !value.includes("\0") &&
    !path.posix.isAbsolute(value) &&
    path.posix.normalize(value) === value &&
    value !== "." &&
    value !== ".." &&
    !value.startsWith("../")
  );
}

function safeRelative(value, label) {
  if (!isSafeRelative(value)) {
    failures.push(`${label} must be a safe relative POSIX path`);
    return false;
  }
  const resolved = path.resolve(contentRoot, value);
  if (resolved !== contentRoot && !resolved.startsWith(`${contentRoot}${path.sep}`)) {
    failures.push(`${label} escapes content root`);
    return false;
  }
  return true;
}

async function readRegularFile(relative, label) {
  if (!safeRelative(relative, label)) return null;
  const absolute = path.join(contentRoot, relative);
  try {
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("regular non-symlink file required");
    return await readFile(absolute, "utf8");
  } catch (error) {
    failures.push(`${label} (${relative}): ${error.message}`);
    return null;
  }
}

// Split a template into its literal prefix and literal suffix around the first
// placeholder. A template may carry a suffix, so stripping only the prefix
// would leave a wrong variable part:
//   `wpdev_field_validate_{$type}` -> prefix `wpdev_field_validate_`, suffix ``
//   `wpdev_{$id}_form_fields`      -> prefix `wpdev_`,             suffix `_form_fields`
function splitTemplate(template) {
  const open = template.indexOf("{");
  if (open === -1) return { prefix: template, suffix: "" };
  const close = template.indexOf("}", open);
  if (close === -1) return { prefix: template.slice(0, open), suffix: "" };
  return { prefix: template.slice(0, open), suffix: template.slice(close + 1) };
}

const HOOK_CALLS = ["apply_filters", "do_action", "apply_filters_ref_array", "do_action_ref_array"];

let manifest = null;
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (error) {
  failures.push(`manifest is unreadable: ${error.message}`);
}

let inventory = null;
if (inventoryPath) {
  try {
    inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  } catch (error) {
    failures.push(`inventory is unreadable: ${error.message}`);
  }
}

const provenIdentifiers = new Set();

if (manifest) {
  if (manifest.schema !== 1) failures.push("schema must be 1");
  if (manifest.purpose !== "hook-contract-dynamic-domain") failures.push("purpose must be hook-contract-dynamic-domain");
  if (!nonEmptyString(manifest.consumer)) failures.push("consumer must be a non-empty string");

  if (!Array.isArray(manifest.domains) || manifest.domains.length === 0) {
    failures.push("domains must be a non-empty array");
  } else {
    for (const [index, domain] of manifest.domains.entries()) {
      const label = `domains[${index}]`;
      if (!object(domain)) {
        failures.push(`${label} must be an object`);
        continue;
      }

      const template = domain.template;
      if (!nonEmptyString(template)) failures.push(`${label}.template must be a non-empty string`);

      // --- matcher -------------------------------------------------------
      let matcher = null;
      if (!nonEmptyString(domain.matcher)) {
        failures.push(`${label}.matcher must be a non-empty string`);
      } else {
        try {
          matcher = new RegExp(domain.matcher);
        } catch (error) {
          failures.push(`${label}.matcher is not a valid regular expression: ${error.message}`);
        }
      }

      // --- producers -----------------------------------------------------
      if (!Array.isArray(domain.producers) || domain.producers.length === 0) {
        failures.push(`${label}.producers must be a non-empty array`);
      } else {
        for (const [pIndex, producer] of domain.producers.entries()) {
          const pLabel = `${label}.producers[${pIndex}]`;
          if (!object(producer)) {
            failures.push(`${pLabel} must be an object`);
            continue;
          }
          if (!Number.isInteger(producer.line) || producer.line < 1) {
            failures.push(`${pLabel}.line must be a positive integer`);
            continue;
          }
          const source = await readRegularFile(producer.path, `${pLabel}.path`);
          if (source === null) continue;

          const lines = source.split(/\r?\n/);
          const line = lines[producer.line - 1];
          if (line === undefined) {
            failures.push(`${pLabel}: line ${producer.line} is past end of file`);
            continue;
          }
          const parts = splitTemplate(nonEmptyString(template) ? template : "");
          if (!line.includes(parts.prefix) || !line.includes(parts.suffix)) {
            failures.push(`${pLabel}: line ${producer.line} does not emit template ${template}`);
          }
          if (!HOOK_CALLS.some((call) => line.includes(call))) {
            failures.push(`${pLabel}: line ${producer.line} is not a WordPress hook call`);
          }
        }
      }

      // --- registration enumeration --------------------------------------
      const enumeration = domain.registrationEnumeration;
      if (!object(enumeration)) {
        failures.push(`${label}.registrationEnumeration must be an object`);
      } else {
        if (!nonEmptyString(enumeration.pattern)) failures.push(`${label}.registrationEnumeration.pattern must be a non-empty string`);
        const registrySource = await readRegularFile(enumeration.path, `${label}.registrationEnumeration.path`);
        if (!Array.isArray(enumeration.identifiers) || enumeration.identifiers.length === 0) {
          failures.push(`${label}.registrationEnumeration.identifiers must be a non-empty array`);
        } else {
          const registered = new Set();
          enumeration.identifiers.forEach((identifier, iIndex) => {
            const iLabel = `${label}.registrationEnumeration.identifiers[${iIndex}]`;
            if (!nonEmptyString(identifier)) {
              failures.push(`${iLabel} must be a non-empty string`);
              return;
            }
            registered.add(identifier);
            if (registrySource !== null && !registrySource.includes(identifier)) {
              failures.push(`${iLabel} (${identifier}) is not registered in ${enumeration.path}`);
            }
          });

          // --- observed identifiers ------------------------------------
          if (!Array.isArray(domain.observedIdentifiers) || domain.observedIdentifiers.length === 0) {
            failures.push(`${label}.observedIdentifiers must be a non-empty array`);
          } else {
            const parts = splitTemplate(nonEmptyString(template) ? template : "");
            domain.observedIdentifiers.forEach((identifier, oIndex) => {
              const oLabel = `${label}.observedIdentifiers[${oIndex}]`;
              if (!nonEmptyString(identifier)) {
                failures.push(`${oLabel} must be a non-empty string`);
                return;
              }
              if (matcher && !matcher.test(identifier)) {
                failures.push(`${oLabel} (${identifier}) is outside the declared domain ${domain.matcher}`);
                return;
              }
              if (!identifier.startsWith(parts.prefix)) {
                failures.push(`${oLabel} (${identifier}) does not start with the literal template prefix ${parts.prefix}`);
                return;
              }
              if (parts.suffix !== "" && !identifier.endsWith(parts.suffix)) {
                failures.push(`${oLabel} (${identifier}) does not end with the literal template suffix ${parts.suffix}`);
                return;
              }
              // Strip the literal prefix AND suffix; what remains is the
              // placeholder value that must be really registered.
              const withoutPrefix = identifier.slice(parts.prefix.length);
              const variablePart =
                parts.suffix === "" ? withoutPrefix : withoutPrefix.slice(0, withoutPrefix.length - parts.suffix.length);
              if (!registered.has(variablePart)) {
                failures.push(`${oLabel} (${identifier}) has variable part "${variablePart}" that is not enumerated`);
                return;
              }
              provenIdentifiers.add(identifier);
            });
          }
        }
      }

      // --- honest residual risk ------------------------------------------
      if (!nonEmptyString(domain.residualRisk)) {
        failures.push(`${label}.residualRisk must state the remaining runtime risk`);
      }
    }
  }
}

// --- cross-check: every dynamic inventory hook must be proven --------------
if (inventory) {
  if (inventory.scope?.consumer !== manifest?.consumer) {
    failures.push("inventory scope.consumer does not match the manifest consumer");
  }
  const contracts = inventory.contracts;
  if (!object(contracts)) {
    failures.push("inventory.contracts must be an object");
  } else {
    for (const [name, contract] of Object.entries(contracts)) {
      const dynamic = contract?.matchingFrameworkDynamicProducers;
      if (!Array.isArray(dynamic) || dynamic.length === 0) continue;
      if (!provenIdentifiers.has(name)) {
        failures.push(`inventory hook ${name} is dynamic but has no proven identifier domain`);
      }
    }
  }
}

const report = {
  schema: 1,
  generatedBy: "tools/validate-hook-contract-dynamic-domain.mjs",
  status: failures.length ? "blocked" : "valid-review-evidence",
  promotionReady: false,
  consumer: manifest?.consumer ?? null,
  provenIdentifiers: [...provenIdentifiers].sort(),
  failures,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
