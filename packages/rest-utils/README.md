# @wpdev/rest-utils

WordPress REST client helpers and batch request factory.

## Install

```bash
npm install @wpdev/rest-utils
```

## Usage

```js
import { createBatchRequest } from "@wpdev/rest-utils/fetch";

const batch = createBatchRequest({ restUrl, nonce });
```

## API

See [docs/api/js-reference.md](../../docs/api/js-reference.md#wpdevrest-utils) and
[fetch-batch.md](../../docs/fetch-batch.md).

## Part of wp-starter-kit

This package is part of [wp-starter-kit](../../README.md).
