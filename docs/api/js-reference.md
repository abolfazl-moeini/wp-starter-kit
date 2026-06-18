# JavaScript packages API reference (`@wpdev/*`)

> Export surface for every `@wpdev/*` npm package in the kit workspace.
> Per-topic guides: [js-hooks.md](../js-hooks.md), [element-props.md](../element-props.md),
> [fetch-batch.md](../fetch-batch.md), [signals.md](../signals.md),
> [translation.md](../translation.md).

## Table of contents

- [@wpdev/hooks](#wpdevhooks)
- [@wpdev/utils](#wpdevutils)
- [@wpdev/rest-utils](#wpdevrest-utils)
- [@wpdev/html-utils](#wpdevhtml-utils)
- [@wpdev/ui-components](#wpdevui-components)
- [@wpdev/fetch (deprecated)](#wpdevfetch-deprecated)
- [@wpdev/translation](#wpdevtranslation)
- [@wpdev/rule-engine](#wpdevrule-engine)
- [@wpdev/polaris-stack](#wpdevpolaris-stack)

---

## `@wpdev/hooks`

Config-driven accessor for the deps-bundle hooks instance (backed by
`@wordpress/hooks` `createHooks()` on the IIFE global).

```ts
export function getHooks(globalName?: string): HooksInstance | undefined;
export default function defaultHooks(): HooksInstance | undefined;
```

| Export     | Signature                                     | Purpose                                        |
| ---------- | --------------------------------------------- | ---------------------------------------------- |
| `getHooks` | `(globalName?) => HooksInstance \| undefined` | Read hooks from `globalThis[globalName].hooks` |
| default    | `() => HooksInstance \| undefined`            | Same as `getHooks()` with config-driven global |

**Usage:**

```ts
import getHooks from "@wpdev/hooks";

getHooks()?.doAction("my-plugin.form.init", container);
getHooks()?.addFilter("my-plugin.rest.before", handler);
```

See [js-hooks.md](../js-hooks.md) for the hook naming convention.

---

## `@wpdev/utils`

```ts
export { localize } from "./localize.js";
```

### `localize`

Object with REST URL/nonce accessors matching the PHP `Assets::get_localize_data()` shape.

```ts
export const localize: {
  api(): { url: string; nonce: string };
  apiX(): { url: string; nonce: string };
  restRootUrl(): string;
  restXRootUrl(): string;
  restNonce(): string;
  restXNonce(): string;
};
```

**Usage:**

```ts
import { localize } from "@wpdev/utils";

const { url, nonce } = localize.api();
```

See [localize-contract.md](../localize-contract.md).

---

## `@wpdev/rest-utils`

REST client helpers and batch request factory.

```ts
export function createRestUtils(deps?: object): RestUtils;
export function getRequestedQueryVar(name: string): string | undefined;
export function requestedQueryVars(raw?: boolean): Record<string, string>;

export const restRequest: typeof defaultUtils.restRequest;
export const restXRequest: typeof defaultUtils.restXRequest;
export const restRootUrl: typeof defaultUtils.restRootUrl;
export const restXRootUrl: typeof defaultUtils.restXRootUrl;
export const restNonce: typeof defaultUtils.restNonce;
export const restXNonce: typeof defaultUtils.restXNonce;
export const restHeaders: typeof defaultUtils.restHeaders;
export const restXHeaders: typeof defaultUtils.restXHeaders;
export const restUrl: typeof defaultUtils.restUrl;
export const restXUrl: typeof defaultUtils.restXUrl;
```

### Fetch submodule (`@wpdev/rest-utils/fetch`)

```ts
export type CacheDriver = "memory";
export type CacheEntry<T> = T | Promise<T>;

export interface CacheStore<T> {
  get(key: string): CacheEntry<T> | undefined;
  set(key: string, value: CacheEntry<T>): void;
  delete(key: string): void;
  clear(): void;
}

export function createCache<T>(driver: CacheDriver): CacheStore<T>;

export type BatchResult<TResponse> = {
  ok: boolean;
  data?: TResponse;
  error?: string;
};
export type BatchRequestConfig<TRequest> = {
  endpoint: string;
  method?: string;
  body?: TRequest;
  cacheKey?: string;
};

export function createBatchRequest<TReq, TRes>(
  config: BatchRequestConfig<TReq>,
): Promise<BatchResult<TRes>>;
```

**Usage:**

```ts
import { restRequest } from "@wpdev/rest-utils";
import { createBatchRequest } from "@wpdev/rest-utils/fetch";

const data = await restRequest("/items", { method: "GET" });
const batch = await createBatchRequest({
  endpoint: "/items",
  cacheKey: "list",
});
```

See [fetch-batch.md](../fetch-batch.md).

---

## `@wpdev/html-utils`

DOM helpers and `elementProps()` for hydrating Preact/React widgets.

```ts
export function elementProps(element: Element): Record<string, unknown>;
export function mountComponent(
  elementId: string,
  Component: Function,
  extraProps?: object,
): void;
export function FreezeUI(): void;
export function UnFreezeUI(): void;
export function currentLanguage(): string;
export function isRTL(): boolean;
export function extractFormData(formHtmlElement: HTMLFormElement): FormData;
export function findFormElement(wrapper: Element): HTMLFormElement | null;
export function elementDispatchChangeEvent(element: Element): void;
export function isInputNameValid(inputName: string): boolean;
export function SwitchableFocusElement(
  context: object,
  switchableName: string,
): object;
export function formatDropDownOptions(
  options: Array<{ value: string; label: string }>,
): Array<object>;
export function formatOptionValue(option: {
  value: string;
  label: string;
}): object;
```

| Export                      | Purpose                                   |
| --------------------------- | ----------------------------------------- |
| `elementProps`              | Map `data-*` attributes → camelCase props |
| `mountComponent`            | Hydrate a component into a DOM node by id |
| `FreezeUI` / `UnFreezeUI`   | Block/unblock UI during async ops         |
| `currentLanguage` / `isRTL` | Read `document.documentElement` lang/dir  |
| `extractFormData`           | Serialize a form to `FormData`            |
| `findFormElement`           | Locate nested form inside wrapper         |
| `isInputNameValid`          | Validate bracket-notation field names     |

**Usage:**

```ts
import { elementProps, mountComponent } from "@wpdev/html-utils";
import { h } from "preact";

const el = document.getElementById("my-widget");
mountComponent("my-widget", MyWidget, elementProps(el));
```

See [element-props.md](../element-props.md).

---

## `@wpdev/ui-components`

WDForm CRUD form utilities (instance-scoped, hooks + optional signals).

```ts
export {
  WDForm,
  useWDForm,
  createWDFormStore,
  validateFieldSync,
  validateAll,
  getDependentFields,
} from "./WDForm/index.js";
```

| Export               | Purpose                             |
| -------------------- | ----------------------------------- |
| `WDForm`             | Preact form component               |
| `useWDForm`          | Hook for form store access          |
| `createWDFormStore`  | Create isolated form state          |
| `validateFieldSync`  | Sync validator for one field        |
| `validateAll`        | Validate entire form                |
| `getDependentFields` | Fields that depend on a given field |

**Subpath:** `@wpdev/ui-components/WDForm`

**Usage:**

```ts
import { WDForm, createWDFormStore } from "@wpdev/ui-components";

const store = createWDFormStore({ fields: { name: { value: "" } } });
```

---

## `@wpdev/fetch` (deprecated)

> **Deprecated.** Use `@wpdev/rest-utils/fetch` instead.

```ts
export {
  createCache,
  type CacheDriver,
  type CacheStore,
  createBatchRequest,
  type BatchRequestConfig,
  type BatchResult,
} from "@wpdev/rest-utils/fetch";
```

The `@wpdev/fetch` package is a backward-compat re-export shim. New code
should import from `@wpdev/rest-utils/fetch` directly.

---

## `@wpdev/translation`

Pure data helpers for the JS+PHP translation pipeline.

```ts
export function parseMapFile(content: string): object;
export function isTranslationValid(map: object, locale: string): boolean;
export function extractTranslation(map: object, locale: string): object;
export function updateTranslation(
  map: object,
  locale: string,
  patch: object,
): object;
export function extractInternalPackages(map: object): string[];
export function mergeTranslationFiles(files: object[]): object;
```

| Export                    | Parameters         | Returns    | Purpose                          |
| ------------------------- | ------------------ | ---------- | -------------------------------- |
| `parseMapFile`            | JSON string        | `object`   | Parse `.json` map file           |
| `isTranslationValid`      | map, locale        | `boolean`  | Whether locale has required keys |
| `extractTranslation`      | map, locale        | `object`   | Extract one locale's strings     |
| `updateTranslation`       | map, locale, patch | `object`   | Merge patch into locale          |
| `extractInternalPackages` | map                | `string[]` | List `@scope/*` package refs     |
| `mergeTranslationFiles`   | file objects       | `object`   | Combine multiple maps            |

**Usage:**

```ts
import { parseMapFile, mergeTranslationFiles } from "@wpdev/translation";

const map = parseMapFile(fs.readFileSync("map.json", "utf8"));
```

See [translation.md](../translation.md).

---

## `@wpdev/rule-engine`

Declarative rule engine using signal tuples.

```ts
export class RuleEngine {
  constructor(rules?: Array<RuleTuple>);
  addRule(rule: RuleTuple): void;
  removeRule(id: string): void;
  evaluate(context: object): EvaluationResult;
  reset(): void;
}
export default RuleEngine;
```

| Method       | Purpose                                |
| ------------ | -------------------------------------- |
| `addRule`    | Register a signal tuple rule           |
| `removeRule` | Remove by rule id                      |
| `evaluate`   | Run all rules against a context object |
| `reset`      | Clear internal state                   |

**Usage:**

```ts
import RuleEngine from "@wpdev/rule-engine";

const engine = new RuleEngine();
engine.addRule([
  "when",
  "field.status",
  "eq",
  "active",
  "then",
  "show",
  "panel",
]);
engine.evaluate({ field: { status: "active" } });
```

See [signals.md](../signals.md) for signal tuple syntax.

---

## `@wpdev/polaris-stack`

Design system foundation: CSS variables, layout primitives, styled components.
Requires `frontendStack: polaris` and `jsLib: react|preact`.

Entry re-exports layout and component primitives. See
[packages/polaris-stack/README.md](../../packages/polaris-stack/README.md)
for the component inventory.

```ts
// Typical imports (see package index for full list):
import { Stack, Box, Button, Text } from "@wpdev/polaris-stack";
```

**Peer dependencies:** `preact` or `react`, optional `@preact/signals`.

---

## Package dependency graph

```
@wpdev/hooks          → (global deps bundle)
@wpdev/utils          → (standalone)
@wpdev/rest-utils     → @wpdev/rest-utils/fetch (internal)
@wpdev/fetch          → @wpdev/rest-utils/fetch (shim)
@wpdev/html-utils     → (standalone)
@wpdev/ui-components  → preact, @preact/signals (optional)
@wpdev/translation    → (standalone, Node + browser)
@wpdev/rule-engine    → (standalone)
@wpdev/polaris-stack  → preact/react
```

## See also

- [packages-overview.md](../packages-overview.md) — where each package lives
- [asset-mappings.md](../asset-mappings.md) — how imports become globals in bundles
