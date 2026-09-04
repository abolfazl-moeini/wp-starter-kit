import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { promisify } from 'node:util';
import { BuildDag } from '../build-dag-runner.mjs';

const execFileAsync = promisify(execFile);

test('DAG Cancellation: abort signal terminates running child process immediately on sibling failure', async () => {
  const dag = new BuildDag({ concurrency: 2 });
  let childStarted = false;
  let childKilled = false;

  // Node 1: Launches a long-running child process
  dag.addNode('long_task', {
    task: async (results, { signal }) => {
      childStarted = true;
      try {
        await execFileAsync(
          process.execPath,
          ['-e', 'setTimeout(() => console.log("CHILD_FINISHED"), 5000)'],
          { signal }
        );
      } catch (err) {
        if (err.name === 'AbortError' || err.code === 'ABORT_ERR' || err.killed) {
          childKilled = true;
        }
        throw err;
      }
    },
  });

  // Node 2: Fails quickly
  dag.addNode('failing_task', {
    task: async () => {
      await new Promise((r) => setTimeout(r, 50));
      throw new Error('Sibling node intentional failure');
    },
  });

  await assert.rejects(
    async () => {
      await dag.run();
    },
    { message: /Sibling node intentional failure/ }
  );

  assert.equal(childStarted, true, 'Child process should have started');
  assert.equal(childKilled, true, 'Child process must have been killed by abort signal');
});
