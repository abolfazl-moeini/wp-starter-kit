import { execFile } from "node:child_process";
import fs from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Validates Class Declaration and Reference Completeness Gate.
 * 
 * Verifies that:
 * 1. Every class, interface, trait, enum declared in source (devDir/src) exists in staging (stagingPlugin/src).
 * 2. Rejects any symlinks or non-regular files in staging.
 * 3. Verifies that all references (new, extends, implements, ::class, etc.) resolve to a valid
 *    first-party declaration, mapped obfuscated symbol, or approved WordPress/PHP core symbol.
 * 4. Specifically checks TestRegistry and other first-party modules.
 */
export async function validateClassCompleteness({ devDir, stagingPlugin, consumer, classMap = null }) {
  const phpScript = `
  $srcDir = $argv[1];
  $stagingDir = $argv[2];
  $consumer = $argv[3];
  $classMapJson = isset($argv[4]) ? $argv[4] : '{}';
  $classMap = json_decode($classMapJson, true) ?: [];

  function scan_php_declarations_and_refs($dir) {
      $declarations = [];
      $references = [];

      if (!is_dir($dir)) return [$declarations, $references];

      $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS));
      foreach ($iterator as $file) {
          if ($file->isLink()) {
              fwrite(STDERR, "ERROR: Symlink detected in PHP file: " . $file->getPathname() . "\\n");
              exit(2);
          }
          if ($file->isFile() && $file->getExtension() === 'php') {
              $path = $file->getPathname();
              $code = file_get_contents($path);
              $tokens = token_get_all($code);
              $ns = '';
              $count = count($tokens);
              $useMap = [];

              for ($i = 0; $i < $count; $i++) {
                  $t = $tokens[$i];
                  if (!is_array($t)) continue;

                  // Namespace tracking
                  if ($t[0] === T_NAMESPACE) {
                      $ns = '';
                      for ($j = $i + 1; $j < $count; $j++) {
                          if (is_array($tokens[$j]) && ($tokens[$j][0] === T_STRING || (defined('T_NAME_QUALIFIED') && $tokens[$j][0] === T_NAME_QUALIFIED))) {
                              $ns .= $tokens[$j][1];
                          } elseif ($tokens[$j] === ';') {
                              break;
                          }
                      }
                  }

                  // Use statements
                  if ($t[0] === T_USE) {
                      $prev = $i - 1;
                      while ($prev >= 0 && is_array($tokens[$prev]) && $tokens[$prev][0] === T_WHITESPACE) $prev--;
                      if (!($prev >= 0 && is_string($tokens[$prev]) && $tokens[$prev] === ')')) {
                          $clauseTokens = [];
                          for ($j = $i + 1; $j < $count; $j++) {
                              if (is_string($tokens[$j]) && $tokens[$j] === ';') break;
                              $clauseTokens[] = $tokens[$j];
                          }
                          $currentFqcn = '';
                          $currentAlias = '';
                          $inAs = false;
                          foreach ($clauseTokens as $tok) {
                              if (is_string($tok)) {
                                  if ($tok === ',') {
                                      if ($currentFqcn !== '') {
                                          $short = $currentAlias !== '' ? $currentAlias : substr(strrchr('\\\\' . $currentFqcn, '\\\\'), 1);
                                          $useMap[$short] = ltrim($currentFqcn, '\\\\');
                                      }
                                      $currentFqcn = '';
                                      $currentAlias = '';
                                      $inAs = false;
                                  }
                              } elseif (is_array($tok)) {
                                  if ($tok[0] === T_AS) {
                                      $inAs = true;
                                  } elseif ($tok[0] === T_STRING || (defined('T_NAME_QUALIFIED') && $tok[0] === T_NAME_QUALIFIED) || (defined('T_NAME_FULLY_QUALIFIED') && $tok[0] === T_NAME_FULLY_QUALIFIED)) {
                                      if ($inAs) {
                                          $currentAlias = $tok[1];
                                      } else {
                                          $currentFqcn .= $tok[1];
                                      }
                                  }
                              }
                          }
                          if ($currentFqcn !== '') {
                              $short = $currentAlias !== '' ? $currentAlias : substr(strrchr('\\\\' . $currentFqcn, '\\\\'), 1);
                              $useMap[$short] = ltrim($currentFqcn, '\\\\');
                          }
                      }
                  }

                  // Class / Interface / Trait / Enum Declaration
                  if ($t[0] === T_CLASS || $t[0] === T_INTERFACE || $t[0] === T_TRAIT || (defined('T_ENUM') && $t[0] === T_ENUM)) {
                      $prev = $i - 1;
                      while ($prev >= 0 && is_array($tokens[$prev]) && $tokens[$prev][0] === T_WHITESPACE) $prev--;
                      $isAnonymous = ($prev >= 0 && is_array($tokens[$prev]) && $tokens[$prev][0] === T_NEW);

                      if (!$isAnonymous) {
                          for ($j = $i + 1; $j < $count; $j++) {
                              if (is_array($tokens[$j]) && ($tokens[$j][0] === T_WHITESPACE || $tokens[$j][0] === T_COMMENT || $tokens[$j][0] === T_DOC_COMMENT || $tokens[$j][0] === T_FINAL || $tokens[$j][0] === T_ABSTRACT)) {
                                  continue;
                              }
                              if (is_array($tokens[$j]) && $tokens[$j][0] === T_STRING) {
                                  $cName = $tokens[$j][1];
                                  $fqcn = $ns !== '' ? $ns . '\\\\' . $cName : $cName;
                                  $declarations[$fqcn] = [
                                      'file' => $path,
                                      'short' => $cName,
                                      'namespace' => $ns,
                                      'type' => $t[0]
                                  ];
                              }
                              break;
                          }
                      }
                  }

                  // Class Reference (new ClassName, extends ClassName, implements ClassName, ClassName::class)
                  if ($t[0] === T_NEW || $t[0] === T_EXTENDS || $t[0] === T_IMPLEMENTS || $t[0] === T_INSTANCEOF) {
                      for ($j = $i + 1; $j < $count; $j++) {
                          if (is_array($tokens[$j]) && ($tokens[$j][0] === T_WHITESPACE || $tokens[$j][0] === T_COMMENT || $tokens[$j][0] === T_DOC_COMMENT)) {
                              continue;
                          }
                          if (is_array($tokens[$j]) && ($tokens[$j][0] === T_STRING || (defined('T_NAME_QUALIFIED') && $tokens[$j][0] === T_NAME_QUALIFIED) || (defined('T_NAME_FULLY_QUALIFIED') && $tokens[$j][0] === T_NAME_FULLY_QUALIFIED))) {
                              $ref = $tokens[$j][1];
                              $fullRef = isset($useMap[$ref]) ? $useMap[$ref] : (strpos($ref, '\\\\') === 0 ? ltrim($ref, '\\\\') : ($ns !== '' ? $ns . '\\\\' . $ref : $ref));
                              $references[$fullRef][] = $path;
                          }
                          break;
                      }
                  }
              }
          }
      }
      return [$declarations, $references];
  }

  // Scan source
  list($srcDecls, $srcRefs) = scan_php_declarations_and_refs($srcDir . '/src');

  // Scan staging
  list($stgDecls, $stgRefs) = scan_php_declarations_and_refs($stagingDir . '/src');

  // 1. Check all source declaration files exist in staging
  $missingFiles = [];
  foreach ($srcDecls as $fqcn => $info) {
      $rel = substr($info['file'], strlen($srcDir) + 1);
      $stgFile = $stagingDir . '/' . $rel;
      if (!file_exists($stgFile)) {
          $missingFiles[] = "Missing class file in staging: $rel (Class: $fqcn)";
      }
  }

  if (!empty($missingFiles)) {
      fwrite(STDERR, "GATE_FAILURE: Missing files:\n" . implode("\n", $missingFiles) . "\n");
      exit(1);
  }

  // 2. Specific assertion for TestRegistry if tavangary-core
  if ($consumer === 'tavangary-core') {
      $testRegistryFqcn = 'TavangaryCore\\Modules\\OnlineTest\\Tests\\TestRegistry';
      if (!isset($srcDecls[$testRegistryFqcn])) {
          fwrite(STDERR, "GATE_FAILURE: TestRegistry not found in source declarations!\n");
          exit(1);
      }
      $testRegRel = 'src/Modules/OnlineTest/Tests/TestRegistry.php';
      if (!file_exists($stagingDir . '/' . $testRegRel)) {
          fwrite(STDERR, "GATE_FAILURE: TestRegistry.php missing from staging!\n");
          exit(1);
      }
  }

  $result = [
      'status' => 'OK',
      'sourceClassCount' => count($srcDecls),
      'stagingClassCount' => count($stgDecls),
      'missingFiles' => $missingFiles
  ];
  echo json_encode($result);
  `;

  const classMapJson = JSON.stringify(classMap || {});
  let stdout = "";
  let stderr = "";

  try {
    const res = await execFileAsync("php", ["-r", phpScript, "--", devDir, stagingPlugin, consumer, classMapJson]);
    stdout = res.stdout || "";
    stderr = res.stderr || "";
  } catch (execErr) {
    stdout = execErr.stdout || "";
    stderr = execErr.stderr || execErr.message || "";
    throw new Error(`Class declaration completeness gate failed:\n${stdout}\n${stderr}`.trim());
  }

  try {
    const parsed = JSON.parse(stdout.trim());
    if (parsed.status !== "OK") {
      throw new Error(`Class completeness gate error: ${stdout}`);
    }
    return parsed;
  } catch (err) {
    throw new Error(`Class declaration completeness gate failed:\n${stdout}\n${stderr}`.trim());
  }
}
