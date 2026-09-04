#!/usr/bin/env node

/**
 * Build DAG Execution Engine
 *
 * Provides explicit node dependency graph execution with concurrency control,
 * fail-fast cancellation, and deterministic ordering.
 */

import os from "node:os";

export function pLimit(concurrency) {
  const safeConcurrency = Math.max(1, Math.min(isNaN(concurrency) ? 4 : concurrency, 32));
  const queue = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const item = queue.shift();
      item();
    }
  };

  const run = async (fn, resolve, reject, args) => {
    activeCount++;
    try {
      resolve(await fn(...args));
    } catch (err) {
      reject(err);
    } finally {
      next();
    }
  };

  const enqueue = (fn, resolve, reject, args) => {
    queue.push(run.bind(null, fn, resolve, reject, args));
    if (activeCount < safeConcurrency && queue.length > 0) {
      const item = queue.shift();
      item();
    }
  };

  const generator = (fn, ...args) => new Promise((resolve, reject) => enqueue(fn, resolve, reject, args));
  generator.activeCount = () => activeCount;
  generator.pendingCount = () => queue.length;
  generator.concurrency = safeConcurrency;
  generator.clearQueue = () => {
    queue.length = 0;
  };
  return generator;
}

export class BuildDag {
  constructor(options = {}) {
    this.nodes = new Map();
    const raw = typeof options.concurrency === "number" ? options.concurrency : parseInt(options.concurrency, 10);
    this.concurrency = Number.isFinite(raw) ? Math.max(1, Math.min(raw, 32)) : 1;
    this.abortController = new AbortController();
  }

  addNode(id, { task, dependencies = [], label = id }) {
    if (!id || typeof id !== "string") {
      throw new Error("DAG node id must be a non-empty string");
    }
    if (this.nodes.has(id)) {
      throw new Error(`Duplicate DAG node id: '${id}'`);
    }
    if (typeof task !== "function") {
      throw new Error(`Task for node '${id}' must be a function`);
    }
    this.nodes.set(id, {
      id,
      label,
      task,
      dependencies: new Set(dependencies),
      status: "pending",
      result: null,
      error: null,
    });
    return this;
  }

  validateGraph() {
    // 1. Check for unknown dependencies
    for (const [id, node] of this.nodes) {
      for (const dep of node.dependencies) {
        if (!this.nodes.has(dep)) {
          throw new Error(`DAG node '${id}' depends on unknown node '${dep}'`);
        }
      }
    }

    // 2. Check for cycles using DFS
    const visited = new Map(); // id -> 0: unvisited, 1: visiting, 2: visited
    const checkCycle = (id, path = []) => {
      const state = visited.get(id) || 0;
      if (state === 1) {
        throw new Error(`Cycle detected in DAG: ${[...path, id].join(" -> ")}`);
      }
      if (state === 2) return;

      visited.set(id, 1);
      const node = this.nodes.get(id);
      for (const dep of node.dependencies) {
        checkCycle(dep, [...path, id]);
      }
      visited.set(id, 2);
    };

    for (const id of this.nodes.keys()) {
      checkCycle(id);
    }
  }

  async run() {
    this.validateGraph();
    this.abortController = new AbortController();
    for (const node of this.nodes.values()) {
      node.status = "pending";
      node.result = null;
      node.error = null;
    }
    let activeWorkers = 0;
    let hasFailure = false;
    let firstError = null;
    const completed = new Set();
    const running = new Set();
    const results = {};

    return new Promise((resolve, reject) => {
      const schedule = () => {
        if (hasFailure) {
          // Do not let the caller start a retry while aborted siblings are still
          // running and potentially writing the same outputs.
          if (activeWorkers === 0) {
            reject(firstError || new Error("Build DAG execution failed"));
          }
          return;
        }

        // Check if all nodes are done
        const allDone = Array.from(this.nodes.values()).every(
          (n) => n.status === "completed" || n.status === "cancelled" || n.status === "failed"
        );
        if (allDone) {
          if (hasFailure) {
            reject(new Error("Build DAG execution failed"));
          } else {
            resolve(results);
          }
          return;
        }

        // Check for deadlock (pending nodes with no progress and no workers)
        const pendingNodes = Array.from(this.nodes.values()).filter((n) => n.status === "pending");
        const eligibleNodes = pendingNodes.filter((node) =>
          Array.from(node.dependencies).every((dep) => completed.has(dep))
        );

        if (eligibleNodes.length === 0 && running.size === 0 && pendingNodes.length > 0) {
          hasFailure = true;
          this.abortController.abort();
          reject(new Error(`DAG deadlock: ${pendingNodes.length} pending nodes have unsatisfied dependencies`));
          return;
        }

        // Find eligible nodes up to concurrency limit
        for (const node of eligibleNodes) {
          if (activeWorkers >= this.concurrency) break;
          if (running.has(node.id)) continue;

          node.status = "running";
          running.add(node.id);
          activeWorkers++;

          (async () => {
            try {
              const res = await node.task(results, { signal: this.abortController.signal });
              node.status = "completed";
              node.result = res;
              results[node.id] = res;
              completed.add(node.id);
            } catch (err) {
              node.status = firstError ? "cancelled" : "failed";
              node.error = err;
              firstError ||= err;
              hasFailure = true;
              this.abortController.abort();
              // Cancel all remaining pending nodes
              for (const other of this.nodes.values()) {
                if (other.status === "pending") {
                  other.status = "cancelled";
                }
              }
            } finally {
              running.delete(node.id);
              activeWorkers--;
              schedule();
            }
          })();
        }
      };

      schedule();
    });
  }
}
