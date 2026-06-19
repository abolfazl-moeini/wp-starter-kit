# @wpdev/rule-engine

Signal-tuple rule engine for wp-starter-kit admin UIs.

## Install

```bash
npm install @wpdev/rule-engine
```

## Usage

```js
import { createRuleEngine } from "@wpdev/rule-engine";

const engine = createRuleEngine(rules);
engine.evaluate(signals);
```

## API

See [docs/api/js-reference.md](../../docs/api/js-reference.md#wpdevrule-engine) and
[signals.md](../../docs/signals.md).

## Part of wp-starter-kit

This package is part of [wp-starter-kit](../../README.md).
