import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {getRootPath} from "@core/utils";

// Validation function
export function validateConfig(config) {
    if (!config.assetMappings || !Array.isArray(config.assetMappings)) {
        throw new Error('assetMappings must be an array');
    }
    for (const mapping of config.assetMappings) {
        if (!mapping.source || !mapping.destination) {
            throw new Error('Each assetMapping requires source and destination');
        }
        if (typeof mapping.source !== 'string' || typeof mapping.destination !== 'string') {
            throw new Error('source and destination must be strings');
        }
        if (mapping.options && typeof mapping.options !== 'object') {
            throw new Error('options must be an object if present');
        }
    }
}
