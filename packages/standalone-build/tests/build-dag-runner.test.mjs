import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test from "node:test";
import { promisify } from "node:util";
import { BuildDag, pLimit } from "../build-dag-runner.mjs";

const execFileAsync = promisify(execFile);

test("pLimit: enforces maximum concurrent task limit", async () => {
  const limit = pLimit(2);
  let active = 0;
  let maxActive = 0;

  const tasks = Array.from({ length: 6 }, (_, i) =>
    limit(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 15));
      active--;
      return i;
    })
  );

  const results = await Promise.all(tasks);
  assert.deepEqual(results, [0, 1, 2, 3, 4, 5]);
  assert.equal(maxActive, 2, "Max concurrent executions must not exceed 2");
});

test("Build DAG: executes independent nodes concurrently and dependent nodes in order", async () => {
  const dag = new BuildDag({ concurrency: 2 });
  const timeline = [];

  dag.addNode("stepA", {
    task: async () => {
      timeline.push("startA");
      timeline.push("endA");
      return "resA";
    },
  });

  dag.addNode("stepB", {
    dependencies: ["stepA"],
    task: async (prev) => {
      timeline.push("startB");
      assert.equal(prev.stepA, "resA");
      timeline.push("endB");
      return "resB";
    },
  });

  const results = await dag.run();
  assert.deepEqual(results, { stepA: "resA", stepB: "resB" });
  assert.equal(timeline[0], "startA");
  assert.equal(timeline[2], "startB");
});

test("Build DAG: rejects graph with cycle or unknown dependency", async () => {
  const cyclicDag = new BuildDag();
  cyclicDag.addNode("nodeA", { dependencies: ["nodeB"], task: async () => {} });
  cyclicDag.addNode("nodeB", { dependencies: ["nodeA"], task: async () => {} });

  await assert.rejects(async () => {
    await cyclicDag.run();
  }, /Cycle detected/);

  const unknownDepDag = new BuildDag();
  unknownDepDag.addNode("node1", { dependencies: ["ghostNode"], task: async () => {} });
  await assert.rejects(async () => {
    await unknownDepDag.run();
  }, /depends on unknown node/);
});

test("pLimit: enforces maximum concurrent task limit for concurrency=1 and concurrency=2", async () => {
  // Test concurrency = 1
  const limit1 = pLimit(1);
  let active1 = 0;
  let maxActive1 = 0;
  await Promise.all(
    Array.from({ length: 4 }, () =>
      limit1(async () => {
        active1++;
        maxActive1 = Math.max(maxActive1, active1);
        await new Promise((r) => setTimeout(r, 10));
        active1--;
      })
    )
  );
  assert.equal(maxActive1, 1, "Max active with concurrency=1 must be exactly 1");

  // Test concurrency = 2
  const limit2 = pLimit(2);
  let active2 = 0;
  let maxActive2 = 0;
  await Promise.all(
    Array.from({ length: 4 }, () =>
      limit2(async () => {
        active2++;
        maxActive2 = Math.max(maxActive2, active2);
        await new Promise((r) => setTimeout(r, 10));
        active2--;
      })
    )
  );
  assert.equal(maxActive2, 2, "Max active with concurrency=2 must be exactly 2");
});

test("Build DAG: safely clamps 0, negative, NaN, and huge concurrency values", () => {
  const dag0 = new BuildDag({ concurrency: 0 });
  assert.equal(dag0.concurrency, 1, "0 must clamp to 1");

  const dagNeg = new BuildDag({ concurrency: -5 });
  assert.equal(dagNeg.concurrency, 1, "Negative numbers must clamp to 1");

  const dagNaN = new BuildDag({ concurrency: NaN });
  assert.equal(dagNaN.concurrency, 1, "NaN must clamp to 1");

  const dagHuge = new BuildDag({ concurrency: 9999 });
  assert.equal(dagHuge.concurrency, 32, "Huge numbers must clamp to 32");
});

test("Build DAG: cancels dependent nodes immediately upon failure (fail-fast)", async () => {
  const dag = new BuildDag({ concurrency: 2 });

  dag.addNode("failNode", {
    task: async () => {
      throw new Error("Deliberate task failure");
    },
  });

  dag.addNode("dependentNode", {
    dependencies: ["failNode"],
    task: async () => {
      return "should_not_run";
    },
  });

  let threw = false;
  try {
    await dag.run();
  } catch (err) {
    threw = true;
    assert.ok(err.message.includes("Deliberate task failure"));
  }

  assert.equal(threw, true, "DAG must reject on node failure");
  assert.equal(dag.nodes.get("dependentNode").status, "cancelled", "Dependent node must be cancelled");
});

test("Build DAG: aborts and settles running child processes before rejecting", async () => {
  const dag = new BuildDag({ concurrency: 2 });
  let childSettled = false;

  dag.addNode("child", {
    task: async (_results, { signal }) => {
      try {
        await execFileAsync(process.execPath, ["-e", "setTimeout(() => {}, 5000)"], { signal });
      } finally {
        childSettled = true;
      }
    },
  });
  dag.addNode("failure", {
    task: async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      throw new Error("cancel-child");
    },
  });

  const startedAt = Date.now();
  await assert.rejects(dag.run(), /cancel-child/);
  assert.equal(childSettled, true, "DAG must not reject while a sibling child process is still running");
  assert.ok(Date.now() - startedAt < 1500, "AbortSignal must terminate the child promptly");
  assert.equal(dag.nodes.get("child").status, "cancelled");
});
