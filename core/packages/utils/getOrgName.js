import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getRootPath } from "./path.js";

// Regex to extract the organization name between '@' and the first '/'
const ORG_REGEX = /^@([^/]+)\//;

// Function to extract org name from a package name
function extractOrgName(packageName) {
  const match = packageName.match(ORG_REGEX);
  return match ? match[1] : packageName; // Return org name or full name if no match
}

function getRootPackageNameSync() {
  const rootPackagePath = join(getRootPath(), "package.json");
  const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8"));
  return rootPackage.name;
}

async function getRootPackageName() {
  const rootPackagePath = join(getRootPath(), "package.json");
  const rootPackage = JSON.parse(await readFile(rootPackagePath, "utf8"));
  return rootPackage.name;
}

// Main function to get the organization name
export async function getOrgName() {
  let rootName;

  // Check environment variable first
  if (process.env.ROOT_NAME) {
    rootName = process.env.ROOT_NAME;
  } else {
    // Fallback to reading root package.json (async)
    try {
      rootName = await getRootPackageName();
    } catch (error) {
      throw new Error(`Failed to read root package.json: ${error.message}`);
    }
  }

  return extractOrgName(rootName);
}

// Sync version: prefers ROOT_NAME env, otherwise attempts sync read of package.json
export function getOrgNameSync() {
  if (process.env.ROOT_NAME) {
    return extractOrgName(process.env.ROOT_NAME);
  }
  try {
    const name = getRootPackageNameSync();
    return extractOrgName(name);
  } catch (error) {
    throw new Error(
      `Synchronous org name resolution failed (no ROOT_NAME and could not read package.json): ${error.message}`,
    );
  }
}
