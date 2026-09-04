# AGENT MASTER ONBOARDING PROMPT & COMPREHENSIVE PROJECT HANDOFF GUIDE

**Project:** Tavangary WordPress Ecosystem — Standalone Plugin Builder, AST Transformer, WAL Journal Engine & Test Tooling  
**Location:** `/Users/moeini/Dev/tavangary.new/wordpress/wp-content/tools/`  
**Target Audience:** Autonomous AI Agents, Senior Systems Engineers, and DevSecOps Reviewers joining with **zero prior knowledge**.

---

## 1. Executive Summary & Core Mission

This repository contains the **production build pipeline, AST obfuscation transformer, hermetic testing framework, and transactional WAL journal engine** for the Tavangary WordPress and WooCommerce ecosystem.

### The Problem We Solve

In standard development, Tavangary plugins depend on a shared framework (`plugins/wpdev`) and raw source trees (`*-dev`). For commercial release and client distribution, we require **independent, hermetic, standalone .zip artifacts** where:

1. The shared `wpdev` core framework is safely **inlined** into each plugin closure without namespace or symbol collisions.
2. PHP source code undergoes **Profile S obfuscation** (comment & docblock stripping, whitespace compression, symbol/variable mangling, and string transformation) while preserving WordPress globals, hooks, filters, and reflection APIs.
3. The build process is **deterministic, incremental, and parallelized** via composite SHA-256 fingerprinting and DAG dependency planning.
4. Deployment and caching are governed by an **immutable Write-Ahead Log (WAL) Transaction Journal** with automatic crash-recovery and fail-closed rollback.
5. All build artifacts and test suites are audited with **strict mathematical integrity**, zero fake assertions, zero recursive child suites, and hermetic isolation.

---

## 2. Directory Structure & Architecture Map

```text
/Users/moeini/Dev/tavangary.new/wordpress/wp-content/
├── plugins/
│   ├── tavangary-core/             # Target standalone plugin (Core business logic)
│   ├── tavangary-theme-panel/      # Target standalone plugin (Bricks theme integration)
│   ├── wpdev-crm/                  # Target standalone plugin (CRM engine)
│   ├── wpdev-tickets/              # Target standalone plugin (Ticketing system)
│   ├── wpdev/                      # Shared core framework (Inlined into standalone plugins)
│   └── *-dev/                      # Raw uncompiled development plugins
├── themes/
│   └── tavangary/                  # Bricks child theme
└── tools/                          # THIS TOOLING REPOSITORY
    ├── build-all-standalone-plugins.mjs   # Master CLI build orchestrator
    ├── build-cache-engine.mjs             # Composite fingerprinting, cache schema 2 & WAL journal
    ├── build-dag-runner.mjs               # Parallel DAG dependency planner & worker pool
    ├── inline-wpdev-closure.mjs           # Dependency inliner engine for wpdev
    ├── plan3/
    │   └── transformer.php                # PHP AST obfuscation engine (nikic/php-parser)
    ├── canonical-artifact-manifest.mjs    # Single-root & ZIP structure validation
    ├── artifact-fixture-helper.mjs        # Hermetic test fixtures & ZIP inspectors
    ├── class-completeness-gate.mjs        # Static class completeness verification
    ├── test-dependency-registry.mjs       # Single source of truth for test metadata & tiers
    ├── test-impact-map.mjs                # Git diff -> Affected test dependency resolver
    ├── dev/
    │   ├── run-tests.mjs                  # Bounded test scheduler runner (--tier=unit|contract|meta|fast|full)
    │   ├── profile-tests.mjs              # Resource & memory profiler using BSD time -l
    │   ├── trace-all-runners.mjs          # Live OS process & concurrency tracer
    │   ├── run-benchmark.mjs              # Standalone production build hardware benchmark
    │   ├── ast-assertion-auditor.mjs      # Acorn-based static AST declaration & assertion auditor
    │   ├── ast-assertion-audit-report.json # Static audit ground truth artifact
    │   ├── runner-invocation-trace.json   # 3-way live OS process trace artifact
    │   └── build-performance-benchmark.json # Production hardware benchmark artifact
    ├── tests/                             # 56 Canonical Test Suites (388 subtests, 100% green)
    ├── tests-docker/                      # 1 Docker Runtime Smoke Test (Excluded from default Node suite)
    └── FULL_BUILD_OBFUSCATOR_AUDIT_AND_REMEDIATION.md # Comprehensive 1,160-line audit & handoff document
```

---

## 3. The 4 Target Plugins & Build Profiles

| Plugin Target               | Source Directory                | Primary Capabilities & Inlined Components                                                |
| :-------------------------- | :------------------------------ | :--------------------------------------------------------------------------------------- |
| **`tavangary-core`**        | `plugins/tavangary-core`        | Core LMS, user access gates, WooCommerce Persian checkout bridges, DRM connector.        |
| **`tavangary-theme-panel`** | `plugins/tavangary-theme-panel` | Bricks Builder UI extensions, admin dashboards, custom elements, settings panels.        |
| **`wpdev-crm`**             | `plugins/wpdev-crm`             | Inlined BerlinDB custom database tables, customer lifecycle management, contact schemas. |
| **`wpdev-tickets`**         | `plugins/wpdev-tickets`         | Inlined ticket schemas, department routing, customer support APIs.                       |

### Obfuscation Profiles

- **Profile S (Source Obfuscation - Active & Implemented):** AST-level comment/docblock removal, symbol mangling, framework closure inlining, hermetic single-root ZIP packaging, and SHA-256 manifest generation.
- **Profile A (Commercial Bytecode Obfuscation - Blocked):** High-grade commercial bytecode encryption (Requires external commercial binary).
- **Profile B (Encoded Artifacts - Blocked):** Specialized encoded loader format.

---

## 4. Summary of Completed Engineering Remediation

When you inspect the history, you will observe the following major architectural fixes that were engineered with strict Test-Driven Development (TDD):

1. **Elimination of Recursive Subprocess Explosions:**
   - _Previous Defect:_ `test-scheduler-and-tiers.test.mjs` was re-invoking `runTestScheduler` recursively, creating exponential child processes and blowing suite execution time past 390 seconds.
   - _Fix:_ Isolated `test-scheduler-and-tiers.test.mjs` into a dedicated `meta` tier using lightweight synthetic fixtures (< 50ms) and added fail-safe recursion environment guards (`__ANTIGRAVITY_RUN_TESTS_ACTIVE`, `__ANTIGRAVITY_PROFILE_ACTIVE`).
2. **Decoupling Benchmarks from Correctness Suites:**
   - _Previous Defect:_ `Regression 21` and `22` in `performance-and-evidence-regressions.test.mjs` were executing full multi-minute production builds inside unit tests.
   - _Fix:_ Refactored `Regression 21` with dependency injection and synthetic schemas to test 100% of mathematical and failure invariants in 3.5ms. Separated `Regression 22` (incremental cache invariant: `1 rebuilt / 3 hit`) and `Regression 23` (AST transformation integration test with `php -l`). Full production benchmarks were moved strictly to `node tools/dev/run-benchmark.mjs`.
3. **Acorn-Based AST Assertion & Declaration Auditor:**
   - Built [`tools/dev/ast-assertion-auditor.mjs`](file:///Users/moeini/Dev/tavangary.new/wordpress/wp-content/tools/dev/ast-assertion-auditor.mjs) using Acorn JS parser. It proved that across all 56 canonical files, exactly **419 AST test blocks**, **1,218 assertions**, and **204 negative/throw error branches** exist with **0 skips, 0 todos, and 0 onlys**.
4. **WAL Transaction Journal & Atomic Crash Recovery:**
   - Implemented `TransactionJournalManager` in `build-cache-engine.mjs` with nested `deepFreeze` snapshot immutability, exact `+1` revision sequence validation, and fail-closed state transitions tested across **45 failure and rollback scenarios** in `pipeline-failure-and-rollback.test.mjs`.
5. **Real 3-Way Process Tracing:**
   - Verified that all 3 runners produce **100% test parity** (historically 381/381; current canonical TAP run is 388/388) with real OS process events captured in `runner-invocation-trace.json`.

---

## 5. Verified Ground Truth Metrics & Benchmark Data

```text
+-------------------------------------------------------------------------------+
| METRIC DIMENSION                      | GROUND TRUTH VALUE                    |
+-------------------------------------------------------------------------------+
| Canonical Test Files                  | 56 files (tools/tests/)               |
| Docker Smoke Test Files               | 1 file (tools/tests-docker/)          |
| Static AST Test Declarations          | 419 blocks (Acorn Parser)             |
| Runtime TAP Subtests (Passed)         | 388 subtests (0 fail, 0 skip, 0 todo) |
| Static AST Assertions (assert.*)      | 1,218 assertions                      |
| Negative & Error Branches (AST)       | 204 checks (196 rejects + 8 throws)   |
| Direct Node Wall Time (node --test)   | 5.18s – 5.97s (Concurrency: 1)        |
| Bounded Scheduler Time (--tier=full)  | 6.97s – 13.90s (Concurrency: 4)       |
| Fast Tier Wall Time (--tier=fast)     | 5.90s – 8.19s (53 files / 306 tests)  |
| Cold Build Mean (jobs=4)              | 12.40s – 16.85s (Rebuilt: 4, Hit: 0)  |
| Warm No-Op Build Mean                 | 369.88ms – 588.75ms (Rebuilt: 0, Hit:4|
| Incremental Build Mean                | 9.51s – 10.02s (Rebuilt: 1, Hit: 3)   |
| Fingerprinting Throughput             | 129.49ms – 149.92ms                   |
| Peak Process RSS Memory               | 160.78MB – 166.33MB                   |
+-------------------------------------------------------------------------------+
```

---

## 6. Verification Taxonomy & Hard Release Gates

Any incoming agent must strictly respect the distinction between local toolchain correctness and commercial customer release readiness:

- **PROVEN IN REPOSITORY (82% Correctness / 95% Test Perf):**
  - DAG Planner & SHA-256 Fingerprinting
  - WAL Transaction Journal & 45 Rollback Scenarios
  - High-Speed In-Memory Node Runner (~5.5s)
  - Disjoint Tier Partitioning (Unit/Contract/Meta/Integration)
  - Parity Across Direct Node, Scheduler, and Profiler
- **PARTIALLY PROVEN (Hermetic Fixtures Only):**
  - wpdev Closure Inliner Engine
  - AST Comment Stripping & Symbol Mangling (`php -l`)
  - Incremental Rebuild Planning (1 rebuilt / 3 cached)
- **STRICT HARD GATES - RELEASE BLOCKED:**
  - Commercial Bytecode Obfuscator (Profile A Binary Missing)
  - Private-Key Ed25519 Signing Authority (Keys Not Provisioned)
  - PHP 7.4 Live Container Smoke Gate (Unexecuted in Live CI)
  - License Management Backend Service (Missing Endpoint)
  - Standalone ZIP Activation on Live Clean WordPress Site

### Calibrated Engineering Scorecard

- **Contract Correctness:** `82%` (Weight: 25% -> Contribution: `20.50`)
- **Test Performance:** `95%` (Weight: 15% -> Contribution: `14.25`)
- **Build Performance:** `78%` (Weight: 15% -> Contribution: `11.70`)
- **Tamper Resistance & WAL:** `44%` (Weight: 20% -> Contribution: `8.80` — Diagnostic Integrity = 88%, Cryptographic = 0%)
- **Architecture & Maintainability:** `85%` (Weight: 15% -> Contribution: `12.75`)
- **Commercial Release Readiness:** `35%` (Weight: 10% -> Contribution: `3.50`)
- **TOTAL WEIGHTED SCORE:** 71.50%
- **CURRENT STATUS:** Technically Consolidated & Ready for Tooling CI Qualification | Customer Release: STRICTLY BLOCKED.

---

## 7. Operational Runbook & Daily Developer Commands

When developing or adding new features in this repository, always use the following canonical commands:

```bash
# 1. Daily fast developer iteration (53 files / 306 tests in ~6-8s):
node tools/dev/run-tests.mjs --tier=fast --jobs=4

# 2. Pipeline failure, rollback, and regression validation (2 files / 68 tests in ~3s):
node tools/dev/run-tests.mjs --tier=integration --jobs=1

# 3. Full canonical test suite execution (56 files / 388 tests in ~5.5s):
node --test tools/tests/*.test.mjs

# 4. AST static assertion & declaration audit (Parses all ASTs in ~800ms):
node tools/dev/ast-assertion-auditor.mjs

# 5. Standalone production build hardware benchmark (Isolated temp fixtures in ~40s):
node tools/dev/run-benchmark.mjs

# 6. Live OS 3-way runner concurrency & process tracer:
node tools/dev/trace-all-runners.mjs

# 7. Full production plugin compilation build (Cold/Warm/Incremental):
node tools/build-all-standalone-plugins.mjs --targets=all
```

---

## 8. Inviolable Rules of Engagement for Autonomous Agents

As an agent operating on this repository, you must obey these strict rules without exception:

1. **NEVER Skip, Todo, or Mock Away Invariants:** Do not add `test.skip`, `test.todo`, `it.only`, `--test-name-pattern`, early returns, or empty assertions to make a test pass.
2. **Preserve Disjoint Test Tiers:** Every canonical test file in `tools/tests/` must belong to exactly one tier in `tools/test-dependency-registry.mjs` (`unit`, `contract`, `meta`, or `integration`). If you add a new test file, register it immediately in `CANONICAL_TEST_REGISTRY`.
3. **No Heavy Builds Inside Correctness Tests:** Unit and contract tests must never spawn multi-minute full production builds. Use synthetic fixtures and dependency injection for schema/invariant tests; reserve full compilation for `tools/dev/run-benchmark.mjs` and integration tests.
4. **Maintain WAL Transaction Integrity:** All filesystem mutations and cache persist operations must flow through `TransactionJournalManager` in `tools/build-cache-engine.mjs`. Direct raw state mutations or bypassing rollback recovery is strictly forbidden.
5. **No False Security Claims:** Diagnostic SHA-256 JSON hashes are integrity checksums, NOT cryptographic tamper-proofing. Never claim "100% tamper proof" or "ready for commercial release" until commercial Profile A binaries, asymmetric private keys, and live PHP 7.4 container activations are verified.
6. **Keep the Working Tree Clean:** All scratch files must be placed in temporary directories or cleaned up before completing tasks.

---

## 9. Turnkey Master Prompt for New Agents (Copy & Paste)

When initializing a new AI agent session with zero prior context, copy and paste the following prompt:

```text
You are an expert systems engineer and compiler/tooling specialist assigned to the Tavangary WordPress Ecosystem standalone build and obfuscation pipeline at `/Users/moeini/Dev/tavangary.new/wordpress/wp-content/tools/`.

CRITICAL CONTEXT & ARCHITECTURE:
1. The project builds 4 standalone commercial WordPress plugins (`tavangary-core`, `tavangary-theme-panel`, `wpdev-crm`, `wpdev-tickets`) by inlining the shared `plugins/wpdev` framework closure, stripping comments/docblocks, and mangling symbols via `plan3/transformer.php`.
2. The pipeline is governed by a parallel DAG runner (`build-dag-runner.mjs`), composite SHA-256 cache engine (`build-cache-engine.mjs`), and an immutable Write-Ahead Log Transaction Journal (`TransactionJournalManager`) with 45 crash-recovery and atomic rollback scenarios.
3. The testing framework consists of 56 canonical test files in `tools/tests/` (18 unit + 35 contract + 1 meta + 2 integration) and 1 Docker smoke test in `tools/tests-docker/`.
4. Ground Truth: Static AST analysis confirms 419 test declarations, 1,218 assertions (204 negative/throw checks), and 0 skips/todos. The runtime Node TAP runner executes all 388 subtests green in ~5.5 seconds.
5. Current Status: The repository is Technically Consolidated with a calibrated engineering score of 71.50% (Contract Correctness: 82%, Test Perf: 95%, Build Perf: 78%, Tamper/WAL: 44%, Maintainability: 85%, Release Readiness: 35%). Commercial Customer Release is STRICTLY BLOCKED due to external infrastructure gates (missing commercial Profile A obfuscator binary, private-key signing authority, and live PHP 7.4 container verification).

OPERATIONAL RULES:
- Always run `node --test tools/tests/*.test.mjs` or `node tools/dev/run-tests.mjs --tier=fast --jobs=4` to verify changes.
- Never weaken assertions, skip tests, or claim commercial readiness.
- Read `tools/FULL_BUILD_OBFUSCATOR_AUDIT_AND_REMEDIATION.md` and `tools/AGENT_MASTER_PROMPT_AND_PROJECT_HANDOFF.md` for full architectural details.
```

---

_End of Master Agent Onboarding Guide. Maintained by Tavangary Core Architecture Team._
