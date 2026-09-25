/** @jest-environment node */
import { describe, test, expect, beforeAll } from "@jest/globals";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync, execFileSync } from "node:child_process";
import { h } from "preact";
import renderToString from "preact-render-to-string";

const MONOREPO_ROOT = join(process.cwd());
const POLARIS_DIST = join(
  MONOREPO_ROOT,
  "packages/polaris-stack/dist/index.js",
);
const FIXTURES_FILE = join(
  MONOREPO_ROOT,
  "tests/fixtures/components/button.json",
);

let Button: any;

beforeAll(() => {
  if (!existsSync(POLARIS_DIST)) {
    execSync("npm run build", {
      cwd: join(MONOREPO_ROOT, "packages/polaris-stack"),
      stdio: "pipe",
    });
  }
  const polaris = require(POLARIS_DIST);
  Button = polaris.Button;
});

interface Fixture {
  name: string;
  props: {
    variant?: "solid" | "soft" | "ghost";
    size?: "sm" | "md" | "lg";
    block?: boolean;
    text: string;
    className?: string;
  };
  expectedClasses: string[];
}

function normalizeHtml(html: string): {
  tag: string;
  classes: string[];
  text: string;
} {
  const tagMatch = html.match(/^<([a-z0-9]+)/i);
  const tag = tagMatch ? tagMatch[1].toLowerCase() : "";

  const classMatch = html.match(/class=["']([^"']*)["']/i);
  const classes = classMatch
    ? classMatch[1].split(/\s+/).filter(Boolean).sort()
    : [];

  const textMatch = html.match(/>([^<]*)</);
  const text = textMatch ? textMatch[1].trim() : "";

  return { tag, classes, text };
}

describe("DOM Parity Gate: Button (PHP vs TSX / Preact)", () => {
  const fixtures: Fixture[] = JSON.parse(readFileSync(FIXTURES_FILE, "utf8"));

  for (const fixture of fixtures) {
    test(`parity for variant: ${fixture.name}`, () => {
      // 1. Render TSX via Preact
      const tsxHtml = renderToString(
        h(
          Button,
          {
            variant: fixture.props.variant,
            size: fixture.props.size,
            block: fixture.props.block,
            className: fixture.props.className,
          },
          fixture.props.text,
        ),
      );

      // 2. Render PHP via CLI using ClassNames::compose
      const phpScript = `
        require_once '${MONOREPO_ROOT}/packages/framework/src/Chameleon/Generated/ClassNames.php';
        use WPDev\\Chameleon\\Generated\\ClassNames;

        $modifiers = [];
        ${fixture.props.variant ? `$modifiers['variant'] = '${fixture.props.variant}';` : ""}
        ${fixture.props.size ? `$modifiers['size'] = '${fixture.props.size}';` : ""}
        ${fixture.props.block ? `$modifiers['width'] = 'block';` : ""}

        $classes = ClassNames::compose('button', $modifiers, '${fixture.props.className || ""}');
        echo "<button type='button' class='{$classes}'>${fixture.props.text}</button>";
      `;

      const phpHtml = execFileSync("php", ["-r", phpScript], {
        encoding: "utf8",
      }).trim();

      const normalizedTsx = normalizeHtml(tsxHtml);
      const normalizedPhp = normalizeHtml(phpHtml);

      expect(normalizedPhp.tag).toBe(normalizedTsx.tag);
      expect(normalizedPhp.text).toBe(normalizedTsx.text);
      expect(normalizedPhp.classes).toEqual(normalizedTsx.classes);

      for (const expectedCls of fixture.expectedClasses) {
        expect(normalizedPhp.classes).toContain(expectedCls);
        expect(normalizedTsx.classes).toContain(expectedCls);
      }
    });
  }
});
