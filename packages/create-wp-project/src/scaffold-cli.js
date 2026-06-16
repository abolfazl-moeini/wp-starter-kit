#!/usr/bin/env node
import { scaffoldProject } from "./index.js";

function parseFeaturesJson() {
  const raw =
    process.env.WPSK_FEATURES_JSON ||
    process.argv
      .find((arg) => arg.startsWith("--features-json="))
      ?.slice("--features-json=".length);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Invalid features JSON: ${error.message}`);
    process.exit(1);
  }
}

const target = process.argv[2];
if (!target || target.startsWith("--")) {
  console.error("Usage: scaffold-cli <dir> [--force] [--features-json=<json>]");
  process.exit(1);
}
const force = process.argv.includes("--force");
const features = parseFeaturesJson();
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
const options = { force };
if (features) options.features = features;
const res = await scaffoldProject(target, answers, options);
console.log(JSON.stringify(res, null, 2));
process.exit(res.ok ? 0 : 1);
