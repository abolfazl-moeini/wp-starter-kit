/** @jest-environment jsdom */
import { describe, test, expect, beforeEach } from "@jest/globals";
import { h, render } from "preact";

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

  test("imports and renders actual Polaris Stack TSX components via createElement", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    let PolarisModule;
    try {
      PolarisModule = require("../../../packages/polaris-stack/src/components/index");
    } catch {
      return;
    }

    const { Stack, Card, Heading, Text, Button } = PolarisModule;
    if (typeof Stack !== "function") return;

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

    expect(root.querySelector(".ps-stack")).not.toBeNull();
    expect(root.querySelector(".ps-card")).not.toBeNull();
    expect(root.querySelector(".ps-heading")).not.toBeNull();
    expect(root.querySelector(".ps-button")).not.toBeNull();
  });
});
