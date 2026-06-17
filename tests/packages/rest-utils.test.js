/** @jest-environment jsdom */
import { describe, test, expect, beforeEach, jest } from "@jest/globals";

let createRestUtils;
let mockHooks;
let mockLocalize;
let mockApiFetch;
let mockFetch;

beforeEach(async () => {
  jest.resetModules();
  mockHooks = { doAction: jest.fn(), addAction: jest.fn() };
  mockLocalize = { get: jest.fn() };
  mockApiFetch = jest.fn(async (opts) => ({ ok: true, opts }));
  mockFetch = jest.fn(async () => ({
    json: async () => ({ ok: true }),
  }));
  mockLocalize.get.mockImplementation((key) => {
    if (key === "api.url") return "https://api.example.test/wp-json/";
    if (key === "api.nonce") return "rest-nonce";
    if (key === "api_x.url") return "https://api-x.example.test/";
    if (key === "api_x.nonce") return "restx-nonce";
    return undefined;
  });
  const mod = await import("../../packages/rest-utils/index.js");
  createRestUtils = mod.createRestUtils;
});

describe("@wpdev/rest-utils — restRequest (via createRestUtils DI)", () => {
  test("fires <hookPrefix>-request-ajax-start before the fetch", async () => {
    const ru = createRestUtils({
      hooks: mockHooks,
      localize: mockLocalize,
      apiFetch: mockApiFetch,
      hookPrefix: "wpdev",
      slug: "wpdev-starter",
    });
    await ru.restRequest("items");

    const startCall = mockHooks.doAction.mock.calls.find(
      ([name]) => name === "wpdev-request-ajax-start",
    );
    expect(startCall).toBeDefined();
    const startIdx = mockHooks.doAction.mock.calls.findIndex(
      ([name]) => name === "wpdev-request-ajax-start",
    );
    const doneIdx = mockHooks.doAction.mock.calls.findIndex(
      ([name]) => name === "wpdev-request-ajax-done",
    );
    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(doneIdx).toBeGreaterThan(startIdx);
  });

  test("fires <hookPrefix>-request-ajax-done in finally (on success)", async () => {
    const ru = createRestUtils({
      hooks: mockHooks,
      localize: mockLocalize,
      apiFetch: mockApiFetch,
      hookPrefix: "wpdev",
      slug: "wpdev-starter",
    });
    await ru.restRequest("items");
    const doneCall = mockHooks.doAction.mock.calls.find(
      ([name]) => name === "wpdev-request-ajax-done",
    );
    expect(doneCall).toBeDefined();
  });

  test("uses <slug>/v1/ URL pattern (config-driven, not hardcoded)", async () => {
    const ru = createRestUtils({
      hooks: mockHooks,
      localize: mockLocalize,
      apiFetch: mockApiFetch,
      hookPrefix: "wpdev",
      slug: "wpdev-starter",
    });
    await ru.restRequest("items");
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    const callArg = mockApiFetch.mock.calls[0][0];
    expect(callArg.path).toMatch(/\/wpdev-starter\/v1\/items/);
  });

  test("reads api.url and api.nonce from localize for WP REST headers", async () => {
    const ru = createRestUtils({
      hooks: mockHooks,
      localize: mockLocalize,
      apiFetch: mockApiFetch,
      hookPrefix: "wpdev",
      slug: "wpdev-starter",
    });
    expect(ru.restRootUrl()).toBe("https://api.example.test/wp-json/");
    expect(ru.restNonce()).toBe("rest-nonce");
    expect(ru.restHeaders()).toEqual({
      "Content-type": "application/json; charset=utf-8",
      "X-WP-Nonce": "rest-nonce",
    });
    expect(mockLocalize.get).toHaveBeenCalledWith("api.url");
    expect(mockLocalize.get).toHaveBeenCalledWith("api.nonce");
  });

  test("uses custom hookPrefix + slug from injected config (NOT hardcoded)", async () => {
    const ru = createRestUtils({
      hooks: mockHooks,
      localize: mockLocalize,
      apiFetch: mockApiFetch,
      hookPrefix: "myapp",
      slug: "my-app",
    });
    await ru.restRequest("users");

    const startCall = mockHooks.doAction.mock.calls.find(
      ([name]) => name === "myapp-request-ajax-start",
    );
    expect(startCall).toBeDefined();
    const callArg = mockApiFetch.mock.calls[0][0];
    expect(callArg.path).toMatch(/\/my-app\/v1\/users/);
  });
});

describe("@wpdev/rest-utils — restXRequest (via createRestUtils DI)", () => {
  test("restXRequest reads api_x.url from localize and fires hooks", async () => {
    const ru = createRestUtils({
      hooks: mockHooks,
      localize: mockLocalize,
      fetch: mockFetch,
      hookPrefix: "wpdev",
      slug: "wpdev-starter",
    });

    expect(ru.restXRootUrl()).toBe("https://api-x.example.test/");
    expect(ru.restXUrl("widget")).toBe("https://api-x.example.test/widget");

    await ru.restXRequest("widget", { method: "POST", data: { x: 1 } });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api-x.example.test/widget");
    expect(options.headers["X-WP-Nonce"]).toBe("restx-nonce");

    const startCall = mockHooks.doAction.mock.calls.find(
      ([name]) => name === "wpdev-request-ajax-start",
    );
    const doneCall = mockHooks.doAction.mock.calls.find(
      ([name]) => name === "wpdev-request-ajax-done",
    );
    expect(startCall).toBeDefined();
    expect(doneCall).toBeDefined();
  });
});
