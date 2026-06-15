/**
 * `ui.js` — thin wrapper around `@clack/prompts`. Centralizing the
 * import here means tests can inject a fake `ui` (recording
 * question/answer pairs) and the gather pipeline never has to
 * import `@clack/prompts` directly. Phase I6 will extend this with
 * `renderSummary` and `renderError` helpers — for now we expose
 * only the four primitives the prompt loop needs.
 *
 * @clack/prompts is ESM-only. We import it lazily inside each
 * function so Jest can stub the module path during tests without
 * the real clack being on disk (it is on disk in production, but
 * we keep the indirection symmetric with the test seam).
 */

let _clack = null;

async function getClack() {
  if (_clack) return _clack;
  // Dynamic import keeps the static graph simple and lets the
  // tests monkey-patch the module via jest.mock("./ui").
  _clack = await import("@clack/prompts");
  return _clack;
}

const ui = {
  /**
   * @param {{message: string, placeholder?: string, validate?: Function}} opts
   * @returns {Promise<string>}
   */
  async text(opts) {
    const clack = await getClack();
    return clack.text(opts);
  },

  /**
   * @param {{message: string, options: Array<{label:string, value:string}>, initialValue?: string}} opts
   * @returns {Promise<string>}
   */
  async select(opts) {
    const clack = await getClack();
    return clack.select(opts);
  },

  /**
   * @param {{message: string}} opts
   * @returns {Promise<boolean>}
   */
  async confirm(opts) {
    const clack = await getClack();
    return clack.confirm(opts);
  },

  /**
   * @param {{message: string}} opts
   * @returns {Promise<{start: Function, stop: Function, message: Function}>}
   */
  async spinner(opts) {
    const clack = await getClack();
    return clack.spinner(opts);
  },

  /**
   * @param {string} message
   */
  async log(message) {
    const clack = await getClack();
    clack.log.message(message);
  },

  /**
   * Phase I6 hook: render a summary panel of the chosen options.
   * Stub for now — Phase I6 (Runners & UX Polish) implements the
   * real layout.
   */
  async renderSummary(_input) {
    // Intentionally a no-op in I1/I2. Phase I6 fills in the real
    // table (slug, JS flavor, PHP min, ON toggles).
  },

  /**
   * Phase I6 hook: render a structured error list.
   */
  async renderError(_err) {
    // Intentionally a no-op in I1/I2. Phase I6 implements the
    // one-error-per-line format.
  },
};

export default ui;
