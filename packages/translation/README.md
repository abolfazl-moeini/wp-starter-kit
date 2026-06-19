# @wpdev/translation

Pure data helpers for the wp-starter-kit JS+PHP translation pipeline.

## Install

```bash
npm install @wpdev/translation
```

## Usage

```js
import { parseMapFile, mergeTranslationFiles } from "@wpdev/translation";

const map = parseMapFile(potContents, "MyBundle");
const merged = mergeTranslationFiles(mainPath, [otherPath], "json");
```

## API

See [docs/api/js-reference.md](../../docs/api/js-reference.md#wpdevtranslation) and
[translation.md](../../docs/translation.md).

## Part of wp-starter-kit

This package is part of [wp-starter-kit](../../README.md).
