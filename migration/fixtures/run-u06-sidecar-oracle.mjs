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

for (const value of [NaN, Infinity, -Infinity]) {
  assert.equal(phpFileContent(value), "<?php return null;\n");
  assert.equal(
    phpFileContent({ n: value }),
    "<?php return array('n' => null);\n",
  );
}
assert.equal(
  phpFileContent([NaN, Infinity, -Infinity, { nested: [NaN, Infinity, -Infinity, 1.5] }]),
  "<?php return array(null, null, null, array('nested' => array(null, null, null, 1.5)));\n",
);
assert.equal(
  phpFileContent(Object.fromEntries([
    ["z", "first"], ["10", "ten"], ["2", "two"], ["a", "last"], ["0", "zero"],
  ])),
  "<?php return array('0' => 'zero', '2' => 'two', '10' => 'ten', 'z' => 'first', 'a' => 'last');\n",
);
assert.equal(
  phpFileContent(Object.fromEntries([
    ["4294967295", 1], ["01", 2], ["-0", 3], ["1.0", 4], ["1e0", 5],
    ["-1", 6], ["+1", 7], ["", 8], ["4294967294", 9], ["0", 10], ["1", 11],
  ])),
  "<?php return array('0' => 10, '1' => 11, '4294967294' => 9, '4294967295' => 1, '01' => 2, '-0' => 3, '1.0' => 4, '1e0' => 5, '-1' => 6, '+1' => 7, '' => 8);\n",
);
assert.equal(
  phpFileContent(Object.fromEntries([
    ["z", "old"], ["2", "old index"], ["a", true],
    ["z", Object.fromEntries([
      ["b", false], ["10", 10], ["2", 2], ["a", 1], ["b", Infinity],
    ])],
    ["2", "new index"],
  ])),
  "<?php return array('2' => 'new index', 'z' => array('2' => 2, '10' => 10, 'b' => null, 'a' => 1), 'a' => true);\n",
);

console.log("U06 sidecar oracle PASS");
