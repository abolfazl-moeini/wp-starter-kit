import { describe, test, expect } from "@jest/globals";

import {
  validateFieldSync,
  validateAll,
  getDependentFields,
} from "../../packages/ui-components/WDForm/validators.js";

describe("WDForm validators", () => {
  test("required rejects empty values", () => {
    expect(validateFieldSync("", { required: true })).toBe(
      "This field is required",
    );
    expect(validateFieldSync("ok", { required: true })).toBeNull();
  });

  test("minLength, maxLength, min, max, and pattern rules", () => {
    expect(validateFieldSync("a", { minLength: 2 })).toBe("Value is too short");
    expect(validateFieldSync("abcd", { maxLength: 3 })).toBe(
      "Value is too long",
    );
    expect(validateFieldSync(2, { min: 3 })).toBe("Value is too small");
    expect(validateFieldSync(10, { max: 5 })).toBe("Value is too large");
    expect(validateFieldSync("bad", { pattern: /^@/ })).toBe(
      "Value format is invalid",
    );
  });

  test("custom rule can return message string", () => {
    const error = validateFieldSync(
      "x",
      {
        custom: (value, all) => value === all.other || "Values must match",
      },
      { other: "y" },
    );
    expect(error).toBe("Values must match");
  });

  test("validateAll runs asyncCustom", async () => {
    const errors = await validateAll(
      { username: "taken" },
      {
        username: {
          asyncCustom: async (value) =>
            value === "taken" ? "Username unavailable" : true,
        },
      },
    );
    expect(errors.username).toBe("Username unavailable");
  });

  test("getDependentFields returns deps targets", () => {
    const deps = getDependentFields("password", {
      confirmPassword: { deps: ["password"] },
    });
    expect(deps).toEqual(["password", "confirmPassword"]);
  });
});
