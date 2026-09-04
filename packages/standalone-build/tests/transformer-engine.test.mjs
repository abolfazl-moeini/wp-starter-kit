import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);
const TRANSFORMER_PHP = path.resolve(packageRoot, "plan3/transformer.php");

test("Transformer Engine: class, multiple constants, method, and variable transformation", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "trans-eng-test-"));
  try {
    const sampleClass = `<?php
namespace MyPlugin\\Features;

/**
 * Class docblock should be stripped.
 */
class PaymentProcessor {

    /** Multiple private constants on one line */
    private const GATEWAY_CODE = 'zarinpal_gateway_v2', TIMEOUT_SECONDS = 30;
    public const PUBLIC_CODE = 'pub_123';

    private $apiKey = 'secret_123';
    public $publicStatus = 'active';

    public function processOrder( $orderId ) {
        // Internal comment
        $fee = 1000;
        for ( $i = 1; $i <= 3; $i++ ) {
            $key = "item_{$i}_key";
        }
        $cls = self::class;
        $isArr = is_array([$fee]);
        $len = strlen(self::GATEWAY_CODE);
        return $this->computeTotal( $orderId, $fee ) . ' via ' . self::GATEWAY_CODE . ' (' . self::TIMEOUT_SECONDS . 's)';
    }

    private function computeTotal( $orderId, $fee ) {
        return (int) $orderId + (int) $fee;
    }
}
`;

    const sampleFile = path.join(tmpDir, "PaymentProcessor.php");
    await writeFile(sampleFile, sampleClass, "utf8");

    const mapFile = path.join(tmpDir, "map.json");
    await execFileAsync("php", [TRANSFORMER_PHP, "--dump-map", tmpDir, mapFile, "test-seed-1"]);

    const mapContent = JSON.parse(await readFile(mapFile, "utf8"));
    assert.ok(mapContent.classes["MyPlugin\\Features\\PaymentProcessor"], "Class must be in class map");

    const mangledClass = mapContent.classes["MyPlugin\\Features\\PaymentProcessor"].split("\\").pop();

    await execFileAsync("php", [TRANSFORMER_PHP, sampleFile, "--not-main", mapFile, "test-seed-1"]);

    const transformedCode = await readFile(sampleFile, "utf8");

    // 1. Comments stripped
    assert.ok(!transformedCode.includes("Class docblock should be stripped"), "Docblock must be stripped");
    assert.ok(!transformedCode.includes("Internal comment"), "Inline comments must be stripped");

    // 2. Class renamed
    assert.ok(transformedCode.includes(`class ${mangledClass}`), `Class must be renamed to ${mangledClass}`);
    assert.ok(!transformedCode.includes("class PaymentProcessor"), "Original class name must not appear in declaration");

    // 3. Private constants mangled, public constants preserved
    assert.ok(!transformedCode.includes("GATEWAY_CODE ="), "GATEWAY_CODE must be mangled in declaration");
    assert.ok(transformedCode.includes("PUBLIC_CODE ="), "PUBLIC_CODE must NOT be mangled");

    // 4. Literal values preserved byte-for-byte
    assert.ok(transformedCode.includes("'zarinpal_gateway_v2'"), "Literal constant value must be byte-exact");
    assert.ok(transformedCode.includes("30"), "Literal integer value must be byte-exact");

    // 5. Internal PHP functions NOT mangled
    assert.ok(transformedCode.includes("is_array"), "is_array must NOT be mangled");
    assert.ok(transformedCode.includes("strlen"), "strlen must NOT be mangled");

    // 6. self::class preserved
    assert.ok(transformedCode.includes("self::class"), "self::class must be preserved");

    // 7. Execute transformed PHP to verify valid runtime behavior
    const testRunner = `<?php
require_once '${sampleFile}';

$fqcn = class_exists('${mangledClass}') ? '${mangledClass}' : "MyPlugin\\\\Features\\\\${mangledClass}";
$instance = new $fqcn();

$result = $instance->processOrder(5000);
if ($result !== '6000 via zarinpal_gateway_v2 (30s)') {
    echo "ERROR: Unexpected result: " . $result . "\\n";
    exit(1);
}

if ($instance->publicStatus !== 'active') {
    echo "ERROR: Public property not active\\n";
    exit(2);
}

echo "ENGINE_TRANSFORM_SUCCESS\\n";
`;

    const runnerFile = path.join(tmpDir, "runner.php");
    await writeFile(runnerFile, testRunner, "utf8");

    const { stdout } = await execFileAsync("php", [runnerFile]);
    assert.ok(stdout.includes("ENGINE_TRANSFORM_SUCCESS"), `Execution output: ${stdout}`);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
