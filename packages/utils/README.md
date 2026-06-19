# @wpdev/utils

REST localize helpers matching the PHP `Assets::get_localize_data()` contract.

## Install

```bash
npm install @wpdev/utils
```

## Usage

```js
import { localize } from "@wpdev/utils";

const { url, nonce } = localize.api();
```

## API

See [docs/api/js-reference.md](../../docs/api/js-reference.md#wpdevutils) and
[localize-contract.md](../../docs/localize-contract.md).

## Part of wp-starter-kit

This package is part of [wp-starter-kit](../../README.md).
