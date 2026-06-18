import { computed, signal } from "@preact/signals";

import { createFieldArray } from "./fieldArray.js";
import { transitionStatus } from "./statusMachine.js";
import {
  getDependentFields,
  inferFieldHints,
  validateAll,
} from "./validators.js";

function cloneValues(values = {}) {
  return JSON.parse(JSON.stringify(values ?? {}));
}

function valuesEqual(a, b) {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  if (a && typeof a === "object" && b && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a == b; // loose for primitives
}

function fireHook(hooksPlugin, hookPrefix, hookName, ...args) {
  if (!hooksPlugin || typeof hooksPlugin.doAction !== "function") return;
  const prefix = hookPrefix || "wpdev";
  hooksPlugin.doAction(`${prefix}-${hookName}`, ...args);
}

/**
 * @typedef {Object} WDFormStoreOptions
 * @property {Record<string, *>} [initialValues]
 * @property {Record<string, Record<string, *>>} [rules]
 * @property {"blur"|"change"|"submit"} [validateOn]
 * @property {"create"|"edit"|"view"} [mode]
 * @property {(values: Record<string, *>, api: WDFormStoreApi) => void|Promise<void>} [onSubmit]
 * @property {(entityId: string|number) => void|Promise<void>} [onDelete]
 * @property {boolean} [resetAfterSubmit]
 * @property {boolean} [autoSave] - Automatically submit after each field change (debounced).
 * @property {number} [autoSaveDelay] - Debounce delay in ms for autoSave (default: 800).
 * @property {object} [hooksPlugin]
 * @property {string} [hookPrefix]
 */

/**
 * @param {WDFormStoreOptions} [options]
 */
export function createWDFormStore(options = {}) {
  const config = {
    rules: options.rules ?? {},
    validateOn: options.validateOn ?? "submit",
    mode: options.mode ?? "create",
    onSubmit: options.onSubmit,
    onDelete: options.onDelete,
    resetAfterSubmit: Boolean(options.resetAfterSubmit),
    autoSave: Boolean(options.autoSave),
    autoSaveDelay: options.autoSaveDelay ?? 800,
    hooksPlugin: options.hooksPlugin,
    hookPrefix: options.hookPrefix ?? "wpdev",
  };

  let disposed = false;
  let baselineValues = cloneValues(options.initialValues ?? {});
  let autoSaveTimer = null;

  const fields = signal(cloneValues(baselineValues));
  const errors = signal({});
  const status = signal("idle");
  const mode = signal(config.mode);

  const dirtyFields = computed(() => {
    const dirty = new Set();
    for (const key of Object.keys(fields.value)) {
      if (!valuesEqual(fields.value[key], baselineValues[key])) {
        dirty.add(key);
      }
    }
    return dirty;
  });

  const isDirty = computed(() => dirtyFields.value.size > 0);

  function assertActive() {
    if (disposed) {
      throw new Error("WDForm store has been disposed");
    }
  }

  function setStatus(next) {
    assertActive();
    status.value = transitionStatus(status.value, next);
  }

  function setBaseline(nextValues) {
    baselineValues = cloneValues(nextValues);
  }

  async function validateFields(names = null) {
    assertActive();
    const result = await validateAll(fields.value, config.rules, names);
    errors.value = { ...errors.value, ...result };
    return Object.values(result).every((value) => !value);
  }

  function scheduleAutoSave() {
    if (!config.autoSave || typeof config.onSubmit !== "function") return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      api.submit();
    }, config.autoSaveDelay ?? 800);
  }

  const api = {
    fields,
    errors,
    status,
    mode,
    isDirty,
    dirtyFields,
    get values() {
      return { ...fields.value };
    },
    get rules() {
      return config.rules;
    },
    watch(name) {
      // Return a computed for reactivity in signal-based code
      return computed(() => fields.value[name]);
    },
    setValue(name, value) {
      assertActive();
      fields.value = { ...fields.value, [name]: value };
      const dependents = getDependentFields(name, config.rules);
      if (config.validateOn === "change") {
        void validateFields(dependents);
      }
      scheduleAutoSave();
    },
    setError(name, message) {
      assertActive();
      errors.value = { ...errors.value, [name]: message ?? null };
    },
    setMode(nextMode) {
      assertActive();
      mode.value = nextMode;
    },
    setRules(nextRules) {
      config.rules = nextRules ?? {};
    },
    configure(next = {}) {
      if (next.rules) config.rules = next.rules;
      if (next.validateOn) config.validateOn = next.validateOn;
      if (next.onSubmit) config.onSubmit = next.onSubmit;
      if (next.onDelete) config.onDelete = next.onDelete;
      if (next.resetAfterSubmit != null) {
        config.resetAfterSubmit = Boolean(next.resetAfterSubmit);
      }
      if (next.hooksPlugin) config.hooksPlugin = next.hooksPlugin;
      if (next.hookPrefix) config.hookPrefix = next.hookPrefix;
      if (next.autoSave != null) config.autoSave = Boolean(next.autoSave);
      if (next.autoSaveDelay != null) config.autoSaveDelay = next.autoSaveDelay;
    },
    register(name) {
      assertActive();
      const hints = inferFieldHints(baselineValues[name]);
      const readOnly = mode.value === "view";
      const value = fields.value[name] ?? "";
      return {
        name,
        value,
        type: hints.type,
        inputMode: hints.inputMode,
        min: hints.min,
        max: hints.max,
        readOnly: readOnly || undefined,
        tabIndex: readOnly ? -1 : undefined,
        onChange: (event) => {
          const nextValue =
            event && event.target !== undefined
              ? event.target.type === "checkbox"
                ? event.target.checked
                : event.target.value
              : event;
          api.setValue(name, nextValue);
          fireHook(
            config.hooksPlugin,
            config.hookPrefix,
            "form-changed",
            null,
            name,
            nextValue,
          );
        },
        onBlur: () => {
          if (config.validateOn === "blur" || config.validateOn === "change") {
            void validateFields(getDependentFields(name, config.rules));
          }
        },
      };
    },
    async reset(nextValues = null) {
      assertActive();
      const restored =
        nextValues == null
          ? cloneValues(baselineValues)
          : cloneValues(nextValues);
      fields.value = restored;
      errors.value = {};
      setStatus("idle");
    },
    async loadInitialValues(loader) {
      if (typeof loader !== "function") return;
      setStatus("loading");
      try {
        const loaded = await loader();
        if (disposed) return;
        const next = cloneValues(loaded ?? {});
        fields.value = next;
        setBaseline(next);
        errors.value = {};
        setStatus("idle");
      } catch (error) {
        if (disposed) return;
        setStatus("error");
        throw error;
      }
    },
    async submit() {
      assertActive();
      if (mode.value === "view") return;
      const valid = await validateFields();
      if (!valid) return;

      if (typeof config.onSubmit !== "function") return;

      setStatus("submitting");
      fireHook(config.hooksPlugin, config.hookPrefix, "form-submit", null, {
        ...fields.value,
      });

      try {
        const result = await config.onSubmit({ ...fields.value }, api);
        if (disposed) return result;
        setStatus("success");
        fireHook(
          config.hooksPlugin,
          config.hookPrefix,
          "form-success",
          null,
          result,
        );
        if (config.resetAfterSubmit) {
          await api.reset();
        } else {
          setStatus("idle");
        }
        return result;
      } catch (error) {
        if (disposed) return;
        setStatus("error");
        fireHook(
          config.hooksPlugin,
          config.hookPrefix,
          "form-error",
          null,
          error,
        );
        throw error;
      }
    },
    async delete(entityId) {
      assertActive();
      if (typeof config.onDelete !== "function") return;
      setStatus("submitting");
      try {
        const result = await config.onDelete(entityId);
        if (disposed) return result;
        setStatus("idle");
        return result;
      } catch (error) {
        if (disposed) return;
        setStatus("error");
        throw error;
      }
    },
    fieldArray(name) {
      return createFieldArray(api, name);
    },
    validateFields,
    dispose() {
      disposed = true;
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    },
    _isDisposed() {
      return disposed;
    },
  };

  return api;
}

/** @typedef {ReturnType<typeof createWDFormStore>} WDFormStoreApi */
