/**
 * Counter.js — example Preact component for the preact-counter example.
 *
 * This file is a runnable demonstration of the mount utility, not a unit-test
 * target. It is intentionally generic (no brand prefix in markup) and uses
 * the standard Preact hooks API.
 *
 * Usage in HTML:
 *   <div id="counter-mount" data-start="0"></div>
 *   <script type="module" src="./script.js"></script>
 */
import { h, Fragment } from "preact";
import { useState } from "preact/hooks";

export function Counter(props) {
  const [count, setCount] = useState(
    typeof props.start === "number" ? props.start : 0,
  );
  const increment = () => setCount(count + 1);
  const reset = () => setCount(0);
  return h(
    Fragment,
    null,
    h("p", { "data-role": "count" }, `Count: ${count}`),
    h(
      "button",
      { type: "button", onClick: increment, "data-role": "increment" },
      "+1",
    ),
    h(
      "button",
      { type: "button", onClick: reset, "data-role": "reset" },
      "Reset",
    ),
  );
}

export default Counter;
