/** @jest-environment jsdom */
import { describe, test, expect, jest } from "@jest/globals";
import { h, render } from "preact";
import { act } from "preact/test-utils";

import { WDForm } from "../../packages/ui-components/WDForm/WDForm.js";
import { createWDFormStore } from "../../packages/ui-components/WDForm/createWDFormStore.js";

describe("WDForm component", () => {
  test("render prop receives form api and submit calls onSubmit", async () => {
    const onSubmit = jest.fn(async () => undefined);
    const container = document.createElement("div");
    document.body.appendChild(container);

    render(
      h(WDForm, {
        initialValues: { title: "Hello" },
        onSubmit,
        children: (form) =>
          h("input", { "data-testid": "title", ...form.register("title") }),
      }),
      container,
    );

    container
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onSubmit).toHaveBeenCalledWith(
      { title: "Hello" },
      expect.any(Object),
    );
  });

  test("accepts external signal store via store prop", () => {
    const store = createWDFormStore({ initialValues: { qty: 3 } });
    const container = document.createElement("div");
    document.body.appendChild(container);

    render(
      h(WDForm, {
        store,
        children: (form) =>
          h("span", { "data-testid": "qty" }, String(form.values.qty)),
      }),
      container,
    );

    expect(container.textContent).toContain("3");
    store.setValue("qty", 9);
    render(
      h(WDForm, {
        store,
        children: (form) =>
          h("span", { "data-testid": "qty" }, String(form.values.qty)),
      }),
      container,
    );
    expect(container.textContent).toContain("9");
  });

  test("fires hooks plugin actions when configured", () => {
    const actions = [];
    const hooksPlugin = {
      doAction: (name, ...args) => actions.push([name, ...args]),
    };

    const container = document.createElement("div");
    document.body.appendChild(container);

    render(
      h(WDForm, {
        initialValues: { name: "" },
        hooksPlugin,
        hookPrefix: "demo",
        onSubmit: async () => undefined,
        children: () => h("span", null, "ok"),
      }),
      container,
    );

    expect(actions.some(([name]) => name === "demo-form-init")).toBe(true);
  });

  test("view mode hides submit button and register is read-only", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    render(
      h(WDForm, {
        mode: "view",
        initialValues: { title: "Read only" },
        onSubmit: async () => undefined,
        children: (form) =>
          h("input", { "data-testid": "title", ...form.register("title") }),
      }),
      container,
    );

    expect(container.querySelector('button[type="submit"]')).toBeNull();
    const input = container.querySelector('[data-testid="title"]');
    expect(input?.readOnly).toBe(true);
    expect(input?.tabIndex).toBe(-1);
  });

  test("fetchInitialValues loads data when entityId is set", async () => {
    const fetchInitialValues = jest.fn(async (id) => ({
      title: `Entity ${id}`,
    }));
    const container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      render(
        h(WDForm, {
          entityId: 42,
          fetchInitialValues,
          onSubmit: async () => undefined,
          children: (form) =>
            h(
              "span",
              { "data-testid": "title" },
              String(form.values.title ?? ""),
            ),
        }),
        container,
      );
    });

    expect(fetchInitialValues).toHaveBeenCalledWith(42);

    await act(async () => {
      await fetchInitialValues.mock.results[0].value;
    });

    expect(container.textContent).toContain("Entity 42");
  });

  test("autoSave debounces submit on field change", async () => {
    jest.useFakeTimers();
    try {
      const onSubmit = jest.fn(async () => undefined);
      let formApi;
      const container = document.createElement("div");
      document.body.appendChild(container);

      render(
        h(WDForm, {
          initialValues: { note: "" },
          autoSave: true,
          autoSaveDelay: 300,
          onSubmit,
          children: (form) => {
            formApi = form;
            return h("input", {
              "data-testid": "note",
              ...form.register("note"),
            });
          },
        }),
        container,
      );

      formApi.setValue("note", "draft");

      jest.advanceTimersByTime(299);
      expect(onSubmit).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);

      expect(onSubmit).toHaveBeenCalledWith(
        { note: "draft" },
        expect.any(Object),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  test("debug panel renders values snapshot", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    render(
      h(WDForm, {
        debug: true,
        initialValues: { name: "Alice" },
        onSubmit: async () => undefined,
        children: () => h("span", null, "form"),
      }),
      container,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    const debug = container.querySelector(".wdform-debug");
    expect(debug).toBeTruthy();
    expect(debug?.textContent).toContain("Alice");
  });

  test("onDirtyLeave attaches beforeunload when form is dirty", async () => {
    const onDirtyLeave = jest.fn(() => false);
    const addSpy = jest.spyOn(window, "addEventListener");
    const store = createWDFormStore({
      initialValues: { name: "" },
      mode: "edit",
    });
    const container = document.createElement("div");
    document.body.appendChild(container);

    const props = {
      store,
      mode: "edit",
      onDirtyLeave,
      onSubmit: async () => undefined,
      children: (form) => h("input", { ...form.register("name") }),
    };

    await act(async () => {
      render(h(WDForm, props), container);
      store.setValue("name", "changed");
      render(h(WDForm, props), container);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(addSpy.mock.calls.some(([event]) => event === "beforeunload")).toBe(
      true,
    );

    addSpy.mockRestore();
  });
});
