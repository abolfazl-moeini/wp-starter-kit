/**
 * @wpdev/wpdev-bridge unit tests — Phase 1 contracts from integrate.md
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import {
  normalizeEnvelope,
  hasData,
  withNonce,
  createCheckoutAjax,
  createListTableAjax,
  unwrapListTablePayload,
  readWpdevFeatureConfig,
  isCheckoutAjaxReady,
  getWpdevHooks,
  createNoopHooks,
} from "../../packages/wpdev-bridge/index.js";

describe("@wpdev/wpdev-bridge/ajax", () => {
  test("normalizeEnvelope maps wp_send_json_success shape", () => {
    const env = normalizeEnvelope({
      success: true,
      data: { order: { id: 1 } },
    });
    expect(env).toEqual({
      success: true,
      code: "success",
      message: "",
      data: { order: { id: 1 } },
    });
  });

  test("normalizeEnvelope maps WP_Error list message", () => {
    const env = normalizeEnvelope({
      success: false,
      data: [{ code: "forbidden", message: "Invalid security token." }],
    });
    expect(env.success).toBe(false);
    expect(env.message).toBe("Invalid security token.");
  });

  test("normalizeEnvelope treats bare light-ajax die(1) as failure", () => {
    expect(normalizeEnvelope(1).code).toBe("handler_missing");
    expect(normalizeEnvelope("1").success).toBe(false);
  });

  test("hasData guards missing data", () => {
    expect(
      hasData({ success: true, code: "success", message: "", data: { a: 1 } }),
    ).toBe(true);
    expect(
      hasData({ success: true, code: "success", message: "", data: null }),
    ).toBe(false);
    expect(
      hasData({ success: false, code: "error", message: "x", data: { a: 1 } }),
    ).toBe(false);
    expect(hasData(undefined)).toBe(false);
  });

  test("withNonce injects custom field without overwriting", () => {
    expect(
      withNonce({ a: 1 }, { nonceField: "_wpnonce", nonceValue: "abc" }),
    ).toEqual({
      a: 1,
      _wpnonce: "abc",
    });
    expect(
      withNonce(
        { _wpnonce: "keep" },
        { nonceField: "_wpnonce", nonceValue: "abc" },
      ),
    ).toEqual({ _wpnonce: "keep" });
  });

  test("createCheckoutAjax defaults to _wpnonce + light URL", async () => {
    const calls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      calls.push({ url, opts });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            data: { order: { id: 9 }, states: [] },
          }),
      };
    };

    try {
      const ajax = createCheckoutAjax({
        ajaxurl: "http://example.test/?wpdev-ajax=1&r=tok",
        nonce: "checkout-nonce",
      });

      const res = await ajax.post("wpdev_create_order", { products: [1] });
      expect(hasData(res)).toBe(true);
      expect(res.data.order.id).toBe(9);

      const body = calls[0].opts.body;
      expect(body.get("action")).toBe("wpdev_create_order");
      expect(body.get("_wpnonce")).toBe("checkout-nonce");
      expect(calls[0].url).toContain("wpdev-ajax=1");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("createCheckoutAjax uses lateAjaxUrl for validate_form", async () => {
    const calls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      calls.push(url);
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: null }),
      };
    };

    try {
      const ajax = createCheckoutAjax({
        ajaxurl: "http://example.test/?wpdev-ajax=1",
        lateAjaxUrl: "http://example.test/?wpdev-ajax=1&wpdev-when=aW5pdA==",
        nonce: "n",
      });
      await ajax.post("wpdev_validate_form", {});
      expect(calls[0]).toContain("wpdev-when=");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("createListTableAjax uses per-table nonce and unwraps payload", async () => {
    const calls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      calls.push({ url, opts });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            data: { rows: "<tr></tr>", pagination: { top: "", bottom: "" } },
          }),
      };
    };

    try {
      const ajax = createListTableAjax(
        { tableId: "product_list_table", nonce: "table-nonce" },
        { adminUrl: "http://example.test/wp-admin/admin-ajax.php" },
      );

      const payload = await ajax.refresh({ paged: 2 });
      expect(payload.rows).toContain("<tr");
      expect(
        unwrapListTablePayload({
          success: false,
          code: "x",
          message: "",
          data: { rows: 1 },
        }),
      ).toBe(null);

      const body = calls[0].opts.body;
      expect(body.get("action")).toBe("wpdev_list_table_fetch_ajax_results");
      expect(body.get("table_id")).toBe("product_list_table");
      expect(body.get("_ajax_product_list_table_nonce")).toBe("table-nonce");
      expect(body.get("paged")).toBe("2");
      expect(calls[0].url).toContain("admin-ajax.php");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("@wpdev/wpdev-bridge/config", () => {
  beforeEach(() => {
    delete globalThis.wpdev_ajax;
    delete globalThis.wpdev_checkout;
    delete globalThis.WPDevLoc;
  });

  afterEach(() => {
    delete globalThis.wpdev_ajax;
    delete globalThis.wpdev_checkout;
    delete globalThis.WPDevLoc;
  });

  test("readWpdevFeatureConfig maps legacy globals", () => {
    globalThis.wpdev_ajax = {
      admin_ajax_url: "/wp-admin/admin-ajax.php",
      light_ajax_url: "/?wpdev-ajax=1",
      nonce: "fw",
    };
    globalThis.wpdev_checkout = {
      ajaxurl: "/?wpdev-ajax=1&r=x",
      late_ajaxurl: "/?wpdev-ajax=1&late=1",
      baseurl: "/register/",
      nonce: "co",
    };

    const cfg = readWpdevFeatureConfig();
    expect(cfg.ajax.adminUrl).toBe("/wp-admin/admin-ajax.php");
    expect(cfg.ajax.nonce).toBe("fw");
    expect(cfg.checkout.nonce).toBe("co");
    expect(cfg.checkout.baseurl).toBe("/register/");
    expect(isCheckoutAjaxReady(cfg)).toBe(true);
  });

  test("isCheckoutAjaxReady requires nonce + light url", () => {
    expect(isCheckoutAjaxReady({ checkout: { nonce: "a" } })).toBe(false);
    expect(
      isCheckoutAjaxReady({
        checkout: { nonce: "a", ajaxurl: "/?wpdev-ajax=1" },
      }),
    ).toBe(true);
  });
});

describe("@wpdev/wpdev-bridge/hooks", () => {
  test("getWpdevHooks falls back to noop when nothing is registered", () => {
    const hooks = getWpdevHooks("__MissingGlobal__");
    expect(() => hooks.doAction("x")).not.toThrow();
    expect(hooks.applyFilters("x", 1)).toBe(1);
  });

  test("createNoopHooks is safe", () => {
    const hooks = createNoopHooks();
    hooks.addAction("a", "ns", () => {});
    expect(hooks.applyFilters("a", "v")).toBe("v");
  });

  test("getWpdevHooks prefers window.wp.hooks when kit global missing", () => {
    const calls = [];
    globalThis.wp = {
      hooks: {
        doAction(name, ...args) {
          calls.push([name, ...args]);
        },
        applyFilters(_n, v) {
          return v;
        },
        addAction() {},
        addFilter() {},
      },
    };

    try {
      getWpdevHooks("__MissingGlobal__").doAction("wpdev_on_create_order", {
        id: 1,
      });
      expect(calls[0][0]).toBe("wpdev_on_create_order");
    } finally {
      delete globalThis.wp;
    }
  });
});
