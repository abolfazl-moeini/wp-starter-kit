/** @jest-environment jsdom */
import { describe, test, expect, jest } from "@jest/globals";

import {
  WDForm,
  useWDForm,
  createWDFormStore,
} from "../../packages/ui-components/index.js";

describe("@wpdev/ui-components barrel exports", () => {
  test("exports WDForm public API", () => {
    expect(typeof WDForm).toBe("function");
    expect(typeof useWDForm).toBe("function");
    expect(typeof createWDFormStore).toBe("function");
  });

  test("createWDFormStore is instance-scoped (no global singleton)", () => {
    const a = createWDFormStore({ initialValues: { x: 1 } });
    const b = createWDFormStore({ initialValues: { x: 2 } });
    a.setValue("x", 10);
    expect(a.values.x).toBe(10);
    expect(b.values.x).toBe(2);
  });

  test("onSubmit receives values directly (no batchGetFormData)", async () => {
    const onSubmit = jest.fn(async () => undefined);
    const store = createWDFormStore({
      initialValues: { email: "a@b.com" },
      onSubmit,
    });
    await store.submit();
    expect(onSubmit).toHaveBeenCalledWith(
      { email: "a@b.com" },
      expect.any(Object),
    );
  });
});
