# WDForm Re-implementation Plan

**Package:** `@wpdev/ui-components`  
**Replaces:** `MLForm` (deleted in full)  
**Goal:** CRUD-form creation by ease in React or Preact projects — wrapper-only, signals + hooks, built-in validation, TypeScript-ready.

---

## 1. Why MLForm Must Go

| Problem                | Detail                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Global singleton store | `formStore` / `formState` in `index.js` are module-level singletons — two `<MLForm>` on the same page share state silently |
| No validation          | Delegate entirely to consuming code                                                                                        |
| No dirty tracking      | No way to know which fields changed                                                                                        |
| No submit lifecycle    | No loading / success / error state                                                                                         |
| No TypeScript          | Plain JS with no types                                                                                                     |
| Signals vs hooks split | Component uses hooks; store uses signals — no unified API                                                                  |
| Hardcoded class names  | `wpdev-form`, `the-form` — consumers can't opt out                                                                         |

---

## 2. Design Principles

1. **Instance-scoped** — every `<WDForm>` owns its own isolated store; no globals.
2. **Dual API** — the same internal store is accessible via `useWDForm()` hook (React/Preact compat) _and_ as Preact signals (signal-first Preact apps).
3. **Wrapper-only** — WDForm does not ship input components. It exposes a `register(name)` helper that returns spread-ready props for any `<input>`.
4. **Declarative validation** — field rules are data (`{ required, minLength, pattern, custom }`), not imperative callbacks.
5. **Zero required configuration** — `<WDForm onSubmit={fn}>` works with no other props. Features are additive.
6. **Framework-agnostic output** — no WordPress-specific imports. WordPress hooks fired optionally via a plugin prop.

---

## 3. Full API Surface

### 3a. `<WDForm>` Component

```tsx
<WDForm
  // Required
  onSubmit={(values, api) => void | Promise<void>}

  // Initial data
  initialValues={{ name: "Alice", role: "admin" }}
  fetchInitialValues={() => fetch("/api/user/1").then(r => r.json())}

  // CRUD mode
  mode="create" | "edit" | "view"   // default: "create"
  entityId={42}                     // triggers fetchInitialValues on mount

  // Validation
  rules={{
    name: { required: true, minLength: 2 },
    email: { required: true, pattern: /^[^@]+@[^@]+$/, message: "Invalid email" },
    age:   { min: 18, max: 120, custom: v => v % 1 === 0 || "Must be a whole number" },
  }}
  validateOn="blur"  // "blur" | "change" | "submit" (default: "submit")

  // Submit behaviour
  resetAfterSubmit={false}
  onDelete={(entityId) => void | Promise<void>}  // edit mode only

  // Auto-save
  autoSave={false}
  autoSaveDelay={800}  // ms, default 800

  // Escape hatches
  className=""
  wrapperClassName=""
  debug={false}

  // WordPress hooks bridge (optional)
  hooksPlugin={window.myProject?.hooks}
  hookPrefix="myproject"
>
  {/* children OR render prop */}
  {(form) => (
    <input {...form.register("name")} />
  )}
</WDForm>
```

### 3b. `useWDForm()` Hook — standalone, no component needed

```ts
const form = useWDForm({
  initialValues: { qty: 1 },
  rules: { qty: { required: true, min: 1 } },
  onSubmit: async (values) => {
    await api.save(values);
  },
});

// form.register(name) → { name, value, onChange, onBlur }
// form.values           → current snapshot (re-renders on change)
// form.errors           → { [name]: string | null }
// form.status           → "idle" | "loading" | "submitting" | "success" | "error"
// form.isDirty          → boolean
// form.dirtyFields      → Set<string>
// form.watch(name)      → current value of one field (reactive)
// form.setValue(n, v)   → programmatic write
// form.setError(n, msg) → programmatic error injection
// form.reset(fields?)   → restore to initialValues (all or specific fields)
// form.submit()         → trigger submit programmatically
// form.delete()         → trigger onDelete programmatically
```

### 3c. `createWDFormStore()` — Preact Signals API

For signal-first Preact apps. Returns the same shape as `useWDForm` but backed by Preact signals instead of `useState`.

```ts
const store = createWDFormStore({ initialValues: { name: "" } });

// store.fields         → signal({ name: "" })       (individual field signals)
// store.errors         → signal({ name: null })
// store.status         → signal("idle")
// store.isDirty        → computed(() => ...)
// store.dirtyFields    → computed(() => new Set(...))
// store.register(name) → { name, value: store.fields.value[name], onChange, onBlur }
// store.setValue(n, v) → store.fields.value = { ...store.fields.value, [n]: v }
// store.reset()        → restore to initialValues
// store.submit()       → run validation + call onSubmit
```

`<WDForm>` accepts `store={myStore}` to use a pre-created signal store instead of managing its own.

---

## 4. Built-in Validation Rules

| Rule          | Type                                            | Description                                                                 |
| ------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `required`    | `boolean`                                       | Field must be non-empty                                                     |
| `minLength`   | `number`                                        | String minimum length                                                       |
| `maxLength`   | `number`                                        | String maximum length                                                       |
| `min`         | `number`                                        | Numeric minimum                                                             |
| `max`         | `number`                                        | Numeric maximum                                                             |
| `pattern`     | `RegExp`                                        | Must match regex                                                            |
| `custom`      | `(value, allValues) => true \| string`          | Sync custom rule; return `true` to pass, a string to fail with that message |
| `asyncCustom` | `(value, allValues) => Promise<true \| string>` | Async custom rule (e.g. check username availability)                        |
| `message`     | `string`                                        | Override the default error message for any rule in this field               |
| `deps`        | `string[]`                                      | Re-validate this field when any of these other fields change                |

### Cross-field example

```ts
rules={{
  password:        { required: true, minLength: 8 },
  confirmPassword: {
    required: true,
    custom: (v, all) => v === all.password || "Passwords do not match",
    deps: ["password"],   // re-run when password changes
  },
}}
```

---

## 5. Cool & Useful Features

### 5a. Status Machine

Submit lifecycle is a first-class state machine:

```
idle → submitting → success
                 → error
idle ← reset()
```

`form.status` drives UI automatically — disable the button, show a spinner, display a success banner.

### 5b. AutoSave Mode

```tsx
<WDForm autoSave autoSaveDelay={600} onSubmit={saveDraft}>
```

Debounces submit on every field change. Pairs with `status === "submitting"` to show a subtle "Saving…" indicator. Replaces the manual `onChange → debounce → API` pattern in every consumer.

### 5c. View Mode (read-only CRUD)

```tsx
<WDForm mode="view" initialValues={entity}>
  {({ register, mode }) => (
    <input {...register("name")} readOnly={mode === "view"} />
  )}
</WDForm>
```

`register()` automatically adds `readOnly` and `tabIndex={-1}` in `view` mode. Consumers can switch mode via `form.setMode("edit")`.

### 5d. Dirty Guard

If the user navigates away from an unsaved `mode="edit"` form, WDForm fires `onDirtyLeave`:

```tsx
<WDForm onDirtyLeave={() => window.confirm("Discard changes?")} />
```

Uses the browser's `beforeunload` event and (if available) a React Router / Preact Router blocker.

### 5e. Field Array (dynamic rows)

```tsx
const { fieldArray } = useWDForm({ initialValues: { items: [] } });
const items = fieldArray("items");

items.fields.map((item, i) => <input {...items.register(i, "name")} />);
items.append({ name: "" });
items.remove(i);
items.move(from, to);
```

Essential for CRUD forms with repeating rows (order lines, tags, teammates).

### 5f. Schema Derive Mode (bonus, zero extra deps)

Pass a flat object as `initialValues` and WDForm auto-infers field types:

- `""` or `string` → text input hints
- `number` → numeric validation hint (`min/max` coerce to numbers)
- `boolean` → checkbox hint
- `Date` → date hint

This is metadata only — WDForm does not render anything — but it makes the `register()` return sensible `type`, `inputMode`, and `min`/`max` attributes automatically.

### 5g. WordPress Hooks Bridge (opt-in)

```tsx
<WDForm hooksPlugin={window.myProject.hooks} hookPrefix="myproject">
```

When provided, fires:

- `myproject-form-init(container, values)`
- `myproject-form-changed(container, fieldName, value)`
- `myproject-form-submit(container, values)`
- `myproject-form-success(container, result)`
- `myproject-form-error(container, error)`

Zero cost if the prop is omitted. Preserves the `dependencies.ts` hook contract from the original MLForm.

### 5h. Debug Panel

```tsx
<WDForm debug>
```

Renders a collapsible `<details>` box below the form (dev only) showing a live JSON dump of `values`, `errors`, `status`, `dirtyFields`. Stripped automatically in production builds via `process.env.NODE_ENV` check.

---

## 6. File Structure

```
packages/ui-components/
├── package.json                    ← updated exports + peerDeps
├── index.js                        ← re-exports WDForm barrel (replaces old store API)
│
├── WDForm/
│   ├── index.js                    ← barrel: WDForm, useWDForm, createWDFormStore
│   ├── WDForm.js                   ← <WDForm> component
│   ├── useWDForm.js                ← hooks-based controller
│   ├── createWDFormStore.js        ← signal-based store factory
│   ├── validators.js               ← built-in rule runners
│   ├── fieldArray.js               ← fieldArray helper
│   └── statusMachine.js            ← idle/submitting/success/error transitions
│
└── MLForm/                         ← DELETED (entire directory removed)
```

### Updated `package.json` exports

```json
{
  "name": "@wpdev/ui-components",
  "exports": {
    ".": "./index.js",
    "./WDForm": "./WDForm/index.js"
  },
  "peerDependencies": {
    "preact": ">=10",
    "@preact/signals": ">=1"
  }
}
```

---

## 7. Implementation Phases

### Phase 1 — Delete & Scaffold

- Delete `MLForm/MLForm.js` and `MLForm/` directory
- Delete the global signal store from `index.js`
- Create new directory structure
- Stub all files with export signatures only

### Phase 2 — Signal Store (`createWDFormStore`)

- Per-instance signal store
- `fields`, `errors`, `status`, `isDirty`, `dirtyFields` signals
- `computed` for derived values
- `setValue`, `setError`, `reset`, `submit` methods
- Unit tests: `wdform.store.test.js`

### Phase 3 — Validation Engine (`validators.js`)

- All built-in rules (required, minLength, maxLength, min, max, pattern, custom)
- Async validation with `asyncCustom`
- Cross-field `deps` re-validation
- Message override support
- Unit tests: `wdform.validators.test.js`

### Phase 4 — Hooks API (`useWDForm`)

- Wraps signal store for React/Preact hooks usage
- `register(name)` returning spread-ready props
- `watch(name)` for targeted subscriptions
- `validateOn` modes: blur / change / submit
- Unit tests: `wdform.hook.test.js`

### Phase 5 — `<WDForm>` Component

- Render-prop + children dual API
- `fetchInitialValues` async load with `status="loading"`
- `mode` prop (`create` / `edit` / `view`)
- `resetAfterSubmit`, `autoSave`, `onDelete`
- `hooksPlugin` / `hookPrefix` WordPress bridge
- Dirty guard (`onDirtyLeave`)
- `debug` panel
- Component tests: `wdform.component.test.js`

### Phase 6 — Field Array (`fieldArray.js`)

- `append`, `remove`, `move`, `swap` operations
- Nested `register(index, fieldName)` helper
- Tests: `wdform.fieldarray.test.js`

### Phase 7 — `store` prop (signal passthrough)

- Accept `store={createWDFormStore(...)}` on `<WDForm>`
- Enables signal-first apps to share a form store across components
- Tests: added to component tests

### Phase 8 — Migrate Tests & Update Index

- Remove old `ui-components.test.js` assertions for the deleted store API
- Write new test suite covering all phases
- Update `index.js` to re-export `WDForm` barrel

---

## 8. Migration from MLForm

| Old                                                              | New                                                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `import { MLForm } from "@wpdev/ui-components/MLForm/MLForm.js"` | `import { WDForm } from "@wpdev/ui-components/WDForm"`     |
| `formStore`, `getFormData`, `setFormData`                        | `useWDForm()` hook or `createWDFormStore()`                |
| `batchGetFormData()` in `onSubmit`                               | `onSubmit(values)` — values passed directly                |
| `props.queryParams`                                              | `initialValues={{ ...queryParams }}`                       |
| `props.fetchInitialValues`                                       | `fetchInitialValues={asyncFn}`                             |
| `props.resetAfterSubmit`                                         | `resetAfterSubmit={true}`                                  |
| `batchSetFormData(values)` externally                            | `form.setValue(name, value)` or `store.fields.value = ...` |

---

## 9. Key Invariants

1. **No module-level mutable state** — `createWDFormStore()` allocates fresh signals every call; no singletons.
2. **Signals are opt-in** — `useWDForm()` works without `@preact/signals` in the runtime (it falls back to `useState`). The peer dep is only required when using `createWDFormStore()` directly.
3. **No rendering opinion** — WDForm never renders `<input>` elements. `register()` returns props; the consumer renders the element.
4. **Async-safe** — if the component unmounts while `fetchInitialValues` or `onSubmit` is in flight, the store is marked as disposed and no state updates occur.
5. **`view` mode is safe-by-default** — in view mode, `register()` always adds `readOnly`; the submit button is not rendered; `onSubmit` never fires. Cannot be bypassed by consumer without switching mode.
