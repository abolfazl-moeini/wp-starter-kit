/**
 * script.js — example entry point for the preact-counter example.
 *
 * Mounts the Counter component into <div id="counter-mount"> using
 * the html-utils mountComponent helper. The placeholder is generic; the
 * data-start attribute flows through elementProps and seeds the counter.
 *
 *   HTML:
 *     <div id="counter-mount" data-start="5"></div>
 *     <script type="module" src="./script.js"></script>
 */
import { mountComponent } from "../../packages/html-utils/index.js";
import { Counter } from "./Counter.js";

// Read the optional `data-start` attribute; default to 0.
const host = document.getElementById("counter-mount");
const startAttr = host ? host.getAttribute("data-start") : null;
const start = startAttr == null ? 0 : Number.parseInt(startAttr, 10) || 0;

mountComponent("counter-mount", Counter, { start });
