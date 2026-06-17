# `elementProps` — DOM data attributes to Preact props

The `@wpdev/html-utils` package exports `elementProps(element)`, which reads
`data-*` attributes from a DOM node and returns a plain object suitable for
spreading onto a Preact (or React) component.

Implementation: `packages/html-utils/index.js`.

## How it works

1. Iterate every attribute on the element.
2. Keep only names starting with `data-`.
3. Strip the `data-` prefix and convert kebab-case to camelCase
   (`data-reset-after-submit` → `resetAfterSubmit`).
4. Try `JSON.parse()` on the value; on failure, keep the raw string.

## HTML → props conversion

| HTML attribute | Prop name | Parsed value | Notes |
|----------------|-----------|--------------|-------|
| `data-reset-after-submit="true"` | `resetAfterSubmit` | `true` (boolean) | Valid JSON |
| `data-reset-after-submit="false"` | `resetAfterSubmit` | `false` (boolean) | Valid JSON |
| `data-reset-after-submit="1"` | `resetAfterSubmit` | `1` (number) | `"1"` is JSON number, not boolean |
| `data-count="5"` | `count` | `5` (number) | Valid JSON |
| `data-label="hello"` | `label` | `"hello"` (string) | Not valid JSON → raw string |
| `data-options='{"a":1}'` | `options` | `{ a: 1 }` (object) | Valid JSON |

## Render pattern (TypeScript + Preact)

```tsx
import { render } from "preact";
import { elementProps } from "@wpdev/html-utils";
import { MyComponent } from "./MyComponent";

const el = document.getElementById("my-widget");
if (el) {
  render(<MyComponent {...elementProps(el)} />, el);
}
```

Or use the bundled helper:

```js
import { mountComponent } from "@wpdev/html-utils";

mountComponent("my-widget", MyComponent, { extraProp: "override" });
```

`extraProps` wins on key collision.

## PHP placeholder

Output the mount point with `data-*` attributes — no inline JSON in script tags:

```php
printf(
    '<div id="my-widget" data-reset-after-submit="true" data-count="%d" data-label="%s"></div>',
    $count,
    esc_attr( $label )
);
```

Enqueue the module bundle on the page that renders this markup (see
[modules.md](modules.md#asset-registration-best-practices)).

## Tests

- `tests/packages/html-utils.test.js` — unit coverage for coercion and camelCase.
- `tests/jsdom.smoke.test.js` — smoke test in jsdom.

## Related

- [react-preact.md](react-preact.md) — UI library choice
- [asset-mappings.md](asset-mappings.md) — how module bundles load in admin