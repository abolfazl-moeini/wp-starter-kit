#!/usr/bin/env node
import { scaffoldProject } from "./index.js";

const target = process.argv[2];
if (!target) {
  console.error("Usage: scaffold-cli <dir> [--force]");
  process.exit(1);
}
const force = process.argv.includes("--force");
const answers = process.env.WPSK_ANSWERS_JSON
  ? JSON.parse(process.env.WPSK_ANSWERS_JSON)
  : {
      slug: "my-project",
      npmScope: "myorg",
      globalName: "MyProject",
      localizeVar: "MyProjectLoc",
      textDomain: "my-project",
      hookPrefix: "my-project",
      depsBundle: "my-project-deps.js",
      phpFunctionPrefix: "myprj_",
      uiFramework: "preact",
    };
const res = await scaffoldProject(target, answers, { force });
console.log(JSON.stringify(res, null, 2));
process.exit(res.ok ? 0 : 1);
