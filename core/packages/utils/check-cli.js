import { fileURLToPath } from 'node:url';
import { checkProject } from './check.js';

function runCheckCli() {
  const issues = checkProject();

  if (issues.length > 0) {
    const msg = issues.join('\n  - ');
    console.error('Check failed:\n  - ' + msg);
    process.exit(1);
  }

  console.log('Check passed.');
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCheckCli();
}