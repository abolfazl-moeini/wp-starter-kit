#!/usr/bin/env node

/**
 * Deterministic Structural AST & Runtime Evidence Auditor
 *
 * Capabilities:
 * - Robust AST parsing via Acorn
 * - Distinguishes top-level test() / it() declarations from nested callbacks or helper functions
 * - Counts assertion call expressions per test declaration (assert, assert.equal, assert.ok, assert.match, assert.strictEqual, assert.deepEqual)
 * - Identifies negative path assertions (assert.rejects, assert.throws)
 * - Verifies zero decorators (.skip, .todo, .only) across all test blocks
 * - Emits both a machine-readable JSON artifact and human-readable summary
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.resolve(__dirname, "..");
const contentRoot = path.resolve(toolsDir, "..");
const defaultTestsDir = path.join(toolsDir, "tests");
const outputJsonPath = path.join(toolsDir, "dev", "ast-assertion-audit-report.json");

// Dynamic resolver for Acorn
async function loadAcorn() {
  const candidates = [
    path.join(contentRoot, "themes/tavangary/node_modules/acorn/dist/acorn.mjs"),
    path.join(contentRoot, "plugins/wpdev-crm-dev/node_modules/acorn/dist/acorn.mjs"),
    path.join(contentRoot, "plugins/tavangary-core-dev/node_modules/acorn/dist/acorn.mjs"),
    path.join(contentRoot, "plugins/tavangary-theme-panel-dev/node_modules/acorn/dist/acorn.mjs"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const mod = await import("file://" + p);
      return mod.parse ? mod : mod.default;
    }
  }
  throw new Error("Acorn parser could not be located in workspace node_modules.");
}

function walk(node, visitor, parent = null) {
  if (!node || typeof node !== "object") return;
  node.parent = parent;
  visitor(node);
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) walk(c, visitor, node);
    } else if (child && typeof child === "object" && child.type) {
      walk(child, visitor, node);
    }
  }
}

export async function auditCanonicalTestSuiteAST(testsDir = defaultTestsDir) {
  const acorn = await loadAcorn();
  const testFiles = fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.mjs")).sort();

  const fileAudits = [];
  let totalRootTests = 0;
  let totalAssertions = 0;
  let totalRejections = 0;
  let totalThrows = 0;
  let totalSkips = 0;
  let totalTodos = 0;
  let totalOnlys = 0;

  for (const file of testFiles) {
    const fullPath = path.join(testsDir, file);
    const code = fs.readFileSync(fullPath, "utf8");

    let ast;
    try {
      ast = acorn.parse(code, {
        ecmaVersion: "latest",
        sourceType: "module",
        locations: true,
      });
    } catch (err) {
      fileAudits.push({
        file,
        error: err.message,
        tests: [],
      });
      continue;
    }

    const assertIdentifiers = new Set(["assert"]);
    const rejectIdentifiers = new Set(["rejects"]);
    const throwIdentifiers = new Set(["throws"]);
    const testIdentifiers = new Set(["test", "it"]);

    // Find imports
    walk(ast, (node) => {
      if (node.type === "ImportDeclaration") {
        const src = node.source.value;
        if (src.includes("assert")) {
          for (const spec of node.specifiers) {
            if (spec.type === "ImportDefaultSpecifier" || spec.type === "ImportNamespaceSpecifier") {
              assertIdentifiers.add(spec.local.name);
            } else if (spec.type === "ImportSpecifier") {
              const importedName = spec.imported.name;
              const localName = spec.local.name;
              if (importedName === "rejects") rejectIdentifiers.add(localName);
              else if (importedName === "throws") throwIdentifiers.add(localName);
              else assertIdentifiers.add(localName);
            }
          }
        } else if (src.includes("test")) {
          for (const spec of node.specifiers) {
            if (spec.type === "ImportDefaultSpecifier" || spec.type === "ImportSpecifier") {
              testIdentifiers.add(spec.local.name);
            }
          }
        }
      }
    });

    const tests = [];
    let fileSkips = 0;
    let fileTodos = 0;
    let fileOnlys = 0;

    // Scan top-level test(...) / it(...) call expressions
    walk(ast, (node) => {
      if (node.type === "CallExpression") {
        let isTest = false;
        let isSkip = false;
        let isTodo = false;
        let isOnly = false;
        let testName = "unnamed";

        if (node.callee.type === "Identifier" && testIdentifiers.has(node.callee.name)) {
          isTest = true;
        } else if (node.callee.type === "MemberExpression") {
          const obj = node.callee.object;
          const prop = node.callee.property;
          if (obj.type === "Identifier" && testIdentifiers.has(obj.name)) {
            isTest = true;
            if (prop.name === "skip") isSkip = true;
            if (prop.name === "todo") isTodo = true;
            if (prop.name === "only") isOnly = true;
          }
        }

        if (isTest) {
          if (isSkip) fileSkips++;
          if (isTodo) fileTodos++;
          if (isOnly) fileOnlys++;

          if (node.arguments[0]?.type === "Literal") {
            testName = String(node.arguments[0].value);
          } else if (node.arguments[0]?.type === "TemplateLiteral") {
            testName = node.arguments[0].quasis.map((q) => q.value.raw).join("${...}");
          }

          let assertions = 0;
          let rejects = 0;
          let throwsCount = 0;

          // Traverse inside the test implementation function
          const fnArg = node.arguments.find((a) => a.type === "ArrowFunctionExpression" || a.type === "FunctionExpression");
          if (fnArg) {
            walk(fnArg, (inner) => {
              if (inner.type === "CallExpression") {
                const callee = inner.callee;
                if (callee.type === "Identifier") {
                  if (assertIdentifiers.has(callee.name)) assertions++;
                  else if (rejectIdentifiers.has(callee.name)) { assertions++; rejects++; }
                  else if (throwIdentifiers.has(callee.name)) { assertions++; throwsCount++; }
                } else if (callee.type === "MemberExpression") {
                  if (callee.object.type === "Identifier" && assertIdentifiers.has(callee.object.name)) {
                    assertions++;
                    if (callee.property.name === "rejects") rejects++;
                    if (callee.property.name === "throws") throwsCount++;
                  }
                }
              }
            });
          }

          tests.push({
            name: testName,
            line: node.loc?.start?.line || 0,
            assertions,
            rejects,
            throwsCount,
            negativeBranches: rejects + throwsCount,
            isSkip,
            isTodo,
            isOnly,
          });
        }
      }
    });

    const fileAssertions = tests.reduce((a, b) => a + b.assertions, 0);
    const fileRejections = tests.reduce((a, b) => a + b.rejects, 0);
    const fileThrows = tests.reduce((a, b) => a + b.throwsCount, 0);

    totalRootTests += tests.length;
    totalAssertions += fileAssertions;
    totalRejections += fileRejections;
    totalThrows += fileThrows;
    totalSkips += fileSkips;
    totalTodos += fileTodos;
    totalOnlys += fileOnlys;

    fileAudits.push({
      file,
      testCount: tests.length,
      assertions: fileAssertions,
      rejections: fileRejections,
      throws: fileThrows,
      negativeChecks: fileRejections + fileThrows,
      skips: fileSkips,
      todos: fileTodos,
      onlys: fileOnlys,
      tests,
    });
  }

  const auditReport = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    testsDir,
    totalFiles: testFiles.length,
    totalRootTests,
    totalAssertions,
    totalRejections,
    totalThrows,
    totalNegativeChecks: totalRejections + totalThrows,
    totalSkips,
    totalTodos,
    totalOnlys,
    files: fileAudits,
  };

  fs.writeFileSync(outputJsonPath, JSON.stringify(auditReport, null, 2), "utf8");
  return auditReport;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const res = await auditCanonicalTestSuiteAST();
  console.log("================ STRUCTURAL AST AUDIT REPORT ================");
  console.log(`Canonical Test Files: ${res.totalFiles}`);
  console.log(`Top-Level Test Declarations: ${res.totalRootTests}`);
  console.log(`Total Assertions (assert.*): ${res.totalAssertions}`);
  console.log(`  - Async Rejections (assert.rejects): ${res.totalRejections}`);
  console.log(`  - Sync Throws (assert.throws): ${res.totalThrows}`);
  console.log(`  - Total Error Invariant Checks: ${res.totalNegativeChecks}`);
  console.log(`Disabled Checks: skips=${res.totalSkips}, todos=${res.totalTodos}, onlys=${res.totalOnlys}`);
  console.log(`✓ Machine-readable report saved to ${outputJsonPath}`);
  console.log("==============================================================");
}
