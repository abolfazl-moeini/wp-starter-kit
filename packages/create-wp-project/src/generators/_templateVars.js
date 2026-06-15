/**
 * @wpsk/create-wp-project — re-export of tplVars from _templates.
 *
 * Phase 21 split: `tplVars` lives in `_templates.js` (Phase 21
 * consolidated the inline templates and helpers there). This
 * file is a thin re-export so generator files can import from
 * `./_templateVars.js` (singular, matching the import style in
 * the existing core.js body) without depending on the larger
 * `_templates.js` module directly.
 *
 * The functions are pure (no I/O, no clock side effects) and
 * cheap to call — both the legacy `scaffoldProject` and the new
 * generators invoke them once per scaffold.
 */

export { tplVars } from "./_templates.js";
