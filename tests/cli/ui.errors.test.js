/**
 * Tests for `packages/cli/src/ui.js` — `renderError` (I6.5 + I6.6).
 *
 * Contract for `ui.renderError({title, errors})`:
 *   - Returns a result object with a non-zero `code` field
 *     (the bin layer uses this to `process.exit(code)`).
 *   - Writes a readable, one-error-per-line list to stderr.
 *     Each line is formatted as `  <key>: <message>`.
 *   - Includes a `title` line up top (e.g. "wpdev create: invalid
 *     feature combination").
 *   - Tolerates an empty / missing `errors` object — returns
 *     `{code: 1}` and does not throw.
 *   - NEVER throws on a malformed error object.
 *
 * The renderer is intentionally side-effectful (it writes to
 * stderr) so the bin layer can stay tiny: `await ui.renderError({...});
 * process.exit(result.code);`. The contract test asserts both
 * the side-effect (stderr output) and the return value (exit
 * code).
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";

import ui, {
  renderError,
  renderFatalError,
} from "../../packages/cli/src/ui.js";

/* -------------------------------------------------------------------- */
/* stderr capture                                                        */
/* -------------------------------------------------------------------- */

let stderrChunks;
let stdoutChunks;
let originalStderrWrite;
let originalStdoutWrite;

beforeEach(() => {
  stderrChunks = [];
  stdoutChunks = [];
  originalStderrWrite = process.stderr.write.bind(process.stderr);
  originalStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stderr.write = (chunk) => {
    stderrChunks.push(String(chunk));
    return true;
  };
  process.stdout.write = (chunk) => {
    stdoutChunks.push(String(chunk));
    return true;
  };
});

afterEach(() => {
  process.stderr.write = originalStderrWrite;
  process.stdout.write = originalStdoutWrite;
});

/* -------------------------------------------------------------------- */
/* renderError — list format                                              */
/* -------------------------------------------------------------------- */

describe("ui.renderError()", () => {
  test("returns a result object (not a Promise, not undefined)", async () => {
    const result = await renderError({
      title: "wpdev create: invalid",
      errors: { slug: "bad" },
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  test("returns a non-zero exit code when errors are present", async () => {
    const result = await renderError({
      title: "wpdev create: invalid",
      errors: { slug: "must be lowercase" },
    });
    expect(result.code).toBeDefined();
    expect(typeof result.code).toBe("number");
    expect(result.code).not.toBe(0);
  });

  test("writes a title line to stderr", async () => {
    await renderError({
      title: "wpdev create: invalid feature combination",
      errors: { slug: "must be lowercase" },
    });
    const out = stderrChunks.join("");
    expect(out).toMatch(/wpdev create: invalid feature combination/);
  });

  test("writes one line per field, formatted as '  <key>: <message>'", async () => {
    await renderError({
      title: "wpdev create: invalid",
      errors: {
        slug: "must be lowercase",
        js: "must be one of: typescript, none",
        css: "must be one of: tailwind, none",
      },
    });
    const out = stderrChunks.join("");
    expect(out).toMatch(/^\s+slug:\s+must be lowercase/m);
    expect(out).toMatch(/^\s+js:\s+must be one of: typescript, none/m);
    expect(out).toMatch(/^\s+css:\s+must be one of: tailwind, none/m);
    // Three error lines exactly (the test does not lock the
    // title line count, but does lock the field line count).
    const fieldLines = out
      .split("\n")
      .filter((line) => /^\s+(slug|js|css):\s/.test(line));
    expect(fieldLines).toHaveLength(3);
  });

  test("tolerates an empty errors object (no throw, still non-zero code)", async () => {
    const result = await renderError({
      title: "wpdev create: invalid",
      errors: {},
    });
    expect(result.code).not.toBe(0);
  });

  test("tolerates a missing errors object (no throw, still non-zero code)", async () => {
    const result = await renderError({
      title: "wpdev create: invalid",
    });
    expect(result.code).not.toBe(0);
  });

  test("tolerates a missing title (no throw)", async () => {
    const result = await renderError({ errors: { slug: "bad" } });
    expect(result.code).not.toBe(0);
  });

  test("tolerates non-string error values (does not throw)", async () => {
    const result = await renderError({
      title: "wpdev create: invalid",
      errors: { slug: 42, js: null, css: undefined },
    });
    expect(result.code).not.toBe(0);
    // The lines may render "42" / "" / "" — we just assert
    // no throw and that something was written.
    expect(stderrChunks.length).toBeGreaterThan(0);
  });

  test("field order is preserved (Object.entries is the iteration contract)", async () => {
    await renderError({
      title: "t",
      errors: { a: "1", b: "2", c: "3" },
    });
    const out = stderrChunks.join("");
    const idxA = out.indexOf("a:");
    const idxB = out.indexOf("b:");
    const idxC = out.indexOf("c:");
    expect(idxA).toBeGreaterThan(-1);
    expect(idxB).toBeGreaterThan(idxA);
    expect(idxC).toBeGreaterThan(idxB);
  });

  test("never writes to stdout (errors are a stderr-only concern)", async () => {
    await renderError({
      title: "wpdev create: invalid",
      errors: { slug: "bad" },
    });
    expect(stdoutChunks.join("")).toBe("");
  });
});

/* -------------------------------------------------------------------- */
/* default `ui` export — exposes renderError                              */
/* -------------------------------------------------------------------- */

describe("ui.renderFatalError()", () => {
  test("returns a non-zero exit code", async () => {
    const result = await renderFatalError({
      title: "Directory is not empty",
      body: "/tmp/my-plugin",
      hint: "Pass --force to overwrite.",
      footer: "Scaffold cancelled",
    });
    expect(result.code).toBe(1);
    expect(result.title).toBe("Directory is not empty");
  });

  test("writes clack-styled output to stdout", async () => {
    await renderFatalError({
      title: "Directory is not empty",
      body: "/tmp/my-plugin",
      hint: "Pass --force to overwrite.",
      footer: "Scaffold cancelled",
    });
    const out = stdoutChunks.join("");
    expect(out).toMatch(/Directory is not empty/);
    expect(out).toMatch(/\/tmp\/my-plugin/);
    expect(out).toMatch(/--force/);
    expect(out).toMatch(/Scaffold cancelled/);
  });

  test("never writes to stderr", async () => {
    await renderFatalError({
      title: "Scaffold failed",
      body: "engine error",
    });
    expect(stderrChunks.join("")).toBe("");
  });
});

describe("default ui export — renderError", () => {
  test("ui.renderError is the same function shape (callable, returns code)", async () => {
    expect(typeof ui.renderError).toBe("function");
    const result = await ui.renderError({
      title: "wpdev create: invalid",
      errors: { slug: "bad" },
    });
    expect(result.code).not.toBe(0);
  });

  test("ui.renderFatalError is exposed on the default export", async () => {
    expect(typeof ui.renderFatalError).toBe("function");
    const result = await ui.renderFatalError({
      title: "Directory is not empty",
      body: "/tmp/proj",
    });
    expect(result.code).toBe(1);
  });
});
