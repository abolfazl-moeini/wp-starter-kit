import {cp} from 'node:fs/promises';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import chalk from 'chalk';

// Parse arguments with yargs (lazy: defer parsing until buildAssets runs
// so tests can mutate process.argv before the parser sees it).
let _argv = null;
function getArgv() {
    if (_argv) return _argv;
    _argv = yargs(hideBin(process.argv))
        .option('validate', {
            type: 'boolean',
            description: 'Validate the config instead of copying assets',
            default: false,
        })
        .option('dry-run', {
            type: 'boolean',
            description: 'Log planned copies but perform none',
            default: false,
        })
        .help()
        .argv;
    return _argv;
}

/**
 * Build/copy/lint assets according to build.config.json.
 *
 * Modes:
 *  - default:    run every `assetMapping` through `fs.promises.cp`.
 *  - --validate: validate config and exit 0 (no copy).
 *  - --dry-run:  log every planned copy but do not perform any I/O.
 *
 * @returns {Promise<{mode: 'copy'|'validate'|'dry-run', planned: number}>}
 */
export async function buildAssets() {
    try {
        // Parse args FIRST so --help / --version short-circuit before we
        // touch the filesystem. yargs is configured lazily (see getArgv).
        const argv = getArgv();

        // Lazy import so tests can `unstable_mockModule('@core/build', ...)`
        // and exercise the validate / dry-run / copy branches in isolation.
        const { readBuildConfig, validateConfig } = await import('@core/build');
        const config = await readBuildConfig();
        validateConfig(config);

        const mappings = config.assetMappings ?? [];
        const isDryRun = !!argv['dry-run'];

        if (argv.validate || isDryRun) {
            // Non-mutating path: list (or just print success) and exit.
            for (const {source, destination, options} of mappings) {
                const mode = argv.validate ? 'validate' : 'dry-run';
                const verb = argv.validate
                    ? 'would copy'
                    : chalk.yellow('[dry-run] would copy');
                console.log(`${verb} ${chalk.underline(source)} → ${chalk.underline(destination)}${
                    options?.overwrite === false ? ' (no-overwrite)' : ''
                } [${mode}]`);
            }
            console.log(
                argv.validate
                    ? chalk.green.bold('✅ Configuration is valid!')
                    : chalk.green.bold(`✅ Dry-run complete — ${mappings.length} planned copies (no I/O).`),
            );
            return { mode: argv.validate ? 'validate' : 'dry-run', planned: mappings.length };
        }

        // Copy assets
        for (const {source, destination, options} of config.assetMappings) {
            console.log(chalk.cyan(`🚚 Copying ${chalk.underline(source)} to ${chalk.underline(destination)}`));
            await cp(source, destination, {recursive: true, force: options?.overwrite ?? true});
        }
        console.log(chalk.green('🎉 Assets copied successfully!'));
        return { mode: 'copy', planned: config.assetMappings.length };
    } catch (error) {
        console.log('🔥 Error in buildAssets:', error);
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

// Main-module guard: only execute the CLI when run directly.
// We use process.env.JEST_WORKER_ID (set by jest) to suppress the side
// effect when the file is imported by tests. Real CLI invocations set
// neither JEST_WORKER_ID nor any other guard, so the side effect runs.
if (!process.env.JEST_WORKER_ID) {
    // Defer the side effect so import-time errors don't fire under jest.
    // The check is a best-effort "am I the entry point" signal.
    const invokedDirectly = process.argv[1] && process.argv[1].endsWith('build-assets.js');
    if (invokedDirectly) {
        buildAssets();
    }
}
