import { fileURLToPath } from "node:url";
import { runBuild } from "./esbuild-dependencies.js";

async function runDepsCli() {
  try {
    await runBuild();
  } catch (error) {
    console.error("Dependencies build failed:", error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDepsCli();
}
