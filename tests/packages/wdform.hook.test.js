/** @jest-environment jsdom */
import { describe, test, expect } from "@jest/globals";
import { h, render } from "preact";

import { useWDForm } from "../../packages/ui-components/WDForm/useWDForm.js";

function HookProbe({ onReady }) {
  const form = useWDForm({
    initialValues: { name: "" },
    rules: { name: { required: true, minLength: 2 } },
    validateOn: "blur",
  });

  onReady(form);

  return h("input", { "data-testid": "name", ...form.register("name") });
}

describe("WDForm useWDForm", () => {
  test("register wires value changes and validation", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    let formApi;
    render(
      h(HookProbe, {
        onReady: (form) => {
          formApi = form;
        },
      }),
      container,
    );

    expect(formApi).toBeTruthy();
    formApi.register("name").onChange({ target: { value: "A" } });
    await formApi.validateFields(["name"]);
    expect(formApi.errors.name).toBe("Value is too short");

    formApi.setValue("name", "Alice");
    await formApi.validateFields(["name"]);
    expect(formApi.errors.name).toBeNull();
  });
});
