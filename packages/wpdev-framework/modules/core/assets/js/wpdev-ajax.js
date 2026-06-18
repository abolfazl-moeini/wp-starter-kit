/**
 * WPDev shared AJAX client (J-04).
 *
 * Provides a single transport with consistent nonce injection, error parsing,
 * and the standard { success, code, message, data } envelope used by
 * Ajax_Response. Use instead of ad hoc jQuery.ajax / fetch calls.
 *
 * Usage:
 *   wpdev.ajax.post('wpdev_search', { model: 'product', search: 'pro' })
 *     .then(function (res) { console.log(res.data); })
 *     .catch(function (err) { console.error(err.message); });
 *
 * @since 2.6.0
 */
(function (window) {
  'use strict';

  var cfg = window.wpdev_ajax || {};

  /**
   * Resolve the endpoint URL for a given transport.
   *
   * @param {string} transport 'admin' (admin-ajax.php) or 'light' (wpdev-ajax).
   * @return {string}
   */
  function endpoint(transport) {
    if (transport === 'light') {
      return cfg.light_ajax_url || '';
    }

    return cfg.admin_ajax_url || window.ajaxurl || '';
  }

  /**
   * Normalize any JSON payload into the standard envelope.
   *
   * @param {*} json Parsed response.
   * @return {{success:boolean, code:string, message:string, data:*}}
   */
  function normalize(json) {
    if (json && typeof json === 'object' && Object.prototype.hasOwnProperty.call(json, 'success')) {
      // WP wp_send_json_success/error wraps payload in { success, data }.
      if (!Object.prototype.hasOwnProperty.call(json, 'code')) {
        return {
          success: !!json.success,
          code: json.success ? 'success' : 'error',
          message: (json.data && json.data.message) || '',
          data: json.data
        };
      }

      return json;
    }

    return { success: true, code: 'success', message: '', data: json };
  }

  /**
   * Perform an AJAX request.
   *
   * @param {string} method   HTTP method.
   * @param {string} action   WPDev ajax action (without wp_ajax_ prefix).
   * @param {Object} data     Payload.
   * @param {Object} [options] { transport, url, signal }.
   * @return {Promise<Object>} Resolves with the standard envelope, rejects on error envelope/HTTP error.
   */
  function request(method, action, data, options) {
    options = options || {};

    var transport = options.transport || 'admin';
    var url = options.url || endpoint(transport);
    var payload = {};
    var key;

    if (data) {
      for (key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          payload[key] = data[key];
        }
      }
    }

    payload.action = action;

    if (cfg.nonce && typeof payload.nonce === 'undefined') {
      payload.nonce = cfg.nonce;
    }

    var fetchOptions = {
      method: method,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    };

    if (options.signal) {
      fetchOptions.signal = options.signal;
    }

    if (method === 'GET') {
      var query = Object.keys(payload)
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]); })
        .join('&');
      url += (url.indexOf('?') === -1 ? '?' : '&') + query;
    } else {
      var body = new FormData();
      Object.keys(payload).forEach(function (k) { body.append(k, payload[k]); });
      fetchOptions.body = body;
    }

    return window.fetch(url, fetchOptions)
      .then(function (response) {
        return response.text().then(function (text) {
          var json;

          try {
            json = JSON.parse(text);
          } catch (e) {
            json = text;
          }

          var envelope = normalize(json);

          if (!response.ok || envelope.success === false) {
            var error = new Error(envelope.message || ('Request failed: ' + response.status));
            error.code = envelope.code || 'error';
            error.data = envelope.data;
            error.status = response.status;
            throw error;
          }

          return envelope;
        });
      });
  }

  window.wpdev = window.wpdev || {};

  window.wpdev.ajax = {
    /**
     * POST helper.
     *
     * @param {string} action  Ajax action.
     * @param {Object} data     Payload.
     * @param {Object} [options] Request options.
     * @return {Promise<Object>}
     */
    post: function (action, data, options) {
      return request('POST', action, data, options);
    },

    /**
     * GET helper.
     *
     * @param {string} action  Ajax action.
     * @param {Object} data     Payload.
     * @param {Object} [options] Request options.
     * @return {Promise<Object>}
     */
    get: function (action, data, options) {
      return request('GET', action, data, options);
    },

    request: request,
    normalize: normalize,
    endpoint: endpoint
  };
})(window);
