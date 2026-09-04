#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const reviewPath = path.resolve(process.argv[2] || "");
const contentRoot = path.resolve(process.argv[3] || path.join(path.dirname(reviewPath), "..", "..", ".."));
const failures = [];
const safe = (value, label) => {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes("\0") || path.posix.isAbsolute(value) || path.posix.normalize(value) !== value || value === "." || value === ".." || value.startsWith("../")) { failures.push(`${label} must be a safe relative path`); return false; }
  return true;
};
const exists = async (value, label, root = contentRoot) => { if (!safe(value, label)) return; try { const s = await fs.lstat(path.resolve(root, value)); if (!s.isFile() || s.isSymbolicLink()) failures.push(`${label} must resolve to a regular file`); } catch { failures.push(`${label} does not resolve to a file`); } };
const existsDir = async (value, label, root = contentRoot) => { if (!safe(value, label)) return; try { const s = await fs.lstat(path.resolve(root, value)); if (!s.isDirectory() || s.isSymbolicLink()) failures.push(`${label} must resolve to a regular directory`); } catch { failures.push(`${label} does not resolve to a directory`); } };
let review;
try { review = JSON.parse(await fs.readFile(reviewPath, "utf8")); } catch (e) { failures.push(`review is unreadable: ${e.message}`); }
if (review) {
  if (review.schema !== 1) failures.push("schema must be 1");
  if (review.status !== undefined && review.status !== "review-required") failures.push("status must be review-required");
  if (review.buildInput !== undefined && review.buildInput !== false) failures.push("buildInput must be false");
  if (!review.reviewApproval || review.reviewApproval.promotionImpact !== "review-only") failures.push("reviewApproval must explicitly remain review-only");
  if (typeof review.scope?.consumer !== "string" || !review.scope.consumer || typeof review.scope?.framework !== "string" || !review.scope.framework) failures.push("scope consumer and framework are required");
  const frameworkRoot = typeof review.scope?.framework === "string" && safe(review.scope.framework, "scope.framework") ? review.scope.framework : "plugins/wpdev";
  if (!Array.isArray(review.calls)) failures.push("calls must be an array");
  else for (const [i, call] of review.calls.entries()) {
    if (!call || typeof call !== "object" || !safe(call.file, `calls[${i}].file`) || typeof call.expression !== "string" || !call.expression) failures.push(`calls[${i}] has invalid identity`);
    if (typeof call.literalView === "string") safe(call.literalView, `calls[${i}].literalView`);
    if (typeof call.file === "string") await exists(path.join(frameworkRoot, call.file), `calls[${i}].file`);
  }
  if (!review.externalListenerCoverage || typeof review.externalListenerCoverage !== "object") failures.push("externalListenerCoverage is required");
  else if (!Array.isArray(review.externalListenerCoverage.scannedRoots)) failures.push("externalListenerCoverage.scannedRoots must be an array");
  else for (const [i, root] of review.externalListenerCoverage.scannedRoots.entries()) await existsDir(root, `externalListenerCoverage.scannedRoots[${i}]`);
  if (!review.blockers || typeof review.blockers !== "object" || Array.isArray(review.blockers)) failures.push("blockers must be an object");
  for (const [view, files] of Object.entries(review.resolvedLiteralFiles || {})) {
    if (!safe(view, `resolvedLiteralFiles.${view}`) || !Array.isArray(files) || files.length === 0) failures.push(`resolvedLiteralFiles.${view} must be a non-empty array`);
    for (const [i, file] of (Array.isArray(files) ? files.entries() : [])) await exists(path.join(frameworkRoot, file), `resolvedLiteralFiles.${view}[${i}]`);
  }
}
const report = { schema: 1, status: failures.length ? "blocked" : "valid-review-evidence", promotionReady: false, reviewPath, failures };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
