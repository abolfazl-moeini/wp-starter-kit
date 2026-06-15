/**
 * @wpsk/rest-utils — config-driven REST + AJAX helpers.
 *
 * Ports the source `mrlogistic/assets/packages/rest-utils/index.js` with
 * every brand-specific token replaced by build-time injected values:
 *
 *   hookPrefix (__WPSK_HOOK_PREFIX__) → '<prefix>-request-ajax-{start,done,error}'
 *   slug       (__WPSK_SLUG__)        → '<slug>/v1/<endpoint>'
 *   localize                         → api.url / api.nonce / api_x.url/api_x.nonce
 *
 * Dependency injection:
 *   The package's defaults pull `getHooks()` and `localize` from the real
 *   `@wpsk/hooks` and `@wpsk/utils` packages. Tests can override by passing
 *   an options object: `createRestUtils({ hooks, localize, apiFetch })`.
 */
import { addQueryArgs } from "@wordpress/url";
import { localize } from "@wpsk/utils";
import getHooks from "@wpsk/hooks";

const FALLBACK_HOOK_PREFIX =
  typeof __WPSK_HOOK_PREFIX__ !== "undefined" ? __WPSK_HOOK_PREFIX__ : "wpsk";
const FALLBACK_SLUG =
  typeof __WPSK_SLUG__ !== "undefined" ? __WPSK_SLUG__ : "wpsk-starter";

const ACTIONS = {
  start: `${FALLBACK_HOOK_PREFIX}-request-ajax-start`,
  done: `${FALLBACK_HOOK_PREFIX}-request-ajax-done`,
  error: `${FALLBACK_HOOK_PREFIX}-request-ajax-error`,
};

function resolveActions(prefix) {
  if (!prefix) return ACTIONS;
  return {
    start: `${prefix}-request-ajax-start`,
    done: `${prefix}-request-ajax-done`,
    error: `${prefix}-request-ajax-error`,
  };
}

/**
 * Build a `restUtils` namespace bound to a specific set of dependencies.
 *
 * @param {object} [deps]
 * @param {object} [deps.hooks]        Object exposing `doAction` (defaults to @wpsk/hooks() result).
 * @param {object} [deps.localize]     Object exposing `get(key)` (defaults to @wpsk/utils localize).
 * @param {Function} [deps.apiFetch]   WP apiFetch implementation.
 * @param {Function} [deps.fetch]      Browser fetch (defaults to globalThis.fetch).
 * @param {string} [deps.hookPrefix]   Override the config-driven hook prefix.
 * @param {string} [deps.slug]         Override the config-driven slug.
 * @returns {object} Rest utils bound to the given deps.
 */
export function createRestUtils(deps = {}) {
  const hooks = deps.hooks ?? getHooks();
  const loc = deps.localize ?? localize;
  const apiFetch = deps.apiFetch;
  const fetchImpl = deps.fetch ?? (typeof fetch !== "undefined" ? fetch : null);
  const actions = resolveActions(deps.hookPrefix);
  const ns = deps.slug ? `${deps.slug}/v1` : `${FALLBACK_SLUG}/v1`;

  function restRootUrl() {
    return loc.get("api.url");
  }
  function restXRootUrl() {
    return loc.get("api_x.url");
  }
  function restNonce() {
    return loc.get("api.nonce");
  }
  function restXNonce() {
    return loc.get("api_x.nonce");
  }

  function restHeaders() {
    return {
      "Content-type": "application/json; charset=utf-8",
      "X-WP-Nonce": restNonce(),
    };
  }
  function restXHeaders() {
    return {
      "Content-type": "application/json; charset=utf-8",
      "X-WP-Nonce": restXNonce(),
    };
  }
  function restUrl(endpoint) {
    endpoint = String(endpoint ?? "")
      .replace(/^\//, "")
      .replace(/\/$/, "");
    return restRootUrl() + `${ns}/${endpoint}`;
  }
  function restXUrl(endpoint) {
    endpoint = String(endpoint ?? "")
      .replace(/^\//, "")
      .replace(/\/$/, "");
    const root = String(restXRootUrl() ?? "").replace(/\/$/, "");
    return root + "/" + endpoint;
  }

  async function defaultApiFetch() {
    const mod = await import("@wordpress/api-fetch");
    return mod.default;
  }

  async function restRequest(endPoint, isLaravel = false, options = {}) {
    if (isLaravel) return restXRequest(endPoint, options);
    hooks.doAction(actions.start, endPoint, options);
    let path = addQueryArgs(`/${ns}/${endPoint}`, { _lang: currentLanguage() });
    if (options?.method?.toUpperCase() === "GET") {
      path = addQueryArgs(path, options.data || {});
      delete options.data;
    }
    const fetchFn = apiFetch ?? (await defaultApiFetch());
    return fetchFn({ path, ...options })
      .catch((error) => {
        hooks.doAction(actions.error, error, endPoint, options);
        return error;
      })
      .finally(() => {
        hooks.doAction(actions.done, endPoint, options);
      });
  }

  function restXRequest(endPoint, options = {}) {
    hooks.doAction(actions.start, endPoint, options);
    let url = restXUrl(endPoint);
    options.headers = { ...(options.headers || {}), ...restXHeaders() };
    if (options?.method?.toUpperCase() === "GET") {
      url = addQueryArgs(url, options.data || {});
    } else {
      options.body = JSON.stringify(options.data);
    }
    delete options.data;
    if (!fetchImpl) {
      throw new Error(
        "restXRequest requires a `fetch` implementation in this environment",
      );
    }
    return fetchImpl(url, options)
      .then((response) => response.json())
      .catch((error) => {
        hooks.doAction(actions.error, error, endPoint, options);
        return error;
      })
      .finally(() => {
        hooks.doAction(actions.done, endPoint, options);
      });
  }

  return {
    restRequest,
    restXRequest,
    restRootUrl,
    restXRootUrl,
    restNonce,
    restXNonce,
    restHeaders,
    restXHeaders,
    restUrl,
    restXUrl,
    getRequestedQueryVar,
    requestedQueryVars,
  };
}

function currentLanguage() {
  if (typeof document === "undefined") return "";
  const lang = document.documentElement?.getAttribute("lang") || "";
  return lang.slice(0, 2).toLocaleLowerCase();
}

export function getRequestedQueryVar(name) {
  return requestedQueryVars(true).get(name);
}

export function requestedQueryVars(raw = false) {
  if (typeof document === "undefined") {
    return raw ? new URLSearchParams() : {};
  }
  const params = new URL(document.location).searchParams;
  return raw ? params : Object.fromEntries(params);
}

// Default-flavor exports (use the live hooks / localize / apiFetch).
const defaultUtils = createRestUtils();
export const restRequest = defaultUtils.restRequest;
export const restXRequest = defaultUtils.restXRequest;
export const restRootUrl = defaultUtils.restRootUrl;
export const restXRootUrl = defaultUtils.restXRootUrl;
export const restNonce = defaultUtils.restNonce;
export const restXNonce = defaultUtils.restXNonce;
export const restHeaders = defaultUtils.restHeaders;
export const restXHeaders = defaultUtils.restXHeaders;
export const restUrl = defaultUtils.restUrl;
export const restXUrl = defaultUtils.restXUrl;
