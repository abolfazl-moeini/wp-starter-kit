# @wpdev/fetch

> ⚠️ Deprecated. Use @wpdev/rest-utils instead.

Backward-compatibility shim that re-exports the batch fetch client from `@wpdev/rest-utils`.

## Install

```bash
npm install @wpdev/fetch
```

New projects should install `@wpdev/rest-utils` directly.

## Usage

```js
import { createBatchRequest } from "@wpdev/rest-utils/fetch";
```

Do not add new imports from `@wpdev/fetch`; use `@wpdev/rest-utils/fetch`.

## API

See [docs/api/js-reference.md](../../docs/api/js-reference.md#wpdevfetch-deprecated).

## Part of wp-starter-kit

This package is part of [wp-starter-kit](../../README.md).
