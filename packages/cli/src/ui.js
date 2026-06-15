/**
 * `ui.js` — thin wrapper around `@clack/prompts`. Centralizing the
 * import here means tests can inject a fake `ui` (recording
 * question/answer pairs) and the gather pipeline never has to
 * import `@clack/prompts` directly.
 *
 * Phase I3 + I6 export two additional helpers:
 *  - `renderSummary({answers, features, runOptions})` — returns a
 *    multi-line string for the "your project" panel. Field order
 *    is locked (slug → JS → lib → CSS → blocks → PHP min →
 *    fault-tolerance → ON toggles).
 *  - `renderNextSteps(features, runOptions)` — returns an ordered
 *    array of `cd <dir> && <command>` strings for the "what to do
 *    next" panel. The first line is always `cd <dir>`. npm and
 *    composer steps are gated by the same §I3.7 rules used by
 *    the post-generation actions in `commands/create.js`.
 *
 * The default `ui` object (still exported for the prompt loop)
 * now has working `renderSummary` / `renderNextSteps` shims that
 * just stringify the named exports.
 */

let _clack = null;

async function getClack() {
  if (_clack) return _clack;
  // Dynamic import keeps the static graph simple and lets the
  // tests monkey-patch the module via jest.mock("./ui").
  _clack = await import("@clack/prompts");
  return _clack;
}

/* -------------------------------------------------------------------- */
/* renderSummary — the "your project" panel                             */
/* -------------------------------------------------------------------- */

/**
 * Build a one-line-per-field summary of the resolved project
 * config. Field order is the plan's appendix-A canonical order
 * (so the panel is predictable across runs).
 *
 * The function is pure: it does not call clack, write to the
 * terminal, or touch the filesystem. The `ui` wrapper's
 * `renderSummary` async helper is the "side-effectful" variant
 * (which prints to stdout); tests should use the named export
 * directly.
 *
 * @param {{answers?:object, features?:object, runOptions?:object}} input
 * @returns {string}
 */
export function renderSummary(input) {
  const i = input || {};
  const a = i.answers || {};
  const f = i.features || {};
  const lines = [];
  const push = (k, v) => {
    if (v === undefined || v === null || v === "") return;
    lines.push(`  ${k}: ${v}`);
  };

  // Header line.
  const slug = a.slug || "<unset>";
  lines.push(`Summary: ${slug}`);

  // 1. JS row (flavor + lib).
  if (f.js !== undefined) {
    const lib = f.js === "none" ? "" : ` + ${f.jsLib || "?"}`;
    push("JS", `${f.js}${lib}`);
  } else {
    push("JS", "<unset>");
  }
  // 2. CSS.
  push("CSS", f.css);
  // 3. Blocks.
  push("Blocks", f.blocks);
  // 4. PHP min + framework + test.
  push("PHP min", f.phpMinVersion);
  push("PHP framework", f.phpFramework);
  push("PHP test", f.phpTest);
  // 5. License + WP min.
  push("License", f.license);
  push("WP min", f.wpMinVersion);
  // 6. ON toggles (in stable order).
  push("batch", f.restBatch);
  push("fault-tolerance", f.faultTolerance);
  push("vendor-scoping", f.vendorScoping);
  push("husky", f.husky);
  push("example", f.exampleFeature);
  push("i18n", f.i18n);

  return lines.join("\n");
}

/* -------------------------------------------------------------------- */
/* renderNextSteps — the "what's next" panel                            */
/* -------------------------------------------------------------------- */

/**
 * Build the ordered list of follow-up commands the user should
 * run after a successful `wpsk create`. Returned as an array of
 * strings (the bin layer prints them; tests assert membership).
 *
 * The gating rules mirror the post-generation actions in
 * `commands/create.js`:
 *   - npm install: included when `js !== 'none'` OR `husky === 'on'`
 *     (i.e. a package.json was emitted by the engine).
 *   - composer install: included when `phpTest === 'phpunit'`
 *     (i.e. a composer.json was emitted by the engine).
 *
 * @param {Record<string,string>} [features]
 * @param {object} [runOptions]
 * @param {string} [runOptions.targetDir]
 * @returns {string[]}
 */
export function renderNextSteps(features, runOptions) {
  const f = features || {};
  const r = runOptions || {};
  const dir = r.targetDir || ".";
  const steps = [`cd ${dir}`];

  const needsNpm = f.js !== "none" || f.husky === "on";
  if (needsNpm) {
    steps.push(`${dir === "." ? "" : " "}npm install`);
  }

  const needsComposer = f.phpTest === "phpunit";
  if (needsComposer) {
    steps.push(`${dir === "." ? "" : " "}composer install`);
  }

  // Advisory: if JS is on, the user can run tests. We add this
  // ONLY when the project has JS — a PHP-only project has no
  // `npm test` to run.
  if (f.js && f.js !== "none") {
    steps.push(`${dir === "." ? "" : " "}npm test`);
  }

  return steps;
}

/* -------------------------------------------------------------------- */
/* Default `ui` wrapper (used by the prompt loop)                       */
/* -------------------------------------------------------------------- */

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
   * Print the summary panel to stdout. Returns a promise so it
   * composes with the rest of the async pipeline.
   *
   * @param {{answers?:object, features?:object, runOptions?:object}} input
   */
  async renderSummary(input) {
    const text = renderSummary(input);
    // Print to stdout (process.stdout.write so we don't depend
    // on clack's log panel — this is the "summary" phase, not
    // an interactive step).
    process.stdout.write(text + "\n");
  },

  /**
   * Print the next-steps panel. Returns a promise so it
   * composes with the rest of the async pipeline.
   *
   * @param {Record<string,string>} features
   * @param {object} runOptions
   */
  async renderNextSteps(features, runOptions) {
    const steps = renderNextSteps(features, runOptions);
    if (steps.length === 0) return;
    process.stdout.write("\nNext steps:\n");
    for (const s of steps) {
      process.stdout.write("  " + s + "\n");
    }
  },

  /**
   * Render a structured error list. One line per error key.
   * Currently a no-op surface — full implementation lands in
   * Phase I6 (UX polish). Kept for API symmetry.
   */
  async renderError(_err) {
    // Intentionally a no-op — Phase I6 implements the full
    // one-error-per-line format. The current `runCreate` returns
    // a structured {ok:false, reason} and the bin layer writes
    // a single line to stderr.
  },

  /**
   * Phase I4 — `wpsk list` table renderer. Prints a 3-column
   * table (FEATURE | STATE | VARIANT) with a header row and an
   * aligned body. The function is intentionally ANSI-color aware
   * (we tint the `state` column green for "on" and dim grey for
   * "off"); picocolors is already a dep, so we use it. Falls
   * back to a plain, uncolored string when stdout is not a TTY
   * (e.g. when the user pipes to `less` or to `wpsk list --json`).
   *
   * The function is async for API symmetry with the other
   * ui.render* helpers, but the work is synchronous; tests can
   * `await` it without consequence.
   *
   * @param {Array<{id: string, state: string, variant: string}>} rows
   * @returns {Promise<void>}
   */
  async renderFeatureTable(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      process.stdout.write("(no features)\n");
      return;
    }
    let pc;
    try {
      pc = (await import("picocolors")).default;
    } catch {
      pc = null; // picocolors missing — fall back to plain
    }
    const tint = (color, str) => (pc ? pc[color](str) : String(str));

    const header = ["FEATURE", "STATE", "VARIANT"];
    const body = rows.map((r) => [
      r.id,
      r.state,
      typeof r.variant === "string" ? r.variant : String(r.variant),
    ]);
    const all = [header, ...body];
    const widths = [0, 0, 0];
    for (const row of all) {
      for (let i = 0; i < row.length; i++) {
        if (row[i].length > widths[i]) widths[i] = row[i].length;
      }
    }
    const fmt = (cols) =>
      cols.map((c, i) => c.padEnd(widths[i], " ")).join("  ");
    process.stdout.write(fmt(header) + "\n");
    process.stdout.write(widths.map((w) => "-".repeat(w)).join("  ") + "\n");
    for (let r = 0; r < body.length; r++) {
      const row = body[r];
      // The "state" column gets tinted (row index 1).
      const colored = [
        row[0],
        tint(row[1] === "on" ? "green" : "gray", row[1]),
        row[2],
      ];
      process.stdout.write(fmt(colored) + "\n");
    }
  },
};

export default ui;
