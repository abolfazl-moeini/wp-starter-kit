import { spawn } from 'node:child_process';

/**
 * List of npm script names that constitute the full build pipeline.
 * Order in this array is the canonical "build pipeline" order; when the
 * orchestrator is invoked sequentially (`release` script), entries run
 * left-to-right. When invoked in parallel (`build` script via
 * `npm-run-all --parallel`), order is irrelevant because the four scripts
 * do not share intermediate state at the file-system level.
 */
export const SUB_BUILDERS = Object.freeze([
  'build:dependencies',
  'build:components',
  'build:styles',
  'build:assets',
]);

/**
 * Spawn a single npm script as a child process. Resolves on exit 0,
 * rejects on non-zero exit or spawn error.
 *
 * @param {string} scriptName  npm script (e.g. 'build:dependencies').
 * @param {object} [options]
 * @param {string} [options.cwd]   Working directory for the child.
 * @param {boolean} [options.captureStdout=false]  If true, accumulate stdout
 *   into the resolved result.
 * @returns {Promise<{status: number, stdout: string, stderr: string}>}
 */
export function _runScript(scriptName, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', scriptName], {
      cwd: options.cwd ?? process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      const s = chunk.toString();
      stdout += s;
      if (!options.captureStdout) {
        process.stdout.write(s);
      }
    });
    child.stderr?.on('data', (chunk) => {
      const s = chunk.toString();
      stderr += s;
      process.stderr.write(s);
    });

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ status: 0, stdout, stderr });
      } else {
        reject(new Error(`npm script ${scriptName} exited with code ${code}`));
      }
    });
  });
}

/**
 * Run all four sub-builders in parallel. Rejects as soon as any one fails.
 *
 * @param {object} [options]
 * @param {string} [options.cwd]  Working directory for the sub-builders.
 * @param {string[]} [options.builders]  Override the list of sub-builders
 *   (defaults to SUB_BUILDERS).
 * @returns {Promise<{results: object[], failures: string[]}>}
 */
export async function runBuildAll(options = {}) {
  const cwd = options.cwd;
  const builders = options.builders ?? SUB_BUILDERS;

  const settled = await Promise.allSettled(
    builders.map((name) => _runScript(name, { cwd })),
  );

  const results = [];
  const failures = [];
  settled.forEach((s, i) => {
    const name = builders[i];
    if (s.status === 'fulfilled') {
      results.push({ name, ...s.value });
    } else {
      failures.push(name);
    }
  });

  if (failures.length > 0) {
    const err = new Error(
      `build-all: ${failures.length} sub-builder(s) failed: ${failures.join(', ')}`,
    );
    err.failures = failures;
    err.results = results;
    throw err;
  }

  return { results, failures };
}

// CLI entry: only run when this file is the main module.
// We use a JEST_WORKER_ID guard (set by jest) to avoid running the side
// effect when this file is imported by tests, and a best-effort argv check
// to confirm this is the entry point. babel-jest does not transform
// `import.meta` so we cannot use the standard fileURLToPath(import.meta.url)
// check inside the test environment.
if (!process.env.JEST_WORKER_ID) {
  const invokedDirectly = process.argv[1] && process.argv[1].endsWith('build-all.js');
  if (invokedDirectly) {
    runBuildAll().catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
  }
}
