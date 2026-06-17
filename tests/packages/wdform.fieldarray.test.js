import { describe, test, expect } from "@jest/globals";

import { createWDFormStore } from "../../packages/ui-components/WDForm/createWDFormStore.js";

describe("WDForm fieldArray", () => {
  test("append, remove, move, and register row fields", () => {
    const store = createWDFormStore({ initialValues: { items: [] } });
    const items = store.fieldArray("items");

    items.append({ name: "One" });
    items.append({ name: "Two" });
    expect(items.fields).toHaveLength(2);

    const row = items.register(1, "name");
    expect(row.value).toBe("Two");
    row.onChange({ target: { value: "Updated" } });
    expect(store.values.items[1].name).toBe("Updated");

    items.move(0, 1);
    expect(store.values.items[0].name).toBe("Updated");

    items.remove(1);
    expect(store.values.items).toHaveLength(1);
  });
});
