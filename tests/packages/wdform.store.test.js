import { describe, test, expect, jest } from "@jest/globals";

import { createWDFormStore } from "../../packages/ui-components/WDForm/createWDFormStore.js";

describe("WDForm createWDFormStore", () => {
  test("instances are isolated — no shared module state", () => {
    const a = createWDFormStore({ initialValues: { name: "A" } });
    const b = createWDFormStore({ initialValues: { name: "B" } });
    a.setValue("name", "Alice");
    expect(a.values.name).toBe("Alice");
    expect(b.values.name).toBe("B");
  });

  test("setValue tracks dirty fields and reset restores baseline", async () => {
    const store = createWDFormStore({ initialValues: { qty: 1 } });
    store.setValue("qty", 2);
    expect(store.isDirty.value).toBe(true);
    expect(store.dirtyFields.value.has("qty")).toBe(true);
    await store.reset();
    expect(store.values.qty).toBe(1);
    expect(store.isDirty.value).toBe(false);
  });

  test("submit validates and calls onSubmit with values", async () => {
    const onSubmit = jest.fn(async () => ({ ok: true }));
    const store = createWDFormStore({
      initialValues: { email: "" },
      rules: { email: { required: true } },
      onSubmit,
    });

    await store.submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(store.errors.value.email).toBeTruthy();

    store.setValue("email", "a@b.com");
    await store.submit();
    expect(onSubmit).toHaveBeenCalledWith(
      { email: "a@b.com" },
      expect.any(Object),
    );
    expect(store.status.value).toBe("idle");
  });

  test("resetAfterSubmit clears values after success", async () => {
    const store = createWDFormStore({
      initialValues: { name: "" },
      resetAfterSubmit: true,
      onSubmit: async () => undefined,
    });
    store.setValue("name", "Bob");
    await store.submit();
    expect(store.values.name).toBe("");
  });

  test("view mode register adds readOnly", () => {
    const store = createWDFormStore({
      initialValues: { title: "Hi" },
      mode: "view",
    });
    const props = store.register("title");
    expect(props.readOnly).toBe(true);
    expect(props.tabIndex).toBe(-1);
  });

  test("submit is ignored in view mode", async () => {
    const onSubmit = jest.fn();
    const store = createWDFormStore({
      mode: "view",
      onSubmit,
    });
    await store.submit();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("dispose prevents further mutations", async () => {
    const store = createWDFormStore({ initialValues: { a: 1 } });
    store.dispose();
    expect(() => store.setValue("a", 2)).toThrow(/disposed/i);
  });

  test("loadInitialValues hydrates fields and returns to idle", async () => {
    const store = createWDFormStore({ initialValues: {} });
    await store.loadInitialValues(async () => ({ name: "Loaded" }));
    expect(store.values.name).toBe("Loaded");
    expect(store.status.value).toBe("idle");
  });
});
