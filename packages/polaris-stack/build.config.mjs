import * as esbuild from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

const isDev = process.argv.includes("--dev");

await esbuild.build({
  entryPoints: ["src/index.ts", "src/theme/script.ts"],
  outdir: "dist",
  format: "esm",
  platform: "neutral",
  target: "es2020",
  sourcemap: isDev,
  bundle: true,
  splitting: false,
  treeShaking: true,
  external: ["react", "react-dom"],
  outExtension: { ".js": ".js" },
});

const globalCss = [
  readFileSync("src/theme/tokens.css", "utf8"),
  readFileSync("src/theme/themes.css", "utf8"),
  readFileSync("src/theme/base.css", "utf8"),
  readFileSync("src/layout/layout.css", "utf8"),
  readFileSync("src/components/components.css", "utf8"),
].join("\n");
writeFileSync("dist/styles.css", globalCss, "utf8");