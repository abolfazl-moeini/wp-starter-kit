#!/usr/bin/env node
/**
 * Source-language oracle for asset MD5 + json2php sidecar bytes.
 */
import assert from "node:assert/strict";
import {
  phpFileContent,
  generateChecksum,
  assetFilePath,
} from "../../core/packages/dependency-extraction-esbuild-plugin/index.js";

assert.equal(generateChecksum(""), "d41d8cd98f00b204e9800998ecf8427e");
assert.equal(generateChecksum("hello"), "5d41402abc4b2a76b9719d911017c592");
assert.equal(generateChecksum("سلام"), "78903c575b0dda53c4a7644a2dd36d0e");

assert.equal(
  phpFileContent({ hash: "abc" }),
  "<?php return array('hash' => 'abc');\n",
);
assert.equal(
  phpFileContent({
    dependencies: ["wp-element", "jquery"],
    internal_packages: [],
    hash: "deadbeef",
  }),
  "<?php return array('dependencies' => array('wp-element', 'jquery'), 'internal_packages' => array(), 'hash' => 'deadbeef');\n",
);
assert.equal(
  phpFileContent({ hash: "a'b" }),
  "<?php return array('hash' => 'a\\'b');\n",
);
assert.equal(
  phpFileContent({ hash: "a\\b" }),
  "<?php return array('hash' => 'a\\\\b');\n",
);
assert.equal(
  phpFileContent({ ok: true, no: false, z: null }),
  "<?php return array('ok' => true, 'no' => false, 'z' => null);\n",
);
assert.equal(
  phpFileContent({ n: 1, f: 1.5 }),
  "<?php return array('n' => 1, 'f' => 1.5);\n",
);
assert.equal(
  assetFilePath("assets/bundles/wpdev-starter-deps.js"),
  "assets/bundles/wpdev-starter-deps.asset.php",
);
assert.equal(
  assetFilePath("assets/bundles/style.css"),
  "assets/bundles/style.asset.php",
);

console.log("U06 sidecar oracle PASS");
