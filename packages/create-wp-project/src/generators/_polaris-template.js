/**
 * Polaris Stack template mirror.
 *
 * Reads source from packages/polaris-stack/src/ at generation time so
 * generated projects stay in sync with the self-contained package.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  resolveEngineSrcDir,
  resolveKitPackageSrc,
} from "../resolve-kit-paths.js";

function polarisSrcRoot() {
  const viaKit = resolveKitPackageSrc(
    "polaris-stack",
    path.join("theme", "tokens.css"),
  );
  if (viaKit) return viaKit;

  const srcDir = resolveEngineSrcDir();
  const candidates = [
    path.join(path.dirname(path.dirname(srcDir)), "polaris-stack", "src"),
    path.join(
      path.dirname(path.dirname(path.dirname(srcDir))),
      "polaris-stack",
      "src",
    ),
    path.join(process.cwd(), "packages/polaris-stack/src"),
  ];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "theme", "tokens.css"))) {
      return candidate;
    }
  }
  throw new Error(
    "Polaris Stack source not found. Expected packages/polaris-stack/src beside create-wp-project.",
  );
}

function walkDir(dir, base = dir) {
  /** @type {Record<string, string>} */
  const files = {};
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      Object.assign(files, walkDir(full, base));
      continue;
    }
    if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) continue;
    const rel = path.relative(base, full).replace(/\\/g, "/");
    files[rel] = readFileSync(full, "utf8");
  }
  return files;
}

/**
 * @param {object} _ctx
 * @returns {Record<string, string>}
 */
export function polarisFiles(_ctx) {
  const files = walkDir(polarisSrcRoot());
  files["index.ts"] = [
    'export * from "./theme";',
    'export * from "./layout";',
    'export * from "./components";',
    "",
  ].join("\n");
  files["styles.css"] = [
    "/* Polaris Stack global styles */",
    files["theme/tokens.css"],
    files["theme/themes.css"],
    files["theme/base.css"],
    files["layout/layout.css"],
    files["components/components.css"],
    "",
  ].join("\n");
  return files;
}

/**
 * Frontend view entry (Preact h — no JSX so .ts works without extra config).
 * Mounts on [data-polaris-demo] nodes from the framework shortcode.
 *
 * @param {object} ctx
 * @returns {string}
 */
export function polarisDemoViewEntry(ctx) {
  const framework = ctx.features?.["jsLib"] === "react" ? "react" : "preact";
  return `/**
 * Frontend Polaris demo — shortcode mount points [data-polaris-demo].
 */
// uiFramework: ${framework}
import { h, render } from "preact";
import "../../../../polaris/styles.css";
import {
  Button,
  Card,
  Heading,
  Stack,
  Text,
  Badge,
  setPolarisTheme,
} from "../../../../polaris";

setPolarisTheme("system");

function PolarisDemoApp() {
  return h(Stack, { gap: "4" }, [
    h(Card, null, [
      h(Heading, null, "Polaris Stack (frontend)"),
      h(
        Text,
        null,
        "Dummy Preact UI via framework ShortcodesSetup shortcode.",
      ),
      h(Stack, { gap: "2" }, [
        h(Badge, null, "sample"),
        h(Badge, null, "preact"),
        h(Badge, null, "polaris"),
      ]),
      h(Stack, { gap: "2" }, [
        h(Button, { onClick: () => setPolarisTheme("dark") }, "Dark theme"),
        h(
          Button,
          { variant: "ghost", onClick: () => setPolarisTheme("light") },
          "Light theme",
        ),
        h(
          Button,
          { variant: "ghost", onClick: () => setPolarisTheme("system") },
          "System",
        ),
      ]),
    ]),
    h(Card, null, [
      h(Heading, { as: "h3" }, "Fake stats"),
      h(Text, null, "Items: 12 · Active: yes"),
    ]),
  ]);
}

function mountAll() {
  document.querySelectorAll("[data-polaris-demo]").forEach((el, index) => {
    if (!el.id) {
      el.id = "polaris-demo-root-" + index;
    }
    render(h(PolarisDemoApp, null), el);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountAll);
} else {
  mountAll();
}

export {};
`;
}

/**
 * @deprecated use polarisDemoViewEntry — kept for any external callers
 */
export function polarisDemoEntry(ctx) {
  return polarisDemoViewEntry(ctx);
}

/**
 * PHP module: registers shortcode via ShortcodesSetup + frontend assets.
 * Placeholders: {{vendor}}, {{slug}}, {{slug_underscore}}, {{slug_constant}}, {{textDomain}}
 */
export const POLARIS_DEMO_MODULE_PHP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\PolarisDemo;

use {{vendor}}\\Modules\\PolarisDemo\\Shortcodes\\DemoShortcode;
use {{frameworkNamespace}}\\Core\\AbstractModule;
use {{frameworkNamespace}}\\Support\\Assets;
use {{frameworkNamespace}}\\Support\\Shortcodes\\ShortcodesSetup;

/**
 * Frontend Polaris demo via framework ShortcodesSetup (not add_shortcode).
 *
 * Shortcode: [{{slug_underscore}}_demo]
 */
final class Module extends AbstractModule
{
    public const SHORTCODE = '{{slug_underscore}}_demo';
    public const SCRIPT_HANDLE = 'polaris-demo-view';
    public const STYLE_HANDLE = 'polaris-demo-view-style';
    public const JS_REL = 'assets/bundles/PolarisDemo-view.js';
    public const CSS_REL = 'assets/bundles/PolarisDemo-view.css';

    /** @var bool */
    private static $enqueue_requested = false;

    public function get_slug(): string
    {
        return 'polaris-demo';
    }

    public function boot(): void
    {
        ShortcodesSetup::register(self::SHORTCODE, DemoShortcode::class);

        add_action('wp_enqueue_scripts', [$this, 'register_assets']);
        add_action('wp_footer', [$this, 'maybe_print_assets'], 1);
    }

    public static function request_enqueue(): void
    {
        self::$enqueue_requested = true;
        if (function_exists('did_action') && did_action('wp_enqueue_scripts')) {
            (new self())->enqueue_view_assets();
        }
    }

    public function register_assets(): void
    {
        if (!class_exists(Assets::class)) {
            return;
        }

        $js = $this->abs(self::JS_REL);
        $css = $this->abs(self::CSS_REL);

        if (is_readable($js)) {
            Assets::register_bundle_script(self::SCRIPT_HANDLE, $js);
        }
        if (is_readable($css)) {
            $info = Assets::asset_info($css);
            $ver = $info['hash'] ?? false;
            $url = plugins_url(self::CSS_REL, $this->plugin_file());
            wp_register_style(self::STYLE_HANDLE, $url, [], $ver);
        }

        if ($this->content_has_shortcode() || self::$enqueue_requested) {
            self::$enqueue_requested = true;
            $this->enqueue_view_assets();
        }
    }

    public function maybe_print_assets(): void
    {
        if (self::$enqueue_requested) {
            $this->enqueue_view_assets();
        }
    }

    private function enqueue_view_assets(): void
    {
        if (!class_exists(Assets::class)) {
            return;
        }

        $js = $this->abs(self::JS_REL);
        $css = $this->abs(self::CSS_REL);

        if (is_readable($js)) {
            if (!wp_script_is(self::SCRIPT_HANDLE, 'registered')) {
                Assets::register_bundle_script(self::SCRIPT_HANDLE, $js);
            }
            Assets::enqueue_bundle_script(self::SCRIPT_HANDLE);
        }

        if (is_readable($css)) {
            if (!wp_style_is(self::STYLE_HANDLE, 'registered')) {
                $info = Assets::asset_info($css);
                $ver = $info['hash'] ?? false;
                $url = plugins_url(self::CSS_REL, $this->plugin_file());
                wp_register_style(self::STYLE_HANDLE, $url, [], $ver);
            }
            wp_enqueue_style(self::STYLE_HANDLE);
        }
    }

    private function content_has_shortcode(): bool
    {
        if (!is_singular()) {
            return false;
        }
        $post = get_post();
        if (!$post instanceof \\WP_Post) {
            return false;
        }
        return has_shortcode((string) $post->post_content, self::SHORTCODE);
    }

    private function abs(string $rel): string
    {
        $root = defined('{{slug_constant}}_PLUGIN_DIR')
            ? {{slug_constant}}_PLUGIN_DIR
            : plugin_dir_path($this->plugin_file());
        return rtrim($root, '/\\\\') . '/' . ltrim($rel, '/');
    }

    private function plugin_file(): string
    {
        return defined('{{slug_constant}}_PLUGIN_FILE')
            ? {{slug_constant}}_PLUGIN_FILE
            : dirname(__DIR__, 3) . '/{{slug}}.php';
    }
}
`;

export const POLARIS_DEMO_SHORTCODE_PHP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\PolarisDemo\\Shortcodes;

use {{vendor}}\\Modules\\PolarisDemo\\Module;
use {{frameworkNamespace}}\\Support\\Shortcodes\\Shortcode;

/**
 * Frontend shortcode [{{slug_underscore}}_demo] — mounts Preact + Polaris UI.
 * Registered via ShortcodesSetup (not add_shortcode).
 */
final class DemoShortcode extends Shortcode
{
    /**
     * @return array<string, string>
     */
    public function default_attributes(): array
    {
        return [
            'label' => '',
        ];
    }

    public function render_shortcode(array $attributes, string $content, string $tag): string
    {
        Module::request_enqueue();

        $label = sanitize_text_field((string) ($attributes['label'] ?? ''));
        $id = 'polaris-demo-root-' . wp_unique_id();

        return sprintf(
            '<div class="polaris-demo-mount" id="%1$s" data-polaris-demo="1" data-label="%2$s"></div>',
            esc_attr($id),
            esc_attr($label)
        );
    }
}
`;

export const POLARIS_DEMO_REGISTER_PHP = `<?php
declare(strict_types=1);

/**
 * Register PolarisDemo module with the kit ModuleLoader.
 */

use {{vendor}}\\Modules\\PolarisDemo\\Module as PolarisDemoModule;
use {{frameworkNamespace}}\\Core\\Plugin;

if (!function_exists('{{slug_underscore}}_register_polaris_demo')) {
    /**
     * @return void
     */
    function {{slug_underscore}}_register_polaris_demo(): void
    {
        Plugin::loader()->register(new PolarisDemoModule());
    }
}

add_action('plugins_loaded', '{{slug_underscore}}_register_polaris_demo', 5);
`;
