/**
 * sync-php-min helpers — phpMinVersion → composer / headers / docker.
 */
import { describe, test, expect } from "@jest/globals";

import {
  comparePhpVersion,
  maxPhpVersion,
  wordpressPhpImage,
  applyPhpMinToComposer,
  patchPluginPhpMin,
  patchReadmePhpMin,
  patchDockerPhpImage,
} from "../../packages/create-wp-project/src/sync-php-min.js";

describe("comparePhpVersion / maxPhpVersion", () => {
  test("orders PHP versions", () => {
    expect(comparePhpVersion("7.4", "8.1")).toBeLessThan(0);
    expect(comparePhpVersion("8.2", "8.1")).toBeGreaterThan(0);
    expect(comparePhpVersion("8.1", "8.1.0")).toBe(0);
  });

  test("maxPhpVersion picks higher", () => {
    expect(maxPhpVersion("7.4", "8.1")).toBe("8.1");
    expect(maxPhpVersion("8.2", "8.1")).toBe("8.2");
  });
});

describe("wordpressPhpImage", () => {
  test("maps min to wordpress image tag", () => {
    expect(wordpressPhpImage("7.4")).toBe("wordpress:php7.4-apache");
    expect(wordpressPhpImage("8.2")).toBe("wordpress:php8.2-apache");
  });
});

describe("applyPhpMinToComposer", () => {
  test("sets require.php and platform.php", () => {
    const out = applyPhpMinToComposer(
      { require: { "ext-json": "*" }, config: { "platform-check": false } },
      "8.2",
    );
    expect(out.require.php).toBe(">=8.2");
    expect(out.require["ext-json"]).toBe("*");
    expect(out.config.platform.php).toBe("8.2");
    expect(out.config["platform-check"]).toBe(false);
  });
});

describe("patchPluginPhpMin / patchReadmePhpMin / patchDockerPhpImage", () => {
  test("patches plugin header and PHP_MIN define", () => {
    const src = ` * Requires PHP:      7.4
define( 'MY_PHP_MIN', '7.4' );`;
    const { content, changed } = patchPluginPhpMin(src, "8.2");
    expect(changed).toBe(true);
    expect(content).toMatch(/Requires PHP:\s+8\.2/);
    expect(content).toMatch(/MY_PHP_MIN',\s*'8\.2'/);
  });

  test("patches readme.txt", () => {
    const { content, changed } = patchReadmePhpMin(
      "Requires PHP: 7.4\n",
      "8.0",
    );
    expect(changed).toBe(true);
    expect(content).toBe("Requires PHP: 8.0\n");
  });

  test("patches docker compose default image", () => {
    const src = "image: ${PHP_IMAGE:-wordpress:php8.1-apache}\n";
    const { content, changed } = patchDockerPhpImage(src, "8.2");
    expect(changed).toBe(true);
    expect(content).toContain("wordpress:php8.2-apache");
  });
});
