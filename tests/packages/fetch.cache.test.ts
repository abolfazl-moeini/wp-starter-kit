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

type Req = { cacheKey: string };
type Res = { ok: boolean };

describe("createBatchRequest cache behavior", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedApiFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("returns fresh:false on cache hit", async () => {
    mockedApiFetch.mockResolvedValue({
      responses: [
        { body: { data: { ok: true }, extra: { cacheKey: "same" } } },
      ],
    });

    const batch = createBatchRequest<Req, Res>({
      uniqueKey: "cacheKey",
      cacheDriver: "memory",
      requestChunk: 10,
      requestDelay: 50,
      method: "POST",
      path: "/wpsk/v1/items",
      batchEndpoint: "/batch/v1",
    });

    const firstPromise = batch({ cacheKey: "same" });
    jest.advanceTimersByTime(50);
    const first = await firstPromise;
    expect(first.fresh).toBe(true);

    const second = await batch({ cacheKey: "same" });
    expect(second.fresh).toBe(false);
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
  });

  test("concurrent callers share pending promise", async () => {
    let resolveFetch!: (value: {
      responses: Array<{ body: { data: Res; extra: { cacheKey: string } } }>;
    }) => void;
    mockedApiFetch.mockImplementation(
      (() =>
        new Promise((resolve: typeof resolveFetch) => {
          resolveFetch = resolve;
        })) as unknown as typeof apiFetch,
    );

    const batch = createBatchRequest<Req, Res>({
      uniqueKey: "cacheKey",
      cacheDriver: "memory",
      requestChunk: 10,
      requestDelay: 20,
      method: "POST",
      path: "/wpsk/v1/items",
      batchEndpoint: "/batch/v1",
    });

    const p1 = batch({ cacheKey: "pending" });
    const p2 = batch({ cacheKey: "pending" });
    jest.advanceTimersByTime(20);

    resolveFetch({
      responses: [
        { body: { data: { ok: true }, extra: { cacheKey: "pending" } } },
      ],
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.fresh).toBe(true);
    expect(r2.fresh).toBe(true);
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
  });

  test("missing extra.cacheKey rejects with Error", async () => {
    mockedApiFetch.mockResolvedValue({
      responses: [{ body: { data: { ok: true } } }],
    });

    const batch = createBatchRequest<Req, Res>({
      uniqueKey: "cacheKey",
      cacheDriver: "memory",
      requestChunk: 10,
      requestDelay: 10,
      method: "POST",
      path: "/wpsk/v1/items",
      batchEndpoint: "/batch/v1",
    });

    const pending = batch({ cacheKey: "bad" });
    jest.advanceTimersByTime(10);

    await expect(pending).rejects.toThrow(/extra\.cacheKey/);
  });

  test("failed requests are cleared from cache to allow retries", async () => {
    mockedApiFetch.mockRejectedValueOnce(new Error("network error"));
    mockedApiFetch.mockResolvedValueOnce({
      responses: [
        { body: { data: { ok: true }, extra: { cacheKey: "retry-key" } } },
      ],
    });

    const batch = createBatchRequest<Req, Res>({
      uniqueKey: "cacheKey",
      cacheDriver: "memory",
      requestChunk: 10,
      requestDelay: 10,
      method: "POST",
      path: "/wpsk/v1/items",
      batchEndpoint: "/batch/v1",
    });

    const first = batch({ cacheKey: "retry-key" });
    jest.advanceTimersByTime(10);
    await expect(first).rejects.toThrow("network error");

    // Second call should trigger another network request because the first was cleared on failure
    const second = batch({ cacheKey: "retry-key" });
    jest.advanceTimersByTime(10);
    const result = await second;
    expect(result.fresh).toBe(true);
    expect(result.response.ok).toBe(true);
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
  });
});
