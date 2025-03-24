import { readFile } from 'node:fs/promises';
import { join} from 'node:path';
import {getRootPath} from "./path.js";

// Regex to extract the organization name between '@' and the first '/'
const ORG_REGEX = /^@([^/]+)\//;

// Function to extract org name from a package name
function extractOrgName(packageName) {
    const match = packageName.match(ORG_REGEX);
    return match ? match[1] : packageName; // Return org name or full name if no match
}

// Main function to get the organization name
export async function getOrgName() {
    let rootName;

    //  Check environment variable first
    if (process.env.ROOT_NAME) {
        rootName = process.env.ROOT_NAME;
    } else {
        // Fallback to reading root package.json
        try {
            const rootPackagePath = join(getRootPath(), './package.json');
            const rootPackage = JSON.parse(await readFile(rootPackagePath, 'utf8'));
            rootName = rootPackage.name;
        } catch (error) {
            throw new Error(`Failed to read root package.json: ${error.message}`);
        }
    }

    // Step 3: Extract organization name with regex
    return extractOrgName(rootName);
}

// Export a sync version for convenience (only works with env var)
export function getOrgNameSync() {
    if (process.env.ROOT_NAME) {
        return extractOrgName(process.env.ROOT_NAME);
    }
    throw new Error('Synchronous mode requires ROOT_NAME environment variable');
}
