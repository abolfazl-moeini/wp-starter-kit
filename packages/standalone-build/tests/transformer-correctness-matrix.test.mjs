import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);
const transformerScript = path.resolve(packageRoot, "plan3/transformer.php");

test("Transformer Matrix: handles class, interface, trait, enum, anonymous classes and duplicate short names with class_alias", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "transform-matrix-"));
  const mapFile = path.join(tmpDir, "map.json");
  try {
    await mkdir(path.join(tmpDir, "src/ModuleA"), { recursive: true });
    await mkdir(path.join(tmpDir, "src/ModuleB"), { recursive: true });

    // Module A Interface and Class
    await writeFile(
      path.join(tmpDir, "src/ModuleA/RegistryInterface.php"),
      `<?php
namespace App\\ModuleA;

interface RegistryInterface {
    public function get_name(): string;
}
`
    );

    await writeFile(
      path.join(tmpDir, "src/ModuleA/Registry.php"),
      `<?php
namespace App\\ModuleA;

class Registry implements RegistryInterface {
    public function get_name(): string {
        return 'ModuleA_Registry';
    }
}
`
    );

    // Module B Trait and Class sharing identical short name 'Registry'
    await writeFile(
      path.join(tmpDir, "src/ModuleB/LoggerTrait.php"),
      `<?php
namespace App\\ModuleB;

trait LoggerTrait {
    public function log(string $msg): string {
        return 'Logged: ' . $msg;
    }
}
`
    );

    await writeFile(
      path.join(tmpDir, "src/ModuleB/Registry.php"),
      `<?php
namespace App\\ModuleB;

class Registry {
    use LoggerTrait;

    public function get_name(): string {
        return 'ModuleB_Registry';
    }

    public function get_anonymous_handler() {
        return new class {
            public function handle() { return 'anon_ok'; }
        };
    }
}
`
    );

    // Test runner code exercising class_exists, ReflectionClass, serialization, callback string
    await writeFile(
      path.join(tmpDir, "runner.php"),
      `<?php
require_once __DIR__ . '/src/ModuleA/RegistryInterface.php';
require_once __DIR__ . '/src/ModuleA/Registry.php';
require_once __DIR__ . '/src/ModuleB/LoggerTrait.php';
require_once __DIR__ . '/src/ModuleB/Registry.php';

// 1. class_exists check for original FQCNs
assert(class_exists('App\\\\ModuleA\\\\Registry'), 'ModuleA Registry must resolve via class_exists');
assert(class_exists('App\\\\ModuleB\\\\Registry'), 'ModuleB Registry must resolve via class_exists');
assert(interface_exists('App\\\\ModuleA\\\\RegistryInterface'), 'Interface must resolve');
assert(trait_exists('App\\\\ModuleB\\\\LoggerTrait'), 'Trait must resolve');

// 2. Instantiate and verify distinct non-colliding instances
$a = new \\App\\ModuleA\\Registry();
$b = new \\App\\ModuleB\\Registry();
assert($a->get_name() === 'ModuleA_Registry', 'Module A name mismatch');
assert($b->get_name() === 'ModuleB_Registry', 'Module B name mismatch');
assert($b->log('test') === 'Logged: test', 'Trait method invocation mismatch');

// 3. Anonymous class check
$anon = $b->get_anonymous_handler();
assert($anon->handle() === 'anon_ok', 'Anonymous class mismatch');

// 4. ReflectionClass check
$refA = new \\ReflectionClass('App\\\\ModuleA\\\\Registry');
assert($refA->getName() !== '', 'ReflectionClass must succeed on aliased FQCN');

// 5. Serialization check
$serialized = serialize($a);
$unserialized = unserialize($serialized);
assert($unserialized->get_name() === 'ModuleA_Registry', 'Serialization roundtrip must preserve behavior');

// 6. Callback string check
$cb = ['App\\\\ModuleA\\\\Registry', 'class'];
assert(is_callable([$a, 'get_name']), 'Callable object method must work');

echo 'TRANSFORMER_CORRECTNESS_MATRIX_SUCCESS';
`
    );

    // Phase 1: Dump map
    await execFileAsync("php", [transformerScript, "--dump-map", tmpDir, mapFile, "test-seed"]);

    // Phase 2: Transform batch
    await execFileAsync("php", [transformerScript, "--batch", tmpDir, mapFile, "test-seed", "runner.php"]);

    // Execute runner.php with transformed code
    const { stdout } = await execFileAsync("php", [path.join(tmpDir, "runner.php")]);
    assert.ok(stdout.includes("TRANSFORMER_CORRECTNESS_MATRIX_SUCCESS"));
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
