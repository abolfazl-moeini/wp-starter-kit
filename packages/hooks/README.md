# @wpdev/hooks

Config-driven accessor for the deps-bundle WordPress hooks instance.

## Install

```bash
npm install @wpdev/hooks
```

## Usage

```js
import getHooks from "@wpdev/hooks";

getHooks()?.doAction("my-plugin.form.init", container);
getHooks()?.addFilter("my-plugin.rest.before", handler);
```

## API

See [docs/api/js-reference.md](../../docs/api/js-reference.md#wpdevhooks).

## Part of wp-starter-kit

This package is part of [wp-starter-kit](../../README.md).
