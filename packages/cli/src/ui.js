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
/* getTinter — lazy picocolors wrapper used by the render* helpers        */
/* -------------------------------------------------------------------- */

let _tinterPromise = null;

/**
 * Resolve a `(color, str) => string` tinter. The first call
 * dynamic-imports `picocolors` and memoises the resulting
 * tinter; subsequent calls reuse the cached value. A missing
 * `picocolors` is non-fatal — the tinter degrades to a plain
 * `String(...)` so the render* helpers still print readable
 * text in non-TTY environments and in the test harness
 * (where picocolors may not be installed).
 *
 * Centralised here so `renderFeatureTable`, `renderKitStatus`,
 * `renderPlan`, and `renderDoctor` all share one dynamic import
 * path (instead of repeating the try/catch around the import
 * in every helper — a previous code review flagged that
 * duplication).
 *
 * @returns {Promise<(color: string, str: string) => string>}
 */
function getTinter() {
  if (!_tinterPromise) {
    _tinterPromise = (async () => {
      let pc = null;
      try {
        pc = (await import("picocolors")).default;
      } catch {
        pc = null;
      }
      return (color, str) => (pc && pc[color] ? pc[color](str) : String(str));
    })();
  }
  return _tinterPromise;
}

/* -------------------------------------------------------------------- */
/* renderError — the "validation failed" panel                            */
/* -------------------------------------------------------------------- */

/**
 * Build a one-line-per-field error panel and return a result the
 * bin layer can use to `process.exit(code)`. Field order is the
 * insertion order of `errors` (Object.entries). The function is
 * pure with respect to inputs (no filesystem / no network), but
 * does write to stderr as a side effect — that's the contract
 * the bin layer relies on (it stays tiny: `await
 * ui.renderError({...}); process.exit(result.code);`).
 *
 * Default behavior:
 *   - `code: 1` for any non-empty input.
 *   - One title line (`<title>`) on stderr.
 *   - One field line per entry, formatted as `  <key>: <msg>`.
 *   - Empty / missing `errors` is tolerated; the title still
 *     prints and the code is still non-zero.
 *
 * Non-string error values are coerced via `String(...)` so the
 * renderer never throws. A null / undefined `title` is
 * substituted with a generic heading.
 *
 * @param {{title?: string, errors?: object}} [input]
 * @returns {{code: number, title: string, count: number}}
 */
export function renderError(input) {
  const i = input || {};
  const title =
    typeof i.title === "string" && i.title.length > 0 ? i.title : "wpdev: error";
  const errors = i.errors && typeof i.errors === "object" ? i.errors : {};

  process.stderr.write(title + "\n");
  let count = 0;
  for (const [k, v] of Object.entries(errors)) {
    const msg = v === null || v === undefined ? "" : String(v);
    process.stderr.write("  " + k + ": " + msg + "\n");
    count += 1;
  }
  return { code: 1, title, count };
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
  if (f.frontendStack === "polaris" && f.js !== "none") {
    const libLabel =
      f.jsLib === "react"
        ? "React"
        : f.jsLib === "preact"
          ? "Preact"
          : f.jsLib || "?";
    lines.push(`Summary: ${slug} · TS+${libLabel} · Polaris Stack`);
  } else {
    lines.push(`Summary: ${slug}`);
  }

  // 1. JS row (flavor + lib).
  if (f.js !== undefined) {
    const lib = f.js === "none" ? "" : ` + ${f.jsLib || "?"}`;
    push("JS", `${f.js}${lib}`);
  } else {
    push("JS", "<unset>");
  }
  if (f.mcpAbilities === "on") {
    lines[0] = `${lines[0]} · Abilities API (MCP)`;
  }

  // 2. CSS.
  push("CSS", f.css);
  // 3. Blocks.
  push("Blocks", f.blocks === "on" ? "Blockstudio" : f.blocks);
  if (f.blocks === "on" && f.phpMinVersion && f.phpMinVersion < "8.2") {
    lines.push(
      "  Note: Blockstudio requires PHP 8.2+ at runtime (Rector downlevels your plugin source only).",
    );
  }
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
   * Render a structured error list. One line per error key, with
   * a title line up top. Returns `{code: 1}` so the bin layer can
   * do `process.exit((await ui.renderError({...})).code)`. The
   * full implementation landed in Phase I6 (UX polish) — see
   * `renderError` (the named export) for the contract.
   *
   * @param {{title?: string, errors?: object}} [err]
   * @returns {Promise<{code: number, title: string, count: number}>}
   */
  async renderError(err) {
    return renderError(err);
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
    const tint = await getTinter();

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

  /**
   * Phase I5 — `wpsk info` panel renderer. Prints the
   * kit-version / dist-mode / path / update / features block
   * that `engine.getKitStatus` returns. When `opts.json` is
   * true, prints the raw object as JSON instead (machine
   * output for `wpsk info --json`).
   *
   * Field order is the spec's canonical order:
   *   Path:           <abs path>
   *   Kit version:    <manifest.kitVersion>
   *   Dist mode:      <manifest.distMode>
   *   Update:         <latest> available     (yellow, only when updateAvailable)
   *   Features:
   *     <id>:  <variant>
   *     ...
   *
   * The function is async for API symmetry; the work is
   * synchronous. A missing picocolors is non-fatal — we
   * fall back to plain strings (the test harness + non-TTY
   * output).
   *
   * @param {{
   *   kitVersion: string,
   *   distMode: string,
   *   path: string,
   *   features: Object,
   *   latestKitVersion?: string,
   *   updateAvailable?: boolean,
   * }} status
   * @param {{json?: boolean}} [opts]
   * @returns {Promise<void>}
   */
  async renderKitStatus(status, opts) {
    const s = status || {};
    const o = opts || {};

    // --json takes precedence over the pretty panel. The
    // contract: a single JSON object on stdout, trailing
    // newline so the shell prompt starts on its own line.
    if (o.json === true) {
      process.stdout.write(JSON.stringify(s, null, 2) + "\n");
      return;
    }

    const tint = await getTinter();

    // Label column width: "Kit version:" is the longest
    // label we emit. 16 chars (with a single trailing
    // space) gives us a stable gutter that lines up with
    // the "Features:" header.
    const LABEL = 16;
    const label = (k) => k.padEnd(LABEL, " ");
    const lines = [];
    lines.push("wpdev info");
    lines.push("─".repeat("wpdev info".length));
    lines.push(label("Path:") + (s.path || ""));
    lines.push(label("Kit version:") + (s.kitVersion || ""));
    lines.push(label("Dist mode:") + (s.distMode || ""));
    if (s.updateAvailable === true && s.latestKitVersion) {
      lines.push(
        label("Update:") + tint("yellow", s.latestKitVersion + " available"),
      );
    }
    lines.push("Features:");
    const features =
      s.features && typeof s.features === "object" ? s.features : {};
    const featureIds = Object.keys(features);
    if (featureIds.length === 0) {
      lines.push("  (none)");
    } else {
      for (const id of featureIds) {
        const v = features[id];
        const val = typeof v === "string" ? v : String(v);
        lines.push("  " + (id + ":").padEnd(12, " ") + " " + val);
      }
    }
    process.stdout.write(lines.join("\n") + "\n");
  },

  /**
   * Phase I5 — `wpsk update` plan renderer. Pretty-prints the
   * object `engine.planUpdate(dir, to)` returns.
   *
   * Layout:
   *   Update plan: <from> → <to>
   *   (when noop) Already at <to>. Nothing to do.
   *   Migrations:
   *     <version> — <description>
   *     ...
   *   Dep changes:
   *     package:  add {...}  bump {...}  remove {...}
   *     composer: add {...}  bump {...}  remove {...}
   *
   * Each dep bucket is rendered as `name: from → to` (bump),
   * `name: range` (add), or `name: <old range>` (remove).
   * Empty buckets render as `(none)`.
   *
   * Colors: bumps in yellow, adds in green, removes in gray.
   * Falls back to plain text when picocolors is missing.
   *
   * @param {{
   *   ok: boolean,
   *   noop?: boolean,
   *   from?: string,
   *   to?: string,
   *   current?: string,
   *   migrations?: Array<{version: string, description: string}>,
   *   depChanges?: {
   *     package: { add: Object, remove: Object, bump: Object },
   *     composer: { add: Object, remove: Object, bump: Object }
   *   }
   * }} plan
   * @returns {Promise<void>}
   */
  async renderPlan(plan) {
    const p = plan || {};
    const tint = await getTinter();

    const lines = [];
    if (p.noop === true) {
      lines.push(
        "Update plan: " +
          tint(
            "green",
            "already at " + (p.current || p.to) + " — nothing to do",
          ),
      );
    } else if (p.from && p.to) {
      lines.push(
        "Update plan: " + (p.from || "?") + " → " + tint("green", p.to),
      );
    } else {
      lines.push("Update plan:");
    }

    // Migrations.
    const migrations = Array.isArray(p.migrations) ? p.migrations : [];
    lines.push("Migrations:");
    if (migrations.length === 0) {
      lines.push("  (none)");
    } else {
      for (const m of migrations) {
        const ver = m && typeof m.version === "string" ? m.version : "?";
        const desc =
          m && typeof m.description === "string" ? m.description : "";
        lines.push("  " + ver + " — " + desc);
      }
    }

    // Dep changes.
    const dc = p.depChanges || {
      package: { add: {}, remove: {}, bump: {} },
      composer: { add: {}, remove: {}, bump: {} },
    };
    lines.push("Dep changes:");

    /**
     * Render a single dep bucket (add/remove/bump) into a list of
     * "name ..." lines, alphabetized. The color logic:
     *   - bump  → yellow   (the range changes — draw attention)
     *   - add   → green    (the dep is new)
     *   - remove → gray    (the dep is leaving the project)
     */
    const renderBucket = (kind, bucket) => {
      const names = Object.keys(bucket || {}).sort();
      if (names.length === 0) {
        return ["    " + tint("gray", "(none)")];
      }
      const out = [];
      for (const name of names) {
        const v = bucket[name];
        if (kind === "bump") {
          const from = (v && v.from) || "?";
          const to = (v && v.to) || "?";
          out.push("    " + tint("yellow", name + ": " + from + " → " + to));
        } else if (kind === "add") {
          out.push("    " + tint("green", name + ": " + v));
        } else {
          // remove
          out.push("    " + tint("gray", name + ": " + v));
        }
      }
      return out;
    };

    for (const side of ["package", "composer"]) {
      const s = dc[side] || { add: {}, remove: {}, bump: {} };
      const addCount = Object.keys(s.add || {}).length;
      const bumpCount = Object.keys(s.bump || {}).length;
      const removeCount = Object.keys(s.remove || {}).length;
      if (addCount === 0 && bumpCount === 0 && removeCount === 0) {
        lines.push("  " + side + ": (no changes)");
        continue;
      }
      lines.push("  " + side + ":");
      lines.push(...renderBucket("add", s.add));
      lines.push(...renderBucket("bump", s.bump));
      lines.push(...renderBucket("remove", s.remove));
    }

    process.stdout.write(lines.join("\n") + "\n");
  },

  /**
   * Phase I5 — `wpsk doctor` report renderer. Pretty-prints the
   * combined `{ system: [...], project: {ok, warnings, errors} }`
   * report.
   *
   * Layout:
   *   wpsk doctor
   *   ───────────
   *   System:
   *     <name>   <ok/fail>  <version?>  <reason?>
   *     ...
   *   Project:
   *     warnings:
   *       - <msg>
   *     errors:
   *       - <msg>
   *
   * The `code` arg, when provided, is rendered as a final
   * summary line:
   *   "OK" (green)            when code === 0
   *   "Warnings: N" (yellow)  when code === 2
   *   "Errors: N" (red)       when code === 1
   *
   * Colors fall back to plain text when picocolors is missing.
   *
   * @param {{
   *   system: Array<{name:string, ok:boolean, found:boolean, version?:string, reason?:string}>,
   *   project: { ok: boolean, warnings: string[], errors: string[] }
   * }} report
   * @param {{code?: number, json?: boolean}} [opts]
   * @returns {Promise<void>}
   */
  async renderDoctor(report, opts) {
    const r = report || {};
    const o = opts || {};

    if (o.json === true) {
      process.stdout.write(JSON.stringify(r, null, 2) + "\n");
      return;
    }

    const tint = await getTinter();

    const lines = [];
    lines.push("wpdev doctor");
    lines.push("─".repeat("wpdev doctor".length));

    // System block.
    const system = Array.isArray(r.system) ? r.system : [];
    lines.push("System:");
    if (system.length === 0) {
      lines.push("  (no checks ran)");
    } else {
      // The "name" column is the longest label, padded to 10
      // chars so the second column lines up.
      const NAME = 10;
      for (const s of system) {
        const name = (s && s.name) || "?";
        const status =
          s && s.ok === true
            ? tint("green", "ok")
            : s && s.found === false
              ? tint("gray", "missing")
              : tint("yellow", "warn");
        const version =
          s && typeof s.version === "string" ? " " + s.version : "";
        const reason = s && typeof s.reason === "string" ? "  " + s.reason : "";
        lines.push(
          "  " +
            name.padEnd(NAME, " ") +
            status.padEnd(7, " ") +
            version +
            reason,
        );
      }
    }

    // Project block.
    const proj = r.project || { ok: true, warnings: [], errors: [] };
    const warnings = Array.isArray(proj.warnings) ? proj.warnings : [];
    const errors = Array.isArray(proj.errors) ? proj.errors : [];
    lines.push("Project:");
    lines.push("  warnings:");
    if (warnings.length === 0) {
      lines.push("    (none)");
    } else {
      for (const w of warnings) {
        lines.push("    " + tint("yellow", "- " + w));
      }
    }
    lines.push("  errors:");
    if (errors.length === 0) {
      lines.push("    (none)");
    } else {
      for (const e of errors) {
        lines.push("    " + tint("red", "- " + e));
      }
    }

    // Final summary line. The bin layer computes `code`; the ui
    // is just the printer. The "OK" / "Warnings: N" / "Errors: N"
    // tri-state mirrors the spec's three exit codes.
    if (typeof o.code === "number") {
      if (o.code === 0) {
        lines.push(tint("green", "OK"));
      } else if (o.code === 2) {
        lines.push(tint("yellow", "Warnings: " + warnings.length));
      } else {
        lines.push(tint("red", "Errors: " + errors.length));
      }
    }

    process.stdout.write(lines.join("\n") + "\n");
  },
};

export default ui;
