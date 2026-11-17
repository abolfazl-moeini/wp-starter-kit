/**
 * @jest-environment jsdom
 */

import {
  getModuleConfig,
  getNonce,
  updateNonce,
  onNonceChange,
  mockConfig,
  resetConfig,
  createNonceRecoveryMiddleware,
} from "../src/index";

describe("@wpdev/config", () => {
  const originalGlobal = { ...globalThis };

  beforeEach(() => {
    resetConfig();
    delete (globalThis as any).wpdev;
    delete (globalThis as any).wpApiSettings;
    delete (globalThis as any).wpdev_ajax;
    delete (globalThis as any).wpdevLegacySettings;
  });

  afterAll(() => {
    resetConfig();
    (globalThis as any).wpdev = (originalGlobal as any).wpdev;
  });

  describe("getModuleConfig", () => {
    it("returns defaults when no globals or container are provided", () => {
      const config = getModuleConfig({
        module: "tickets",
        defaults: {
          restUrl: "/default",
          brand: "acme",
          allowOrder: false,
          tzOffset: 0,
        },
      });

      expect(config.restUrl).toBe("/default");
      expect(config.brand).toBe("acme");
      expect(config.allowOrder).toBe(false);
      expect(config.tzOffset).toBe(0);
      expect(Object.isFrozen(config)).toBe(true);
    });

    it("does not poison subsequent container or global reads after a containerless call", () => {
      // First call without container or globals returns defaults
      const initial = getModuleConfig({
        module: "tickets",
        defaults: {
          restUrl: "",
          nonce: "",
          brand: "acme",
          tzOffset: 0,
          allowOrder: false,
        },
      });
      expect(initial.restUrl).toBe("");

      // Subsequent call with container dataset must NOT be overwritten by initial defaults
      const container = document.createElement("div");
      container.dataset.restUrl = "https://site.test/wp-json/wpdev-tickets/v1";
      container.dataset.nonce = "container-nonce-999";
      container.dataset.brand = "custom-brand";
      container.dataset.allowOrder = "1";

      const fromContainer = getModuleConfig({
        module: "tickets",
        container,
        defaults: {
          restUrl: "",
          nonce: "",
          brand: "acme",
          tzOffset: 0,
          allowOrder: false,
        },
      });

      expect(fromContainer.restUrl).toBe(
        "https://site.test/wp-json/wpdev-tickets/v1",
      );
      expect(fromContainer.nonce).toBe("container-nonce-999");
      expect(fromContainer.brand).toBe("custom-brand");
      expect(fromContainer.allowOrder).toBe(true);
    });

    it("merges legacy globals when specified", () => {
      (globalThis as any).wpdevLegacySettings = {
        restUrl: "/legacy-rest",
        brand: "legacy-brand",
      };

      const config = getModuleConfig({
        module: "tickets",
        legacyGlobals: ["wpdevLegacySettings"],
        defaults: {
          restUrl: "/default",
          brand: "default",
          allowOrder: true,
        },
      });

      expect(config.restUrl).toBe("/legacy-rest");
      expect(config.brand).toBe("legacy-brand");
      expect(config.allowOrder).toBe(true);
    });

    it("prefers window.wpdev[module] over legacy globals and defaults", () => {
      (globalThis as any).wpdevLegacySettings = {
        restUrl: "/legacy-rest",
        brand: "legacy-brand",
      };
      (globalThis as any).wpdev = {
        tickets: {
          restUrl: "/modern-rest",
          brand: "modern-brand",
          nonce: "modern-nonce",
        },
      };

      const config = getModuleConfig({
        module: "tickets",
        legacyGlobals: ["wpdevLegacySettings"],
        defaults: {
          restUrl: "/default",
          brand: "default",
          allowOrder: false,
        },
      });

      expect(config.restUrl).toBe("/modern-rest");
      expect(config.brand).toBe("modern-brand");
      expect(config.nonce).toBe("modern-nonce");
      expect(config.allowOrder).toBe(false);
    });

    it("hydrates and coerces container dataset attributes properly", () => {
      const container = document.createElement("div");
      container.dataset.restUrl = "/dataset-rest";
      container.dataset.allowOrder = "1";
      container.dataset.tzOffset = "3.5";
      container.dataset.isActive = "true";
      container.dataset.isArchived = "false";
      container.dataset.zeroFlag = "0";

      const config = getModuleConfig({
        module: "tickets",
        container,
        defaults: {
          brand: "default-brand",
        },
      });

      expect(config.restUrl).toBe("/dataset-rest");
      expect(config.allowOrder).toBe(true);
      expect(config.tzOffset).toBe(3.5);
      expect(config.isActive).toBe(true);
      expect(config.isArchived).toBe(false);
      expect(config.zeroFlag).toBe(false);
      expect(config.brand).toBe("default-brand");

      // Verify WeakMap memoization
      const configSecond = getModuleConfig({
        module: "tickets",
        container,
      });
      expect(configSecond).toBe(config);
    });

    it("preserves numeric 0 for number defaults and string type for hex/numeric nonces", () => {
      const container = document.createElement("div");
      container.dataset.tzOffset = "0";
      container.dataset.nonce = "12345e6789"; // scientific-looking hex nonce
      container.dataset.brand = ""; // empty string should not overwrite non-empty default

      const config = getModuleConfig({
        module: "tickets",
        container,
        defaults: {
          restUrl: "",
          nonce: "",
          tzOffset: 0,
          brand: "acme",
          allowOrder: false,
        },
      });

      expect(config.tzOffset).toBe(0);
      expect(typeof config.tzOffset).toBe("number");
      expect(config.nonce).toBe("12345e6789");
      expect(typeof config.nonce).toBe("string");
      expect(config.brand).toBe("acme");
    });
  });

  describe("getNonce & updateNonce", () => {
    it("retrieves nonce from module store, window.wpdev, wpApiSettings, and wpdev_ajax in priority", () => {
      expect(getNonce("tickets")).toBe("");

      (globalThis as any).wpdev_ajax = { nonce: "ajax-nonce" };
      expect(getNonce("tickets")).toBe("ajax-nonce");

      (globalThis as any).wpApiSettings = { nonce: "api-nonce" };
      expect(getNonce("tickets")).toBe("api-nonce");

      (globalThis as any).wpdev = { tickets: { nonce: "module-window-nonce" } };
      expect(getNonce("tickets")).toBe("module-window-nonce");

      updateNonce("store-fresh-nonce", "tickets");
      expect(getNonce("tickets")).toBe("store-fresh-nonce");
      expect((globalThis as any).wpdev.tickets.nonce).toBe("store-fresh-nonce");
    });

    it("syncs legacy globals and invalidates container cache on updateNonce", () => {
      (globalThis as any).wpdevLegacySettings = { nonce: "old-legacy" };
      const container = document.createElement("div");
      container.dataset.restUrl = "/api";

      const initial = getModuleConfig({
        module: "tickets",
        container,
        legacyGlobals: ["wpdevLegacySettings"],
        defaults: { restUrl: "", nonce: "" },
      });
      expect(initial.nonce).toBe("old-legacy");

      updateNonce("new-synced-nonce", "tickets");
      expect((globalThis as any).wpdevLegacySettings.nonce).toBe(
        "new-synced-nonce",
      );

      const afterUpdate = getModuleConfig({
        module: "tickets",
        container,
        legacyGlobals: ["wpdevLegacySettings"],
        defaults: { restUrl: "", nonce: "" },
      });
      expect(afterUpdate.nonce).toBe("new-synced-nonce");
    });

    it("notifies subscribers on updateNonce", () => {
      const listener = jest.fn();
      const unsubscribe = onNonceChange(listener);

      updateNonce("new-token-123", "tickets");
      expect(listener).toHaveBeenCalledWith("new-token-123", "tickets");

      unsubscribe();
      updateNonce("new-token-456", "tickets");
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("mockConfig & resetConfig", () => {
    it("allows mocking config for tests and resets completely", () => {
      mockConfig("tickets", { restUrl: "/mocked-url", nonce: "mocked-nonce" });
      const config = getModuleConfig({ module: "tickets" });
      expect(config.restUrl).toBe("/mocked-url");
      expect(getNonce("tickets")).toBe("mocked-nonce");

      resetConfig();
      const resetConf = getModuleConfig({
        module: "tickets",
        defaults: { restUrl: "/default" },
      });
      expect(resetConf.restUrl).toBe("/default");
    });
  });

  describe("createNonceRecoveryMiddleware", () => {
    it("passes through successful requests without modification", async () => {
      const middleware = createNonceRecoveryMiddleware({ module: "tickets" });
      const next = jest.fn().mockResolvedValue({ success: true });

      const res = await middleware({ path: "/tickets" }, next);
      expect(res).toEqual({ success: true });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("intercepts rest_cookie_invalid_nonce and retries once with fresh nonce", async () => {
      (globalThis as any).wpApiSettings = { nonce: "fresh-recovered-nonce" };

      const middleware = createNonceRecoveryMiddleware({ module: "tickets" });
      let callCount = 0;
      const next = jest.fn().mockImplementation((options) => {
        callCount++;
        if (callCount === 1) {
          const err: any = new Error("Cookie check failed");
          err.code = "rest_cookie_invalid_nonce";
          err.status = 403;
          return Promise.reject(err);
        }
        return Promise.resolve({ success: true, options });
      });

      const requestOptions = {
        path: "/tickets",
        headers: { "X-WP-Nonce": "old-stale-nonce" },
      };

      const res = await middleware(requestOptions, next);
      expect(res.success).toBe(true);
      expect(next).toHaveBeenCalledTimes(2);
      expect(requestOptions.headers["X-WP-Nonce"]).toBe(
        "fresh-recovered-nonce",
      );
      expect(getNonce("tickets")).toBe("fresh-recovered-nonce");
    });

    it("recovers from wpApiSettings even when window.wpdev[module].nonce still holds the failed nonce", async () => {
      (globalThis as any).wpdev = { tickets: { nonce: "stale-module-nonce" } };
      (globalThis as any).wpApiSettings = { nonce: "heartbeat-fresh-nonce" };

      const middleware = createNonceRecoveryMiddleware({
        module: "tickets",
        getCurrentNonce: () => "stale-module-nonce",
      });

      let callCount = 0;
      const next = jest.fn().mockImplementation((options) => {
        callCount++;
        if (callCount === 1) {
          const err: any = new Error("Cookie check failed");
          err.code = "rest_cookie_invalid_nonce";
          err.status = 403;
          return Promise.reject(err);
        }
        return Promise.resolve({ success: true, options });
      });

      // Simulate @wordpress/api-fetch where outer requestOptions has no X-WP-Nonce yet
      const requestOptions: any = { path: "/tickets", headers: {} };
      const res = await middleware(requestOptions, next);

      expect(res.success).toBe(true);
      expect(next).toHaveBeenCalledTimes(2);
      expect(requestOptions.headers["X-WP-Nonce"]).toBe(
        "heartbeat-fresh-nonce",
      );
      expect((globalThis as any).wpdev.tickets.nonce).toBe(
        "heartbeat-fresh-nonce",
      );
    });

    it("invokes active refreshNonce callback if current nonce is stale", async () => {
      updateNonce("stale-nonce", "tickets");
      const refreshMock = jest.fn().mockResolvedValue("active-refreshed-nonce");

      const middleware = createNonceRecoveryMiddleware({
        module: "tickets",
        refreshNonce: refreshMock,
      });

      let callCount = 0;
      const next = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const err: any = new Error("Cookie check failed");
          err.status = 403;
          return Promise.reject(err);
        }
        return Promise.resolve({ success: true });
      });

      const requestOptions = {
        path: "/tickets",
        headers: { "X-WP-Nonce": "stale-nonce" },
      };

      const res = await middleware(requestOptions, next);
      expect(res.success).toBe(true);
      expect(refreshMock).toHaveBeenCalledTimes(1);
      expect(requestOptions.headers["X-WP-Nonce"]).toBe(
        "active-refreshed-nonce",
      );
      expect(getNonce("tickets")).toBe("active-refreshed-nonce");
    });

    it("does not retry multiple times if _nonceRetry is already true", async () => {
      (globalThis as any).wpApiSettings = { nonce: "fresh-nonce" };
      const middleware = createNonceRecoveryMiddleware({ module: "tickets" });
      const err: any = new Error("Cookie check failed");
      err.code = "rest_cookie_invalid_nonce";

      const next = jest.fn().mockRejectedValue(err);

      await expect(
        middleware({ path: "/tickets", _nonceRetry: true }, next),
      ).rejects.toThrow("Cookie check failed");

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
