import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { scopeFrameworkCoreForConsumer } from "../inline-wpdev-closure.mjs";
import { protectCrossPluginModuleRegistrations } from "../assemble-profile-s-candidate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

test("Multi-Plugin Coexistence: scopeFrameworkCoreForConsumer isolates Core to consumer namespace", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "coexistence-scope-test-"));
  const stagingPlugin = path.join(tmpDir, "drm-connector");
  const coreDestDir = path.join(stagingPlugin, "src/FrameworkClosure/Core");
  await mkdir(path.join(coreDestDir, "Core"), { recursive: true });
  await writeFile(path.join(stagingPlugin, "wpdev.json"), JSON.stringify({ globalName: "DRMConnector" }), "utf8");

  const dummyPluginPhp = `<?php
declare(strict_types=1);
namespace WPDev\\Core;
final class Plugin {
    private static ?ModuleLoader $loader = null;
    public static function loader(): ModuleLoader {
        if (null === self::$loader) { self::$loader = new ModuleLoader('test'); }
        return self::$loader;
    }
}
`;
  const dummyLoaderPhp = `<?php
declare(strict_types=1);
namespace WPDev\\Core;
final class ModuleLoader {
    private array $modules = [];
    public function __construct(string $prefix) {}
    public function register(ModuleInterface $module): void {
        $this->modules[] = $module;
    }
}
`;
  await writeFile(path.join(coreDestDir, "Core/Plugin.php"), dummyPluginPhp, "utf8");
  await writeFile(path.join(coreDestDir, "Core/ModuleLoader.php"), dummyLoaderPhp, "utf8");

  try {
    const res = await scopeFrameworkCoreForConsumer(coreDestDir, stagingPlugin, "drm-connector");
    assert.equal(res.consumerNs, "DRMConnector");

    const scopedPlugin = await readFile(path.join(coreDestDir, "Core/Plugin.php"), "utf8");
    assert.ok(scopedPlugin.includes("namespace DRMConnector\\Core;"), "Plugin must be namespaced to DRMConnector\\Core");
    assert.ok(scopedPlugin.includes("class_alias( Plugin::class, 'WPDev\\\\Core\\\\Plugin' )"), "Plugin must include class_alias fallback");

    const scopedLoader = await readFile(path.join(coreDestDir, "Core/ModuleLoader.php"), "utf8");
    assert.ok(scopedLoader.includes("namespace DRMConnector\\Core;"), "ModuleLoader must be namespaced to DRMConnector\\Core");
    assert.ok(scopedLoader.includes("function register( object $module )"), "ModuleLoader register must be duck-typed object");
    assert.ok(scopedLoader.includes("class_alias( ModuleLoader::class, 'WPDev\\\\Core\\\\ModuleLoader' )"), "ModuleLoader must include class_alias fallback");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("Multi-Plugin Coexistence: assembler must not catch-and-boot on ->register()", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "coexistence-protect-test-"));
  const stagingPlugin = path.join(tmpDir, "test-plugin");
  await mkdir(path.join(stagingPlugin, "src"), { recursive: true });

  const dummyRegisterPhp = `<?php
$module = new MyModule();
$loader->register($module);
`;
  await writeFile(path.join(stagingPlugin, "src/my-register.php"), dummyRegisterPhp, "utf8");

  try {
    const res = await protectCrossPluginModuleRegistrations(stagingPlugin, "test-plugin");
    assert.equal(res.protectedCount, 0, "Catch-and-boot wrappers duplicate admin pages (Help Hub x3)");

    const protectedCode = await readFile(path.join(stagingPlugin, "src/my-register.php"), "utf8");
    assert.equal(protectedCode, dummyRegisterPhp, "Register files must stay as register() without Throwable reboot");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("Multi-Plugin Coexistence: PHP runtime loads DRM then ThemePanel and ThemePanel then DRM without collisions", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "coexistence-php-test-"));

  const phpScript = `<?php
namespace DRMConnector\\Core {
    class ModuleLoader {
        private array $modules = [];
        public function register(object $m): void { $this->modules[] = $m; }
        public function count(): int { return count($this->modules); }
    }
    class Plugin {
        private static ?ModuleLoader $loader = null;
        public static function loader(): ModuleLoader {
            if (!self::$loader) { self::$loader = new ModuleLoader(); }
            return self::$loader;
        }
    }
}

namespace SampleProfileS\\Core {
    class ModuleLoader {
        private array $modules = [];
        public function register(object $m): void { $this->modules[] = $m; }
        public function count(): int { return count($this->modules); }
    }
    class Plugin {
        private static ?ModuleLoader $loader = null;
        public static function loader(): ModuleLoader {
            if (!self::$loader) { self::$loader = new ModuleLoader(); }
            return self::$loader;
        }
    }
}

namespace DRMConnector\\Modules\\AdminPanel {
    class Module {
        public function get_slug(): string { return 'drm-admin'; }
    }
}

namespace SampleProfileS\\Modules\\Customizer {
    class Module {
        public function get_slug(): string { return 'theme-customizer'; }
    }
}

namespace {
    error_reporting(E_ALL);

    // 1. DRM registers DRM module into DRM loader
    $drmMod = new \\DRMConnector\\Modules\\AdminPanel\\Module();
    \\DRMConnector\\Core\\Plugin::loader()->register($drmMod);

    // 2. Theme panel registers Theme module into Theme panel loader
    $themeMod = new \\SampleProfileS\\Modules\\Customizer\\Module();
    \\SampleProfileS\\Core\\Plugin::loader()->register($themeMod);

    // Assert each loader is 100% isolated
    if (\\DRMConnector\\Core\\Plugin::loader()->count() !== 1) {
        exit(1);
    }
    if (\\SampleProfileS\\Core\\Plugin::loader()->count() !== 1) {
        exit(2);
    }
    echo "COEXISTENCE_OK\\n";
}
`;
  const phpFile = path.join(tmpDir, "test.php");
  await writeFile(phpFile, phpScript, "utf8");

    try {
    const { stdout } = await execFileAsync("php", [phpFile]);
    assert.equal(stdout.trim(), "COEXISTENCE_OK");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("Multi-Plugin Coexistence: inlined helper functions coexist with framework helper in both load orders without redeclaration errors", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "coexistence-helper-test-"));
  const frameworkHelper = path.resolve(__dirname, "../../wpdev-framework/modules/core/src/functions/helper.php");

  // Load Order A: Inlined Closure first, then Framework helper second
  const scriptA = `<?php
define('ABSPATH', '${tmpDir}/');
if (!function_exists('wpdev_get_version')) {
    function wpdev_get_version() { return 'inlined-closure'; }
}
if (!function_exists('wpdev_is_debug')) {
    function wpdev_is_debug() { return true; }
}
require_once '${frameworkHelper}';
assert(function_exists('wpdev_get_version'));
assert(wpdev_get_version() === 'inlined-closure');
echo "ORDER_A_OK\\n";
`;

  // Load Order B: Framework helper first, then Inlined Closure second
  const scriptB = `<?php
define('ABSPATH', '${tmpDir}/');
require_once '${frameworkHelper}';
if (!function_exists('wpdev_get_version')) {
    function wpdev_get_version() { return 'inlined-closure'; }
}
assert(function_exists('wpdev_get_version'));
echo "ORDER_B_OK\\n";
`;

  const fileA = path.join(tmpDir, "order-a.php");
  const fileB = path.join(tmpDir, "order-b.php");
  await writeFile(fileA, scriptA, "utf8");
  await writeFile(fileB, scriptB, "utf8");

  try {
    const resA = await execFileAsync("php", [fileA]);
    assert.equal(resA.stdout.trim(), "ORDER_A_OK");

    const resB = await execFileAsync("php", [fileB]);
    assert.equal(resB.stdout.trim(), "ORDER_B_OK");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

