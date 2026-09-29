# @wpdev/build [DEPRECATED]

> **DEPRECATION NOTICE**: This Node.js/esbuild build pipeline is **deprecated** in favor of the new Go-based build system located in [`packages/build-go`](../../packages/build-go) (`wpdev-build`).
> Please migrate to the Go build system for faster builds and single-binary toolchain workflows.

esbuild-based build pipeline for wp-starter-kit consumers (components, dependencies, styles, assets).

## Install

```bash
npm install @wpdev/build
```

## Usage

```bash
npx wpdev-build-components --config build.config.mjs
npx wpdev-build-dependencies --config build.config.mjs
```

Programmatic:

```js
import { buildComponents } from "@wpdev/build/esbuild-components.js";
```

## API

See [build-system.md](../../docs/build-system.md) and [build-outputs.md](../../docs/build-outputs.md).

## Part of wp-starter-kit

This package is part of [wp-starter-kit](../../README.md).
