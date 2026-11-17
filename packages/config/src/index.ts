import type { ModuleConfigOptions, NonceChangeListener } from "./types";

export * from "./types";
export { createNonceRecoveryMiddleware } from "./middleware";

// Explicit overrides set via mockConfig() or updateNonce()
const moduleOverrides: Record<string, Record<string, any>> = {};
// Registered legacy global names per module (e.g. ["wpdevTicketsSettings"])
const moduleLegacyGlobals: Record<string, string[]> = {};
// Last non-empty nonce observed during getModuleConfig()
const moduleLastNonce: Record<string, string> = {};
// Per-container memoization cache (invalidated on updateNonce / mockConfig / resetConfig)
let containerStores = new WeakMap<
  HTMLElement,
  Record<string, Record<string, any>>
>();
const nonceListeners: Set<NonceChangeListener> = new Set();

function getGlobal(): Record<string, any> | undefined {
  if (typeof globalThis !== "undefined") {
    return globalThis as Record<string, any>;
  }
  if (typeof window !== "undefined") {
    return window as Record<string, any>;
  }
  return undefined;
}

function parseDatasetValue(val: string, defaultVal?: unknown): unknown {
  if (typeof defaultVal === "string") {
    return val;
  }
  if (typeof defaultVal === "boolean") {
    if (val === "true" || val === "1") return true;
    if (val === "false" || val === "0") return false;
    return defaultVal;
  }
  if (typeof defaultVal === "number") {
    const trimmed = val.trim();
    if (trimmed === "") return defaultVal;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : defaultVal;
  }
  if (val === "true" || val === "1") return true;
  if (val === "false" || val === "0") return false;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  return val;
}

function parseDataset(
  dataset: Record<string, string | undefined>,
  defaults: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(dataset)) {
    const val = dataset[key];
    if (typeof val === "string" && val !== "") {
      result[key] = parseDatasetValue(val, defaults[key]);
    }
  }
  return result;
}

export function getModuleConfig<T extends Record<string, any>>(
  options: ModuleConfigOptions<T>,
): T {
  const { module, container, defaults = {}, legacyGlobals = [] } = options;
  const globalObj = getGlobal();

  if (legacyGlobals.length > 0) {
    const existing = moduleLegacyGlobals[module] || [];
    const combined = Array.from(new Set([...existing, ...legacyGlobals]));
    moduleLegacyGlobals[module] = combined;
  }

  // If container provided and already cached in WeakMap for this module, return it
  if (container) {
    const cachedByModule = containerStores.get(container);
    if (cachedByModule && cachedByModule[module]) {
      return cachedByModule[module] as T;
    }
  }

  // 1. Start with defaults
  let merged: Record<string, any> = { ...defaults };

  // 2. Container dataset attributes (fallback above defaults)
  if (container?.dataset) {
    const datasetParsed = parseDataset(
      container.dataset,
      defaults as Record<string, any>,
    );
    merged = { ...merged, ...datasetParsed };
  }

  // 3. Fall back to legacy globals if present (override dataset if non-empty)
  if (globalObj) {
    for (const legacyKey of legacyGlobals) {
      if (globalObj[legacyKey] && typeof globalObj[legacyKey] === "object") {
        for (const k of Object.keys(globalObj[legacyKey])) {
          const val = globalObj[legacyKey][k];
          if (val !== undefined && val !== "") {
            merged[k] = val;
          }
        }
      }
    }

    // 4. Modern namespace: window.wpdev[module]
    if (globalObj.wpdev && typeof globalObj.wpdev === "object") {
      if (
        globalObj.wpdev[module] &&
        typeof globalObj.wpdev[module] === "object"
      ) {
        for (const k of Object.keys(globalObj.wpdev[module])) {
          const val = globalObj.wpdev[module][k];
          if (val !== undefined && val !== "") {
            merged[k] = val;
          }
        }
      }
    }
  }

  // 5. Explicit in-memory override (from mockConfig or updateNonce)
  if (moduleOverrides[module]) {
    merged = { ...merged, ...moduleOverrides[module] };
  }

  if (typeof merged.nonce === "string" && merged.nonce.length > 0) {
    moduleLastNonce[module] = merged.nonce;
  }

  const frozen = Object.freeze(merged) as T;

  if (container) {
    const existing = containerStores.get(container) || {};
    existing[module] = frozen;
    containerStores.set(container, existing);
  }

  return frozen;
}

export function getCandidateNonces(module?: string): string[] {
  const globalObj = getGlobal();
  const candidates: string[] = [];
  const push = (val: unknown) => {
    if (
      typeof val === "string" &&
      val.length > 0 &&
      !candidates.includes(val)
    ) {
      candidates.push(val);
    }
  };

  if (module && moduleOverrides[module]?.nonce) {
    push(String(moduleOverrides[module].nonce));
  }
  if (module && globalObj?.wpdev?.[module]?.nonce) {
    push(String(globalObj.wpdev[module].nonce));
  }
  if (module && moduleLegacyGlobals[module]) {
    for (const legacyKey of moduleLegacyGlobals[module]) {
      if (globalObj?.[legacyKey]?.nonce) {
        push(String(globalObj[legacyKey].nonce));
      }
    }
  }
  if (globalObj?.wpApiSettings?.nonce) {
    push(String(globalObj.wpApiSettings.nonce));
  }
  if (globalObj?.wpdev_ajax?.nonce) {
    push(String(globalObj.wpdev_ajax.nonce));
  }
  if (module && moduleLastNonce[module]) {
    push(moduleLastNonce[module]);
  }

  return candidates;
}

export function getNonce(module?: string): string {
  return getCandidateNonces(module)[0] || "";
}

export function updateNonce(newNonce: string, module?: string): void {
  if (!newNonce) return;
  const globalObj = getGlobal();

  if (module) {
    if (!moduleOverrides[module]) {
      moduleOverrides[module] = {};
    }
    moduleOverrides[module].nonce = newNonce;
    moduleLastNonce[module] = newNonce;

    if (
      globalObj?.wpdev?.[module] &&
      typeof globalObj.wpdev[module] === "object"
    ) {
      globalObj.wpdev[module].nonce = newNonce;
    }

    if (moduleLegacyGlobals[module] && globalObj) {
      for (const legacyKey of moduleLegacyGlobals[module]) {
        if (globalObj[legacyKey] && typeof globalObj[legacyKey] === "object") {
          globalObj[legacyKey].nonce = newNonce;
        }
      }
    }
  }

  // Invalidate cached container configs so subsequent reads observe the updated nonce
  containerStores = new WeakMap<
    HTMLElement,
    Record<string, Record<string, any>>
  >();

  // Notify registered listeners
  for (const listener of nonceListeners) {
    try {
      listener(newNonce, module);
    } catch {
      // Ignore listener error
    }
  }
}

export function onNonceChange(callback: NonceChangeListener): () => void {
  nonceListeners.add(callback);
  return () => {
    nonceListeners.delete(callback);
  };
}

export function mockConfig<T extends Record<string, any>>(
  module: string,
  config: Partial<T>,
): void {
  moduleOverrides[module] = { ...(moduleOverrides[module] || {}), ...config };
  containerStores = new WeakMap<
    HTMLElement,
    Record<string, Record<string, any>>
  >();
}

export function resetConfig(): void {
  for (const key of Object.keys(moduleOverrides)) {
    delete moduleOverrides[key];
  }
  for (const key of Object.keys(moduleLegacyGlobals)) {
    delete moduleLegacyGlobals[key];
  }
  for (const key of Object.keys(moduleLastNonce)) {
    delete moduleLastNonce[key];
  }
  containerStores = new WeakMap<
    HTMLElement,
    Record<string, Record<string, any>>
  >();
  nonceListeners.clear();
}
