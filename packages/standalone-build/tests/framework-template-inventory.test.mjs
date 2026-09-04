import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../framework-template-inventory.mjs",
);

test("rejects a source-tree symlink instead of silently omitting it from template evidence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-template-inventory-source-symlink-"));
  try {
    await mkdir(path.join(root, "plugins/wpdev/modules/core/src"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-theme-panel"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-core"), { recursive: true });
    await mkdir(path.join(root, "plugins/drm-connector"), { recursive: true });
    await mkdir(path.join(root, "themes/tavangary"), { recursive: true });
    await writeFile(
      path.join(root, "framework-closure-inventory.json"),
      JSON.stringify({
        scope: { consumer: "tavangary-theme-panel" },
        literalIncludeClosure: { files: ["modules/core/src/view.php"] },
      }),
    );
    await writeFile(path.join(root, "plugins/wpdev/modules/core/src/view.php"), "<?php wpdev_get_template('ui/header');\n");
    await writeFile(path.join(root, "outside.php"), "<?php add_filter('wpdev_view_locate', 'listener');\n");
    await symlink(
      path.join(root, "outside.php"),
      path.join(root, "plugins/tavangary-theme-panel/linked.php"),
    );

    await assert.rejects(
      execFileAsync(process.execPath, [script, root, "tavangary-theme-panel", path.join(root, "template.json")]),
      (error) => {
        assert.match(error.stderr, /source-tree symlink is not allowed: linked\.php/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("records scoped external template listeners separately from framework filter definitions", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-template-inventory-"));
  try {
    await mkdir(path.join(root, "plugins/wpdev/modules/core/src"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-theme-panel"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-core"), { recursive: true });
    await mkdir(path.join(root, "plugins/drm-connector"), { recursive: true });
    await mkdir(path.join(root, "themes/tavangary"), { recursive: true });
    await writeFile(
      path.join(root, "framework-closure-inventory.json"),
      JSON.stringify({
        scope: { consumer: "tavangary-theme-panel" },
        literalIncludeClosure: { files: ["modules/core/src/view.php"] },
      }),
    );
    await mkdir(path.join(root, "plugins/wpdev/modules/core/src"), { recursive: true });
    await writeFile(
      path.join(root, "plugins/wpdev/modules/core/src/view.php"),
      "<?php\n$dir = $args['dir'] ?? '/tmp';\napply_filters( 'wpdev_view_locate', $path, $view );\nwpdev_get_template( $view );\n",
    );
    await writeFile(
      path.join(root, "plugins/tavangary-theme-panel/listener.php"),
      "<?php add_filter( 'wpdev_view_locate', 'listener' );\n",
    );
    const output = path.join(root, "template.json");
    await execFileAsync(process.execPath, [script, root, "tavangary-theme-panel", output]);
    const report = JSON.parse(await readFile(output, "utf8"));

    assert.deepEqual(report.policyDecision, {
      option: "C",
      status: "approved-hybrid-facade",
      approvedBy: "product-owner",
      note: "Keep observed public compatibility hooks frozen; place only internal rendering/registry implementation behind a bounded private provider. Do not rename or remove public hooks, and do not ship standalone WPDev as a legacy fallback.",
    });
    assert.deepEqual(report.externalListenerCoverage, {
      status: "incomplete",
      scannedRoots: [
        "plugins/drm-connector",
        "plugins/tavangary-core",
        "plugins/tavangary-theme-panel",
        "plugins/wpdev",
        "themes/tavangary",
      ],
      unscannedRoots: [],
      notProven:
        "WordPress core (wp-includes), persisted callbacks in the database, runtime-generated listeners, and code installed after this scan are outside any static scan.",
    });
    assert.equal(
      report.blockers.externalListenerClosure,
      "External listener closure is incomplete; even a scan of every installed plugin, theme and mu-plugin cannot prove the public compatibility hooks are free of persisted, runtime-generated, or not-yet-installed listeners.",
      "Incomplete listener coverage must remain a fail-closed promotion blocker.",
    );
    assert.deepEqual(report.blockers.unboundedTemplateRootOverrides, [
      {
        file: "modules/core/src/view.php",
        expression: "$args['dir']",
      },
    ]);
    assert.deepEqual(
      report.externalListeners.wpdev_view_locate,
      ["plugins/tavangary-theme-panel/listener.php"],
    );
    assert.deepEqual(report.moduleViewRegistrations, []);
    assert.ok(report.blockers.externalOverrideListeners.wpdev_view_locate);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recognizes the approved bounded template-root contract without clearing unrelated blockers", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-template-inventory-bounded-root-"));
  try {
    await mkdir(path.join(root, "plugins/wpdev/modules/core/src"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-theme-panel"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-core"), { recursive: true });
    await mkdir(path.join(root, "plugins/drm-connector"), { recursive: true });
    await mkdir(path.join(root, "themes/tavangary"), { recursive: true });
    await writeFile(
      path.join(root, "framework-closure-inventory.json"),
      JSON.stringify({
        scope: { consumer: "tavangary-theme-panel" },
        literalIncludeClosure: { files: ["modules/core/src/view.php"] },
      }),
    );
    await writeFile(
      path.join(root, "plugins/wpdev/modules/core/src/view.php"),
      "<?php\n$has_custom_root = array_key_exists( 'dir', $args );\n$dir = $args['dir'];\nif ( $args['dir'] ) { $dir = $args['dir']; }\n$template = Bounded_View_Root_Registry::resolve( $dir, $view );\nif ( $has_custom_root && ! $template ) { return; }\n$template = apply_filters( 'wpdev_view_locate', $template, $view );\nif ( ! Bounded_View_Root_Registry::is_approved_template( $template ) ) { return; }\n",
    );

    const output = path.join(root, "template.json");
    await execFileAsync(process.execPath, [script, root, "tavangary-theme-panel", output]);
    const report = JSON.parse(await readFile(output, "utf8"));

    assert.deepEqual(report.templateRootOverrides, [
      {
        file: "modules/core/src/view.php",
        expression: "$args['dir']",
        contract: "bounded-registered-root",
      },
    ]);
    assert.deepEqual(
      report.blockers.unboundedTemplateRootOverrides,
      [],
      "A root override is not unbounded when resolve, fail-closed custom-root handling, and final-path validation are all present.",
    );
    assert.equal(
      report.blockers.externalListenerClosure,
      "External listener closure is incomplete; even a scan of every installed plugin, theme and mu-plugin cannot prove the public compatibility hooks are free of persisted, runtime-generated, or not-yet-installed listeners.",
      "Bounded root evidence must not clear independent external-listener blockers.",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps symlinked views outside the framework root unresolved", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-template-inventory-symlink-"));
  try {
    await mkdir(path.join(root, "plugins/wpdev/modules/core/src"), { recursive: true });
    await mkdir(path.join(root, "plugins/wpdev/views"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-theme-panel"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-core"), { recursive: true });
    await mkdir(path.join(root, "plugins/drm-connector"), { recursive: true });
    await mkdir(path.join(root, "themes/tavangary"), { recursive: true });
    await writeFile(
      path.join(root, "framework-closure-inventory.json"),
      JSON.stringify({
        scope: { consumer: "tavangary-theme-panel" },
        literalIncludeClosure: { files: ["modules/core/src/view.php"] },
      }),
    );
    await writeFile(
      path.join(root, "plugins/wpdev/modules/core/src/view.php"),
      "<?php\nwpdev_get_template( 'unsafe' );\n",
    );
    await writeFile(path.join(root, "outside.php"), "<?php echo 'outside';\n");
    await symlink("../../../outside.php", path.join(root, "plugins/wpdev/views/unsafe.php"));

    const output = path.join(root, "template.json");
    await execFileAsync(process.execPath, [script, root, "tavangary-theme-panel", output]);
    const report = JSON.parse(await readFile(output, "utf8"));

    assert.deepEqual(report.resolvedLiteralFiles, {});
    assert.deepEqual(report.blockers.unresolvedLiteralViews, [
      { file: "modules/core/src/view.php", view: "unsafe" },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps traversal template identifiers unresolved even when they land inside the framework", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-template-inventory-traversal-"));
  try {
    await mkdir(path.join(root, "plugins/wpdev/modules/core/src"), { recursive: true });
    await mkdir(path.join(root, "plugins/wpdev/views"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-theme-panel"), { recursive: true });
    await mkdir(path.join(root, "plugins/tavangary-core"), { recursive: true });
    await mkdir(path.join(root, "plugins/drm-connector"), { recursive: true });
    await mkdir(path.join(root, "themes/tavangary"), { recursive: true });
    await writeFile(
      path.join(root, "framework-closure-inventory.json"),
      JSON.stringify({
        scope: { consumer: "tavangary-theme-panel" },
        literalIncludeClosure: { files: ["modules/core/src/view.php"] },
      }),
    );
    await writeFile(
      path.join(root, "plugins/wpdev/modules/core/src/view.php"),
      "<?php\nwpdev_get_template( '../outside' );\n",
    );
    await writeFile(path.join(root, "plugins/wpdev/outside.php"), "<?php echo 'outside';\n");

    const output = path.join(root, "template.json");
    await execFileAsync(process.execPath, [script, root, "tavangary-theme-panel", output]);
    const report = JSON.parse(await readFile(output, "utf8"));

    assert.deepEqual(
      report.resolvedLiteralFiles,
      {},
      "Inventory must not approve a template identifier that the runtime rejects.",
    );
    assert.deepEqual(report.blockers.unresolvedLiteralViews, [
      { file: "modules/core/src/view.php", view: "../outside" },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function writeListenerFixture(root, extra = () => {}) {
  await mkdir(path.join(root, "plugins/wpdev/modules/core/src"), { recursive: true });
  for (const directory of [
    "plugins/tavangary-theme-panel",
    "plugins/tavangary-core",
    "plugins/drm-connector",
    "themes/tavangary",
  ]) {
    await mkdir(path.join(root, directory), { recursive: true });
  }
  await writeFile(
    path.join(root, "framework-closure-inventory.json"),
    JSON.stringify({
      scope: { consumer: "tavangary-theme-panel" },
      literalIncludeClosure: { files: ["modules/core/src/view.php"] },
    }),
  );
  await writeFile(
    path.join(root, "plugins/wpdev/modules/core/src/view.php"),
    "<?php\napply_filters( 'wpdev_view_locate', $path, $view );\n",
  );
  await extra();
}

test("scans every installed plugin, theme and mu-plugin for frozen public listeners", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-template-inventory-full-scan-"));
  try {
    await writeListenerFixture(root, async () => {
      await mkdir(path.join(root, "plugins/some-third-party"), { recursive: true });
      await mkdir(path.join(root, "themes/another-theme"), { recursive: true });
      await mkdir(path.join(root, "mu-plugins"), { recursive: true });
      await writeFile(
        path.join(root, "plugins/some-third-party/hooks.php"),
        "<?php add_filter( 'wpdev_view_locate', 'third_party_locate' );\n",
      );
      await writeFile(
        path.join(root, "themes/another-theme/hooks.php"),
        "<?php add_filter( 'wpdev_view_override', 'theme_override' );\n",
      );
      await writeFile(
        path.join(root, "mu-plugins/loader.php"),
        "<?php add_filter( 'wpdev_render_vars', 'mu_render_vars' );\n",
      );
    });

    const output = path.join(root, "template.json");
    await execFileAsync(process.execPath, [script, root, "tavangary-theme-panel", output]);
    const report = JSON.parse(await readFile(output, "utf8"));

    const scanned = report.externalListenerCoverage.scannedRoots;
    assert.ok(
      scanned.includes("plugins/some-third-party"),
      `third-party plugins must be scanned; scanned: ${JSON.stringify(scanned)}`,
    );
    assert.ok(
      scanned.includes("themes/another-theme"),
      `every installed theme must be scanned; scanned: ${JSON.stringify(scanned)}`,
    );
    assert.ok(
      scanned.includes("mu-plugins"),
      `mu-plugins must be scanned; scanned: ${JSON.stringify(scanned)}`,
    );
    assert.deepEqual(
      report.externalListeners.wpdev_view_locate,
      ["plugins/some-third-party/hooks.php"],
      "a listener outside the first-party scoped roots must still be inventoried",
    );
    assert.deepEqual(report.externalListeners.wpdev_view_override, [
      "themes/another-theme/hooks.php",
    ]);
    assert.deepEqual(report.externalListeners.wpdev_render_vars, [
      "mu-plugins/loader.php",
    ]);
    assert.deepEqual(
      report.externalListenerCoverage.unscannedRoots,
      [],
      "no root may be left unscanned when the whole content tree is readable",
    );
    // Coverage still cannot be complete: persisted callbacks and runtime
    // listeners are outside any static scan. Narrowing the unproven surface
    // must not be mistaken for proving listener closure.
    assert.equal(
      report.externalListenerCoverage.status,
      "incomplete",
      "scanning all installed code narrows the unproven surface but never proves closure",
    );
    assert.doesNotMatch(
      report.externalListenerCoverage.notProven,
      /third-party plugins\/themes|mu-plugins/,
      "third-party plugins, themes and mu-plugins are now scanned, so they are no longer unproven",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps coverage incomplete when a discovered root cannot be scanned", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpdev-template-inventory-unscannable-"));
  try {
    await writeListenerFixture(root, async () => {
      await mkdir(path.join(root, "plugins/broken-third-party"), { recursive: true });
      await writeFile(path.join(root, "outside.php"), "<?php add_filter('wpdev_view_locate', 'hidden');\n");
      await symlink(
        path.join(root, "outside.php"),
        path.join(root, "plugins/broken-third-party/linked.php"),
      );
    });

    const output = path.join(root, "template.json");
    // Must not crash the whole scan the way a first-party symlink does.
    await execFileAsync(process.execPath, [script, root, "tavangary-theme-panel", output]);
    const report = JSON.parse(await readFile(output, "utf8"));

    assert.equal(
      report.externalListenerCoverage.status,
      "incomplete",
      "an unscannable root keeps listener coverage fail-closed",
    );
    assert.ok(
      report.externalListenerCoverage.unscannedRoots.some(
        (entry) => entry.root === "plugins/broken-third-party",
      ),
      `the unscannable root must be named; got ${JSON.stringify(report.externalListenerCoverage.unscannedRoots)}`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
