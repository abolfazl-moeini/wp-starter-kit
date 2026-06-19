# @wpdev/build

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
