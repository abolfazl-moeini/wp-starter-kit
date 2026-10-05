import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { createCanonicalZip } from "../canonical-artifact-manifest.mjs";
import { verifyProfileSArtifact } from "../verify-profile-s-artifact.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);
const TRANSFORMER_PHP = path.resolve(packageRoot, "plan3/transformer.php");

test("Two-Track: preserves consumer namespace & comments while flattening & stripping FrameworkClosure (inlineFramework=1, spaghetti=0, obfuscate=0)", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "two-track-test-"));
  const mapFile = path.join(tempDir, "symbol-map.json");
  const mainFile = "sample-profile-s-plugin.php";

  try {
    await mkdir(path.join(tempDir, "src/Admin"), { recursive: true });
    await mkdir(path.join(tempDir, "src/FrameworkClosure/Admin_Pages"), { recursive: true });

    // Main plugin file
    await writeFile(
      path.join(tempDir, mainFile),
      `<?php
/**
 * Plugin Name: Sample Profile S Plugin
 * Version: 1.0.0
 * Author: Sample Team
 */
if (!defined('ABSPATH')) {
    exit;
}
`,
      "utf8"
    );

    // Consumer class extending framework class
    const consumerSrc = `<?php
namespace SampleProfileS\\Admin;

use WPDevFramework\\Admin_Pages\\Base_Admin_Page;

/**
 * Consumer DocBlock for SampleAdminPage.
 */
class SampleAdminPage extends Base_Admin_Page {
    // Consumer developer comment
    public function render() {
        return "<div>Sample Admin Page Content</div>";
    }
}
`;
    await writeFile(path.join(tempDir, "src/Admin/SampleAdminPage.php"), consumerSrc, "utf8");

    // FrameworkClosure base class
    const frameworkSrc = `<?php
namespace WPDevFramework\\Admin_Pages;

/**
 * Framework DocBlock for Base_Admin_Page.
 */
abstract class Base_Admin_Page {
    // Internal framework comment
    abstract public function render();
}
`;
    await writeFile(
      path.join(tempDir, "src/FrameworkClosure/Admin_Pages/Base_Admin_Page.php"),
      frameworkSrc,
      "utf8"
    );

    // 1. Generate map with two-track options (un-mangled consumer, flattened+stripped framework)
    await execFileAsync("php", [
      TRANSFORMER_PHP,
      "--dump-map",
      tempDir,
      mapFile,
      "seed-two-track",
      "--flatten=0",
      "--mangle=0",
      "--strip-comments=0",
      "--framework-flatten=1",
      "--framework-mangle=0",
      "--framework-strip=1",
    ]);

    const map = JSON.parse(await readFile(mapFile, "utf8"));
    assert.equal(
      map.classes["WPDevFramework\\Admin_Pages\\Base_Admin_Page"],
      "Base_Admin_Page",
      "Framework class must be mapped to global Base_Admin_Page in un-mangled flattened mode"
    );
    assert.equal(
      map.classes["SampleProfileS\\Admin\\SampleAdminPage"],
      "SampleProfileS\\Admin\\SampleAdminPage",
      "Consumer class must retain its namespaced FQCN in un-flattened mode"
    );

    // 2. Batch transform files
    await execFileAsync("php", [
      TRANSFORMER_PHP,
      "--batch",
      tempDir,
      mapFile,
      "seed-two-track",
      mainFile,
      "--flatten=0",
      "--mangle=0",
      "--strip-comments=0",
      "--framework-flatten=1",
      "--framework-mangle=0",
      "--framework-strip=1",
    ]);

    const transformedConsumer = await readFile(path.join(tempDir, "src/Admin/SampleAdminPage.php"), "utf8");
    const transformedFramework = await readFile(
      path.join(tempDir, "src/FrameworkClosure/Admin_Pages/Base_Admin_Page.php"),
      "utf8"
    );

    // Consumer code checks:
    assert.ok(
      transformedConsumer.includes("namespace SampleProfileS\\Admin;"),
      "Consumer namespace must be preserved"
    );
    assert.ok(
      transformedConsumer.includes("Consumer DocBlock for SampleAdminPage."),
      "Consumer DocBlock must be preserved"
    );
    assert.ok(
      transformedConsumer.includes("// Consumer developer comment"),
      "Consumer developer comments must be preserved"
    );
    assert.ok(
      transformedConsumer.includes("extends \\Base_Admin_Page") || transformedConsumer.includes("extends Base_Admin_Page"),
      "Consumer class must extend Base_Admin_Page without broken FQCN"
    );

    // FrameworkClosure code checks:
    assert.ok(
      !transformedFramework.includes("Framework DocBlock for Base_Admin_Page."),
      "Framework DocBlocks must be stripped"
    );
    assert.ok(
      !transformedFramework.includes("// Internal framework comment"),
      "Framework internal comments must be stripped"
    );
    assert.ok(
      !transformedFramework.includes("namespace WPDevFramework\\Admin_Pages;"),
      "Framework namespace declaration must be flattened"
    );
    assert.ok(
      transformedFramework.includes("abstract class Base_Admin_Page"),
      "Framework class must be declared in global scope"
    );
    assert.ok(
      transformedFramework.includes("class_alias('Base_Admin_Page', 'WPDevFramework\\\\Admin_Pages\\\\Base_Admin_Page'"),
      "Framework class must emit class_alias backward compatibility bridge"
    );

    // Syntax validation
    const lintConsumer = await execFileAsync("php", ["-l", path.join(tempDir, "src/Admin/SampleAdminPage.php")]);
    assert.ok(lintConsumer.stdout.includes("No syntax errors detected"));
    const lintFramework = await execFileAsync("php", [
      "-l",
      path.join(tempDir, "src/FrameworkClosure/Admin_Pages/Base_Admin_Page.php"),
    ]);
    assert.ok(lintFramework.stdout.includes("No syntax errors detected"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("Profile S Full Obfuscation: mangles both consumer and FrameworkClosure with zero leaked framework FQCNs", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "profile-s-obf-test-"));
  const mapFile = path.join(tempDir, "symbol-map.json");
  const mainFile = "sample-profile-s-plugin.php";

  try {
    await mkdir(path.join(tempDir, "src/Admin"), { recursive: true });
    await mkdir(path.join(tempDir, "src/FrameworkClosure/Admin_Pages"), { recursive: true });

    // Main plugin file
    await writeFile(
      path.join(tempDir, mainFile),
      `<?php
/**
 * Plugin Name: Sample Profile S Plugin
 * Version: 1.0.0
 * Author: Sample Team
 */
if (!defined('ABSPATH')) {
    exit;
}
`,
      "utf8"
    );

    // Consumer class with private members extending framework class
    const consumerSrc = `<?php
namespace SampleProfileS\\Admin;

use WPDevFramework\\Admin_Pages\\Base_Admin_Page;

/**
 * Consumer DocBlock to strip.
 */
class SampleAdminPage extends Base_Admin_Page {
    private $secretToken = "secret_12345";

    public function render() {
        return $this->formatTitle("<div>Sample Content</div>");
    }

    private function formatTitle($title) {
        return $title . ':' . $this->secretToken;
    }
}
`;
    await writeFile(path.join(tempDir, "src/Admin/SampleAdminPage.php"), consumerSrc, "utf8");

    // FrameworkClosure base class
    const frameworkSrc = `<?php
namespace WPDevFramework\\Admin_Pages;

/**
 * Framework DocBlock to strip.
 */
abstract class Base_Admin_Page {
    // Internal framework comment
    abstract public function render();
}
`;
    await writeFile(
      path.join(tempDir, "src/FrameworkClosure/Admin_Pages/Base_Admin_Page.php"),
      frameworkSrc,
      "utf8"
    );

    // 1. Generate map with Profile S full obfuscation
    await execFileAsync("php", [
      TRANSFORMER_PHP,
      "--dump-map",
      tempDir,
      mapFile,
      "seed-profile-s-obf",
      "--flatten=1",
      "--mangle=1",
      "--strip-comments=1",
      "--framework-flatten=1",
      "--framework-mangle=1",
      "--framework-strip=1",
    ]);

    const map = JSON.parse(await readFile(mapFile, "utf8"));
    const frameworkMangled = map.classes["WPDevFramework\\Admin_Pages\\Base_Admin_Page"];
    const consumerMangled = map.classes["SampleProfileS\\Admin\\SampleAdminPage"];

    assert.ok(
      frameworkMangled && frameworkMangled.startsWith("_fc_"),
      `Framework class must be mangled with _fc_ prefix, got: ${frameworkMangled}`
    );
    assert.ok(
      consumerMangled && consumerMangled.startsWith("_c_"),
      `Consumer class must be mangled with _c_ prefix, got: ${consumerMangled}`
    );

    // 2. Batch transform files
    await execFileAsync("php", [
      TRANSFORMER_PHP,
      "--batch",
      tempDir,
      mapFile,
      "seed-profile-s-obf",
      mainFile,
      "--flatten=1",
      "--mangle=1",
      "--strip-comments=1",
      "--framework-flatten=1",
      "--framework-mangle=1",
      "--framework-strip=1",
    ]);

    const transformedConsumer = await readFile(path.join(tempDir, "src/Admin/SampleAdminPage.php"), "utf8");
    const transformedFramework = await readFile(
      path.join(tempDir, "src/FrameworkClosure/Admin_Pages/Base_Admin_Page.php"),
      "utf8"
    );

    // ZERO readable WPDevFramework FQCNs in consumer code (Invariant)
    assert.ok(
      !transformedConsumer.includes("WPDevFramework"),
      "Consumer file must NOT contain any readable WPDevFramework references"
    );
    assert.ok(
      !transformedConsumer.includes("Base_Admin_Page"),
      "Consumer file must NOT contain un-mangled Base_Admin_Page reference"
    );

    // Consumer class must extend mangled framework class
    assert.ok(
      transformedConsumer.includes(`extends ${frameworkMangled}`) || transformedConsumer.includes(`extends \\${frameworkMangled}`),
      `Consumer class must extend mangled framework symbol ${frameworkMangled}`
    );

    // Comments and DocBlocks stripped
    assert.ok(!transformedConsumer.includes("Consumer DocBlock to strip."), "DocBlocks must be stripped in consumer");
    assert.ok(!transformedFramework.includes("Framework DocBlock to strip."), "DocBlocks must be stripped in framework");

    // Private members mangled
    assert.ok(!transformedConsumer.includes("$secretToken"), "Private property must be mangled");
    assert.ok(!transformedConsumer.includes("formatTitle"), "Private method must be mangled");

    // Framework closure must declare mangled class and bridge class_alias
    assert.ok(
      transformedFramework.includes(`abstract class ${frameworkMangled}`),
      `Framework must declare abstract class ${frameworkMangled}`
    );
    assert.ok(
      transformedFramework.includes(`class_alias('${frameworkMangled}', 'WPDevFramework\\\\Admin_Pages\\\\Base_Admin_Page'`),
      "Framework must provide class_alias backward compatibility bridge"
    );

    // Syntax validation
    const lintConsumer = await execFileAsync("php", ["-l", path.join(tempDir, "src/Admin/SampleAdminPage.php")]);
    assert.ok(lintConsumer.stdout.includes("No syntax errors detected"));
    const lintFramework = await execFileAsync("php", [
      "-l",
      path.join(tempDir, "src/FrameworkClosure/Admin_Pages/Base_Admin_Page.php"),
    ]);
    assert.ok(lintFramework.stdout.includes("No syntax errors detected"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("verifyProfileSArtifact Probe 2b: detects leaked framework FQCN in consumer code and fails closed", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "verify-probe2b-leak-"));
  const pluginDir = path.join(tempDir, "sample-profile-s-plugin");
  const zipPath = path.join(tempDir, "sample-profile-s-plugin.zip");

  try {
    await mkdir(path.join(pluginDir, "src/Admin"), { recursive: true });
    await mkdir(path.join(pluginDir, "src/FrameworkClosure/Admin_Pages"), { recursive: true });

    // Main file
    await writeFile(
      path.join(pluginDir, "sample-profile-s-plugin.php"),
      `<?php
/**
 * Plugin Name: Sample Profile S Plugin
 */
`,
      "utf8"
    );

    // Leaked consumer file with raw WPDevFramework FQCN
    await writeFile(
      path.join(pluginDir, "src/Admin/SampleAdminPage.php"),
      `<?php
use WPDevFramework\\Admin_Pages\\Base_Admin_Page;

class _c_12345678 extends \\WPDevFramework\\Admin_Pages\\Base_Admin_Page {
    public function render() {}
}
`,
      "utf8"
    );

    // FrameworkClosure file
    await writeFile(
      path.join(pluginDir, "src/FrameworkClosure/Admin_Pages/Base_Admin_Page.php"),
      `<?php
abstract class _fc_12345678 {
    abstract public function render();
}
if (class_exists('_fc_12345678', false)) {
    class_alias('_fc_12345678', 'WPDevFramework\\Admin_Pages\\Base_Admin_Page');
}
`,
      "utf8"
    );

    await createCanonicalZip({
      sourceRoot: pluginDir,
      outputZip: zipPath,
      rootName: "sample-profile-s-plugin",
    });

    const report = await verifyProfileSArtifact({
      zipPath,
      consumer: "sample-profile-s-plugin",
      obfuscate: true,
      requireManifest: false,
    });

    assert.equal(report.status, "failed", "Verification must fail when framework FQCN leaks in consumer");
    assert.ok(report.testsFailed > 0, "At least one probe must fail");

    const probe2b = report.details.find((d) => d.test.includes("Framework FQCN Obfuscation & Leakage"));
    assert.ok(probe2b, "Probe 2b must be reported");
    assert.equal(probe2b.status, "failed", "Probe 2b must report failed status");
    assert.ok(
      probe2b.errors.some((err) => err.includes("leaked framework FQCN") && err.includes("WPDevFramework")),
      "Probe 2b must identify leaked framework FQCN in consumer file"
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("verifyProfileSArtifact Probe 2b: passes when consumer code has zero leaked framework FQCNs", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "verify-probe2b-clean-"));
  const pluginDir = path.join(tempDir, "sample-profile-s-plugin");
  const zipPath = path.join(tempDir, "sample-profile-s-plugin.zip");

  try {
    await mkdir(path.join(pluginDir, "src/Admin"), { recursive: true });
    await mkdir(path.join(pluginDir, "src/FrameworkClosure/Admin_Pages"), { recursive: true });

    // Main file
    await writeFile(
      path.join(pluginDir, "sample-profile-s-plugin.php"),
      `<?php
/**
 * Plugin Name: Sample Profile S Plugin
 */
`,
      "utf8"
    );

    // Clean consumer file: fully mangled reference, zero WPDevFramework
    await writeFile(
      path.join(pluginDir, "src/Admin/SampleAdminPage.php"),
      `<?php
class _c_12345678 extends _fc_87654321 {
    public function render() {}
}
`,
      "utf8"
    );

    // FrameworkClosure file with allowed bridge line
    await writeFile(
      path.join(pluginDir, "src/FrameworkClosure/Admin_Pages/Base_Admin_Page.php"),
      `<?php
abstract class _fc_87654321 {
    abstract public function render();
}
if (class_exists('_fc_87654321', false)) {
    class_alias('_fc_87654321', 'WPDevFramework\\Admin_Pages\\Base_Admin_Page');
}
`,
      "utf8"
    );

    await createCanonicalZip({
      sourceRoot: pluginDir,
      outputZip: zipPath,
      rootName: "sample-profile-s-plugin",
    });

    const report = await verifyProfileSArtifact({
      zipPath,
      consumer: "sample-profile-s-plugin",
      obfuscate: true,
      requireManifest: false,
    });

    assert.equal(report.status, "passed", "Verification must pass when all framework FQCNs are properly mangled");
    assert.equal(report.testsFailed, 0, "Zero probes should fail");

    const probe2b = report.details.find((d) => d.test.includes("Framework FQCN Obfuscation & Leakage"));
    assert.ok(probe2b, "Probe 2b must be present");
    assert.equal(probe2b.status, "passed", "Probe 2b must pass cleanly");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
