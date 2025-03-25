import {cp} from 'node:fs/promises';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import chalk from 'chalk';
import {readBuildConfig, validateConfig} from "@core/build";

// Parse arguments with yargs
const argv = yargs(hideBin(process.argv))
    .option('validate', {
        type: 'boolean',
        description: 'Validate the config instead of copying assets',
        default: false,
    })
    .help()
    .argv;

export async function buildAssets() {

    try {
        const config = await readBuildConfig();

        if (argv.validate) {
            // Validate config only
            validateConfig(config);
            console.log(chalk.green.bold('✅ Configuration is valid!'));
        } else {

            // Copy assets
            for (const {source, destination, options} of config.assetMappings) {
                console.log(chalk.cyan(`🚚 Copying ${chalk.underline(source)} to ${chalk.underline(destination)}`));
                await cp(source, destination, {recursive: true, force: options?.overwrite ?? true});
            }
            console.log(chalk.green('🎉 Assets copied successfully!'));
        }

    } catch (error) {
        console.log('🔥 Error in buildAssets:', error);

        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

buildAssets();
