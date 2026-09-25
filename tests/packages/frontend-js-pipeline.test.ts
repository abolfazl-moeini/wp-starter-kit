/** @jest-environment node */
import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = globalThis;
}
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import * as esbuild from "esbuild";

jest.mock("@wordpress/api-fetch", () => {
  const fn: any = jest.fn();
  fn.use = jest.fn();
  return {
    __esModule: true,
    default: fn,
  };
});

import apiFetch from "@wordpress/api-fetch";
import {
  wpExternalsPlugin,
  FORBIDDEN_PACKAGES,
} from "../../packages/polaris-stack/tools/esbuild-wp-externals.mjs";
import {
  publicFetch,
  authFetch,
  resetNonceCache,
  setCachedNonce,
  getCachedNonce,
  getNonceEndpoint,
} from "../../packages/polaris-stack/src/runtime/api";

const mockedApiFetch = apiFetch as unknown as jest.MockedFunction<any>;

describe("Frontend JS Pipeline & Runtime (Plan 7)", () => {
  const tempDir = path.join(__dirname, "temp-test-build");

  beforeEach(() => {
    mockedApiFetch.mockReset();
    resetNonceCache();
    delete (window as any).wpdev;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("T7-1 & T7-2: WordPress Externals & Asset PHP Generation", () => {
    test("T7-1: Maps @wordpress/* to window.wp.* globals without bundling core source", async () => {
      const entryFile = path.join(tempDir, "entry.js");
      const outFile = path.join(tempDir, "bundle.js");
      const source = `
        import apiFetch from "@wordpress/api-fetch";
        import { __ } from "@wordpress/i18n";
        import { addQueryArgs } from "@wordpress/url";
        import { createHooks } from "@wordpress/hooks";

        export function testRun() {
          const url = addQueryArgs("/api", { test: 1 });
          apiFetch({ path: url });
          const hooks = createHooks();
          return __("Hello World", "my-plugin");
        }
      `;
      fs.writeFileSync(entryFile, source, "utf8");

      await esbuild.build({
        entryPoints: [entryFile],
        outfile: outFile,
        bundle: true,
        format: "esm",
        plugins: [wpExternalsPlugin()],
      });

      const bundleContent = fs.readFileSync(outFile, "utf8");

      // Verify no core source code was bundled
      expect(bundleContent).toContain("window.wp.apiFetch");
      expect(bundleContent).toContain("window.wp.i18n");
      expect(bundleContent).toContain("window.wp.url");
      expect(bundleContent).toContain("window.wp.hooks");

      // Does not contain raw implementation functions of @wordpress packages
      expect(bundleContent).not.toContain("function createHooks(");
      expect(bundleContent).not.toContain("function buildQueryString(");
    });

    test("T7-2: Generates valid *.asset.php with sorted dependencies and version hash", async () => {
      const entryFile = path.join(tempDir, "entry-asset.js");
      const outFile = path.join(tempDir, "asset-bundle.js");
      const assetFile = path.join(tempDir, "asset-bundle.asset.php");

      const source = `
        import { __ } from "@wordpress/i18n";
        import apiFetch from "@wordpress/api-fetch";
        apiFetch({ path: "/foo" });
        console.log(__("hi"));
      `;
      fs.writeFileSync(entryFile, source, "utf8");

      await esbuild.build({
        entryPoints: [entryFile],
        outfile: outFile,
        bundle: true,
        format: "esm",
        plugins: [wpExternalsPlugin()],
      });

      expect(fs.existsSync(assetFile)).toBe(true);
      const phpContent = fs.readFileSync(assetFile, "utf8");

      // Check format and sorted dependencies
      expect(phpContent).toMatch(
        /<\?php return array\('dependencies' => array\('wp-api-fetch', 'wp-i18n'\), 'version' => '[a-f0-9]{16}'\);/,
      );
    });
  });

  describe("T7-3: Forbidden Packages Gate", () => {
    test("T7-3: Importing @wordpress/components halts build with fatal error", async () => {
      const entryFile = path.join(tempDir, "entry-forbidden.js");
      const source = `
        import { Button } from "@wordpress/components";
        console.log(Button);
      `;
      fs.writeFileSync(entryFile, source, "utf8");

      await expect(
        esbuild.build({
          entryPoints: [entryFile],
          outfile: path.join(tempDir, "forbidden.js"),
          bundle: true,
          format: "esm",
          plugins: [wpExternalsPlugin()],
        }),
      ).rejects.toThrow(/FATAL: Forbidden package "@wordpress\/components"/);
    });

    test("Rejects all forbidden packages (@wordpress/ui, @wordpress/preferences, @wordpress/block-editor)", async () => {
      for (const pkg of [
        "@wordpress/ui",
        "@wordpress/preferences",
        "@wordpress/block-editor",
        "@wordpress/editor",
      ]) {
        const entryFile = path.join(
          tempDir,
          `entry-${pkg.replace(/[^a-z0-9]/g, "-")}.js`,
        );
        fs.writeFileSync(entryFile, `import "${pkg}";`, "utf8");

        await expect(
          esbuild.build({
            entryPoints: [entryFile],
            outfile: path.join(tempDir, "out.js"),
            bundle: true,
            format: "esm",
            plugins: [wpExternalsPlugin()],
          }),
        ).rejects.toThrow(new RegExp(`Forbidden package "${pkg}"`));
      }
    });
  });

  describe("T7-4 & T7-5: REST Client & Nonce Management", () => {
    test("T7-4: publicFetch strips X-WP-Nonce header for CDN/Varnish cacheability", async () => {
      mockedApiFetch.mockResolvedValueOnce({ success: true });

      const result = await publicFetch({
        path: "/wpdev/v1/posts",
        headers: {
          "X-WP-Nonce": "unintended-nonce-123",
          "x-wp-nonce": "duplicate-nonce",
          "Content-Type": "application/json",
        },
      });

      expect(result).toEqual({ success: true });
      expect(mockedApiFetch).toHaveBeenCalledTimes(1);

      const calledOptions = mockedApiFetch.mock.calls[0][0];
      expect(calledOptions.path).toBe("/wpdev/v1/posts");
      expect(calledOptions.isPublicRequest).toBe(true);

      // Verify X-WP-Nonce is completely stripped
      expect(calledOptions.headers["X-WP-Nonce"]).toBeUndefined();
      expect(calledOptions.headers["x-wp-nonce"]).toBeUndefined();
      expect(calledOptions.headers["Content-Type"]).toBe("application/json");
    });

    test("T7-5: authFetch lazily acquires nonce, caches it, and injects header", async () => {
      // 1. First call to acquire nonce
      mockedApiFetch.mockResolvedValueOnce({ nonce: "test-nonce-abc" });
      // 2. The actual API call
      mockedApiFetch.mockResolvedValueOnce({ saved: true });

      const res = await authFetch({
        path: "/wpdev/v1/update",
        method: "POST",
        data: { id: 42 },
      });

      expect(res).toEqual({ saved: true });
      expect(mockedApiFetch).toHaveBeenCalledTimes(2);

      // Verify lazy nonce fetch was performed
      const nonceCall = mockedApiFetch.mock.calls[0][0];
      expect(nonceCall.path).toBe("/wpdev/v1/rest-nonce");
      expect(nonceCall.method).toBe("GET");

      // Verify main call received the nonce
      const mainCall = mockedApiFetch.mock.calls[1][0];
      expect(mainCall.path).toBe("/wpdev/v1/update");
      expect(mainCall.headers["X-WP-Nonce"]).toBe("test-nonce-abc");
      expect(getCachedNonce()).toBe("test-nonce-abc");

      // Second call uses cached nonce without another nonce fetch
      mockedApiFetch.mockResolvedValueOnce({ saved: true, second: true });
      await authFetch({
        path: "/wpdev/v1/update-again",
        method: "POST",
      });

      expect(mockedApiFetch).toHaveBeenCalledTimes(3);
      const secondCall = mockedApiFetch.mock.calls[2][0];
      expect(secondCall.headers["X-WP-Nonce"]).toBe("test-nonce-abc");
    });

    test("T7-5: authFetch single-retry guarantee on rest_cookie_invalid_nonce", async () => {
      setCachedNonce("expired-nonce");

      // 1. Initial attempt fails with rest_cookie_invalid_nonce
      mockedApiFetch.mockRejectedValueOnce({
        code: "rest_cookie_invalid_nonce",
        message: "Cookie check failed",
        data: { status: 403 },
      });

      // 2. Lazy nonce refresh endpoint call
      mockedApiFetch.mockResolvedValueOnce({ nonce: "refreshed-nonce-xyz" });

      // 3. Retry attempt succeeds
      mockedApiFetch.mockResolvedValueOnce({ updated: true });

      const response = await authFetch({
        path: "/wpdev/v1/mutate",
        method: "POST",
      });

      expect(response).toEqual({ updated: true });
      expect(mockedApiFetch).toHaveBeenCalledTimes(3);

      // Verify retry call used the fresh nonce
      const retryCall = mockedApiFetch.mock.calls[2][0];
      expect(retryCall.headers["X-WP-Nonce"]).toBe("refreshed-nonce-xyz");
      expect(getCachedNonce()).toBe("refreshed-nonce-xyz");
    });

    test("T7-5: authFetch does NOT retry more than once if refreshed nonce still fails", async () => {
      setCachedNonce("bad-nonce");

      // 1. First attempt fails with rest_cookie_invalid_nonce
      mockedApiFetch.mockRejectedValueOnce({
        code: "rest_cookie_invalid_nonce",
        message: "Cookie check failed",
        data: { status: 403 },
      });

      // 2. Nonce refresh returns new nonce
      mockedApiFetch.mockResolvedValueOnce({ nonce: "fresh-bad-nonce" });

      // 3. Retry attempt ALSO fails
      mockedApiFetch.mockRejectedValueOnce({
        code: "rest_cookie_invalid_nonce",
        message: "Repeated invalid nonce",
        data: { status: 403 },
      });

      await expect(
        authFetch({
          path: "/wpdev/v1/mutate",
          method: "POST",
        }),
      ).rejects.toEqual(
        expect.objectContaining({ code: "rest_cookie_invalid_nonce" }),
      );

      // Exactly 3 calls: initial request, nonce refresh, single retry (no infinite loop)
      expect(mockedApiFetch).toHaveBeenCalledTimes(3);
    });

    test("Custom plugin nonceEndpoint resolution from window.wpdev[pluginName]", () => {
      (window as any).wpdev = {
        customPlugin: {
          endpoint: "/my-plugin/v1",
          nonceEndpoint: "/my-plugin/v1/auth/nonce",
        },
      };

      expect(getNonceEndpoint("customPlugin")).toBe("/my-plugin/v1/auth/nonce");
      expect(getNonceEndpoint("unknownPlugin")).toBe("/wpdev/v1/rest-nonce");
    });
  });

  describe("T7-6: Budget Hard Cap Verification (<10,240B Gzip)", () => {
    test("T7-6: Runtime entry bundle satisfies strict 10KB gzip budget", () => {
      const runtimeDistPath = path.join(
        __dirname,
        "../../packages/polaris-stack/dist/runtime/index.js",
      );

      if (!fs.existsSync(runtimeDistPath)) {
        console.warn("Skipping budget test: runtime dist not yet built");
        return;
      }

      const content = fs.readFileSync(runtimeDistPath);
      const gzipLength = zlib.gzipSync(content, { level: 9 }).length;

      expect(gzipLength).toBeLessThan(10240);
      // Actual compiled runtime is ~1.5KB gzip
      expect(gzipLength).toBeLessThan(3000);
    });
  });
});
