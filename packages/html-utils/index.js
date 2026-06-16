/**
 * @wpsk/html-utils — DOM utilities for the @wpsk starter kit.
 *
 * Ported from `mrlogistic/assets/packages/html-utils/index.js`. Heavy
 * domain-specific helpers (SweetAlert2, jQuery, Datepicker, progressbar.js,
 * Jalali calendar, rest-utils) are intentionally omitted from this version —
 * consumers add them as their domain needs grow. What stays:
 *
 *   - `elementProps(element)`   data-* attribute → camelCase prop
 *   - `mountComponent(id, C, extra)`  Preact mount helper
 *   - `FreezeUI()` / `UnFreezeUI()`   Loading overlay
 *   - `currentLanguage()`        Reads <html lang="…">
 *   - `isRTL()`                  Detects RTL
 *   - `extractFormData(el)`      FormData → plain object
 *   - `findFormElement(scope)`   <form> lookup
 *   - `elementDispatchChangeEvent(el)`  fire a "change" Event
 *   - `formatDropDownOptions(arr)` / `formatOptionValue(opt)`  dropdown helpers
 *   - `isInputNameValid(name)`   Whitelist check
 *   - `SwitchableFocusElement(ctx, name)`  Focus switcher
 *
 * DOM-rendering helpers (mountComponent, FreezeUI) require a real DOM —
 * tests must run with jsdom or in a browser.
 */
import { h, render } from "preact";

/* ---------- Preact mount helpers --------------------------------------- */

/**
 * Convert a DOM element's `data-*` attributes into camelCased props.
 *
 * Values are JSON-parsed when possible, otherwise the raw string is kept.
 * This matches the convention from the source theme and gives consumers
 * a clean object to spread onto a Preact component.
 *
 *   data-foo="bar"             → { foo: 'bar' }
 *   data-enabled="true"        → { enabled: true }   (JSON.parse)
 *   data-count="42"            → { count: 42 }       (JSON.parse)
 *   data-label="hello world"   → { label: 'hello world' }  (raw string, parse fails)
 *
 * @param {Element} element
 * @returns {Object<string, *>}
 */
export function elementProps(element) {
  if (!element || !element.attributes) return {};
  const out = {};
  for (const attr of Array.from(element.attributes)) {
    if (!attr.name.startsWith("data-")) continue;
    // data-foo-bar → fooBar
    const key = attr.name
      .slice("data-".length)
      .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    // Try JSON parse so booleans/numbers/objects come through typed.
    let value = attr.value;
    try {
      value = JSON.parse(attr.value);
    } catch (_) {
      // keep raw string
    }
    out[key] = value;
  }
  return out;
}

/**
 * Render a Preact component into a DOM element by id.
 *
 * - Looks up `document.getElementById(elementId)`.
 * - No-op (returns `null`) when the element is absent.
 * - Spreads `elementProps(element)` (the data-* attribute bag) and
 *   `extraProps` (caller-supplied) onto the component. `extraProps`
 *   wins on key collision (spread last).
 *
 * @param {string} elementId
 * @param {import('preact').FunctionComponent<any>} Component
 * @param {Object<string, *>} [extraProps]
 * @returns {Element|null} the rendered root, or null if the element was missing
 */
export function mountComponent(elementId, Component, extraProps = {}) {
  if (typeof document === "undefined") return null;
  const element = document.getElementById(elementId);
  if (!element) return null;
  const props = { ...elementProps(element), ...extraProps };
  return render(h(Component, props), element);
}

/* ---------- Loading overlay ------------------------------------------- */

const LOADING_ID = "wpsk-loading";

export function FreezeUI() {
  if (typeof document === "undefined") return;
  if (document.getElementById(LOADING_ID)) {
    return;
  }
  const loading = document.createElement("div");
  loading.setAttribute("id", LOADING_ID);
  loading.innerHTML = `
  <div class="spinner">
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
  </div>
`;
  document.body.appendChild(loading);
}

export function UnFreezeUI() {
  if (typeof document === "undefined") return;
  const loading = document.getElementById(LOADING_ID);
  loading && loading.remove();
}

/* ---------- Language / direction -------------------------------------- */

export function currentLanguage() {
  if (typeof document === "undefined") return "";
  const lang = document.documentElement?.getAttribute("lang") || "";
  return lang.slice(0, 2).toLocaleLowerCase();
}

export function isRTL() {
  if (typeof document === "undefined") return false;
  const dir = document.documentElement?.getAttribute("dir");
  return dir === "rtl" || document.body?.classList?.contains("rtl");
}

/* ---------- Form helpers ---------------------------------------------- */

export function extractFormData(formHtmlElement) {
  if (!formHtmlElement) return {};
  return Object.fromEntries(new FormData(formHtmlElement));
}

export function findFormElement(wrapper) {
  if (!wrapper) return undefined;
  return (
    wrapper.querySelector?.("form.the-form") || wrapper.querySelector?.("form")
  );
}

export function elementDispatchChangeEvent(element) {
  if (typeof Event === "undefined") return;
  const event = new Event("change", { bubbles: true });
  element instanceof EventTarget && element.dispatchEvent(event);
}

/**
 * Whitelist check for an `<input name="…">` value: only ASCII letters,
 * digits, underscore, and dash; non-empty. Anchored + quantifier so the
 * whole string must be in the whitelist (a single-char pattern would let
 * `"foo bar"` or `"../etc"` slip through because the regex only checks
 * that *some* character matches).
 *
 * @param {string} inputName
 * @returns {boolean}
 */
export function isInputNameValid(inputName) {
  return typeof inputName === "string" && /^[A-Za-z0-9_-]+$/.test(inputName);
}

export function SwitchableFocusElement(context, switchableName) {
  if (!isInputNameValid(switchableName) || !context) {
    return;
  }
  const changedElement = context.querySelector?.(`[name="${switchableName}"]`);
  if (
    !changedElement?.classList?.contains("switchable-trigger") ||
    !changedElement?.checked
  ) {
    return;
  }
  const targetElement = changedElement
    .closest(".switchable-input")
    ?.querySelector(".conditional-field")
    ?.querySelector("input,selector");
  targetElement && targetElement.focus();
}

/* ---------- Dropdown helpers ------------------------------------------ */

export function formatDropDownOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map(formatOptionValue).filter((option) => !!option);
}

export function formatOptionValue(option) {
  if (typeof option === "object" && option !== null) {
    return option;
  }
  if (typeof option === "string") {
    return { key: option, value: option };
  }
  return undefined;
}

export default {
  elementProps,
  mountComponent,
  FreezeUI,
  UnFreezeUI,
  currentLanguage,
  isRTL,
  extractFormData,
  findFormElement,
  elementDispatchChangeEvent,
  formatDropDownOptions,
  formatOptionValue,
  isInputNameValid,
  SwitchableFocusElement,
};
