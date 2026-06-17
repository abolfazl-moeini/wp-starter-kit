import { useEffect, useRef } from "preact/hooks";

import { createWDFormStore } from "./createWDFormStore.js";

/**
 * Hooks-based WDForm controller. Each call creates an isolated store.
 *
 * @param {import('./createWDFormStore.js').WDFormStoreOptions} [options]
 */
export function useWDForm(options = {}) {
  const storeRef = useRef(null);
  const optionsRef = useRef(options);

  if (!storeRef.current) {
    storeRef.current = createWDFormStore(options);
  }

  const store = storeRef.current;

  // Keep latest options for configure
  useEffect(() => {
    optionsRef.current = options;
    store.configure(options);
  }, [options]);

  useEffect(() => {
    const opts = optionsRef.current;
    if (typeof opts.fetchInitialValues === "function") {
      if (opts.entityId != null) {
        void store.loadInitialValues(() =>
          opts.fetchInitialValues(opts.entityId),
        );
      } else {
        void store.loadInitialValues(opts.fetchInitialValues);
      }
    }
    return () => store.dispose();
  }, []); // initial load only, like component behavior

  // Subscribe to signal updates by reading them during render.
  store.fields.value;
  store.errors.value;
  store.status.value;
  store.mode.value;
  store.isDirty.value;
  store.dirtyFields.value;

  return {
    values: store.values,
    errors: { ...store.errors.value },
    status: store.status.value,
    mode: store.mode.value,
    isDirty: store.isDirty.value,
    dirtyFields: new Set(store.dirtyFields.value),
    register: (name) => store.register(name),
    watch: (name) => store.watch(name),
    setValue: (name, value) => store.setValue(name, value),
    setError: (name, message) => store.setError(name, message),
    setMode: (mode) => store.setMode(mode),
    reset: (values) => store.reset(values),
    submit: () => store.submit(),
    delete: (entityId) => store.delete(entityId),
    fieldArray: (name) => store.fieldArray(name),
    validateFields: (names) => store.validateFields(names),
    store,
  };
}
