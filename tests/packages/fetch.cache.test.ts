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
import { createBatchRequest } from "../../packages/rest-utils/src/fetch/index";

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
      path: "/wpdev/v1/items",
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
      path: "/wpdev/v1/items",
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
      path: "/wpdev/v1/items",
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
      path: "/wpdev/v1/items",
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

  test("throws RangeError on non-positive requestChunk", () => {
    expect(() =>
      createBatchRequest<Req, Res>({
        uniqueKey: "cacheKey",
        cacheDriver: "memory",
        requestChunk: 0,
        requestDelay: 10,
        method: "POST",
        path: "/wpdev/v1/items",
        batchEndpoint: "/batch/v1",
      }),
    ).toThrow(RangeError);

    expect(() =>
      createBatchRequest<Req, Res>({
        uniqueKey: "cacheKey",
        cacheDriver: "memory",
        requestChunk: -5,
        requestDelay: 10,
        method: "POST",
        path: "/wpdev/v1/items",
        batchEndpoint: "/batch/v1",
      }),
    ).toThrow(RangeError);
  });

  test("sends outer POST and subrequest method matching WP Core /batch/v1 protocol", async () => {
    mockedApiFetch.mockResolvedValue({
      responses: [
        { body: { data: { ok: true }, extra: { cacheKey: "wp-core-batch" } } },
      ],
    });

    const batch = createBatchRequest<Req, Res>({
      uniqueKey: "cacheKey",
      cacheDriver: "memory",
      requestChunk: 10,
      requestDelay: 20,
      method: "PUT",
      path: "/wpdev/v1/items/123",
      batchEndpoint: "/batch/v1",
    });

    const pending = batch({ cacheKey: "wp-core-batch" });
    jest.advanceTimersByTime(20);
    await pending;

    expect(mockedApiFetch).toHaveBeenCalledWith({
      path: "/batch/v1",
      method: "POST",
      data: {
        requests: [
          {
            method: "PUT",
            path: "/wpdev/v1/items/123",
            body: { cacheKey: "wp-core-batch" },
          },
        ],
      },
    });
  });

  test("subrequest HTTP 4xx fails with error", async () => {
    mockedApiFetch.mockResolvedValue({
      responses: [
        {
          status: 404,
          body: { code: "not_found", message: "Item not found" },
        },
      ],
    });

    const batch = createBatchRequest<Req, Res>({
      uniqueKey: "cacheKey",
      cacheDriver: "memory",
      requestChunk: 10,
      requestDelay: 10,
      method: "GET",
      path: "/wpdev/v1/items",
      batchEndpoint: "/batch/v1",
    });

    const pending = batch({ cacheKey: "missing" });
    jest.advanceTimersByTime(10);
    await expect(pending).rejects.toThrow(/status 404/);
  });

  test("requireCacheKey: false allows standard WP REST responses without extra.cacheKey", async () => {
    mockedApiFetch.mockResolvedValue({
      responses: [
        {
          status: 200,
          body: { ok: true },
        },
      ],
    });

    const batch = createBatchRequest<Req, Res>({
      uniqueKey: "cacheKey",
      cacheDriver: "memory",
      requestChunk: 10,
      requestDelay: 10,
      method: "GET",
      path: "/wpdev/v1/items",
      batchEndpoint: "/batch/v1",
      requireCacheKey: false,
    });

    const pending = batch({ cacheKey: "std-endpoint" });
    jest.advanceTimersByTime(10);
    const result = await pending;

    expect(result.fresh).toBe(true);
    expect(result.response.ok).toBe(true);
  });

  test("clearCache() clears cache and allows re-fetching", async () => {
    mockedApiFetch.mockResolvedValue({
      responses: [{ body: { data: { ok: true }, extra: { cacheKey: "clr" } } }],
    });

    const batch = createBatchRequest<Req, Res>({
      uniqueKey: "cacheKey",
      cacheDriver: "memory",
      requestChunk: 10,
      requestDelay: 10,
      method: "POST",
      path: "/wpdev/v1/items",
      batchEndpoint: "/batch/v1",
    });

    const p1 = batch({ cacheKey: "clr" });
    jest.advanceTimersByTime(10);
    const r1 = await p1;
    expect(r1.fresh).toBe(true);

    // Call clearCache
    batch.clearCache();

    // Next fetch should trigger network request
    const p2 = batch({ cacheKey: "clr" });
    jest.advanceTimersByTime(10);
    const r2 = await p2;
    expect(r2.fresh).toBe(true);
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
  });
});
