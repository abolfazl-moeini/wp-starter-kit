# Rule Engine Signals

> How `core/packages/rule-engine/` lets a project author declarative
> rules (predicates + transforms) that run on every WordPress load
> and short-circuit when a condition isn't met.

## The mental model

A **signal** is a tuple: `{ name, condition, transform }`. The engine
holds a list of signals. On every load:

1. For each signal, evaluate `condition(input)`.
2. If `condition` returns `false` (or a falsy value), **skip** the
   transform. (Note: `undefined` is treated as truthy because the
   author probably forgot to return — see the bug-fix note below.)
3. Otherwise, run `transform(input)` and use the result.

Signals are read-only with respect to each other (the engine advances
in order, never backwards), so a downstream signal can rely on an
upstream signal's output.

## The API (`@wpsk/rule-engine`)

```js
import { createEngine } from '@wpsk/rule-engine';

const engine = createEngine();

engine.add({
  name: 'maybeAddAdminNotice',
  condition: (ctx) => ctx.user?.role === 'subscriber',
  transform: (ctx) => ({
    ...ctx,
    notices: [...(ctx.notices ?? []), 'Welcome, subscriber!'],
  }),
});

const result = engine.run({ user: { role: 'subscriber' } });
// result.notices === ['Welcome, subscriber!']
```

## The bug we fixed (Phase 5)

Early versions of the engine had two subtle bugs:

1. **`if (signal.condition(input))` — when `condition: () => true` is
   the literal text, the engine parsed it as a function with no
   `return`, so it returned `undefined`. The `if (undefined)` branch
   skipped the transform, but the rule had been added precisely
   because the author wanted the transform to run.** Fix: treat
   `undefined` as truthy (the author probably forgot to `return`).
   A real `false` is still falsy.

2. **Engine restart at index 0 on every signal.** If signal 2's
   transform modified the input and signal 3's condition read the
   modification, signal 1's condition (which had already passed)
   was re-evaluated and could now fail. Fix: advance to `idx+1`,
   never restart.

Both fixes are unit-tested in `tests/packages/rule-engine.test.js`
(the `condition-undefined-true` and `advance-not-restart` tests
are explicit regressions).

## Signal shape

```ts
type Signal<I, O> = {
  name: string;                           // for logging / debug
  condition?: (input: I) => boolean;      // optional; defaults to truthy
  transform: (input: I) => O;             // required
};
```

`O` is a superset of `I` (the engine passes the previous transform's
output to the next signal's input). A signal that adds a field
should spread the input: `transform: (i) => ({ ...i, newField: 42 })`.

## Common patterns

### Conditional enqueue

```js
engine.add({
  name: 'enqueueAdminStyles',
  condition: (ctx) => ctx.isAdmin,
  transform: (ctx) => {
    ctx.enqueueStyle('my-project/admin.css');
    return ctx;
  },
});
```

### Hook a WordPress filter (via `@wpsk/hooks`)

```js
import { createNamespacedHooks } from '@wpsk/hooks';

const hooks = createNamespacedHooks('my-project');

engine.add({
  name: 'filterRestResponse',
  transform: (ctx) => {
    hooks.addFilter('rest/response', (response) => ({
      ...response,
      headers: { ...response.headers, 'X-Powered-By': 'my-project' },
    }));
    return ctx;
  },
});
```

### Dynamic prefix

```js
engine.add({
  name: 'applyPhpFunctionPrefix',
  condition: (ctx) => ctx.phpFunctionPrefix,
  transform: (ctx) => ({
    ...ctx,
    functions: ctx.functions.map((fn) => ({
      ...fn,
      name: ctx.phpFunctionPrefix + fn.name,
    })),
  }),
});
```

## Test surface (Phase 1, 18 tests)

`tests/packages/rule-engine.test.js` covers:

- Empty engine: `run(input)` returns `input` unchanged.
- Single signal with truthy condition: transform runs.
- Single signal with `false` condition: transform skipped.
- Single signal with `undefined` return: treated as truthy (regression).
- Multiple signals: output of N is input of N+1.
- `condition` returning `false` short-circuits **only** that signal,
  engine advances to next (regression).
- `name` is logged when debug is enabled (`createEngine({ debug: true })`).
- `engine.remove(name)` correctly unsubscribes.
- `engine.clear()` resets the list.
- `engine.list()` returns the registered names in order.

## Anti-patterns

- **Don't** mutate the input in place. Always return a new object.
  The engine treats the input as immutable between signals.
- **Don't** use the engine for stateful workflows. The engine is
  designed for short, declarative, on-load transforms. For longer
  workflows, use a state machine or a queue.
- **Don't** register a signal whose `condition` does I/O (DB query,
  HTTP call). The engine runs every signal on every load; I/O
  conditions kill performance. Use `@wpsk/hooks` filters for I/O-gated
  work.
