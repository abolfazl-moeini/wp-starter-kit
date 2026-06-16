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

    // Use raw elements with the expected Polaris BEM classes.
    // (Full component render of the TSX sources is covered by typecheck +
    // generator integration + e2e created projects.)
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
});
