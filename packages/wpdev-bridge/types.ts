/**
 * Shared contracts for the WPDev ↔ starter-kit bridge.
 *
 * @see integrate.md Phase 1
 */

export type WpdevAjaxEnvelope<T = unknown> = {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
};

export type WpdevAjaxTransport = "admin" | "light";

export type WpdevAjaxNonceField = "_wpnonce" | "nonce" | string;

export type WpdevAjaxOptions = {
  transport?: WpdevAjaxTransport;
  endpointUrl?: string;
  nonceField?: WpdevAjaxNonceField;
  nonceValue?: string;
  signal?: AbortSignal;
};

export type WpdevAjaxConfig = {
  adminUrl?: string;
  lightUrl?: string;
  nonce?: string;
};

export type WpdevCheckoutConfig = {
  baseurl?: string;
  nonce?: string;
  lateAjaxUrl?: string;
  ajaxurl?: string;
};

export type WpdevFeatureConfig = {
  ajax?: WpdevAjaxConfig;
  checkout?: WpdevCheckoutConfig;
  hooksNamespace?: string;
};

export type WpdevLegacyGlobals = {
  wpdev_ajax?: {
    admin_ajax_url?: string;
    light_ajax_url?: string;
    nonce?: string;
  };
  wpdev_checkout?: {
    ajaxurl?: string;
    late_ajaxurl?: string;
    baseurl?: string;
    nonce?: string;
  };
  wpdev?: {
    ajax?: {
      post?: (
        action: string,
        data?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => Promise<unknown>;
      get?: (
        action: string,
        data?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => Promise<unknown>;
      normalize?: (json: unknown) => WpdevAjaxEnvelope;
    };
  };
  wp?: {
    hooks?: {
      doAction?: (hookName: string, ...args: unknown[]) => void;
      applyFilters?: (
        hookName: string,
        value: unknown,
        ...args: unknown[]
      ) => unknown;
      addAction?: (
        hookName: string,
        namespace: string,
        callback: (...args: unknown[]) => void,
        priority?: number,
      ) => void;
      addFilter?: (
        hookName: string,
        namespace: string,
        callback: (...args: unknown[]) => unknown,
        priority?: number,
      ) => unknown;
    };
  };
};
