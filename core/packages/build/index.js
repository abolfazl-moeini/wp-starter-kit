import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
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

    if (config.globalMappings !== undefined) {
        if (typeof config.globalMappings !== 'object' || config.globalMappings === null || Array.isArray(config.globalMappings)) {
            throw new Error('globalMappings must be an object');
        }
        for (const [key, value] of Object.entries(config.globalMappings)) {
            if (typeof value !== 'string') {
                throw new Error(`globalMappings["${key}"] must be a string`);
            }
        }
    }

    if (config.styleEntryPoints !== undefined) {
        if (!Array.isArray(config.styleEntryPoints)) {
            throw new Error('styleEntryPoints must be an array');
        }
        for (const entry of config.styleEntryPoints) {
            if (typeof entry !== 'string') {
                throw new Error('Each styleEntryPoint must be a string');
            }
        }
    }
}

export async function readBuildConfig() {
    const configPath = join(getRootPath(), 'build.config.json');

    try {
        const configData = await readFile(configPath, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error('build.config.json not found. Path:' + configPath);
        } else if (error instanceof SyntaxError) {
            throw new Error('build.config.json is malformed or invalid JSON');
        } else {
            throw new Error(`Failed to read build.config.json: ${error.message}`);
        }
    }
}
