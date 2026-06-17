import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";

import { createWDFormStore } from "./createWDFormStore.js";

function fireHook(hooksPlugin, hookPrefix, hookName, ...args) {
  if (!hooksPlugin || typeof hooksPlugin.doAction !== "function") return;
  const prefix = hookPrefix || "wpdev";
  hooksPlugin.doAction(`${prefix}-${hookName}`, ...args);
}

function DebugPanel({ form }) {
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "production"
  ) {
    return null;
  }

  return h(
    "details",
    { className: "wdform-debug" },
    h("summary", null, "WDForm debug"),
    h(
      "pre",
      null,
      JSON.stringify(
        {
          values: form.values,
          errors: form.errors,
          status: form.status,
          dirtyFields: [...form.dirtyFields],
        },
        null,
        2,
      ),
    ),
  );
}

/**
 * @param {object} props
 */
export function WDForm(props) {
  const containerRef = useRef(null);
  const initFiredRef = useRef(false);
  const storeRef = useRef(null);
  const ownsStoreRef = useRef(!props.store);

  if (!storeRef.current) {
    storeRef.current =
      props.store ??
      createWDFormStore({
        initialValues: props.initialValues,
        rules: props.rules,
        validateOn: props.validateOn,
        mode: props.mode,
        onSubmit: props.onSubmit,
        onDelete: props.onDelete,
        resetAfterSubmit: props.resetAfterSubmit,
        autoSave: props.autoSave,
        autoSaveDelay: props.autoSaveDelay,
        hooksPlugin: props.hooksPlugin,
        hookPrefix: props.hookPrefix,
      });
  }

  const store = storeRef.current;

  const lastPropsRef = useRef(props);
  useEffect(() => {
    lastPropsRef.current = props;
  });

  useEffect(() => {
    store.configure({
      rules: props.rules,
      validateOn: props.validateOn,
      onSubmit: props.onSubmit,
      onDelete: props.onDelete,
      resetAfterSubmit: props.resetAfterSubmit,
      autoSave: props.autoSave,
      autoSaveDelay: props.autoSaveDelay,
      hooksPlugin: props.hooksPlugin,
      hookPrefix: props.hookPrefix,
    });
    if (props.mode) store.setMode(props.mode);
  }, [
    props.rules,
    props.validateOn,
    props.onSubmit,
    props.onDelete,
    props.resetAfterSubmit,
    props.autoSave,
    props.autoSaveDelay,
    props.hooksPlugin,
    props.hookPrefix,
    props.mode,
  ]);

  useEffect(() => {
    const load = async () => {
      if (typeof props.fetchInitialValues !== "function") return;
      if (props.entityId != null) {
        await store.loadInitialValues(() =>
          props.fetchInitialValues(props.entityId),
        );
        return;
      }
      await store.loadInitialValues(props.fetchInitialValues);
    };
    void load();
  }, [props.entityId]);

  useEffect(
    () => () => {
      if (ownsStoreRef.current) store.dispose();
    },
    [],
  );

  function assignContainerRef(element) {
    containerRef.current = element;
    if (!element || initFiredRef.current) return;
    initFiredRef.current = true;
    fireHook(
      props.hooksPlugin,
      props.hookPrefix,
      "form-init",
      element,
      store.values,
    );
  }

  const onDirtyLeaveRef = useRef(props.onDirtyLeave);
  useEffect(() => {
    onDirtyLeaveRef.current = props.onDirtyLeave;
  });

  useEffect(() => {
    if (!props.onDirtyLeave) return undefined;

    const beforeUnload = (event) => {
      // Read latest isDirty at event time
      if (!store.isDirty.value) return;
      const ok = onDirtyLeaveRef.current && onDirtyLeaveRef.current();
      if (ok === false) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [props.onDirtyLeave]);

  store.fields.value;
  store.errors.value;
  store.status.value;
  store.mode.value;
  store.isDirty.value;

  const formApi = {
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

  const content =
    typeof props.children === "function"
      ? props.children(formApi)
      : props.children;

  const showSubmit =
    (props.showSubmitButton ?? false) && store.mode.value !== "view";

  return h(
    "div",
    {
      ref: assignContainerRef,
      className: props.wrapperClassName || undefined,
      "data-wdform-status": store.status.value,
    },
    h(
      "form",
      {
        className: props.className || undefined,
        onSubmit: (event) => {
          event.preventDefault();
          void store.submit();
        },
      },
      content,
      showSubmit
        ? h(
            "button",
            {
              type: "submit",
              disabled: store.status.value === "submitting",
            },
            store.status.value === "submitting" ? "Submitting…" : "Submit",
          )
        : null,
    ),
    props.debug ? h(DebugPanel, { form: formApi }) : null,
  );
}

export default WDForm;
