import { fileURLToPath } from "node:url";
import { buildComponents } from "./esbuild-components.js";

async function runBuildComponentsCli() {
  try {
    await buildComponents();
  } catch (error) {
    console.error("Component build failed:", error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBuildComponentsCli();
}
