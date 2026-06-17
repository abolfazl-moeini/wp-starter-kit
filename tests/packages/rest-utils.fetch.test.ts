import { describe, test, expect } from "@jest/globals";
import { createBatchRequest } from "../../packages/rest-utils/src/fetch/index";

describe("@wpdev/rest-utils batch fetch", () => {
  test("exports createBatchRequest from merged fetch module", () => {
    expect(typeof createBatchRequest).toBe("function");
  });
});