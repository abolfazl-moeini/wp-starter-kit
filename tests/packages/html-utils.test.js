/** @jest-environment jsdom */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { h } from "preact";

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("@wpdev/html-utils — elementProps", () => {
  test('converts data-foo="bar" to { foo: "bar" }', async () => {
    const { elementProps } = await import("../../packages/html-utils/index.js");
    const el = document.createElement("div");
    el.setAttribute("data-foo", "bar");
    expect(elementProps(el)).toEqual({ foo: "bar" });
  });

  test('converts data-foo-bar="1" (kebab) to { fooBar: 1 } (camelCase + JSON parse)', async () => {
    const { elementProps } = await import("../../packages/html-utils/index.js");
    const el = document.createElement("div");
    el.setAttribute("data-foo-bar", "1");
    // '1' is valid JSON → parsed to number 1
    expect(elementProps(el)).toEqual({ fooBar: 1 });
  });

  test('camelCases non-JSON-parseable values (data-my-field = "x" → myField: "x")', async () => {
    const { elementProps } = await import("../../packages/html-utils/index.js");
    const el = document.createElement("div");
    el.setAttribute("data-my-field", "x");
    expect(elementProps(el)).toEqual({ myField: "x" });
  });

  test("JSON-parses valid JSON values (numbers, booleans, objects)", async () => {
    const { elementProps } = await import("../../packages/html-utils/index.js");
    const el = document.createElement("div");
    el.setAttribute("data-count", "42");
    el.setAttribute("data-enabled", "true");
    el.setAttribute("data-options", '{"a":1}');
    const props = elementProps(el);
    expect(props.count).toBe(42);
    expect(props.enabled).toBe(true);
    expect(props.options).toEqual({ a: 1 });
  });

  test("returns raw string for non-JSON-parseable values", async () => {
    const { elementProps } = await import("../../packages/html-utils/index.js");
    const el = document.createElement("div");
    el.setAttribute("data-label", "plain string with spaces");
    el.setAttribute("data-url", "https://example.test/path?q=1");
    const props = elementProps(el);
    expect(props.label).toBe("plain string with spaces");
    expect(props.url).toBe("https://example.test/path?q=1");
  });
});

describe("@wpdev/html-utils — isInputNameValid (whole-string whitelist)", () => {
  test("accepts plain ASCII names (alphanumerics, underscores, dashes)", async () => {
    const { isInputNameValid } =
      await import("../../packages/html-utils/index.js");
    expect(isInputNameValid("foo")).toBe(true);
    expect(isInputNameValid("foo_bar")).toBe(true);
    expect(isInputNameValid("foo-bar")).toBe(true);
    expect(isInputNameValid("Foo123")).toBe(true);
    expect(isInputNameValid("a")).toBe(true);
  });

  test("rejects names with ANY non-whitelisted character (whitespace, dot, slash, angle bracket, etc.)", async () => {
    const { isInputNameValid } =
      await import("../../packages/html-utils/index.js");
    // Whitespace
    expect(isInputNameValid("foo bar")).toBe(false);
    expect(isInputNameValid(" foo")).toBe(false);
    expect(isInputNameValid("foo ")).toBe(false);
    // Path-traversal-ish
    expect(isInputNameValid("../etc/passwd")).toBe(false);
    expect(isInputNameValid("foo/bar")).toBe(false);
    expect(isInputNameValid("foo\\bar")).toBe(false);
    // HTML-injection-ish
    expect(isInputNameValid("<script>")).toBe(false);
    expect(isInputNameValid('"foo"')).toBe(false);
    expect(isInputNameValid("foo'bar")).toBe(false);
    // Misc
    expect(isInputNameValid("foo;bar")).toBe(false);
    expect(isInputNameValid("foo=bar")).toBe(false);
    expect(isInputNameValid("foo&bar")).toBe(false);
  });

  test("rejects empty string (no character to validate)", async () => {
    const { isInputNameValid } =
      await import("../../packages/html-utils/index.js");
    expect(isInputNameValid("")).toBe(false);
  });
});

describe("@wpdev/html-utils — mountComponent", () => {
  test("mountComponent renders a Preact component into the target div", async () => {
    const { mountComponent } =
      await import("../../packages/html-utils/index.js");
    const placeholder = document.createElement("div");
    placeholder.id = "mount-target-1";
    document.body.appendChild(placeholder);

    function Hello(props) {
      return h("p", null, `hi ${props.name}`);
    }

    mountComponent("mount-target-1", Hello, { name: "world" });
    const rendered = document.getElementById("mount-target-1");
    expect(rendered).not.toBeNull();
    expect(rendered.textContent).toBe("hi world");
  });

  test("mountComponent is a no-op when target element does not exist", async () => {
    const { mountComponent } =
      await import("../../packages/html-utils/index.js");
    function Noop() {
      return h("span", null, "should not render");
    }
    expect(() => mountComponent("does-not-exist", Noop, {})).not.toThrow();
    expect(document.getElementById("does-not-exist")).toBeNull();
  });
});
