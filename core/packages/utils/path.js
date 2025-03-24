import {fileURLToPath} from 'node:url';
import {dirname as nodeDirname, join} from 'node:path';

/**
 * Gets the directory name of a path, with an optional number of levels to go up.
 * Mimics PHP's dirname() with a levels argument.
 * @param {string} path - The input path.
 * @param {number} [levels=1] - Number of parent directories to go up (default: 1).
 * @returns {string} The resulting directory path.
 * @throws {TypeError} If path is not a string or levels is not a positive integer.
 */
export function dirname(path, levels = 1) {
    if (typeof path !== 'string') {
        throw new TypeError('Path must be a string');
    }
    if (!Number.isInteger(levels) || levels < 0) {
        throw new TypeError('Levels must be a non-negative integer');
    }

    let result = path;
    for (let i = 0; i < levels; i++) {
        result = nodeDirname(result);
        // If we reach the root (e.g., '/' or 'C:'), stop
        if (result === '/' || /^[A-Za-z]:\\?$/.test(result)) {
            break;
        }
    }
    return result;
}

/**
 * Gets the absolute path to the monorepo root.
 * @param {ImportMeta} importMeta - The import.meta object from the caller.
 * @returns {string} The root directory path.
 */
export function getRootPath() {

    const __filename = fileURLToPath(import.meta.url);

    return dirname(__filename, 4);
}
