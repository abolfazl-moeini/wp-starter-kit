/**
 * @wpdev/ui-components — WDForm CRUD form utilities.
 *
 * Instance-scoped forms with hooks + optional Preact signals.
 * Replaces the legacy global MLForm store API.
 *
 * See form.plan.md for the design.
 */
export {
  WDForm,
  useWDForm,
  createWDFormStore,
  validateFieldSync,
  validateAll,
  getDependentFields,
} from "./WDForm/index.js";
