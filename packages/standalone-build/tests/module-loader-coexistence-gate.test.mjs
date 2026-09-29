import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  assertDuckTypedModuleLoaders,
  inspectModuleLoaderRegister,
  rewriteModuleLoaderRegisterToDuckTyped,
} from "../module-loader-coexistence-gate.mjs";

const execFileAsync = promisify(execFile);

const TYPED_LOADER = `<?php
namespace WPDev\\Core;
interface ModuleInterface {
    public function get_slug(): string;
}
final class ModuleLoader {
    private array $modules = [];
    public function register(ModuleInterface $module): void {
        $this->modules[$module->get_slug()] = $module;
    }
    public function has(string $slug): bool {
        return isset($this->modules[$slug]);
    }
}
`;

const MANGLED_LOADER = `<?php
namespace WPDev\\Core;
final class _c_2ee614fb {}
final class ModuleLoader {
    public function register(_c_2ee614fb $module): void {}
}
`;

async function withTree(prefix, setup) {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await setup(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("inspectModuleLoaderRegister flags ModuleInterface and mangled class type hints", () => {
  const typed = inspectModuleLoaderRegister(TYPED_LOADER);
  assert.equal(typed.duckTyped, false);
  assert.equal(typed.typeHint, "ModuleInterface");

  const mangled = inspectModuleLoaderRegister(MANGLED_LOADER);
  assert.equal(mangled.duckTyped, false);
  assert.equal(mangled.typeHint, "_c_2ee614fb");

  const duck = inspectModuleLoaderRegister(
    "<?php class ModuleLoader { public function register( object $module ): void {} }",
  );
  assert.equal(duck.duckTyped, true);
  assert.equal(duck.typeHint, "object");
});

test("assertDuckTypedModuleLoaders fails closed on a typed vendor copy", async () => {
  await withTree("ml-gate-typed-", async (root) => {
    const file = path.join(root, "vendor/wpdev/framework/src/Core/ModuleLoader.php");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, TYPED_LOADER);
    assert.throws(
      () => assertDuckTypedModuleLoaders(root),
      /ModuleLoader::register\(\) must accept object/,
    );
  });
});

test("rewrite converts typed and mangled register() hints to object", async () => {
  await withTree("ml-gate-rewrite-", async (root) => {
    const vendor = path.join(root, "vendor/wpdev/framework/src/Core/ModuleLoader.php");
    const closure = path.join(root, "src/FrameworkClosure/Core/Core/ModuleLoader.php");
    await mkdir(path.dirname(vendor), { recursive: true });
    await mkdir(path.dirname(closure), { recursive: true });
    await writeFile(vendor, TYPED_LOADER);
    await writeFile(closure, MANGLED_LOADER);

    const result = rewriteModuleLoaderRegisterToDuckTyped(root);
    assert.equal(result.rewritten, 2);
    assertDuckTypedModuleLoaders(root);

    const vendorSrc = await readFile(vendor, "utf8");
    const closureSrc = await readFile(closure, "utf8");
    assert.match(vendorSrc, /function register\(\s*object\s+/);
    assert.match(closureSrc, /function register\(\s*object\s+/);
    assert.doesNotMatch(vendorSrc, /register\(\s*ModuleInterface\s+/);
    assert.doesNotMatch(closureSrc, /register\(\s*_c_2ee614fb\s+/);
  });
});

test("typed winner ModuleLoader TypeErrors on a foreign DRM module; object hint does not", async () => {
  const script = (typeHint) => `<?php
namespace WPDev\\Core {
    interface ModuleInterface {
        public function get_slug(): string;
    }
    final class ModuleLoader {
        private array $modules = [];
        public function register(${typeHint} $module): void {
            $slug = \\method_exists($module, 'get_slug') ? $module->get_slug() : '';
            $this->modules[$slug] = $module;
        }
        public function has(string $slug): bool {
            return isset($this->modules[$slug]);
        }
    }
    final class Plugin {
        private static $loader = null;
        public static function loader() {
            if (self::$loader === null) {
                self::$loader = new ModuleLoader();
            }
            return self::$loader;
        }
    }
}
namespace DRMConnector\\Modules\\AdminPanel {
    final class Module {
        public function get_slug(): string { return 'drm-connector-admin-panel'; }
    }
}
namespace {
    $module = new \\DRMConnector\\Modules\\AdminPanel\\Module();
    \\WPDev\\Core\\Plugin::loader()->register($module);
    echo \\WPDev\\Core\\Plugin::loader()->has('drm-connector-admin-panel') ? "COEXIST_OK\\n" : "COEXIST_MISSING\\n";
}
`;

  await withTree("ml-gate-php-", async (root) => {
    const typedFile = path.join(root, "typed-probe.php");
    const duckFile = path.join(root, "duck-probe.php");
    await writeFile(typedFile, script("ModuleInterface"));
    await writeFile(duckFile, script("object"));

    await assert.rejects(
      () => execFileAsync("php", [typedFile]),
      /TypeError|must be an instance of WPDev\\Core\\ModuleInterface/i,
    );

    const { stdout } = await execFileAsync("php", [duckFile]);
    assert.match(stdout, /COEXIST_OK/);
  });
});
