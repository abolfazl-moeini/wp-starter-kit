import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  scaffoldProject,
  validateAnswers,
  renderTemplate,
  answersToProjectConfig,
} from '../../packages/create-wp-project/src/index.js';

describe('@wpsk/create-wp-project', () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wpsk-scaffold-'));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  /* -------------------------------------------------------------------- */
  /* validateAnswers                                                      */
  /* -------------------------------------------------------------------- */

  describe('validateAnswers', () => {
    test('accepts a fully populated answer set', () => {
      const ok = validateAnswers({
        slug: 'my-project',
        npmScope: 'myorg',
        globalName: 'MyProject',
        localizeVar: 'MyProjectLoc',
        textDomain: 'my-project',
        hookPrefix: 'my-project',
        depsBundle: 'my-project-deps.js',
        phpFunctionPrefix: 'myprj_',
        uiFramework: 'preact',
      });
      expect(ok).toEqual({ ok: true, errors: {} });
    });

    test('rejects empty slug / npmScope / globalName / textDomain / hookPrefix', () => {
      const r = validateAnswers({
        slug: '',
        npmScope: '',
        globalName: '',
        localizeVar: '',
        textDomain: '',
        hookPrefix: '',
        depsBundle: 'x.js',
        phpFunctionPrefix: 'x_',
        uiFramework: 'preact',
      });
      expect(r.ok).toBe(false);
      expect(Object.keys(r.errors).sort()).toEqual(
        ['globalName', 'hookPrefix', 'npmScope', 'slug', 'textDomain'].sort()
      );
    });

    test('rejects slug with spaces or uppercase', () => {
      const r = validateAnswers({
        slug: 'My Project',
        npmScope: 'org',
        globalName: 'G',
        localizeVar: 'GLoc',
        textDomain: 'tp',
        hookPrefix: 'tp',
        depsBundle: 'x.js',
        phpFunctionPrefix: 'x_',
        uiFramework: 'preact',
      });
      expect(r.ok).toBe(false);
      expect(r.errors.slug).toBeDefined();
    });

    test('rejects uiFramework other than preact|react', () => {
      const r = validateAnswers({
        slug: 'p',
        npmScope: 'o',
        globalName: 'P',
        localizeVar: 'PLoc',
        textDomain: 't',
        hookPrefix: 't',
        depsBundle: 'x.js',
        phpFunctionPrefix: 'p_',
        uiFramework: 'svelte',
      });
      expect(r.ok).toBe(false);
      expect(r.errors.uiFramework).toBeDefined();
    });
  });

  /* -------------------------------------------------------------------- */
  /* answersToProjectConfig                                              */
  /* -------------------------------------------------------------------- */

  describe('answersToProjectConfig', () => {
    test('returns the canonical project.config.json shape', () => {
      const cfg = answersToProjectConfig({
        slug: 'my-project',
        npmScope: 'myorg',
        globalName: 'MyProject',
        localizeVar: 'MyProjectLoc',
        textDomain: 'my-project',
        hookPrefix: 'my-project',
        depsBundle: 'my-project-deps.js',
        phpFunctionPrefix: 'myprj_',
        uiFramework: 'preact',
      });
      expect(cfg).toEqual({
        slug: 'my-project',
        globalName: 'MyProject',
        localizeVar: 'MyProjectLoc',
        textDomain: 'my-project',
        hookPrefix: 'my-project',
        npmScope: '@myorg',
        depsBundle: 'my-project-deps.js',
        phpFunctionPrefix: 'myprj_',
        uiFramework: 'preact',
        projectType: 'plugin',
        restNamespace: 'wpsk/v1',
        vendorPrefix: 'WpskVendor',
        phpMinVersion: '7.4',
        phpSourceVersion: '8.1',
        batchEndpoint: '/batch/v1',
      });
    });

    test('infers localizeVar from globalName when omitted', () => {
      const cfg = answersToProjectConfig({
        slug: 'p',
        npmScope: 'o',
        globalName: 'MyProject',
        // localizeVar omitted
        textDomain: 'p',
        hookPrefix: 'p',
        depsBundle: 'p-deps.js',
        phpFunctionPrefix: 'p_',
        uiFramework: 'preact',
      });
      expect(cfg.localizeVar).toBe('MyProjectLoc');
    });

    test('infers depsBundle from slug when omitted', () => {
      const cfg = answersToProjectConfig({
        slug: 'my-project',
        npmScope: 'o',
        globalName: 'G',
        localizeVar: 'GLoc',
        textDomain: 't',
        hookPrefix: 't',
        // depsBundle omitted
        phpFunctionPrefix: 'p_',
        uiFramework: 'preact',
      });
      expect(cfg.depsBundle).toBe('my-project-deps.js');
    });
  });

  /* -------------------------------------------------------------------- */
  /* renderTemplate (substitution)                                       */
  /* -------------------------------------------------------------------- */

  describe('renderTemplate', () => {
    test('substitutes {{token}} placeholders with answers', () => {
      const out = renderTemplate(
        '// {{globalName}} — deps: {{depsBundle}}',
        { globalName: 'G', depsBundle: 'g.js' }
      );
      expect(out).toBe('// G — deps: g.js');
    });

    test('leaves unknown placeholders verbatim (so missing config is loud)', () => {
      const out = renderTemplate(
        'hello {{unknown}}',
        { globalName: 'G' }
      );
      expect(out).toBe('hello {{unknown}}');
    });
  });

  /* -------------------------------------------------------------------- */
  /* scaffoldProject (file system output)                                */
  /* -------------------------------------------------------------------- */

  describe('scaffoldProject', () => {
    const goodAnswers = {
      slug: 'my-project',
      npmScope: 'myorg',
      globalName: 'MyProject',
      localizeVar: 'MyProjectLoc',
      textDomain: 'my-project',
      hookPrefix: 'my-project',
      depsBundle: 'my-project-deps.js',
      phpFunctionPrefix: 'myprj_',
      uiFramework: 'preact',
    };

    /** @type {ScaffoldAnswers} */
    const goodAnswersTyped = goodAnswers;

    test('writes project.config.json with the expected shape', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const cfg = JSON.parse(await fs.readFile(path.join(tmp, 'project.config.json'), 'utf8'));
      expect(cfg).toEqual({
        slug: 'my-project',
        globalName: 'MyProject',
        localizeVar: 'MyProjectLoc',
        textDomain: 'my-project',
        hookPrefix: 'my-project',
        npmScope: '@myorg',
        depsBundle: 'my-project-deps.js',
        phpFunctionPrefix: 'myprj_',
        uiFramework: 'preact',
        projectType: 'plugin',
        restNamespace: 'wpsk/v1',
        vendorPrefix: 'WpskVendor',
        phpMinVersion: '7.4',
        phpSourceVersion: '8.1',
        batchEndpoint: '/batch/v1',
      });
    });

    test('writes functions.php using stable wpsk_* framework asset helpers + slug-derived names for own glue', async () => {
      // Phase 11: theme bootstrap is opt-in via projectType: 'theme'.
      // The default is now 'plugin' which emits {slug}.php; this
      // test covers the legacy theme path.
      const themeAnswers = { ...goodAnswers, projectType: 'theme' };
      const res = await scaffoldProject(tmp, themeAnswers);
      expect(res.ok).toBe(true);
      const fn = await fs.readFile(path.join(tmp, 'functions.php'), 'utf8');
      // Framework asset helpers are always the stable wpsk_* names (shipped
      // once by the kit in includes/asset-functions.php or via composer).
      expect(fn).toMatch(/\bwpsk_enqueue_bundle_script\b/);
      expect(fn).toMatch(/\bwpsk_enqueue_stylesheet\b/);
      expect(fn).toMatch(/\bwpsk_get_localize_data\b/);
      // The project's own bootstrap functions are derived from slug (with _ not -)
      // and the phpFunctionPrefix is carried in project.config but the bootstrap
      // template prefers the descriptive slug_ form for the action callbacks.
      expect(fn).toMatch(/\bmy_project_setup\b/);
      expect(fn).toMatch(/\bmy_project_enqueue_assets\b/);
      // The localize var and text domain etc. are still rendered from answers.
      expect(fn).toMatch(/MyProjectLoc/);
      expect(fn).toMatch(/my-project/);
      // Phase 11 deprecation comment is present even in the legacy
      // theme-mode template.
      expect(fn).toMatch(/DEPRECATION NOTICE/i);
    });

    test('writes assets/dependencies.js with hook prefix substituted', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const dep = await fs.readFile(path.join(tmp, 'assets', 'dependencies.js'), 'utf8');
      // No leftover wpsk- action names.
      expect(dep).not.toMatch(/['"]wpsk-/);
      // The scaffolded file uses the new hook prefix.
      expect(dep).toMatch(/['"]my-project-/);
    });

    test('writes package.json with @myorg scope and preact aliases', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const pkg = JSON.parse(await fs.readFile(path.join(tmp, 'package.json'), 'utf8'));
      expect(pkg.name).toBe('@myorg/my-project');
      // For the preact path, react is aliased to @preact/compat.
      expect(pkg.dependencies?.react).toBe('npm:@preact/compat');
      expect(pkg.dependencies?.['react-dom']).toBe('npm:@preact/compat');
    });

    test('writes the README scaffold', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const readme = await fs.readFile(path.join(tmp, 'README.md'), 'utf8');
      expect(readme).toContain('my-project');
      expect(readme).toContain('MyProject');
    });

    test('writes build.config.json and default stylesheet for style hashing', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const buildConfig = JSON.parse(
        await fs.readFile(path.join(tmp, 'build.config.json'), 'utf8'),
      );
      expect(buildConfig.styleEntryPoints).toEqual(['assets/stylesheets/style.css']);
      const css = await fs.readFile(
        path.join(tmp, 'assets', 'stylesheets', 'style.css'),
        'utf8',
      );
      expect(css).toMatch(/body\s*\{/);
    });

    test('returns ok=false (does not throw) when target dir already has project.config.json', async () => {
      // Pre-populate a sentinel project.config.json
      await fs.writeFile(
        path.join(tmp, 'project.config.json'),
        '{"sentinel": true}'
      );
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/already exists/i);
      // Sentinel must not have been overwritten
      const after = await fs.readFile(path.join(tmp, 'project.config.json'), 'utf8');
      expect(after).toContain('sentinel');
    });

    test('for react uiFramework, does NOT alias react to @preact/compat', async () => {
      const reactAnswers = { ...goodAnswers, uiFramework: 'react' };
      const res = await scaffoldProject(tmp, reactAnswers);
      expect(res.ok).toBe(true);
      const pkg = JSON.parse(await fs.readFile(path.join(tmp, 'package.json'), 'utf8'));
      // Real react path: no @preact/compat alias.
      expect(pkg.dependencies?.react).not.toBe('npm:@preact/compat');
    });

    /* ------------------------------------------------------------------ */
    /* plugin mode — {slug}.php primary bootstrap (Phase 11)              */
    /* ------------------------------------------------------------------ */

    const pluginAnswers = {
      ...goodAnswers,
      projectType: 'plugin',
    };

    test('plugin mode: writes {slug}.php with WP plugin headers + Plugin::boot wiring', async () => {
      const res = await scaffoldProject(tmp, pluginAnswers);
      expect(res.ok).toBe(true);
      const pluginFile = path.join(tmp, 'my-project.php');
      const src = await fs.readFile(pluginFile, 'utf8');
      // WordPress.org plugin file headers.
      expect(src).toMatch(/Plugin Name:/);
      expect(src).toMatch(/Version:/);
      expect(src).toMatch(/Requires PHP:/);
      expect(src).toMatch(/Text Domain:/);
      // Guard + autoload + Plugin::boot.
      expect(src).toMatch(/defined\s*\(\s*['"]ABSPATH['"]\s*\)/);
      expect(src).toMatch(/require_once.*vendor\/autoload\.php/);
      // WPSK\Core\Plugin::boot can be either an add_action callback
      // (a string) or a direct call site. Either form proves the
      // plugin knows about the kit's facade.
      expect(src).toMatch(/WPSK\\Core\\Plugin::boot/);
    });

    test('plugin mode: {slug}.php includes register_(activation|deactivation|uninstall)_hook', async () => {
      const res = await scaffoldProject(tmp, pluginAnswers);
      expect(res.ok).toBe(true);
      const src = await fs.readFile(path.join(tmp, 'my-project.php'), 'utf8');
      expect(src).toMatch(/register_activation_hook\(/);
      expect(src).toMatch(/register_deactivation_hook\(/);
      expect(src).toMatch(/register_uninstall_hook\(/);
    });

    test('plugin mode: {slug}.php does NOT use get_template_directory or after_setup_theme', async () => {
      const res = await scaffoldProject(tmp, pluginAnswers);
      expect(res.ok).toBe(true);
      const src = await fs.readFile(path.join(tmp, 'my-project.php'), 'utf8');
      expect(src).not.toMatch(/get_template_directory/);
      expect(src).not.toMatch(/after_setup_theme/);
    });

    test('plugin mode: scaffold does not write functions.php as the primary bootstrap', async () => {
      const res = await scaffoldProject(tmp, pluginAnswers);
      expect(res.ok).toBe(true);
      // functions.php may or may not be written in plugin mode (it's
      // theme bootstrap and is deprecated), but it must NOT be the
      // primary plugin bootstrap — i.e. the scaffolded project must
      // contain a {slug}.php that WordPress will pick up as the
      // plugin entry, not functions.php.
      const pluginFile = path.join(tmp, 'my-project.php');
      const stat = await fs.stat(pluginFile);
      expect(stat.isFile()).toBe(true);
      const writtenList = res.written || [];
      expect(writtenList).toContain('my-project.php');
    });

    test('plugin mode: scaffoldProject written list reports {slug}.php', async () => {
      const res = await scaffoldProject(tmp, pluginAnswers);
      expect(res.ok).toBe(true);
      // Document the contract for the scaffold output.
      const written = res.written || [];
      expect(written).toEqual(
        expect.arrayContaining(['my-project.php'])
      );
    });
  });

  /* -------------------------------------------------------------------- */
  /* p11-scaffold-update: Core / Modules / dependencies / configs         */
  /* -------------------------------------------------------------------- */

  describe('scaffoldProject (Phase 11 Core+Modules+assets+configs)', () => {
    // Same canonical answers as the rest of the suite, so the new
    // assertions don't have to rebuild the fixture.
    const goodAnswers = {
      slug: 'my-project',
      npmScope: 'myorg',
      globalName: 'MyProject',
      localizeVar: 'MyProjectLoc',
      textDomain: 'my-project',
      hookPrefix: 'my-project',
      depsBundle: 'my-project-deps.js',
      phpFunctionPrefix: 'myprj_',
      uiFramework: 'preact',
    };

    /* ----- src/Core/ emission ----------------------------------------- */

    test('scaffolds src/Core/Plugin.php (kit core facade)', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const pluginPhp = await fs.readFile(
        path.join(tmp, 'src', 'Core', 'Plugin.php'),
        'utf8',
      );
      // Must be a real PHP class, not a placeholder, declaring the
      // WPSK\Core\Plugin facade the bootstrap template relies on.
      expect(pluginPhp).toMatch(/namespace\s+WPSK\\Core\b/);
      expect(pluginPhp).toMatch(/class\s+Plugin\b/);
      expect(pluginPhp).toMatch(/public\s+static\s+function\s+boot\b/);
    });

    test('scaffolds src/Core/ModuleInterface.php (module contract)', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const iface = await fs.readFile(
        path.join(tmp, 'src', 'Core', 'ModuleInterface.php'),
        'utf8',
      );
      expect(iface).toMatch(/namespace\s+WPSK\\Core\b/);
      expect(iface).toMatch(/interface\s+ModuleInterface\b/);
      expect(iface).toMatch(/function\s+boot\b/);
      expect(iface).toMatch(/function\s+get_slug\b/);
    });

    test('scaffolds src/Core/ModuleLoader.php (registry + boot orchestrator)', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const loader = await fs.readFile(
        path.join(tmp, 'src', 'Core', 'ModuleLoader.php'),
        'utf8',
      );
      expect(loader).toMatch(/namespace\s+WPSK\\Core\b/);
      expect(loader).toMatch(/class\s+ModuleLoader\b/);
      expect(loader).toMatch(/function\s+register\b/);
      expect(loader).toMatch(/function\s+boot_all\b/);
    });

    /* ----- src/Modules/ emission ------------------------------------- */

    test('scaffolds src/Modules/ExampleFeature/ as a directory (stub)', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      // The scaffold must create a directory for the example module.
      // The directory must contain at least a .gitkeep or a Module.php
      // stub so the project commits it.
      const moduleDir = path.join(tmp, 'src', 'Modules', 'ExampleFeature');
      const stat = await fs.stat(moduleDir);
      expect(stat.isDirectory()).toBe(true);
      const entries = await fs.readdir(moduleDir);
      // Some kind of content file must be present (.gitkeep, Module.php,
      // or any placeholder).
      expect(entries.length).toBeGreaterThan(0);
    });

    /* ----- assets/dependencies.{js,ts} generation -------------------- */

    test('scaffolds assets/dependencies.js (or .ts) with globalName substituted', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      // Phase 11: dependencies lives at assets/dependencies.{js,ts}.
      // TS is not yet a hard requirement, so .js is acceptable. Either
      // extension must exist.
      const jsPath = path.join(tmp, 'assets', 'dependencies.js');
      const tsPath = path.join(tmp, 'assets', 'dependencies.ts');
      const hasJs = existsSyncSync(jsPath);
      const hasTs = existsSyncSync(tsPath);
      expect(hasJs || hasTs).toBe(true);
      const dep = await fs.readFile(
        hasTs ? tsPath : jsPath,
        'utf8',
      );
      // globalName must appear in the template so the IIFE wrap can
      // resolve at build time.
      expect(dep).toMatch(/MyProject/);
      // hookPrefix must appear in the action names.
      expect(dep).toMatch(/my-project-/);
    });

    /* ----- build.config.json + project.config.json shape ------------- */

    test('scaffolds build.config.json with styleEntryPoints', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const buildConfig = JSON.parse(
        await fs.readFile(path.join(tmp, 'build.config.json'), 'utf8'),
      );
      expect(Array.isArray(buildConfig.styleEntryPoints)).toBe(true);
      // Default entrypoint points at the style.css that the scaffold
      // also emits under assets/stylesheets/.
      expect(buildConfig.styleEntryPoints).toEqual(
        expect.arrayContaining(['assets/stylesheets/style.css']),
      );
    });

    test('scaffolds project.config.json with Phase 11 v2 default fields', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const cfg = JSON.parse(
        await fs.readFile(path.join(tmp, 'project.config.json'), 'utf8'),
      );
      // v2 defaults must be present in the scaffold output so that
      // consumers (e.g. readProjectConfig) can rely on them without
      // a follow-up migration step.
      expect(cfg.restNamespace).toBe('wpsk/v1');
      expect(cfg.vendorPrefix).toBe('WpskVendor');
      expect(cfg.phpMinVersion).toBe('7.4');
      expect(cfg.phpSourceVersion).toBe('8.1');
      expect(cfg.batchEndpoint).toBe('/batch/v1');
    });

    /* ----- tsconfig.json (only if not present) ----------------------- */

    test('scaffolds tsconfig.json when absent', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const tsconfigPath = path.join(tmp, 'tsconfig.json');
      // TS support is opt-in; the scaffold must emit tsconfig.json
      // (a baseline config) so consumers can `tsc` their assets.
      const stat = await fs.stat(tsconfigPath);
      expect(stat.isFile()).toBe(true);
      const tsconfig = JSON.parse(
        await fs.readFile(tsconfigPath, 'utf8'),
      );
      // Baseline TS config — at minimum a compilerOptions block.
      expect(tsconfig).toBeDefined();
      expect(typeof tsconfig).toBe('object');
    });

    /* ----- readme.txt (WordPress.org format) ------------------------- */

    test('scaffolds readme.txt in WordPress.org plugin format', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const readme = await fs.readFile(
        path.join(tmp, 'readme.txt'),
        'utf8',
      );
      // WP.org plugin readme.txt uses a fixed set of section markers.
      expect(readme).toMatch(/===\s*[^=\n]+\s*===/); // plugin title
      expect(readme).toMatch(/Contributors:/);
      expect(readme).toMatch(/Tags:/);
      expect(readme).toMatch(/Requires at least:/);
      expect(readme).toMatch(/Tested up to:/);
      expect(readme).toMatch(/Stable tag:/);
      expect(readme).toMatch(/License:/);
    });

    /**
     * Phase 11 readme.txt hardening — lock the full WP.org header
     * contract that the verifier inspects. Each assertion maps to a
     * header the WP.org plugin directory reads, plus a short
     * description block (the text that follows the metadata block
     * and is shown under the plugin name in the directory listing).
     */
    test('readme.txt: emits the full WP.org header set (Plugin Name, Contributors, Tags, Requires at least, Tested up to, Requires PHP, Stable tag, License, Short Description)', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const readme = await fs.readFile(
        path.join(tmp, 'readme.txt'),
        'utf8',
      );

      // 1. === Plugin Name === — first header line. WP.org parses
      //    the first `=== ... ===` line as the plugin title.
      const titleMatch = readme.match(/^===\s*([^\n=]+?)\s*===\s*$/m);
      expect(titleMatch).not.toBeNull();
      // The title must echo the project's globalName (default: 'MyProject')
      // so the WP.org listing matches the plugin's display name.
      expect(titleMatch[1].trim()).toBe('MyProject');

      // 2. Contributors:  — comma-separated list of WP.org user slugs.
      //    The scaffold defaults to the kit's own author slug.
      expect(readme).toMatch(/^Contributors:\s+\S+/m);

      // 3. Tags:  — comma-separated plugin tags. wp-starter-kit
      //    ships a sensible default.
      expect(readme).toMatch(/^Tags:\s+\S+/m);

      // 4. Requires at least:  — minimum WP version (major.minor).
      expect(readme).toMatch(/^Requires at least:\s+\d+\.\d+/m);

      // 5. Tested up to:  — latest WP version the author has
      //    smoke-tested against.
      expect(readme).toMatch(/^Tested up to:\s+\d+\.\d+/m);

      // 6. Requires PHP:  — minimum PHP version. Must be rendered
      //    from project.config.json's phpMinVersion field.
      const phpMinMatch = readme.match(/^Requires PHP:\s+(\S+)/m);
      expect(phpMinMatch).not.toBeNull();
      // The default phpMinVersion in answersToProjectConfig is '7.4'.
      expect(phpMinMatch[1]).toBe('7.4');

      // 7. Stable tag:  — the version of the current release.
      //    SemVer-ish (X.Y.Z).
      expect(readme).toMatch(/^Stable tag:\s+\d+\.\d+\.\d+/m);

      // 8. License:  — SPDX license identifier. wp-starter-kit
      //    defaults to GPL-2.0-or-later.
      expect(readme).toMatch(/^License:\s+GPL-2\.0-or-later/m);

      // 9. Short Description — the free-form paragraph that
      //    appears immediately after the metadata block and
      //    before the first `== Section ==` heading. WP.org
      //    requires it; without it the directory shows an empty
      //    description. The scaffold populates it from
      //    project.config.json (or, by default, from
      //    tplVars.description).
      //    Locate the short description as the first non-empty,
      //    non-comment line after the metadata block.
      const afterMeta = readme.split(/\r?\n\r?\n/);
      // The metadata block + short description sit in the first
      // 2 paragraphs of the file (WP.org standard). The first
      // paragraph is the metadata block (the `=== Title ===`
      // section); the second paragraph is the short description.
      expect(afterMeta.length).toBeGreaterThanOrEqual(2);
      const shortDesc = afterMeta[1].trim();
      // The short description must be non-empty.
      expect(shortDesc.length).toBeGreaterThan(0);
      // It must NOT be a WP.org section heading (== Title ==).
      expect(shortDesc).not.toMatch(/^==/);
      // And it must reflect the kit-derived description (slug + kit
      // identifier) so consumers see something useful in the
      // directory listing.
      expect(shortDesc).toMatch(/my-project/);
      expect(shortDesc).toMatch(/wp-starter-kit|WPSK|wp plugin starter kit/i);
    });

    test('readme.txt: preserves plugin mode contract — scaffold does not write functions.php', async () => {
      // The p11-bootstrap-template task moved the primary bootstrap
      // to {slug}.php; the p11-scaffold-update task confirmed the
      // scaffold never lists functions.php in the written set when
      // projectType === 'plugin' (the default). This test re-asserts
      // the same invariant in the readme context: a plugin-mode
      // readme.txt must describe a plugin (Plugin URI present),
      // not a theme, and the scaffold's `written` list must not
      // include functions.php.
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const readme = await fs.readFile(
        path.join(tmp, 'readme.txt'),
        'utf8',
      );
      // readme.txt for a plugin must include a Plugin URI line —
      // themes get a Theme URI instead. The scaffold always
      // emits Plugin URI for plugin-mode scaffolds.
      expect(readme).toMatch(/^Plugin URI:\s+\S+/m);
      // The scaffold's written list must not include functions.php
      // (we are in plugin mode by default).
      expect(res.written || []).not.toContain('functions.php');
    });

    /* ----- refuse to clobber ---------------------------------------- */

    test('refuses to clobber existing project.config.json without --force', async () => {
      // Pre-populate a sentinel project.config.json AND a sentinel
      // src/Core/Plugin.php so we can prove neither was overwritten.
      await fs.mkdir(path.join(tmp, 'src', 'Core'), { recursive: true });
      await fs.writeFile(
        path.join(tmp, 'project.config.json'),
        '{"sentinel": true}',
      );
      await fs.writeFile(
        path.join(tmp, 'src', 'Core', 'Plugin.php'),
        '<?php // sentinel',
      );
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/already exists|clobber|exists/i);
      // Both sentinels must still be intact.
      const cfg = await fs.readFile(
        path.join(tmp, 'project.config.json'),
        'utf8',
      );
      expect(cfg).toContain('sentinel');
      const plugin = await fs.readFile(
        path.join(tmp, 'src', 'Core', 'Plugin.php'),
        'utf8',
      );
      expect(plugin).toContain('sentinel');
    });

    test('overwrites with --force: refreshes project.config.json + src/Core/Plugin.php', async () => {
      await fs.mkdir(path.join(tmp, 'src', 'Core'), { recursive: true });
      await fs.writeFile(
        path.join(tmp, 'project.config.json'),
        '{"sentinel": true}',
      );
      await fs.writeFile(
        path.join(tmp, 'src', 'Core', 'Plugin.php'),
        '<?php // sentinel',
      );
      const res = await scaffoldProject(tmp, goodAnswers, { force: true });
      expect(res.ok).toBe(true);
      // The new project.config.json must NOT contain the sentinel.
      const cfg = JSON.parse(
        await fs.readFile(path.join(tmp, 'project.config.json'), 'utf8'),
      );
      expect(cfg.sentinel).toBeUndefined();
      expect(cfg.slug).toBe('my-project');
      // The Plugin.php must be the real WPSK\Core\Plugin facade, not
      // the sentinel comment.
      const plugin = await fs.readFile(
        path.join(tmp, 'src', 'Core', 'Plugin.php'),
        'utf8',
      );
      expect(plugin).toMatch(/namespace\s+WPSK\\Core\b/);
      expect(plugin).not.toMatch(/sentinel/);
    });

    /* ----- plugin mode: no functions.php ---------------------------- */

    test('plugin mode: does not emit functions.php as a side effect', async () => {
      const res = await scaffoldProject(tmp, {
        ...goodAnswers,
        projectType: 'plugin',
      });
      expect(res.ok).toBe(true);
      const written = res.written || [];
      expect(written).not.toContain('functions.php');
    });
  });
});

/**
 * Local existsSync — avoid pulling in the whole `fs` module just for
 * a synchronous stat in the test that probes for .js/.ts presence.
 */
function existsSyncSync(p) {
  try {
    // eslint-disable-next-line global-require
    return require('node:fs').existsSync(p);
  } catch {
    return false;
  }
}
