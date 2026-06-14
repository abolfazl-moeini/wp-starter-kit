import { fileURLToPath } from 'node:url';
import { buildStyles } from './esbuild-styles.js';

async function runStylesCli() {
  try {
    await buildStyles();
  } catch (error) {
    console.error('Style hash build failed:', error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runStylesCli();
}
