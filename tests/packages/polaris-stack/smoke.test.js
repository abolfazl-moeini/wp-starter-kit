/** @jest-environment jsdom */
import { describe, test, expect, beforeEach, beforeAll } from "@jest/globals";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { h, render } from "preact";

const POLARIS_DIST = join(
  process.cwd(),
  "packages/polaris-stack/dist/index.js",
);

let Stack;
let Button;
let Card;
let Heading;
let Text;

beforeAll(() => {
  if (!existsSync(POLARIS_DIST)) {
    execSync("npm run build", {
      cwd: join(process.cwd(), "packages/polaris-stack"),
      stdio: "pipe",
    });
  }
  const polaris = require(POLARIS_DIST);
  ({ Stack, Button, Card, Heading, Text } = polaris);
});

describe("polaris-stack smoke render", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });

  test("renders BEM class structure without runtime style tags (proves no CSS-in-JS)", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    function Demo() {
      return h("div", { className: "ps-stack" }, [
        h("div", { className: "ps-card" }, [
          h("h2", { className: "ps-heading ps-heading-2" }, "Hello"),
          h("p", { className: "ps-text" }, "Body"),
          h(
            "button",
            { className: "ps-button ps-button-solid", type: "button" },
            "Action",
          ),
        ]),
      ]);
    }

    render(h(Demo, null), root);

    expect(root.querySelector(".ps-stack")).not.toBeNull();
    expect(root.querySelector(".ps-card")).not.toBeNull();
    expect(root.querySelector(".ps-heading")).not.toBeNull();
    expect(root.querySelector(".ps-text")).not.toBeNull();
    expect(root.querySelector(".ps-button")).not.toBeNull();
    expect(document.querySelectorAll("style").length).toBe(0);
  });

  test("renders Polaris Stack TSX components with layout CSS variables", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    function Demo() {
      return h(
        Stack,
        { gap: "4" },
        h(Card, null, [
          h(Heading, { level: 2 }, "Hello"),
          h(Text, null, "Body"),
          h(Button, { variant: "solid" }, "Action"),
        ]),
      );
    }

    render(h(Demo, null), root);

    const stack = root.querySelector(".ps-stack");
    expect(stack).not.toBeNull();
    expect(stack.style.getPropertyValue("--ps-gap")).toBe("var(--ps-space-4)");
    expect(root.querySelector(".ps-card")).not.toBeNull();
    expect(root.querySelector(".ps-heading")).not.toBeNull();
    expect(root.querySelector(".ps-button")).not.toBeNull();
    expect(document.querySelectorAll("style").length).toBe(0);
  });
});
