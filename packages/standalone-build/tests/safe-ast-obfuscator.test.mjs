import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);
const OBFUSCATOR_PHP = path.resolve(packageRoot, "safe-ast-obfuscator.php");

test("preserves gettext %1$s placeholders and sprintf strings with zero corruption", async () => {
  const source = `<?php
class NotificationService {
    private $apiKey = "secret";
    public function formatNotice($userName, $orderCount) {
        $template = __("Hello %1$s, you have %2$d pending orders.", "tavangary");
        return sprintf($template, $userName, $orderCount);
    }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "safe-obf-test-"));
  const tempFile = path.join(tempDir, "test.php");
  try {
    await writeFile(tempFile, source, "utf8");
    await execFileAsync("php", [OBFUSCATOR_PHP, tempFile, "seed-123"]);

    const transformed = await readFile(tempFile, "utf8");

    // The gettext template string MUST be byte-exact and untouched
    assert.ok(
      transformed.includes('"Hello %1$s, you have %2$d pending orders."'),
      "Gettext placeholders %1$s and %2$d must remain completely untouched"
    );
    assert.ok(!transformed.includes("%1$_v"), "%1$s must NOT be turned into variable");

    // The local variables inside formatNotice MUST be safely renamed
    assert.ok(!transformed.includes("$template ="), "Local variable $template must be renamed");

    // Syntax validation
    const { stdout } = await execFileAsync("php", ["-l", tempFile]);
    assert.ok(stdout.includes("No syntax errors detected"), "Transformed PHP must be syntax-valid");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("renames private methods and properties while preserving public/protected ones", async () => {
  const source = `<?php
class AccountManager {
    private $internalSecret = 999;
    protected $accountType = "gold";
    public $accountId = 42;

    public function getInfo() {
        return $this->computeSecretHash() + $this->internalSecret;
    }

    private function computeSecretHash() {
        $temp = $this->internalSecret * 2;
        return $temp;
    }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "safe-obf-test-"));
  const tempFile = path.join(tempDir, "test.php");
  try {
    await writeFile(tempFile, source, "utf8");
    await execFileAsync("php", [OBFUSCATOR_PHP, tempFile, "seed-456"]);

    const transformed = await readFile(tempFile, "utf8");

    // Public and protected properties preserved
    assert.ok(transformed.includes("protected $accountType"));
    assert.ok(transformed.includes("public $accountId"));

    // Private method and private property renamed
    assert.ok(!transformed.includes("computeSecretHash"), "Private method must be renamed");
    assert.ok(!transformed.includes("$internalSecret"), "Private property must be renamed");

    // PHP lint
    const { stdout } = await execFileAsync("php", ["-l", tempFile]);
    assert.ok(stdout.includes("No syntax errors detected"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("renames private static calls and removes non-essential comments", async () => {
  const source = `<?php
// internal implementation detail
/** another internal comment */
class StaticService {
    /** @var int */
    private static $value = 1;
    // License: retain this metadata
    private static function calculate() { return self::$value; }
    public static function run() { return self::calculate(); }
}
`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "safe-obf-test-"));
  const tempFile = path.join(tempDir, "test.php");
  try {
    await writeFile(tempFile, source, "utf8");
    await execFileAsync("php", [OBFUSCATOR_PHP, tempFile, "seed-static"]);
    const transformed = await readFile(tempFile, "utf8");
    assert.ok(!transformed.includes("internal implementation detail"));
    assert.ok(!transformed.includes("another internal comment"));
    assert.ok(transformed.includes("License: retain this metadata"));
    assert.ok(!transformed.includes("self::calculate"));
    const { stdout } = await execFileAsync("php", ["-l", tempFile]);
    assert.ok(stdout.includes("No syntax errors detected"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
