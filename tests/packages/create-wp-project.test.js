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
      });
    });

    test('writes functions.php with wpsk_ prefix replaced by phpFunctionPrefix', async () => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const fn = await fs.readFile(path.join(tmp, 'functions.php'), 'utf8');
      // No leftover wpsk_ from the template (the function prefix is myprj_).
      expect(fn).not.toMatch(/\bwpsk_/);
      // The scaffolded file uses the new prefix.
      expect(fn).toMatch(/\bmyprj_enqueue_bundle_script\b/);
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
  });
});
