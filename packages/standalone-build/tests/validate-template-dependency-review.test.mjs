import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const exec = promisify(execFile);
const script = path.resolve(packageRoot, "validate-template-dependency-review.mjs");
const base = { schema:1, status:"review-required", buildInput:false, reviewApproval:{promotionImpact:"review-only"}, scope:{consumer:"p",framework:"plugins/wpdev"}, calls:[{file:"modules/a.php",expression:"'x'",literalView:"x"}], resolvedLiteralFiles:{x:["modules/x.php"]}, externalListenerCoverage:{status:"incomplete",scannedRoots:[]}, blockers:{dynamic:[]}};
test("accepts review-only template evidence", async()=>{const d=await mkdtemp(path.join(os.tmpdir(),"template-review-")); await mkdir(path.join(d,"plugins/wpdev/modules"),{recursive:true}); await writeFile(path.join(d,"plugins/wpdev/modules/a.php"),""); await writeFile(path.join(d,"plugins/wpdev/modules/x.php"),""); await writeFile(path.join(d,"review.json"),JSON.stringify(base)); const {stdout}=await exec(process.execPath,[script,path.join(d,"review.json"),d]); assert.equal(JSON.parse(stdout).status,"valid-review-evidence");});
test("rejects promotion state and missing resolved file", async()=>{const d=await mkdtemp(path.join(os.tmpdir(),"template-review-")); await writeFile(path.join(d,"review.json"),JSON.stringify({...base,buildInput:true})); await assert.rejects(exec(process.execPath,[script,path.join(d,"review.json"),d]));});
test("rejects unsafe or missing external listener scan roots", async()=>{const d=await mkdtemp(path.join(os.tmpdir(),"template-review-")); await mkdir(path.join(d,"plugins/wpdev/modules"),{recursive:true}); await writeFile(path.join(d,"plugins/wpdev/modules/a.php"),""); await writeFile(path.join(d,"plugins/wpdev/modules/x.php"),""); const review={...base,externalListenerCoverage:{status:"incomplete",scannedRoots:["/tmp"]}}; await writeFile(path.join(d,"review.json"),JSON.stringify(review)); await assert.rejects(exec(process.execPath,[script,path.join(d,"review.json"),d]));});
test("resolves calls and literals relative to declared framework", async()=>{const d=await mkdtemp(path.join(os.tmpdir(),"template-review-")); await mkdir(path.join(d,"framework/views"),{recursive:true}); await writeFile(path.join(d,"framework/a.php"),""); await writeFile(path.join(d,"framework/views/x.php"),""); const review={...base,scope:{consumer:"p",framework:"framework"},calls:[{file:"a.php",expression:"'x'",literalView:"x"}],resolvedLiteralFiles:{x:["views/x.php"]},externalListenerCoverage:{status:"incomplete",scannedRoots:["framework"]}}; await writeFile(path.join(d,"review.json"),JSON.stringify(review)); const {stdout}=await exec(process.execPath,[script,path.join(d,"review.json"),d]); assert.equal(JSON.parse(stdout).status,"valid-review-evidence");});
