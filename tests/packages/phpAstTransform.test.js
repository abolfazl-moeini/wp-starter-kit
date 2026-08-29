import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");
const transform = path.join(
  repoRoot,
  "packages/create-wp-project/src/release/php-ast-transform.php",
);
const fixtureCopy = path.join(
  repoRoot,
  "tests/fixtures/private-runtime-fixture/php-ast-transform.php",
);

function run(mapping, source) {
  const dir = mkdtempSync(path.join(tmpdir(), "php-ast-transform-"));
  const input = path.join(dir, "input.php");
  const output = path.join(dir, "output.php");
  writeFileSync(input, source);
  return {
    dir,
    input,
    output,
    result: spawnSync(
      "php",
      [transform, JSON.stringify(mapping), input, output],
      { encoding: "utf8" },
    ),
  };
}

function runWithOutput(mapping, source, outputPath) {
  const dir = mkdtempSync(path.join(tmpdir(), "php-ast-transform-"));
  const input = path.join(dir, "input.php");
  writeFileSync(input, source);
  return spawnSync(
    "php",
    [transform, JSON.stringify(mapping), input, outputPath],
    { encoding: "utf8" },
  );
}

describe("php-ast-transform", () => {
  test("renames a mapped function declaration and its call sites", () => {
    const { result, output } = run(
      { wpdev_register_table: "Artifact_register_table" },
      "<?php\nfunction wpdev_register_table() { return 1; }\nwpdev_register_table();\n",
    );

    expect(result.status).toBe(0);
    const printed = readFileSync(output, "utf8");
    expect(printed).toContain("function Artifact_register_table()");
    expect(printed).toContain("Artifact_register_table();");
    expect(printed).not.toContain("wpdev_register_table");
  });

  test("fails closed on a dynamic framework call built from a wpdev_ prefix", () => {
    const { result } = run(
      {},
      "<?php\n$name = 'wpdev_' . $suffix;\n$name();\n",
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("unresolved dynamic framework call");
  });

  test("fails closed on a dynamic function call with a non-name callee", () => {
    const { result } = run({}, "<?php\n$callable();\n");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("unresolved dynamic framework call");
  });

  test("fails closed when a mapped callable appears as a plain string literal", () => {
    const { result } = run(
      { wpdev_register_table: "Artifact_register_table" },
      "<?php\ncall_user_func('wpdev_register_table');\n",
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("unresolved dynamic framework callable");
  });

  // Plan 1 §7 step 9: "parser and printer explicitly target pinned PHP 7.4
  // grammar/output". The php-parser default happens to be 7.4 today, so an
  // implicit printer silently inherits whatever a future release defaults to.
  test("pins the pretty printer to PHP 7.4 explicitly, not by library default", () => {
    const source = readFileSync(transform, "utf8");

    expect(source).toMatch(
      /new Standard\(\s*(?:array\(|\[)\s*'phpVersion'\s*=>\s*PhpVersion::fromString\(\s*'7\.4'\s*\)\s*(?:\)|\])/,
    );
  });

  // Fail-closed: a transform that cannot persist its output must not report
  // success, or a later stage promotes a stale/missing file as the rewritten
  // artifact.
  test("fails closed when the transformed output cannot be written", () => {
    const unwritable = mkdtempSync(
      path.join(tmpdir(), "php-ast-transform-dir-"),
    );
    const target = path.join(unwritable, "is-a-directory");
    mkdirSync(target);

    const result = runWithOutput({}, "<?php\n$x = 1;\n", target);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/write/i);
  });

  // The fixture copy is what assembler tests execute. If it drifts from the
  // shipped helper, the suite validates behaviour that never ships.
  test("the fixture copy keeps every fail-closed rule of the shipped helper", () => {
    const rulesOf = (file) => {
      const source = readFileSync(file, "utf8");
      return {
        exceptions: [
          ...source.matchAll(/throw new RuntimeException\(\s*'([^']+)'\s*\)/g),
        ]
          .map((match) => match[1])
          .sort(),
        rewritesFunctionDeclarations: source.includes("Node\\Stmt\\Function_"),
      };
    };

    expect(rulesOf(fixtureCopy)).toEqual(rulesOf(transform));
  });
});
