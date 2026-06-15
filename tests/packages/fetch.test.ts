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
type Res = { fields: Array<{ name: string }> };

describe("createBatchRequest", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedApiFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("debounces and chunks requests after requestDelay", async () => {
    mockedApiFetch.mockResolvedValue({
      responses: [
        {
          body: {
            data: { fields: [{ name: "a" }] },
            extra: { cacheKey: "k1" },
          },
        },
        {
          body: {
            data: { fields: [{ name: "b" }] },
            extra: { cacheKey: "k2" },
          },
        },
      ],
    });

    const batch = createBatchRequest<Req, Res>({
      uniqueKey: "cacheKey",
      cacheDriver: "memory",
      requestChunk: 10,
      requestDelay: 80,
      method: "POST",
      path: "/wpsk/v1/items",
      batchEndpoint: "/batch/v1",
    });

    const p1 = batch({ cacheKey: "k1", type: "a" });
    const p2 = batch({ cacheKey: "k2", type: "b" });

    jest.advanceTimersByTime(80);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
    expect(r1.fresh).toBe(true);
    expect(r2.response.fields[0].name).toBe("b");
  });
});
