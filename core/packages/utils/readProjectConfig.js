import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED_FIELDS = [
  'slug',
  'globalName',
  'localizeVar',
  'textDomain',
  'hookPrefix',
  'npmScope',
];

const OPTIONAL_DEFAULTS = {
  phpFunctionPrefix: 'wpsk_',
  uiFramework: 'preact',
};

export function readProjectConfig(options = {}) {
  const configPath = options.path || join(process.cwd(), 'project.config.json');

  let raw;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`project.config.json not found at: ${configPath}`);
    }
    throw new Error(`Failed to read project.config.json: ${error.message}`);
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new Error(`project.config.json is malformed or invalid JSON at: ${configPath}`);
  }

  if (!config || typeof config !== 'object') {
    throw new Error('project.config.json must contain a JSON object');
  }

  const missing = REQUIRED_FIELDS.filter((f) => !config[f]);
  if (missing.length) {
    throw new Error(
      `project.config.json missing required fields: ${missing.join(', ')}. ` +
      `Required: ${REQUIRED_FIELDS.join(', ')}`,
    );
  }

  const defaults = {
    ...OPTIONAL_DEFAULTS,
    depsBundle: `${config.slug}-deps.js`,
  };

  return { ...defaults, ...config };
}
