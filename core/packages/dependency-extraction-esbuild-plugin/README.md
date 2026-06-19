# @wpdev/dependency-extraction-esbuild-plugin

esbuild plugin that extracts WordPress-style script dependency registrations from import statements.

## Install

```bash
npm install @wpdev/dependency-extraction-esbuild-plugin
```

## Usage

```js
import { dependencyExtractionPlugin } from "@wpdev/dependency-extraction-esbuild-plugin";
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/admin.js"],
  plugins: [dependencyExtractionPlugin()],
  bundle: true,
  outfile: "dist/admin.js",
});
```

## API

See [asset-mappings.md](../../docs/asset-mappings.md) and [build-system.md](../../docs/build-system.md).

## Part of wp-starter-kit

This package is part of [wp-starter-kit](../../README.md).
