/**
 * @wpsk/rest-utils — config-driven REST + AJAX helpers.
 *
 * Ports the source `mrlogistic/assets/packages/rest-utils/index.js` with
 * every brand-specific token (`mrlogistic-*`, hardcoded paths) replaced by
 * values read from `project.config.json` via `@core/utils`:
 *
 *   hookPrefix  → '<hookPrefix>-request-ajax-{start,done,error}'
 *   slug        → '<slug>/v1/<endpoint>'
 *   localize    → api.url / api.nonce (WP REST) and api_x.url (laravel-style)
 *
 * Dependency injection:
 *   The package's defaults pull `getHooks()` and `localize` from the real
 *   `@wpsk/hooks` and `@wpsk/utils` packages. Tests can override by passing
 *   an options object: `createRestUtils({ hooks, localize, apiFetch })`.
 *   The standalone `restRequest` / `restXRequest` wrappers use the defaults.
 */
import { addQueryArgs } from '@wordpress/url';
import { readProjectConfig } from '@core/utils';
import { localize } from '@wpsk/utils';
import getHooks from '@wpsk/hooks';

let cachedHookActions = null;

function hookActions(prefix) {
  if (prefix) {
    return {
      start: `${prefix}-request-ajax-start`,
      done: `${prefix}-request-ajax-done`,
      error: `${prefix}-request-ajax-error`,
    };
  }
  if (cachedHookActions) return cachedHookActions;
  const { hookPrefix } = readProjectConfig();
  cachedHookActions = {
    start: `${hookPrefix}-request-ajax-start`,
    done: `${hookPrefix}-request-ajax-done`,
    error: `${hookPrefix}-request-ajax-error`,
  };
  return cachedHookActions;
}

function restNamespace() {
  const { slug } = readProjectConfig();
  return `${slug}/v1`;
}

/**
 * Build a `restUtils` namespace bound to a specific set of dependencies.
 * Lets tests inject custom `hooks`, `localize`, `apiFetch`, and `fetch`.
 *
 * @param {object} [deps]
 * @param {object} [deps.hooks]        Object exposing `doAction` (defaults to @wpsk/hooks() result).
 * @param {object} [deps.localize]     Object exposing `get(key)` (defaults to @wpsk/utils localize).
 * @param {Function} [deps.apiFetch]   WP apiFetch implementation (defaults to @wordpress/api-fetch).
 * @param {Function} [deps.fetch]      Browser fetch (defaults to globalThis.fetch).
 * @param {string} [deps.hookPrefix]   Override the config-driven hook prefix.
 * @returns {object} Rest utils bound to the given deps.
 */
export function createRestUtils(deps = {}) {
  const hooks = deps.hooks ?? getHooks();
  const loc = deps.localize ?? localize;
  const apiFetch = deps.apiFetch;
  const fetchImpl = deps.fetch ?? (typeof fetch !== 'undefined' ? fetch : null);
  const actions = hookActions(deps.hookPrefix);
  const ns = deps.slug ? `${deps.slug}/v1` : restNamespace();

  function restRootUrl() {
    return loc.get('api.url');
  }
  function restXRootUrl() {
    return loc.get('api_x.url');
  }
  function restNonce() {
    return loc.get('api.nonce');
  }
  function restXNonce() {
    return loc.get('api_x.nonce');
  }
  function restHeaders() {
    return {
      'Content-type': 'application/json; charset=utf-8',
      'X-WP-Nonce': restNonce(),
    };
  }
  function restXHeaders() {
    return {
      'Content-type': 'application/json; charset=utf-8',
      'X-WP-Nonce': restXNonce(),
    };
  }
  function restUrl(endpoint) {
    endpoint = String(endpoint ?? '').replace(/^\//, '').replace(/\/$/, '');
    return restRootUrl() + `${ns}/${endpoint}`;
  }
  function restXUrl(endpoint) {
    endpoint = String(endpoint ?? '').replace(/^\//, '').replace(/\/$/, '');
    const root = String(restXRootUrl() ?? '').replace(/\/$/, '');
    return root + '/' + endpoint;
  }

  function restRequest(endPoint, isLaravel = false, options = {}) {
    if (isLaravel) {
      return restXRequest(endPoint, options);
    }
    hooks.doAction(actions.start, endPoint, options);
    let path = addQueryArgs(`/${ns}/${endPoint}`, { _lang: currentLanguage() });
    if (options?.method?.toUpperCase() === 'GET') {
      path = addQueryArgs(path, options.data || {});
      delete options.data;
    }
    const fetchFn = apiFetch ?? defaultApiFetch();
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
    if (options?.method?.toUpperCase() === 'GET') {
      url = addQueryArgs(url, options.data || {});
    } else {
      options.body = JSON.stringify(options.data);
    }
    delete options.data;
    if (!fetchImpl) {
      throw new Error('restXRequest requires a `fetch` implementation in this environment');
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

function defaultApiFetch() {
  // Lazy require so the file remains importable in environments without
  // the @wordpress/api-fetch module installed (some test setups).
  // eslint-disable-next-line global-require
  return require('@wordpress/api-fetch').default;
}

function currentLanguage() {
  if (typeof document === 'undefined') return '';
  const lang = document.documentElement?.getAttribute('lang') || '';
  return lang.slice(0, 2).toLocaleLowerCase();
}

export function getRequestedQueryVar(name) {
  return requestedQueryVars(true).get(name);
}

export function requestedQueryVars(raw = false) {
  if (typeof document === 'undefined') {
    return raw ? new URLSearchParams() : {};
  }
  const params = new URL(document.location).searchParams;
  return raw ? params : Object.fromEntries(params);
}

// Default-flavor exports (use the live hooks / localize / apiFetch).
// These call the underlying packages directly so consumers can `import
// { restRequest } from '@wpsk/rest-utils'` without ceremony.
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
