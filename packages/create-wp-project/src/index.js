/**
 * @wpsk/create-wp-project — minimal Node scaffold for a new wp-starter-kit
 * project (Phase 8).
 *
 * The mrlogistic approach was a Yeoman generator. The wp-starter-kit
 * version uses a tiny in-process Node script (no Plop/Yeoman dependency)
 * that:
 *
 *   1. Accepts an `ScaffoldAnswers` shape (slug, scope, globalName, ...).
 *   2. Validates the answers (`validateAnswers`).
 *   3. Renders each template with `{{token}}` substitution.
 *   4. Writes the output to a target directory.
 *
 * Usage (CLI):
 *   node packages/create-wp-project/src/index.js [target-dir]
 *
 * When called without args, the script reads answers from `WPSK_ANSWERS_JSON`
 * env var. When called from PHPUnit or another test, import the named
 * exports and drive `scaffoldProject()` directly.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/* -------------------------------------------------------------------- */
/* Types                                                                */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} ScaffoldAnswers
 * @property {string} slug
 * @property {string} npmScope       e.g. 'myorg' (no @)
 * @property {string} globalName     e.g. 'MyProject'
 * @property {string} [localizeVar]  e.g. 'MyProjectLoc' (inferred from globalName)
 * @property {string} textDomain
 * @property {string} hookPrefix
 * @property {string} [depsBundle]   e.g. 'my-project-deps.js' (inferred from slug)
 * @property {string} phpFunctionPrefix e.g. 'myprj_'
 * @property {'preact'|'react'} uiFramework
 */

/* -------------------------------------------------------------------- */
/* validateAnswers                                                      */
/* -------------------------------------------------------------------- */

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const SCOPE_RE = /^[a-z0-9][a-z0-9-]*$/;     // npmScope is the part after '@'
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;     // JS identifier
const DOMAIN_RE = /^[a-z0-9][a-z0-9-]*$/;       // text-domain / hook-prefix slug

export function validateAnswers(a) {
  const errors = {};

  if (!a || typeof a !== 'object') {
    return { ok: false, errors: { _root: 'answers must be an object' } };
  }
  if (!a.slug || !SLUG_RE.test(a.slug)) {
    errors.slug = 'slug must be lowercase kebab-case (a-z, 0-9, dashes)';
  }
  if (!a.npmScope || !SCOPE_RE.test(a.npmScope)) {
    errors.npmScope = 'npmScope must be lowercase kebab-case (no @)';
  }
  if (!a.globalName || !IDENT_RE.test(a.globalName)) {
    errors.globalName = 'globalName must be a valid JS identifier';
  }
  if (a.localizeVar !== undefined && a.localizeVar !== '' && !IDENT_RE.test(a.localizeVar)) {
    errors.localizeVar = 'localizeVar must be a valid JS identifier';
  }
  if (!a.textDomain || !DOMAIN_RE.test(a.textDomain)) {
    errors.textDomain = 'textDomain must be lowercase kebab-case';
  }
  if (!a.hookPrefix || !DOMAIN_RE.test(a.hookPrefix)) {
    errors.hookPrefix = 'hookPrefix must be lowercase kebab-case';
  }
  if (a.phpFunctionPrefix !== undefined && a.phpFunctionPrefix !== '' &&
      !/^[a-z][a-z0-9_]*_$/.test(a.phpFunctionPrefix)) {
    errors.phpFunctionPrefix = 'phpFunctionPrefix must be lowercase letters/digits/underscores, ending with underscore';
  }
  if (a.uiFramework !== 'preact' && a.uiFramework !== 'react') {
    errors.uiFramework = 'uiFramework must be "preact" or "react"';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/* -------------------------------------------------------------------- */
/* answersToProjectConfig                                              */
/* -------------------------------------------------------------------- */

export function answersToProjectConfig(a) {
  const cfg = {
    slug: a.slug,
    globalName: a.globalName,
    localizeVar: a.localizeVar || a.globalName + 'Loc',
    textDomain: a.textDomain,
    hookPrefix: a.hookPrefix,
    npmScope: '@' + a.npmScope,
    depsBundle: a.depsBundle || `${a.slug}-deps.js`,
    phpFunctionPrefix: a.phpFunctionPrefix || 'wpsk_',
    uiFramework: a.uiFramework,
  };
  return cfg;
}

/* -------------------------------------------------------------------- */
/* renderTemplate                                                       */
/* -------------------------------------------------------------------- */

const TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function renderTemplate(tmpl, vars) {
  return tmpl.replace(TOKEN_RE, (full, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key) && vars[key] !== undefined && vars[key] !== null) {
      return String(vars[key]);
    }
    return full; // leave unknown tokens verbatim so missing config is loud
  });
}

/* -------------------------------------------------------------------- */
/* Templates                                                            */
/* -------------------------------------------------------------------- */

const TEMPLATE_PROJECT_CONFIG = `{
  "slug": "{{slug}}",
  "globalName": "{{globalName}}",
  "localizeVar": "{{localizeVar}}",
  "textDomain": "{{textDomain}}",
  "hookPrefix": "{{hookPrefix}}",
  "npmScope": "{{npmScope}}",
  "depsBundle": "{{depsBundle}}",
  "phpFunctionPrefix": "{{phpFunctionPrefix}}",
  "uiFramework": "{{uiFramework}}"
}
`;

const TEMPLATE_FUNCTIONS_PHP = `<?php
/**
 * Theme bootstrap for the {{slug}} WordPress theme.
 *
 * Scaffolded from wp-starter-kit. Prefix: {{phpFunctionPrefix}} (read from
 * project.config.json — the function prefix is intentionally hardcoded to
 * match the seeded value because PHP namespaces/function names cannot be
 * resolved at runtime like JS global names can).
 */

if (!defined('{{slug_underscore}}_VERSION')) {
    define('{{slug_underscore}}_VERSION', '0.1.0');
}

add_action('after_setup_theme', '{{slug_underscore}}_setup');
function {{slug_underscore}}_setup(): void
{
    load_theme_textdomain('{{textDomain}}', get_template_directory() . '/languages');
}

add_action('wp_enqueue_scripts', '{{slug_underscore}}_enqueue_assets');
function {{slug_underscore}}_enqueue_assets(): void
{
    {{phpFunctionPrefix}}enqueue_bundle_script('{{depsBundle}}');
    {{phpFunctionPrefix}}enqueue_bundle_style('{{slug}}.css');
    wp_localize_script(
        '{{depsHandle}}',
        '{{localizeVar}}',
        {{phpFunctionPrefix}}get_localize_data()
    );
    wp_set_script_translations('{{depsHandle}}', '{{textDomain}}', get_template_directory() . '/assets/translations');
}
`;

// Aliases for template token → answer key
function tplVars(answers, cfg) {
  return {
    ...answers,
    ...cfg,
    // {{slug_underscore}} for the PHP-side function names
    slug_underscore: answers.slug.replace(/-/g, '_'),
    depsHandle: answers.depsBundle || cfg.depsBundle.replace(/\.js$/, ''),
  };
}

const TEMPLATE_DEPENDENCIES_JS = `/**
 * {{globalName}} — dependencies bundle entry.
 *
 * Exports become properties on the {{globalName}} global at runtime (the
 * IIFE wrapping is added by esbuild with globalName: '{{globalName}}').
 */

import { createHooks } from '@wordpress/hooks';
import domReady from '@wordpress/dom-ready';

export const hooks = createHooks();

export const table = { Tabulator: window.Tabulator };

domReady(() => {
  hooks.addAction(
    '{{hookPrefix}}-request-ajax-start',
    'theme',
    (endpoint, options = {}) => {
      if (!options?.disableLoading) {
        document.body.classList.add('is-loading');
      }
    }
  );
  hooks.addAction(
    '{{hookPrefix}}-request-ajax-done',
    'theme',
    (endpoint, options = {}) => {
      if (!options?.disableLoading) {
        document.body.classList.remove('is-loading');
      }
    }
  );
});
`;

function packageJsonForAnswers(answers) {
  const preactAliases = answers.uiFramework === 'preact';
  return {
    name: '@' + answers.npmScope + '/' + answers.slug,
    version: '0.1.0',
    description: `${answers.slug} — WordPress theme built on wp-starter-kit`,
    private: true,
    type: 'module',
    scripts: {
      build: 'npm-run-all --parallel build:dependencies build:components build:styles build:assets',
      'build:dependencies': 'node core/packages/build/esbuild-dependencies-cli.js',
      'build:components':  'node core/packages/build/esbuild-components-cli.js',
      'build:styles':      'node core/packages/build/esbuild-styles-cli.js',
      'build:assets':      'node build/build-assets.js',
      test: 'jest',
      check: 'node core/packages/utils/check-cli.js',
    },
    workspaces: ['core/packages/*', 'packages/*'],
    dependencies: preactAliases
      ? {
          preact: '^10.19.3',
          '@preact/compat': '^18.3.2',
          '@preact/signals': '^2.9.1',
          '@wordpress/hooks': '^3.50.0',
          '@wordpress/dom-ready': '^3.50.0',
          // Aliases: code uses `react`/`react-dom` but Preact is installed.
          react: 'npm:@preact/compat',
          'react-dom': 'npm:@preact/compat',
        }
      : {
          react: '^18.3.0',
          'react-dom': '^18.3.0',
          '@wordpress/hooks': '^3.50.0',
          '@wordpress/dom-ready': '^3.50.0',
        },
  };
}

const TEMPLATE_README = `# {{slug}}

WordPress theme scaffolded from [wp-starter-kit](https://github.com/abolfazl-moeini/wp-plugin-starter-kit).

## Branding (all from \`project.config.json\`)

- npm scope: \`{{npmScope}}\`
- Global JS name: \`{{globalName}}\`
- Localize var: \`{{localizeVar}}\`
- Text domain: \`{{textDomain}}\`
- Hook prefix: \`{{hookPrefix}}\`
- PHP function prefix: \`{{phpFunctionPrefix}}\`
- UI framework: \`{{uiFramework}}\`

## Development

\`\`\`
npm install
npm run build
npm test
\`\`\`

See the parent starter docs in \`node_modules/wp-starter-kit/README.md\` (if linked) or https://github.com/abolfazl-moeini/wp-plugin-starter-kit.
`;

/* -------------------------------------------------------------------- */
/* scaffoldProject                                                     */
/* -------------------------------------------------------------------- */

/**
 * @param {string} targetDir  absolute path where the project will be created.
 * @param {ScaffoldAnswers} answers
 * @returns {Promise<{ok: boolean, written?: string[], reason?: string}>}
 */
export async function scaffoldProject(targetDir, answers) {
  // 1. Validate
  const v = validateAnswers(answers);
  if (!v.ok) {
    return { ok: false, reason: 'invalid answers: ' + JSON.stringify(v.errors) };
  }

  // 2. Refuse to clobber an existing project
  try {
    await fs.access(path.join(targetDir, 'project.config.json'));
    return { ok: false, reason: `project.config.json already exists at ${targetDir}` };
  } catch {
    /* good — does not exist */
  }

  // 3. Build cfg + vars
  const cfg = answersToProjectConfig(answers);
  const vars = tplVars(answers, cfg);

  // 4. Render + write
  const written = [];

  await fs.mkdir(path.join(targetDir, 'assets'), { recursive: true });
  await fs.mkdir(path.join(targetDir, 'components'), { recursive: true });

  const files = {
    'project.config.json':         renderTemplate(TEMPLATE_PROJECT_CONFIG, vars),
    'functions.php':               renderTemplate(TEMPLATE_FUNCTIONS_PHP, vars),
    'assets/dependencies.js':      renderTemplate(TEMPLATE_DEPENDENCIES_JS, vars),
    'package.json':                JSON.stringify(packageJsonForAnswers(answers), null, 2) + '\n',
    'README.md':                   renderTemplate(TEMPLATE_README, vars),
  };

  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(targetDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
    written.push(rel);
  }

  return { ok: true, written };
}

/* -------------------------------------------------------------------- */
/* CLI entry                                                            */
/* -------------------------------------------------------------------- */

function parseAnswersFromEnv() {
  const raw = process.env.WPSK_ANSWERS_JSON;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function parseAnswersFromArgs(argv) {
  // Lightweight flag parser: --slug=foo --scope=bar --global=MyProject ...
  // Plus --target=<dir>. For interactive use the user can pipe in JSON.
  const a = {};
  let target = null;
  for (const arg of argv) {
    if (arg.startsWith('--target=')) {
      target = arg.slice('--target='.length);
    } else if (arg.startsWith('--slug='))       a.slug         = arg.slice('--slug='.length);
    else if (arg.startsWith('--scope='))      a.npmScope     = arg.slice('--scope='.length);
    else if (arg.startsWith('--global='))     a.globalName   = arg.slice('--global='.length);
    else if (arg.startsWith('--domain='))     a.textDomain   = arg.slice('--domain='.length);
    else if (arg.startsWith('--hook='))        a.hookPrefix   = arg.slice('--hook='.length);
    else if (arg.startsWith('--php='))         a.phpFunctionPrefix = arg.slice('--php='.length);
    else if (arg.startsWith('--ui='))          a.uiFramework  = arg.slice('--ui='.length);
  }
  return { answers: a, target };
}

async function main() {
  const argv = process.argv.slice(2);
  const fromEnv = parseAnswersFromEnv();
  const fromArgs = parseAnswersFromArgs(argv);
  const answers = fromEnv || fromArgs.answers;
  const target = process.env.WPSK_TARGET || fromArgs.target || process.cwd();

  if (!answers || Object.keys(answers).length === 0) {
    process.stdout.write(
      'Usage: node packages/create-wp-project/src/index.js ' +
      '[--target=<dir>] [--slug=<s> --scope=<s> --global=<s> --domain=<s> --hook=<s> --php=<s> --ui=preact|react]\n' +
      '   or: WPSK_ANSWERS_JSON=<json> node packages/create-wp-project/src/index.js\n'
    );
    process.exit(2);
  }

  const res = await scaffoldProject(path.resolve(target), answers);
  if (!res.ok) {
    process.stderr.write('Scaffold failed: ' + (res.reason || 'unknown') + '\n');
    process.exit(1);
  }
  process.stdout.write('Scaffold OK. Wrote: ' + (res.written || []).join(', ') + '\n');
}

// CLI detection: if this script was invoked directly (argv[1] is our file
// or our bin), run main(). jest passes the test file as argv[1], so the
// equality check is `endsWith` not `===`.
if (process.argv[1] && process.argv[1].endsWith('create-wp-project') ||
    process.argv[1] && process.argv[1].includes('create-wp-project/src/index.js')) {
  main().catch((e) => {
    process.stderr.write('Scaffold error: ' + (e && e.message) + '\n');
    process.exit(1);
  });
}
