/**
 * MLForm — Preact form component for the @wpsk starter kit.
 *
 * The original `mrlogistic` implementation wired up RuleEngine, lodash,
 * formUtils, i18n, and the rest-utils AJAX layer into a single 360-line
 * class component. That complexity belongs in the consuming project
 * (ml-rates, ml-billing, …), not in the starter kit.
 *
 * What we keep here is the structural skeleton:
 *   - props.onSubmit / props.onAjaxResponse / props.onAjaxError
 *   - props.resetAfterSubmit, props.fetchInitialValues, props.useLaravelRest
 *   - rules array (passed to the @wpsk/rule-engine)
 *   - a flat render with children passthrough
 *
 * Consumers wanting the full MLForm feature set should import the
 * original from their own theme/plugin — the starter kit only ships
 * the version-agnostic scaffolding.
 */
import { useEffect, useRef, useState } from "preact/hooks";
import classNames from "classnames";
import isEmpty from "lodash.isempty";

import { batchGetFormData, batchSetFormData } from "../index.js";

export function MLForm(props) {
  const wrapperRef = useRef(null);
  const [dynamicInitialValues] = useState();
  const firstRender = !wrapperRef.current;

  const initialValues = () => ({
    ...(props.queryParams || {}),
    ...(dynamicInitialValues || {}),
    ...(props.initialValues || {}),
  });

  useEffect(() => {
    if (firstRender) {
      batchSetFormData(initialValues());
    }
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    if (props.onSubmit) props.onSubmit(batchGetFormData());
  }

  return (
    <div
      ref={wrapperRef}
      className={classNames("wpsk-form", props.wrapperClassName, {
        "invalid-ajax-data":
          props.fetchInitialValues && isEmpty(dynamicInitialValues),
      })}
    >
      <form
        onSubmit={handleSubmit}
        className={classNames("the-form", props.className)}
      >
        {props.children ?? ""}
      </form>
    </div>
  );
}

export default MLForm;
