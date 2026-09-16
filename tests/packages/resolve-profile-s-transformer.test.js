import { describe, test, expect } from "@jest/globals";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  resolveProfileSTransformer,
  requireProfileSTransformer,
} from "../../packages/create-wp-project/src/release/resolve-profile-s-transformer.js";

describe("resolveProfileSTransformer", () => {
  test("returns null when nothing is configured", () => {
    expect(
      resolveProfileSTransformer({
        fromDir: os.tmpdir(),
        pluginRoot: os.tmpdir(),
        env: {},
      }),
    ).toBeNull();
  });

  test("prefers WPDEV_PROFILE_S_TRANSFORMER", () => {
    const dir = path.join(os.tmpdir(), `wpdev-transformer-${process.pid}`);
    mkdirSync(dir, { recursive: true });
    const transformer = path.join(dir, "transformer.php");
    writeFileSync(transformer, "<?php\n");
    try {
      expect(
        resolveProfileSTransformer({
          fromDir: os.tmpdir(),
          env: { WPDEV_PROFILE_S_TRANSFORMER: transformer },
        }),
      ).toBe(transformer);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("requireProfileSTransformer fails closed", () => {
    expect(() =>
      requireProfileSTransformer({
        fromDir: os.tmpdir(),
        pluginRoot: os.tmpdir(),
        env: {},
      }),
    ).toThrow(/transformer not found/i);
  });

  test("finds packages/standalone-build via WPDEV_STARTER_KIT", () => {
    const kit = path.resolve(__dirname, "../..");
    const resolved = resolveProfileSTransformer({
      env: { WPDEV_STARTER_KIT: kit },
    });
    expect(resolved).toMatch(/standalone-build\/plan3\/transformer\.php$/);
  });

  test("finds dev/release/plan3/transformer.php in pluginRoot", () => {
    const tmpRoot = path.join(
      os.tmpdir(),
      `wpdev-root-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const plan3Dir = path.join(tmpRoot, "dev/release/plan3");
    mkdirSync(plan3Dir, { recursive: true });
    const transformer = path.join(plan3Dir, "transformer.php");
    writeFileSync(transformer, "<?php // transformer\n");
    try {
      const resolved = resolveProfileSTransformer({
        pluginRoot: tmpRoot,
        env: {},
      });
      expect(resolved).toBe(path.resolve(transformer));
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test("finds plan3/transformer.php in pluginRoot", () => {
    const tmpRoot = path.join(
      os.tmpdir(),
      `wpdev-root-p3-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const plan3Dir = path.join(tmpRoot, "plan3");
    mkdirSync(plan3Dir, { recursive: true });
    const transformer = path.join(plan3Dir, "transformer.php");
    writeFileSync(transformer, "<?php // transformer\n");
    try {
      const resolved = resolveProfileSTransformer({
        pluginRoot: tmpRoot,
        env: {},
      });
      expect(resolved).toBe(path.resolve(transformer));
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test("finds transformer walking up from pluginRoot", () => {
    const tmpRoot = path.join(
      os.tmpdir(),
      `wpdev-root-walk-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const subPlugin = path.join(tmpRoot, "plugins/demo-plugin");
    const plan3Dir = path.join(tmpRoot, "packages/standalone-build/plan3");
    mkdirSync(subPlugin, { recursive: true });
    mkdirSync(plan3Dir, { recursive: true });
    const transformer = path.join(plan3Dir, "transformer.php");
    writeFileSync(transformer, "<?php // transformer\n");
    try {
      const resolved = resolveProfileSTransformer({
        pluginRoot: subPlugin,
        env: {},
      });
      expect(resolved).toBe(path.resolve(transformer));
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
