/**
 * @wpdev/wpdev-bridge/config
 *
 * Maps legacy WPDev localized globals into a stable WpdevFeatureConfig shape
 * so starter-kit module entries do not read arbitrary browser globals.
 */

/**
 * @typedef {import('./types.js').WpdevFeatureConfig} WpdevFeatureConfig
 * @typedef {import('./types.js').WpdevLegacyGlobals} WpdevLegacyGlobals
 */

/**
 * Read a value from a localize root using dotted paths
 * (same semantics as `@wpdev/utils` localize.get).
 *
 * @param {Record<string, *>|undefined} root
 * @param {string} index
 * @returns {*}
 */
function dig(root, index) {
  if (!root || !index) {
    return undefined;
  }

  if (index.indexOf(".") === -1) {
    return root[index];
  }

  let parts = index.split(".");
  let current = root[parts[0]];

  if (!current) {
    return undefined;
  }

  parts = parts.slice(1);
  const len = parts.length - 1;

  for (let i = 0; i <= len; i++) {
    if (typeof current[parts[i]] !== "object" && i !== len) {
      return undefined;
    }
    current = current[parts[i]];
  }

  return current;
}

/**
 * Build WpdevFeatureConfig from known WPDev globals + optional localize root.
 *
 * Priority:
 * 1. Explicit overrides
 * 2. `window.wpdev_ajax` / `window.wpdev_checkout`
 * 3. starter-kit localize root (`WPDevLoc` or custom)
 *
 * @param {object} [options]
 * @param {WpdevFeatureConfig} [options.overrides]
 * @param {string} [options.localizeVar] localize global name
 * @param {WpdevLegacyGlobals} [options.globals] inject globals (tests)
 * @returns {WpdevFeatureConfig}
 */
export function readWpdevFeatureConfig(options = {}) {
  const globals = options.globals || globalThis;
  const localizeVar = options.localizeVar || "WPDevLoc";
  const locRoot = globals[localizeVar];
  const overrides = options.overrides || {};

  const wpdevAjax = globals.wpdev_ajax || {};
  const wpdevCheckout = globals.wpdev_checkout || {};

  const ajax = {
    adminUrl:
      overrides.ajax?.adminUrl ||
      wpdevAjax.admin_ajax_url ||
      dig(locRoot, "wpdev.ajax.adminUrl") ||
      dig(locRoot, "ajax.adminUrl") ||
      (typeof globals.ajaxurl === "string" ? globals.ajaxurl : undefined),
    lightUrl:
      overrides.ajax?.lightUrl ||
      wpdevAjax.light_ajax_url ||
      wpdevCheckout.ajaxurl ||
      dig(locRoot, "wpdev.ajax.lightUrl") ||
      dig(locRoot, "ajax.lightUrl"),
    nonce:
      overrides.ajax?.nonce ||
      wpdevAjax.nonce ||
      dig(locRoot, "wpdev.ajax.nonce") ||
      dig(locRoot, "ajax.nonce"),
  };

  const checkout = {
    baseurl:
      overrides.checkout?.baseurl ||
      wpdevCheckout.baseurl ||
      dig(locRoot, "wpdev.checkout.baseurl") ||
      dig(locRoot, "checkout.baseurl"),
    nonce:
      overrides.checkout?.nonce ||
      wpdevCheckout.nonce ||
      dig(locRoot, "wpdev.checkout.nonce") ||
      dig(locRoot, "checkout.nonce"),
    lateAjaxUrl:
      overrides.checkout?.lateAjaxUrl ||
      wpdevCheckout.late_ajaxurl ||
      dig(locRoot, "wpdev.checkout.lateAjaxUrl") ||
      dig(locRoot, "checkout.lateAjaxUrl"),
    ajaxurl:
      overrides.checkout?.ajaxurl ||
      wpdevCheckout.ajaxurl ||
      dig(locRoot, "wpdev.checkout.ajaxurl") ||
      dig(locRoot, "checkout.ajaxurl"),
  };

  return {
    ajax,
    checkout,
    hooksNamespace:
      overrides.hooksNamespace ||
      dig(locRoot, "wpdev.hooksNamespace") ||
      dig(locRoot, "hooksNamespace") ||
      "wpdev",
  };
}

/**
 * True when checkout feature config has the minimum fields for light AJAX.
 *
 * @param {WpdevFeatureConfig} config
 * @returns {boolean}
 */
export function isCheckoutAjaxReady(config) {
  return !!(
    config &&
    config.checkout &&
    config.checkout.nonce &&
    (config.checkout.ajaxurl || config.ajax?.lightUrl)
  );
}
