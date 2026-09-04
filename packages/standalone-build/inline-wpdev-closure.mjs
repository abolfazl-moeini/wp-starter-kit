#!/usr/bin/env node

/**
 * Plan 3: WPDev Closure Inliner & Full Asset Minifier
 * 
 * Functions:
 * 1. Copies the exact runtime closure of WPDevFramework (classes, traits, database engine,
 *    and ALL core/admin/field/table/metabox functions) required by a consumer plugin
 *    into its staging tree (src/FrameworkClosure/).
 * 2. Wraps all inlined functions with if (!function_exists('...')) guards to support
 *    safe co-existence without class/function collision.
 * 3. Inlines comprehensive fallback definitions for all public WPDev APIs.
 * 4. Decouples plugin main file from the external wpdev plugin.
 * 5. Minifies 100% of first-party JS and CSS assets using esbuild.
 */

import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const REQUIRED_WPDEV_MODULE_FILES = [
  // BerlinDB Core Dependencies
  "modules/core/dependencies/berlindb/core/src/Database/Base.php",
  "modules/core/dependencies/berlindb/core/src/Database/Schema.php",
  "modules/core/dependencies/berlindb/core/src/Database/Table.php",
  "modules/core/dependencies/berlindb/core/src/Database/Column.php",
  "modules/core/dependencies/berlindb/core/src/Database/Query.php",
  "modules/core/dependencies/berlindb/core/src/Database/Row.php",
  "modules/core/dependencies/berlindb/core/src/Database/Queries/Compare.php",
  "modules/core/dependencies/berlindb/core/src/Database/Queries/Date.php",
  "modules/core/dependencies/berlindb/core/src/Database/Queries/Meta.php",
  // Database engine
  "modules/core/src/Database/engine/class-base.php",
  "modules/core/src/Database/engine/class-table.php",
  "modules/core/src/Database/engine/class-schema.php",
  "modules/core/src/Database/engine/class-column.php",
  "modules/core/src/Database/engine/class-query.php",
  "modules/core/src/Database/engine/class-enum.php",
  "modules/core/src/Database/engine/class-compare.php",
  "modules/core/src/Database/engine/class-date.php",
  "modules/core/src/Database/engine/class-row.php",
  "modules/core/src/Database/engine/class-meta.php",
  "modules/core/src/Database/engine/class-meta-type-compat.php",
  // Traits, models, managers, registries
  "modules/core/src/traits/trait-singleton.php",
  "modules/core/src/traits/trait-delegates-component-registry.php",
  "modules/core/src/traits/trait-wpdev-settings-deprecated.php",
  "modules/core/src/traits/trait-wpdev-deprecated.php",
  "modules/core/src/traits/trait-wpdev-coupon-deprecated.php",
  "modules/core/src/traits/trait-wpdev-plan-deprecated.php",
  "modules/core/src/traits/trait-wpdev-site-deprecated.php",
  "modules/core/src/traits/trait-wpdev-subscription-deprecated.php",
  "modules/core/src/Model/class-base-model.php",
  "modules/core/src/Model/class-post-base-model.php",
  "modules/core/src/Model/traits/trait-billable.php",
  "modules/core/src/Model/traits/trait-limitable.php",
  "modules/core/src/Model/traits/trait-notable.php",
  "modules/core/src/managers/class-base-manager.php",
  "modules/core/src/class-registry-base.php",
  "modules/core/src/class-table-registry.php",
  "modules/core/src/class-service-registry.php",
  "modules/core/src/Contracts/interface-service-contract.php",
  "modules/core/src/Contracts/interface-ajax-service-contract.php",
  "modules/core/src/Contracts/interface-modal-service-contract.php",
  "modules/core/src/Contracts/interface-view-service-contract.php",
  "modules/core/src/Contracts/interface-component-registry-contract.php",
  "modules/core/src/Contracts/interface-module-contract.php",
  "modules/core/src/Services/class-ajax-service.php",
  "modules/core/src/Services/class-form-service.php",
  "modules/core/src/Services/class-modal-service.php",
  "modules/core/src/Services/class-screen-options-service.php",
  "modules/core/src/Services/class-tour-service.php",
  "modules/core/src/Services/class-view-service.php",
  "modules/core/src/class-hooks.php",
  "modules/core/src/class-current.php",
  "modules/core/src/class-logger.php",
  "modules/core/src/class-admin-notices.php",
  "modules/core/src/class-scripts.php",
  "modules/core/src/class-module-loader.php",
  "modules/core/src/ajax/class-ajax.php",
  "modules/core/src/ajax/class-ajax-response.php",
  "modules/core/src/ajax/class-ajax-tab-loader.php",
  "modules/core/src/ajax/class-async-calls.php",
  "modules/core/src/ajax/class-light-ajax.php",
  "modules/core/src/class-user-switching.php",
  "modules/core/src/capabilities/class-capability-registry.php",
  "modules/core/src/class-documentation.php",
  "modules/core/src/class-helper.php",
  "modules/core/src/class-requirements.php",
  "modules/core/src/class-whitelabel.php",
  "modules/core/src/helpers/class-hash.php",
  "modules/core/src/helpers/class-arr.php",
  "modules/core/src/helpers/class-validator.php",
  "modules/core/src/helpers/class-sender.php",
  "modules/core/src/tour/class-tours.php",
  "modules/core/src/managers/class-base-manager.php",
  "modules/core/src/form/class-form-manager.php",
  // Table builder
  "modules/table-builder/src/table/class-base-list-table.php",
  // Admin pages
  "modules/admin-page-builder/src/admin/class-base-admin-page.php",
  "modules/admin-page-builder/src/admin/class-list-admin-page.php",
  "modules/admin-page-builder/src/admin/class-edit-admin-page.php",
  "modules/admin-page-builder/src/admin/class-wizard-admin-page.php",
  "modules/admin-page-builder/src/admin/trait-edit-object-page.php",
  "modules/metabox-builder/src/admin/trait-edit-page-widgets.php",
  "modules/metabox-builder/src/admin/class-post-edit-admin-page.php",
  "modules/metabox-builder/src/class-metabox-registry.php",
  "modules/metabox-builder/src/class-component-registry.php",
  "modules/admin-setting-page/src/class-settings-admin-page.php",
  // Settings panel & storage
  "modules/settings-panel-builder/src/class-settings-write-lock.php",
  "modules/settings-panel-builder/src/class-settings-storage.php",
  "modules/settings-panel-builder/src/class-settings-section-registry.php",
  "modules/settings-panel-builder/src/class-settings-save.php",
  "modules/settings-panel-builder/src/class-settings.php",
  // Form & Field
  "modules/field-builder/src/field/class-field.php",
  "modules/form-builder/src/form/class-form.php",
  // Builder Registries
  "modules/menu-builder/src/class-menu-registry.php",
  "modules/menu-builder/src/class-component-registry.php",
  "modules/admin-page-builder/src/class-page-template-registry.php",
  "modules/admin-page-builder/src/class-component-registry.php",
  "modules/field-builder/src/class-field-type-registry.php",
  "modules/field-builder/src/class-component-registry.php",
  "modules/form-builder/src/class-component-registry.php",
  "modules/table-builder/src/class-list-table-registry.php",
  "modules/table-builder/src/class-component-registry.php",
  "modules/tab-navigation/src/class-component-registry.php",
  "modules/tab-navigation/src/class-tab-navigation.php",
  "modules/core/src/view/class-module-view-registry.php",
  "modules/core/src/view/class-bounded-view-root-registry.php",
];

const REQUIRED_WPDEV_FUNCTION_DIRS = [
  "modules/core/src/functions",
  "modules/admin-page-builder/src/functions",
  "modules/field-builder/src/functions",
  "modules/form-builder/src/functions",
  "modules/settings-panel-builder/src/functions",
  "modules/table-builder/src/functions",
  "modules/menu-builder/src/functions",
  "modules/tab-navigation/src/functions",
  "modules/metabox-builder/src/functions",
];

const REQUIRED_WPDEV_FUNCTION_FILES = [
  "modules/core/src/functions-module-assets.php",
  "modules/core/src/functions-module-managers.php",
  "modules/core/src/functions-waas.php",
  "modules/core/src/capabilities.php",
  "modules/core/src/view/template-functions.php",
];

const REQUIRED_WPDEV_VIEW_DIRS = [
  "modules/admin-custom-page/views",
  "modules/admin-page-builder/views",
  "modules/admin-widget-builder/views",
  "modules/core/views",
  "modules/field-builder/views",
  "modules/form-builder/views",
  "modules/metabox-builder/views",
  "modules/settings-panel-builder/views",
  "modules/tab-navigation/views",
  "modules/table-builder/views",
  "views",
];

const REQUIRED_WPDEV_ASSET_DIRS = [
  "assets",
  "modules/core/assets",
  "modules/admin-page-builder/assets",
  "modules/admin-custom-page/assets",
  "modules/admin-widget-builder/assets",
  "modules/field-builder/assets",
  "modules/tab-navigation/assets",
  "modules/table-builder/assets",
  "modules/wizard/assets",
];

export async function inlineWpdevClosure({ stagingPlugin, consumer, contentRoot, wpdevPluginDirOverride = null }) {
  const wpdevPluginDir = wpdevPluginDirOverride || path.join(contentRoot, "plugins/wpdev");

  // Decouple main plugin file header for all consumers
  const mainPhpPath = path.join(stagingPlugin, `${consumer}.php`);
  if (fs.existsSync(mainPhpPath)) {
    let mainPhp = await readFile(mainPhpPath, "utf8");
    mainPhp = mainPhp.replace(/^[ \t]*\*[ \t]*.*Requires Plugins:[ \t]*wpdev.*\r?\n/gim, "");
    mainPhp = mainPhp.replace(/add_action\(\s*'admin_notices',\s*'[^']+_wpdev_dependency_notice'\s*\);/g, "");
    
    // Inject functions-closure loader after vendor_autoload require
    if (!mainPhp.includes("functions-closure.php")) {
      mainPhp = mainPhp.replace(
        /(require_once\s+\$vendor_autoload;\s*\})/s,
        `$1\nif (file_exists(__DIR__ . '/src/FrameworkClosure/functions-closure.php')) {\n    require_once __DIR__ . '/src/FrameworkClosure/functions-closure.php';\n}`
      );
    }
    await writeFile(mainPhpPath, mainPhp, "utf8");
  }

  // Only inline runtime closure for consumers that use WPDevFramework
  const isTargetConsumer = [
    "wpdev-crm",
    "wpdev-tickets",
    "tavangary-core",
    "tavangary-theme-panel",
    "drm-connector",
    "wpdev-analytics",
    "wpdev-woo-persian",
  ].includes(consumer) || wpdevPluginDirOverride !== null;
  if (!isTargetConsumer || !fs.existsSync(wpdevPluginDir)) {
    return { inlinedFiles: 0 };
  }

  const targetDir = path.join(stagingPlugin, "src/FrameworkClosure");
  const functionsDir = path.join(targetDir, "functions");
  await mkdir(functionsDir, { recursive: true });

  const destinationMap = new Map();
  const inlinedManifest = [];
  let inlinedCount = 0;
  const copiedFiles = [];

  async function safeCopyFile(srcPath, destPath) {
    const bytes = await readFile(srcPath);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (destinationMap.has(destPath)) {
      const existing = destinationMap.get(destPath);
      if (existing.sha256 !== sha256) {
        throw new Error(
          `CRITICAL STRUCTURAL COLLISION: Destination '${destPath}' was targeted by multiple sources with conflicting content:\n` +
          `  1: ${existing.sourcePath} (SHA: ${existing.sha256})\n` +
          `  2: ${srcPath} (SHA: ${sha256})`
        );
      }
      return;
    }
    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, bytes);
    destinationMap.set(destPath, { sourcePath: srcPath, sha256 });
    inlinedManifest.push({
      source: path.relative(wpdevPluginDir, srcPath).replace(/\\/g, "/"),
      destination: path.relative(stagingPlugin, destPath).replace(/\\/g, "/"),
      sha256,
      bytes: bytes.length
    });
    copiedFiles.push(destPath);
    inlinedCount++;
  }

  // Discover all files in modules/ directory or fallback to REQUIRED_WPDEV_MODULE_FILES
  const modulesRoot = path.join(wpdevPluginDir, "modules");
  if (fs.existsSync(modulesRoot)) {
    async function visitDir(curDir) {
      const entries = await readdir(curDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const full = path.join(curDir, entry.name);
        if (entry.isDirectory()) {
          const lower = entry.name.toLowerCase();
          if (["dependencies", "tests", "unit-tests", "node_modules", ".git", "vendor"].includes(lower)) {
            continue;
          }
          await visitDir(full);
        } else if (entry.isFile() && entry.name.endsWith(".php")) {
          const rel = path.relative(wpdevPluginDir, full);
          if (rel.includes("/src/")) {
            const dest = path.join(targetDir, rel);
            await safeCopyFile(full, dest);
          }
        }
      }
    }
    await visitDir(modulesRoot);
  }

  // Ensure all explicit REQUIRED_WPDEV_MODULE_FILES are copied
  for (const relFile of REQUIRED_WPDEV_MODULE_FILES) {
    const srcPath = path.join(wpdevPluginDir, relFile);
    if (fs.existsSync(srcPath)) {
      const destPath = path.join(targetDir, relFile);
      await safeCopyFile(srcPath, destPath);
    }
  }

  // Copy all function files into src/FrameworkClosure/functions/
  const functionFilesToProcess = [];
  for (const relDir of REQUIRED_WPDEV_FUNCTION_DIRS) {
    const srcDir = path.join(wpdevPluginDir, relDir);
    if (fs.existsSync(srcDir)) {
      const entries = await readdir(srcDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        if (entry.name.endsWith(".php")) {
          const srcFile = path.join(srcDir, entry.name);
          const destFile = path.join(functionsDir, entry.name);
          await safeCopyFile(srcFile, destFile);
          functionFilesToProcess.push(destFile);
        }
      }
    }
  }
  for (const relFile of REQUIRED_WPDEV_FUNCTION_FILES) {
    const srcFile = path.join(wpdevPluginDir, relFile);
    if (fs.existsSync(srcFile)) {
      const destFile = path.join(functionsDir, path.basename(relFile));
      await safeCopyFile(srcFile, destFile);
      functionFilesToProcess.push(destFile);
    }
  }

  // Wrap all function definitions with if (!function_exists('...')) guards using PHP token_get_all
  const phpWrapperScript = `
function wrap_php_functions($code) {
    $tokens = token_get_all($code);
    $output = "";
    $in_class = 0;
    $class_depth = 0;
    $len = count($tokens);
    for ($i = 0; $i < $len; $i++) {
        $t = $tokens[$i];
        if (is_array($t)) {
            if ($t[0] === T_CLASS || $t[0] === T_TRAIT || $t[0] === T_INTERFACE || (defined('T_ENUM') && $t[0] === T_ENUM)) {
                $in_class = 1;
            } elseif ($t[0] === T_FUNCTION && $in_class === 0) {
                $fn_name = "";
                for ($j = $i + 1; $j < $len; $j++) {
                    $tok_j = $tokens[$j];
                    if (is_array($tok_j) && ($tok_j[0] === T_WHITESPACE || $tok_j[0] === T_COMMENT || $tok_j[0] === T_DOC_COMMENT)) {
                        continue;
                    }
                    if ($tok_j === "&") {
                        continue;
                    }
                    if (is_array($tok_j) && $tok_j[0] === T_STRING) {
                        $fn_name = $tok_j[1];
                    }
                    break;
                }
                if ($fn_name !== "") {
                    $output .= "if (!function_exists(\x27" . $fn_name . "\x27)) {\n";
                    $func_tokens = [$t];
                    $i++;
                    $brace_count = 0;
                    $started = false;
                    for (; $i < $len; $i++) {
                        $tok = $tokens[$i];
                        $func_tokens[] = $tok;
                        $tok_str = is_array($tok) ? $tok[1] : $tok;
                        if ($tok_str === "{") {
                            $brace_count++;
                            $started = true;
                        } elseif ($tok_str === "}") {
                            $brace_count--;
                            if ($started && $brace_count === 0) {
                                break;
                            }
                        }
                    }
                    foreach ($func_tokens as $ft) {
                        $output .= is_array($ft) ? $ft[1] : $ft;
                    }
                    $output .= "\n}\n";
                    continue;
                }
            }
            $output .= $t[1];
        } else {
            if ($in_class > 0) {
                if ($t === "{") {
                    $class_depth++;
                } elseif ($t === "}") {
                    $class_depth--;
                    if ($class_depth <= 0) {
                        $in_class = 0;
                        $class_depth = 0;
                    }
                }
            }
            $output .= $t;
        }
    }
    return $output;
}
function wrap_traits_and_interfaces($code) {
    $tokens = token_get_all($code);
    $output = "";
    $ns = "";
    $len = count($tokens);
    for ($i = 0; $i < $len; $i++) {
        $t = $tokens[$i];
        if (is_array($t)) {
            if ($t[0] === T_NAMESPACE) {
                $ns = "";
                for ($j = $i + 1; $j < $len; $j++) {
                    if (is_array($tokens[$j]) && ($tokens[$j][0] === T_STRING || (defined('T_NAME_QUALIFIED') && $tokens[$j][0] === T_NAME_QUALIFIED))) {
                        $ns .= $tokens[$j][1];
                    } elseif ($tokens[$j] === ';') {
                        break;
                    }
                }
            } elseif ($t[0] === T_TRAIT || $t[0] === T_INTERFACE) {
                $kind = ($t[0] === T_TRAIT) ? 'trait_exists' : 'interface_exists';
                $name = "";
                for ($j = $i + 1; $j < $len; $j++) {
                    if (is_array($tokens[$j]) && ($tokens[$j][0] === T_WHITESPACE || $tokens[$j][0] === T_COMMENT || $tokens[$j][0] === T_DOC_COMMENT)) continue;
                    if (is_array($tokens[$j]) && $tokens[$j][0] === T_STRING) {
                        $name = $tokens[$j][1];
                    }
                    break;
                }
                if ($name !== "") {
                    $fqcn = ($ns !== '') ? ($ns . '\\\\' . $name) : $name;
                    $output .= "if (!" . $kind . "(\x27" . $fqcn . "\x27, false)) {\n";
                    $body_tokens = [$t];
                    $i++;
                    $brace_count = 0;
                    $started = false;
                    for (; $i < $len; $i++) {
                        $tok = $tokens[$i];
                        $body_tokens[] = $tok;
                        $tok_str = is_array($tok) ? $tok[1] : $tok;
                        if ($tok_str === "{") {
                            $brace_count++;
                            $started = true;
                        } elseif ($tok_str === "}") {
                            $brace_count--;
                            if ($started && $brace_count === 0) break;
                        }
                    }
                    foreach ($body_tokens as $bt) {
                        $output .= is_array($bt) ? $bt[1] : $bt;
                    }
                    $output .= "\n}\n";
                    continue;
                }
            }
            $output .= $t[1];
        } else {
            $output .= $t;
        }
    }
    return $output;
}
foreach ($argv as $idx => $f) {
    if ($idx === 0) continue;
    if (is_file($f)) {
        $src = file_get_contents($f);
        $res = wrap_php_functions($src);
        $res = wrap_traits_and_interfaces($res);
        file_put_contents($f, $res);
    }
}
`;
  if (functionFilesToProcess.length > 0) {
    await execFileAsync("php", ["-r", phpWrapperScript, "--", ...functionFilesToProcess]);
  }

  // Also apply trait/interface wrapper to all files in FrameworkClosure
  const wrapTraitsScript = `
${phpWrapperScript}
  $dir = $argv[1];
  $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS));
  foreach ($iterator as $file) {
      if ($file->isFile() && $file->getExtension() === 'php') {
          $p = $file->getPathname();
          $code = file_get_contents($p);
          $wrapped = wrap_traits_and_interfaces($code);
          if ($wrapped !== $code) {
              file_put_contents($p, $wrapped);
          }
      }
  }
`;
  await execFileAsync("php", ["-r", wrapTraitsScript, "--", targetDir]);

  // Normalize internal cross-module requires in all FrameworkClosure php files
  async function normalizeClosureRequires(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await normalizeClosureRequires(full);
      } else if (entry.isFile() && entry.name.endsWith(".php") && entry.name !== "functions-closure.php") {
        let content = await readFile(full, "utf8");
        const replaced = content.replace(/require(?:_once)?\s+[^;]+\/((?:trait|class)-[a-zA-Z0-9_-]+\.php)['"][^;]*;/g, (match, filename) => {
          return `$_req_candidates = [
              __DIR__ . '/${filename}',
              dirname(__DIR__) . '/${filename}',
              dirname(dirname(__DIR__)) . '/${filename}',
              dirname(dirname(dirname(__DIR__))) . '/${filename}',
          ];
          $_found_req = false;
          foreach ($_req_candidates as $_c) {
              if (file_exists($_c)) { require_once $_c; $_found_req = true; break; }
          }
          if (!$_found_req) {
              $_fc_dir = __DIR__;
              while ($_fc_dir && basename($_fc_dir) !== 'FrameworkClosure' && $_fc_dir !== dirname($_fc_dir)) {
                  $_fc_dir = dirname($_fc_dir);
              }
              $_matches = glob($_fc_dir . '/modules/*/src/**/${filename}') ?: glob($_fc_dir . '/**/${filename}');
              if (!empty($_matches)) { require_once $_matches[0]; }
          }`;
        });
        if (replaced !== content) {
          await writeFile(full, replaced, "utf8");
        }
      }
    }
  }
  await normalizeClosureRequires(targetDir);

  // Create comprehensive master functions-closure.php
  const helperCode = `<?php
defined('ABSPATH') || exit;

if (!defined('WPDEV_LOADED')) {
    define('WPDEV_LOADED', true);
}

// Preload and alias Core Primitives with existence guards across plugins
$wpdev_closure_core_map = array(
    'WPDev\\\\Dependencies\\\\BerlinDB\\\\Database\\\\Base'  => __DIR__ . '/modules/core/dependencies/berlindb/core/src/Database/Base.php',
    'WPDev\\\\Dependencies\\\\BerlinDB\\\\Database\\\\Table' => __DIR__ . '/modules/core/dependencies/berlindb/core/src/Database/Table.php',
    'WPDevFramework\\\\Database\\\\Engine\\\\Base'           => __DIR__ . '/modules/core/src/Database/engine/class-base.php',
    'WPDevFramework\\\\Database\\\\Engine\\\\Table'          => __DIR__ . '/modules/core/src/Database/engine/class-table.php',
    'WPDevFramework\\\\Admin_Pages\\\\Edit_Object_Page'     => __DIR__ . '/modules/admin-page-builder/src/admin/trait-edit-object-page.php',
    'WPDevFramework\\\\Admin_Pages\\\\Edit_Page_Widgets'    => __DIR__ . '/modules/metabox-builder/src/admin/trait-edit-page-widgets.php',
    'WPDevFramework\\\\Admin_Pages\\\\Base_Admin_Page'       => __DIR__ . '/modules/admin-page-builder/src/admin/class-base-admin-page.php',
    'WPDevFramework\\\\Admin_Pages\\\\List_Admin_Page'       => __DIR__ . '/modules/admin-page-builder/src/admin/class-list-admin-page.php',
);
foreach ($wpdev_closure_core_map as $wpdev_c_cls => $wpdev_c_f) {
    if (!class_exists($wpdev_c_cls, false) && !trait_exists($wpdev_c_cls, false) && file_exists($wpdev_c_f)) {
        require_once $wpdev_c_f;
    }
}

foreach (array('Base', 'Table') as $wpdev_b) {
    if (class_exists("WPDev\\\\Dependencies\\\\BerlinDB\\\\Database\\\\{$wpdev_b}", false) && !class_exists("BerlinDB\\\\Database\\\\{$wpdev_b}", false)) {
        class_alias("WPDev\\\\Dependencies\\\\BerlinDB\\\\Database\\\\{$wpdev_b}", "BerlinDB\\\\Database\\\\{$wpdev_b}");
    }
}

foreach (array('Base_Admin_Page', 'List_Admin_Page') as $wpdev_ap) {
    if (class_exists("WPDevFramework\\\\Admin_Pages\\\\{$wpdev_ap}", false) && !class_exists("WPDev\\\\Admin_Pages\\\\{$wpdev_ap}", false)) {
        class_alias("WPDevFramework\\\\Admin_Pages\\\\{$wpdev_ap}", "WPDev\\\\Admin_Pages\\\\{$wpdev_ap}");
    }
}

if (trait_exists('WPDevFramework\\\\Admin_Pages\\\\Edit_Object_Page', false) && !trait_exists('Edit_Object_Page', false)) {
    class_alias('WPDevFramework\\\\Admin_Pages\\\\Edit_Object_Page', 'Edit_Object_Page');
}
if (trait_exists('WPDevFramework\\\\Admin_Pages\\\\Edit_Page_Widgets', false) && !trait_exists('Edit_Page_Widgets', false)) {
    class_alias('WPDevFramework\\\\Admin_Pages\\\\Edit_Page_Widgets', 'Edit_Page_Widgets');
}

if (!function_exists('wpdev_register_module_admin_pages')) {
    $wpdev_closure_fn_managers = __DIR__ . '/modules/core/src/functions-module-managers.php';
    if (file_exists($wpdev_closure_fn_managers)) {
        require_once $wpdev_closure_fn_managers;
    }
}

if (class_exists('WPDevFramework\\\\List_Tables\\\\Base_List_Table', false) && !class_exists('WPDev\\\\List_Tables\\\\Base_List_Table', false)) {
    class_alias('WPDevFramework\\\\List_Tables\\\\Base_List_Table', 'WPDev\\\\List_Tables\\\\Base_List_Table');
}

spl_autoload_register(function ($class) {
    // Admin Pages
    if (0 === strpos($class, 'WPDevFramework\\\\Admin_Pages\\\\') || 0 === strpos($class, 'WPDev\\\\Admin_Pages\\\\')) {
        $trait_w = __DIR__ . '/modules/metabox-builder/src/admin/trait-edit-page-widgets.php';
        if (file_exists($trait_w) && !trait_exists('WPDevFramework\\\\Admin_Pages\\\\Edit_Page_Widgets', false)) {
            require_once $trait_w;
        }
        $trait_e = __DIR__ . '/modules/admin-page-builder/src/admin/trait-edit-object-page.php';
        if (file_exists($trait_e) && !trait_exists('WPDevFramework\\\\Admin_Pages\\\\Edit_Object_Page', false)) {
            require_once $trait_e;
        }
        $base_p = __DIR__ . '/modules/admin-page-builder/src/admin/class-base-admin-page.php';
        if (file_exists($base_p) && !class_exists('WPDevFramework\\\\Admin_Pages\\\\Base_Admin_Page', false)) {
            require_once $base_p;
        }
        $basename = basename(str_replace('\\\\', '/', $class));
        $f = __DIR__ . '/modules/admin-page-builder/src/admin/class-' . strtolower(str_replace('_', '-', $basename)) . '.php';
        if (file_exists($f)) {
            require_once $f;
            if (!class_exists($class, false) && !interface_exists($class, false)) {
                $alt = 0 === strpos($class, 'WPDev\\\\') ? 'WPDevFramework\\\\' . substr($class, 6) : 'WPDev\\\\' . substr($class, 15);
                if (class_exists($alt, false)) {
                    class_alias($alt, $class);
                }
            }
            return;
        }
        $f_setting = __DIR__ . '/modules/admin-setting-page/src/class-' . strtolower(str_replace('_', '-', $basename)) . '.php';
        if (file_exists($f_setting)) {
            require_once $f_setting;
            return;
        }
    }

    // List Tables
    if (0 === strpos($class, 'WPDevFramework\\\\List_Tables\\\\') || 0 === strpos($class, 'WPDev\\\\List_Tables\\\\') || 0 === strpos($class, 'WPDevFramework\\\\Table_Builder\\\\')) {
        if (!class_exists('WP_List_Table', false) && defined('ABSPATH')) {
            if (file_exists(ABSPATH . 'wp-admin/includes/template.php')) {
                require_once ABSPATH . 'wp-admin/includes/template.php';
            }
            if (file_exists(ABSPATH . 'wp-admin/includes/screen.php')) {
                require_once ABSPATH . 'wp-admin/includes/screen.php';
            }
            if (file_exists(ABSPATH . 'wp-admin/includes/class-wp-list-table.php')) {
                require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
            }
        }
        $basename = basename(str_replace('\\\\', '/', $class));
        $f = __DIR__ . '/modules/table-builder/src/table/class-' . strtolower(str_replace('_', '-', $basename)) . '.php';
        if (file_exists($f)) {
            require_once $f;
            if (!class_exists($class, false) && !interface_exists($class, false)) {
                $alt = 0 === strpos($class, 'WPDev\\\\') ? 'WPDevFramework\\\\' . substr($class, 6) : 'WPDev\\\\' . substr($class, 15);
                if (class_exists($alt, false)) {
                    class_alias($alt, $class);
                }
            }
            return;
        }
    }

    // Database Engine & BerlinDB
    if (0 === strpos($class, 'WPDevFramework\\\\Database\\\\Engine\\\\') || 0 === strpos($class, 'WPDev\\\\Dependencies\\\\BerlinDB\\\\Database\\\\') || 0 === strpos($class, 'BerlinDB\\\\Database\\\\')) {
        $basename = basename(str_replace('\\\\', '/', $class));
        $engine_file = __DIR__ . '/modules/core/src/Database/engine/class-' . strtolower(str_replace('_', '-', $basename)) . '.php';
        if (file_exists($engine_file)) {
            require_once $engine_file;
            return;
        }
        $berlin_file = __DIR__ . '/modules/core/dependencies/berlindb/core/src/Database/' . $basename . '.php';
        if (file_exists($berlin_file)) {
            require_once $berlin_file;
            return;
        }
        $query_file = __DIR__ . '/modules/core/dependencies/berlindb/core/src/Database/Queries/' . $basename . '.php';
        if (file_exists($query_file)) {
            require_once $query_file;
            return;
        }
    }

    // Settings Panel Builder
    if (0 === strpos($class, 'WPDevFramework\\\\Settings_Panel_Builder\\\\') || 0 === strpos($class, 'WPDev\\\\Settings_Panel_Builder\\\\')) {
        $basename = basename(str_replace('\\\\', '/', $class));
        $f = __DIR__ . '/modules/settings-panel-builder/src/class-' . strtolower(str_replace('_', '-', $basename)) . '.php';
        if (file_exists($f)) {
            require_once $f;
            return;
        }
    }

    // Field Builder
    if (0 === strpos($class, 'WPDevFramework\\\\Field_Builder\\\\') || 0 === strpos($class, 'WPDev\\\\Field_Builder\\\\')) {
        $basename = basename(str_replace('\\\\', '/', $class));
        $f = __DIR__ . '/modules/field-builder/src/field/class-' . strtolower(str_replace('_', '-', $basename)) . '.php';
        if (file_exists($f)) {
            require_once $f;
            return;
        }
    }

    // Form Builder
    if (0 === strpos($class, 'WPDevFramework\\\\Form_Builder\\\\') || 0 === strpos($class, 'WPDev\\\\Form_Builder\\\\')) {
        $basename = basename(str_replace('\\\\', '/', $class));
        $f = __DIR__ . '/modules/form-builder/src/form/class-' . strtolower(str_replace('_', '-', $basename)) . '.php';
        if (file_exists($f)) {
            require_once $f;
            return;
        }
    }
}, true, true);

if (!function_exists('wpdev_path')) {
    function wpdev_path($dir = '') {
        if ('views' === $dir || 'views/' === $dir || (is_string($dir) && 0 === strpos($dir, 'views/'))) {
            $sub = ltrim(substr((string)$dir, 5), '/');
            return __DIR__ . '/views' . ($sub !== '' ? '/' . $sub : '');
        }
        return defined('WPDEV_PLUGIN_DIR') ? WPDEV_PLUGIN_DIR . $dir : dirname(__DIR__) . '/' . ltrim((string)$dir, '/');
    }
}

if (!function_exists('wpdev_url')) {
    function wpdev_url($dir = '') {
        return defined('WPDEV_PLUGIN_URL') ? apply_filters('wpdev_url', WPDEV_PLUGIN_URL . $dir) : plugins_url(ltrim((string)$dir, '/'), __FILE__);
    }
}

if (!function_exists('wpdev_require_public_function')) {
    function wpdev_require_public_function($basename) {
        $local = __DIR__ . "/functions/{$basename}.php";
        if (file_exists($local)) {
            require_once $local;
        }
        return true;
    }
}

if (!function_exists('wpdev_services')) {
    function wpdev_services($id = null) {
        if (class_exists('\\WPDevFramework\\Core\\Service_Registry')) {
            return null === $id ? \\WPDevFramework\\Core\\Service_Registry::all() : \\WPDevFramework\\Core\\Service_Registry::get($id);
        }
        return null;
    }
}

if (!function_exists('wpdev_register_table')) {
    function wpdev_register_table($table) {
        if (class_exists('\\WPDevFramework\\Core\\Table_Registry')) {
            \\WPDevFramework\\Core\\Table_Registry::register($table);
        }
    }
}

if (!function_exists('wpdev_get_table')) {
    function wpdev_get_table($name) {
        if (class_exists('\\WPDevFramework\\Core\\Table_Registry')) {
            return \\WPDevFramework\\Core\\Table_Registry::get($name);
        }
        return null;
    }
}

if (!function_exists('wpdev_kses_data')) {
    function wpdev_kses_data($data) {
        if (function_exists('wp_kses_data')) {
            return wp_kses_data($data);
        }
        return $data;
    }
}

if (!function_exists('wpdev_get_isset')) {
    function wpdev_get_isset($arr, $key, $default = null) {
        return is_array($arr) && isset($arr[$key]) ? $arr[$key] : $default;
    }
}

if (!function_exists('wpdev_request')) {
    function wpdev_request($key, $default = false) {
        $value = isset($_REQUEST[$key]) ? (function_exists('stripslashes_deep') ? stripslashes_deep($_REQUEST[$key]) : $_REQUEST[$key]) : $default;
        return function_exists('apply_filters') ? apply_filters('wpdev_request', $value, $key, $default) : $value;
    }
}

// Load all inlined function definitions from functions/ directory
$closure_funcs = glob(__DIR__ . '/functions/*.php');
if (is_array($closure_funcs)) {
    foreach ($closure_funcs as $f) {
        require_once $f;
    }
}

// Preload foundational framework traits and core registries
$core_preload = [
    __DIR__ . '/trait-singleton.php',
    __DIR__ . '/trait-delegates-component-registry.php',
    __DIR__ . '/trait-wpdev-settings-deprecated.php',
    __DIR__ . '/trait-wpdev-deprecated.php',
    __DIR__ . '/class-registry-base.php',
    __DIR__ . '/class-settings-storage.php',
    __DIR__ . '/class-settings-section-registry.php',
    __DIR__ . '/class-settings.php',
    __DIR__ . '/class-table-registry.php',
    __DIR__ . '/class-service-registry.php',
    __DIR__ . '/class-bounded-view-root-registry.php',
    __DIR__ . '/class-module-view-registry.php',
];
foreach ($core_preload as $file) {
    if (file_exists($file)) {
        require_once $file;
    }
}

if (class_exists('\\WPDevFramework\\Core\\Bounded_View_Root_Registry')) {
    \\WPDevFramework\\Core\\Bounded_View_Root_Registry::register('closure-views', __DIR__ . '/views', 'internal-private');
}
if (class_exists('\\WPDevFramework\\Core\\Module_View_Registry')) {
    \\WPDevFramework\\Core\\Module_View_Registry::register('closure-root', __DIR__ . '/views');
}

if (!function_exists('wpdev_get_version')) {
    function wpdev_get_version() {
        return defined('WPDEV_VERSION') ? WPDEV_VERSION : '2.10.0';
    }
}

if (!function_exists('wpdev_boot_closure_lifecycle')) {
    function wpdev_boot_closure_lifecycle() {
        if (!did_action('wpdev_load')) {
            do_action('wpdev_load');
        }
        if (!did_action('wpdev_admin_pages')) {
            do_action('wpdev_admin_pages');
        }
    }
    if (function_exists('add_action')) {
        add_action('plugins_loaded', 'wpdev_boot_closure_lifecycle', 20);
        add_action('init', function() {
            wpdev_boot_closure_lifecycle();
            if (function_exists('wp_script_is') && class_exists('\\WPDevFramework\\Scripts')) {
                \\WPDevFramework\\Scripts::ensure_defaults_registered();
            }
        }, 1);
        add_action('admin_enqueue_scripts', function() {
            if (function_exists('wp_script_is') && class_exists('\\WPDevFramework\\Scripts')) {
                \\WPDevFramework\\Scripts::ensure_defaults_registered();
            }
        }, 1);
        if (function_exists('did_action') && did_action('init') > 0) {
            wpdev_boot_closure_lifecycle();
            if (function_exists('wp_script_is') && class_exists('\\WPDevFramework\\Scripts')) {
                \\WPDevFramework\\Scripts::ensure_defaults_registered();
            }
        }
    }
}
`;
  await writeFile(path.join(targetDir, "functions-closure.php"), helperCode, "utf8");

  // Copy all view templates into src/FrameworkClosure/views/
  const viewsDir = path.join(targetDir, "views");
  await mkdir(viewsDir, { recursive: true });

  async function copyDirRecursive(src, dest, baseSrcDir) {
    if (!fs.existsSync(src)) return;
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "Thumbs.db") continue;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyDirRecursive(srcPath, destPath, baseSrcDir);
      } else if (entry.isFile()) {
        await safeCopyFile(srcPath, destPath);
      }
    }
  }

  for (const relDir of REQUIRED_WPDEV_VIEW_DIRS) {
    const srcDir = path.join(wpdevPluginDir, relDir);
    await copyDirRecursive(srcDir, viewsDir, srcDir);
  }

  // Copy all assets into src/FrameworkClosure/assets/
  const assetsDir = path.join(targetDir, "assets");
  await mkdir(assetsDir, { recursive: true });

  for (const relDir of REQUIRED_WPDEV_ASSET_DIRS) {
    const srcDir = path.join(wpdevPluginDir, relDir);
    await copyDirRecursive(srcDir, assetsDir, srcDir);
  }

  // Copy packages/framework/src/ into src/FrameworkClosure/Core/
  const devPackagesSrc = path.join(contentRoot, "plugins", `${consumer}-dev`, "packages/framework/src");
  const fallbackFrameworkSrc = path.resolve(scriptDir, "../framework/src");
  const frameworkSrcToCopy = fs.existsSync(devPackagesSrc)
    ? devPackagesSrc
    : (fs.existsSync(fallbackFrameworkSrc) ? fallbackFrameworkSrc : null);
  const coreDestDir = path.join(targetDir, "Core");
  if (frameworkSrcToCopy) {
    await copyDirRecursive(frameworkSrcToCopy, coreDestDir, frameworkSrcToCopy);
  }

  // Scope framework core to consumer namespace
  const { consumerNs } = await scopeFrameworkCoreForConsumer(coreDestDir, stagingPlugin, consumer);

  // Write inlined files manifest
  const manifestData = {
    consumer,
    totalFiles: inlinedManifest.length,
    manifestDigest: crypto.createHash("sha256").update(JSON.stringify(inlinedManifest)).digest("hex"),
    files: inlinedManifest
  };
  await writeFile(
    path.join(targetDir, "inlined-files-manifest.json"),
    JSON.stringify(manifestData, null, 2),
    "utf8"
  );

  // Update composer.json in staging to autoload functions-closure.php and Core classes
  const composerJsonPath = path.join(stagingPlugin, "composer.json");
  let composerData = {};
  if (fs.existsSync(composerJsonPath)) {
    try {
      composerData = JSON.parse(await readFile(composerJsonPath, "utf8"));
    } catch {
      // Ignored if composer.json parsing fails
    }
  }
  composerData.autoload = composerData.autoload || {};
  composerData.autoload.files = composerData.autoload.files || [];
  if (!composerData.autoload.files.includes("src/FrameworkClosure/functions-closure.php")) {
    composerData.autoload.files.unshift("src/FrameworkClosure/functions-closure.php");
  }
  composerData.autoload["psr-4"] = composerData.autoload["psr-4"] || {};
  composerData.autoload["psr-4"][`${consumerNs}\\\\Core\\\\`] = "src/FrameworkClosure/Core/Core/";
  composerData.autoload["psr-4"]["WPDev\\\\"] = "src/FrameworkClosure/Core/";
  await writeFile(composerJsonPath, JSON.stringify(composerData, null, 2), "utf8");

  return { inlinedFiles: inlinedCount, manifestDigest: manifestData.manifestDigest };
}

export async function scopeFrameworkCoreForConsumer(coreDestDir, stagingPlugin, consumer) {
  const CONSUMER_NAMESPACES = {
    "drm-connector": "DRMConnector",
    "tavangary-core": "TavangaryCore",
    "tavangary-theme-panel": "TavangaryThemePanel",
    "wpdev-analytics": "WpdevAnalytics",
    "wpdev-crm": "WpdevCrm",
    "wpdev-tickets": "WpdevTickets",
    "wpdev-woo-persian": "WpdevWooPersian",
  };
  const consumerNs = CONSUMER_NAMESPACES[consumer] || consumer
    .replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, c => c.toUpperCase());

  // 1. Process Core/Plugin.php in coreDestDir
  const pluginPhp = path.join(coreDestDir, "Core/Plugin.php");
  if (fs.existsSync(pluginPhp)) {
    let content = await readFile(pluginPhp, "utf8");
    content = content.replace(/namespace\s+WPDev\\Core\s*;/g, `namespace ${consumerNs}\\Core;`);
    if (!content.includes("'WPDev\\Core\\Plugin'")) {
      content += `\nif ( ! \\class_exists( 'WPDev\\\\Core\\\\Plugin', false ) ) {\n    \\class_alias( Plugin::class, 'WPDev\\\\Core\\\\Plugin' );\n}\n`;
    }
    await writeFile(pluginPhp, content, "utf8");
  }

  // 2. Process Core/ModuleLoader.php in coreDestDir
  const loaderPhp = path.join(coreDestDir, "Core/ModuleLoader.php");
  if (fs.existsSync(loaderPhp)) {
    let content = await readFile(loaderPhp, "utf8");
    content = content.replace(/namespace\s+WPDev\\Core\s*;/g, `namespace ${consumerNs}\\Core;`);
    content = content.replace(/public\s+function\s+register\(\s*ModuleInterface\s+\$module\s*\)/g, "public function register( object $module )");
    if (!content.includes("'WPDev\\Core\\ModuleLoader'")) {
      content += `\nif ( ! \\class_exists( 'WPDev\\\\Core\\\\ModuleLoader', false ) ) {\n    \\class_alias( ModuleLoader::class, 'WPDev\\\\Core\\\\ModuleLoader' );\n}\n`;
    }
    await writeFile(loaderPhp, content, "utf8");
  }

  // 3. Process Core/AbstractModule.php
  const absModulePhp = path.join(coreDestDir, "Core/AbstractModule.php");
  if (fs.existsSync(absModulePhp)) {
    let content = await readFile(absModulePhp, "utf8");
    content = content.replace(/namespace\s+WPDev\\Core\s*;/g, `namespace ${consumerNs}\\Core;`);
    if (!content.includes("'WPDev\\Core\\AbstractModule'")) {
      content += `\nif ( ! \\class_exists( 'WPDev\\\\Core\\\\AbstractModule', false ) ) {\n    \\class_alias( AbstractModule::class, 'WPDev\\\\Core\\\\AbstractModule' );\n}\n`;
    }
    await writeFile(absModulePhp, content, "utf8");
  }

  // 4. Process Core/ModuleInterface.php
  const modInterfacePhp = path.join(coreDestDir, "Core/ModuleInterface.php");
  if (fs.existsSync(modInterfacePhp)) {
    let content = await readFile(modInterfacePhp, "utf8");
    content = content.replace(/namespace\s+WPDev\\Core\s*;/g, `namespace ${consumerNs}\\Core;`);
    if (!content.includes("'WPDev\\Core\\ModuleInterface'")) {
      content += `\nif ( ! \\interface_exists( 'WPDev\\\\Core\\\\ModuleInterface', false ) ) {\n    \\class_alias( ModuleInterface::class, 'WPDev\\\\Core\\\\ModuleInterface' );\n}\n`;
    }
    await writeFile(modInterfacePhp, content, "utf8");
  }

  // 5. Rewrite bare WPDev\Core\Plugin in staging files outside FrameworkClosure/Core
  async function rewriteBarePluginRefs(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "vendor" || entry.name === "vendor-prefixed") continue;
        if (full === coreDestDir) continue;
        await rewriteBarePluginRefs(full);
      } else if (entry.isFile() && entry.name.endsWith(".php")) {
        let code = await readFile(full, "utf8");
        let modified = false;
        if (/use\s+WPDev\\Core\\Plugin(\s*;|\s+as)/.test(code)) {
          code = code.replace(/use\s+WPDev\\Core\\Plugin(\s*;|\s+as)/g, `use ${consumerNs}\\Core\\Plugin$1`);
          modified = true;
        }
        if (code.includes("\\WPDev\\Core\\Plugin::") && !code.includes(`\\${consumerNs}\\Core\\Plugin::`)) {
          code = code.replace(/\\WPDev\\Core\\Plugin::/g, `\\${consumerNs}\\Core\\Plugin::`);
          modified = true;
        }
        if (modified) {
          await writeFile(full, code, "utf8");
        }
      }
    }
  }
  await rewriteBarePluginRefs(stagingPlugin);

  return { consumerNs };
}

export async function minifyAssetsInTree(dir, contentRoot = "") {
  let minifiedCount = 0;
  const filesToMinify = [];

  const baseRoot = contentRoot || process.cwd();
  const esbuildModulePath = [
    path.join(baseRoot, "plugins/tavangary-core-dev/node_modules/esbuild/lib/main.js"),
    path.join(baseRoot, "plugins/wpdev-crm-dev/node_modules/esbuild/lib/main.js"),
    path.join(baseRoot, "plugins/wpdev-tickets-dev/node_modules/esbuild/lib/main.js"),
  ].find(p => fs.existsSync(p));

  let esbuild = null;
  if (esbuildModulePath) {
    try {
      esbuild = await import(esbuildModulePath);
    } catch {}
  }

  const localEsbuildBin = [
    path.join(baseRoot, "plugins/tavangary-core-dev/node_modules/.bin/esbuild"),
    path.join(baseRoot, "plugins/wpdev-crm-dev/node_modules/.bin/esbuild"),
    path.join(baseRoot, "plugins/wpdev-tickets-dev/node_modules/.bin/esbuild"),
  ].find(p => fs.existsSync(p));

  if (!esbuild && !localEsbuildBin) {
    throw new Error(`esbuild binary/module not found in dev plugins node_modules (searched under ${baseRoot})`);
  }

  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(full);
      } else if (entry.isFile()) {
        const name = entry.name.toLowerCase();
        if (name.endsWith(".js") || name.endsWith(".css")) {
          filesToMinify.push(full);
        }
      }
    }
  }

  await visit(dir);

  if (esbuild && typeof esbuild.transform === "function") {
    await Promise.all(
      filesToMinify.map(async (file) => {
        const ext = file.endsWith(".js") ? "js" : "css";
        const content = await readFile(file, "utf8");
        try {
          const res = await esbuild.transform(content, { minify: true, loader: ext });
          await writeFile(file, res.code, "utf8");
          minifiedCount++;
        } catch (err) {
          throw new Error(`In-process asset minification failed for ${file}:\n${err.message}`);
        }
      })
    );
  } else {
    await Promise.all(
      filesToMinify.map(async (file) => {
        try {
          await execFileAsync(localEsbuildBin, [
            file,
            "--minify",
            "--allow-overwrite",
            `--outfile=${file}`,
          ]);
          minifiedCount++;
        } catch (err) {
          throw new Error(`Asset minification failed for ${file} with esbuild:\n${err.message}\n${err.stderr || ""}`);
        }
      })
    );
  }

  return { totalAssets: filesToMinify.length, minifiedAssets: minifiedCount };
}
