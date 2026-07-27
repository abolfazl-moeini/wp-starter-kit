/**
 * @wpdev/wpdev-bridge/ajax
 *
 * Adapter around WPDev's shared client (`window.wpdev.ajax`) and a
 * fetch fallback that understands admin-ajax vs light-ajax, feature
 * nonces, and the standard { success, code, message, data } envelope.
 *
 * Never assume `envelope.data` is present — consumers must guard.
 */

/**
 * @typedef {import('./types.js').WpdevAjaxEnvelope} WpdevAjaxEnvelope
 * @typedef {import('./types.js').WpdevAjaxOptions} WpdevAjaxOptions
 * @typedef {import('./types.js').WpdevAjaxConfig} WpdevAjaxConfig
 */

/**
 * Normalize any JSON payload into the standard envelope.
 *
 * Mirrors `wpdev/modules/core/assets/js/wpdev-ajax.js` normalize().
 *
 * @param {*} json
 * @returns {WpdevAjaxEnvelope}
 */
export function normalizeEnvelope(json) {
  if (
    json &&
    typeof json === "object" &&
    Object.prototype.hasOwnProperty.call(json, "success")
  ) {
    if (!Object.prototype.hasOwnProperty.call(json, "code")) {
      const data = json.data ?? null;
      return {
        success: !!json.success,
        code: json.success ? "success" : "error",
        message:
          (data &&
            typeof data === "object" &&
            !Array.isArray(data) &&
            data.message) ||
          (Array.isArray(data) && data[0] && data[0].message) ||
          "",
        data,
      };
    }

    return {
      success: !!json.success,
      code: String(json.code || (json.success ? "success" : "error")),
      message: String(json.message || ""),
      data: Object.prototype.hasOwnProperty.call(json, "data")
        ? json.data
        : null,
    };
  }

  // Light-ajax fallthrough (`die('1')`) and bare payloads.
  if (json === 1 || json === "1") {
    return {
      success: false,
      code: "handler_missing",
      message: "AJAX handler did not return a JSON envelope.",
      data: null,
    };
  }

  return {
    success: true,
    code: "success",
    message: "",
    data: json ?? null,
  };
}

/**
 * Guard helper — true only when envelope succeeded and data is present.
 *
 * @param {WpdevAjaxEnvelope|null|undefined} envelope
 * @returns {boolean}
 */
export function hasData(envelope) {
  return !!(envelope && envelope.success && envelope.data != null);
}

/**
 * Resolve endpoint URL for a transport.
 *
 * @param {WpdevAjaxConfig} [cfg]
 * @param {WpdevAjaxOptions} [options]
 * @returns {string}
 */
export function resolveEndpoint(cfg = {}, options = {}) {
  if (options.endpointUrl) {
    return options.endpointUrl;
  }

  if (options.transport === "light") {
    return cfg.lightUrl || "";
  }

  return (
    cfg.adminUrl ||
    (typeof globalThis.ajaxurl === "string" ? globalThis.ajaxurl : "")
  );
}

/**
 * Merge nonce into a plain object payload.
 *
 * @param {Record<string, *>} data
 * @param {WpdevAjaxOptions} options
 * @param {WpdevAjaxConfig} [cfg]
 * @returns {Record<string, *>}
 */
export function withNonce(data = {}, options = {}, cfg = {}) {
  const payload = { ...data };
  const field = options.nonceField || "nonce";
  const value =
    typeof options.nonceValue === "string"
      ? options.nonceValue
      : typeof cfg.nonce === "string"
        ? cfg.nonce
        : "";

  if (value && typeof payload[field] === "undefined") {
    payload[field] = value;
  }

  return payload;
}

/**
 * Read the shared WPDev ajax client when present.
 *
 * @returns {*|undefined}
 */
function getSharedClient() {
  return globalThis.wpdev && globalThis.wpdev.ajax
    ? globalThis.wpdev.ajax
    : undefined;
}

/**
 * Fetch fallback that posts FormData like the shared WPDev client.
 *
 * @param {string} method
 * @param {string} action
 * @param {Record<string, *>} payload
 * @param {string} url
 * @param {AbortSignal} [signal]
 * @returns {Promise<WpdevAjaxEnvelope>}
 */
async function fetchRequest(method, action, payload, url, signal) {
  if (!url) {
    return {
      success: false,
      code: "missing_endpoint",
      message: "No AJAX endpoint URL configured.",
      data: null,
    };
  }

  const bodyPayload = { ...payload, action };
  const fetchOptions = {
    method,
    credentials: "same-origin",
    headers: { "X-Requested-With": "XMLHttpRequest" },
  };

  if (signal) {
    fetchOptions.signal = signal;
  }

  let finalUrl = url;

  if (method === "GET") {
    const query = Object.keys(bodyPayload)
      .map(
        (k) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(bodyPayload[k]))}`,
      )
      .join("&");
    finalUrl += (finalUrl.indexOf("?") === -1 ? "?" : "&") + query;
  } else {
    const body = new FormData();
    Object.keys(bodyPayload).forEach((k) => {
      const value = bodyPayload[k];
      if (Array.isArray(value)) {
        value.forEach((item) => body.append(`${k}[]`, item));
      } else if (value != null && typeof value === "object") {
        body.append(k, JSON.stringify(value));
      } else if (value != null) {
        body.append(k, String(value));
      }
    });
    fetchOptions.body = body;
  }

  const response = await fetch(finalUrl, fetchOptions);
  const text = await response.text();
  let json;

  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  const envelope = normalizeEnvelope(json);

  if (!response.ok || envelope.success === false) {
    const error = new Error(
      envelope.message || `Request failed: ${response.status}`,
    );
    error.code = envelope.code || "error";
    error.data = envelope.data;
    error.status = response.status;
    error.envelope = envelope;
    throw error;
  }

  return envelope;
}

/**
 * Create a bound AJAX client.
 *
 * Prefers `window.wpdev.ajax` when available; otherwise uses fetch.
 *
 * @param {WpdevAjaxConfig} [cfg]
 * @returns {{
 *   post: (action: string, data?: Record<string, *>, options?: WpdevAjaxOptions) => Promise<WpdevAjaxEnvelope>,
 *   get: (action: string, data?: Record<string, *>, options?: WpdevAjaxOptions) => Promise<WpdevAjaxEnvelope>,
 *   request: (method: string, action: string, data?: Record<string, *>, options?: WpdevAjaxOptions) => Promise<WpdevAjaxEnvelope>,
 *   normalize: typeof normalizeEnvelope,
 *   hasData: typeof hasData,
 * }}
 */
export function createWpdevAjax(cfg = {}) {
  async function request(method, action, data = {}, options = {}) {
    const payload = withNonce(data, options, cfg);
    const shared = getSharedClient();

    // Shared client injects the framework nonce as `nonce`. When a feature
    // needs a different field (checkout `_wpnonce`, list-table `_ajax_*`),
    // prefer fetch so we control the payload exactly.
    const needsCustomNonce =
      typeof options.nonceField === "string" && options.nonceField !== "nonce";

    if (
      shared &&
      typeof shared[method.toLowerCase()] === "function" &&
      !needsCustomNonce
    ) {
      const sharedOptions = {
        transport: options.transport || "admin",
        url: options.endpointUrl,
        signal: options.signal,
      };

      try {
        const result = await shared[method.toLowerCase()](
          action,
          payload,
          sharedOptions,
        );
        return normalizeEnvelope(result);
      } catch (err) {
        if (err && err.envelope) {
          throw err;
        }

        const envelope = normalizeEnvelope(
          err && err.data !== undefined
            ? {
                success: false,
                code: err.code || "error",
                message: err.message || "",
                data: err.data,
              }
            : null,
        );

        const error = new Error(
          envelope.message || err.message || "Request failed",
        );
        error.code = err.code || envelope.code;
        error.data = err.data !== undefined ? err.data : envelope.data;
        error.status = err.status;
        error.envelope = envelope;
        throw error;
      }
    }

    const url = resolveEndpoint(cfg, options);
    return fetchRequest(
      method.toUpperCase(),
      action,
      payload,
      url,
      options.signal,
    );
  }

  return {
    post(action, data, options) {
      return request("POST", action, data, options);
    },
    get(action, data, options) {
      return request("GET", action, data, options);
    },
    request,
    normalize: normalizeEnvelope,
    hasData,
  };
}

/**
 * Convenience factory for checkout light-AJAX handlers.
 *
 * Always injects `_wpnonce` from checkout config and defaults to light transport.
 *
 * @param {{ ajaxurl?: string, lateAjaxUrl?: string, nonce?: string }} checkout
 * @param {WpdevAjaxConfig} [ajaxCfg]
 */
export function createCheckoutAjax(checkout = {}, ajaxCfg = {}) {
  const cfg = {
    adminUrl: ajaxCfg.adminUrl,
    lightUrl: checkout.ajaxurl || ajaxCfg.lightUrl,
    nonce: checkout.nonce || ajaxCfg.nonce,
  };

  const client = createWpdevAjax(cfg);

  function withCheckoutDefaults(options = {}) {
    return {
      transport: options.transport || "light",
      endpointUrl: options.endpointUrl,
      nonceField: options.nonceField || "_wpnonce",
      nonceValue: options.nonceValue || checkout.nonce || cfg.nonce || "",
      signal: options.signal,
    };
  }

  return {
    ...client,
    /**
     * Late (init) transport URL used by validate_form.
     */
    lateUrl: checkout.lateAjaxUrl || "",
    post(action, data, options) {
      const opts = withCheckoutDefaults(options);
      if (
        action === "wpdev_validate_form" &&
        !opts.endpointUrl &&
        checkout.lateAjaxUrl
      ) {
        opts.endpointUrl = checkout.lateAjaxUrl;
      }
      return client.post(action, data, opts);
    },
    get(action, data, options) {
      return client.get(action, data, withCheckoutDefaults(options));
    },
  };
}

/**
 * Unwrap list-table refresh payloads.
 *
 * List tables often return `wp_send_json_success({ rows, pagination, ... })`
 * so consumers want the inner `data` object, not the envelope.
 *
 * @param {WpdevAjaxEnvelope} envelope
 * @returns {*}
 */
export function unwrapListTablePayload(envelope) {
  if (!hasData(envelope)) {
    return null;
  }
  return envelope.data;
}

/**
 * Convenience factory for ajax list-table refresh.
 *
 * Uses admin-ajax + per-table nonce field `_ajax_{tableId}_nonce`.
 *
 * @param {{ tableId: string, nonce?: string, action?: string }} table
 * @param {WpdevAjaxConfig} [ajaxCfg]
 */
export function createListTableAjax(table, ajaxCfg = {}) {
  const tableId = table && table.tableId ? String(table.tableId) : "";
  const action =
    (table && table.action) || "wpdev_list_table_fetch_ajax_results";
  const nonceField = tableId ? `_ajax_${tableId}_nonce` : "nonce";

  const cfg = {
    adminUrl: ajaxCfg.adminUrl,
    lightUrl: ajaxCfg.lightUrl,
    nonce: table.nonce || ajaxCfg.nonce,
  };

  const client = createWpdevAjax(cfg);

  function withTableDefaults(options = {}) {
    return {
      transport: options.transport || "admin",
      endpointUrl: options.endpointUrl,
      nonceField: options.nonceField || nonceField,
      nonceValue: options.nonceValue || table.nonce || cfg.nonce || "",
      signal: options.signal,
    };
  }

  return {
    ...client,
    tableId,
    action,
    nonceField,
    /**
     * Refresh the table. Merges `table_id` automatically.
     *
     * @param {Record<string, *>} [data]
     * @param {WpdevAjaxOptions} [options]
     * @returns {Promise<*>} unwrapped list-table payload (`rows`, etc.) or null
     */
    async refresh(data = {}, options = {}) {
      const envelope = await client.post(
        action,
        {
          table_id: tableId,
          ...data,
        },
        withTableDefaults(options),
      );
      return unwrapListTablePayload(envelope);
    },
    post(actionName, data, options) {
      return client.post(actionName, data, withTableDefaults(options));
    },
    get(actionName, data, options) {
      return client.get(actionName, data, withTableDefaults(options));
    },
  };
}
