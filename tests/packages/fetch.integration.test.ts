import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

jest.mock("@wordpress/api-fetch", () => jest.fn());

import apiFetch from "@wordpress/api-fetch";
import { createBatchRequest } from "../../packages/fetch/src/index";

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

type Req = { cacheKey: string; type: string };
type Res = { items: Array<{ id: number; label: string }> };

describe("fetch + PHP batch contract integration", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedApiFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("maps batch response body.data and extra.cacheKey", async () => {
    mockedApiFetch.mockResolvedValue({
      responses: [
        {
          body: {
            data: { items: [{ id: 1, label: "Example" }] },
            extra: { cacheKey: "item-1" },
          },
        },
      ],
    });

    const batch = createBatchRequest<Req, Res>({
      uniqueKey: "cacheKey",
      cacheDriver: "memory",
      requestChunk: 5,
      requestDelay: 40,
      method: "POST",
      path: "/wpsk/v1/items",
      batchEndpoint: "/batch/v1",
    });

    const resultPromise = batch({ cacheKey: "item-1", type: "demo" });
    jest.advanceTimersByTime(40);
    const result = await resultPromise;

    expect(result.response.items[0].label).toBe("Example");
    expect(result.fresh).toBe(true);
  });
});
